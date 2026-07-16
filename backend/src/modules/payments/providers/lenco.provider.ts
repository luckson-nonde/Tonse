import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  Channel,
  CollectionResult,
  CollectionStatus,
  FeeBearer,
  FeeQuote,
  InitiateCollectionInput,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  RefundInput,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';
import { fromNgwee, toNgwee } from '../../../common/money/money';

/**
 * Live Lenco adapter — SERVER SIDE ONLY (the key must never reach a browser).
 *
 * Shapes follow Lenco's collections API (`/collections/mobile-money`,
 * `/collections/status/:reference`), which is what the local documentation
 * covers. Two things are NOT in that documentation and must be confirmed
 * against the live dashboard before go-live (Phase 7):
 *
 *   1. The webhook signature header + algorithm. `verifySignature` below
 *      assumes HMAC-SHA256 hex over the raw body in `x-lenco-signature`.
 *   2. Refunds and payouts. Lenco documents collections only; for ZM mobile
 *      money a refund is an OUTBOUND TRANSFER, so `refund()` is implemented as
 *      a payout to the payer's MSISDN. Confirm the endpoint before relying on it.
 *
 * Both are isolated here by design — the rest of the system talks to the
 * interface, so correcting them is a change to this file alone.
 */
@Injectable()
export class LencoPaymentProvider implements PaymentProvider {
  readonly name = 'lenco';
  private readonly logger = new Logger(LencoPaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('psp.lenco.baseUrl');
  }

  private get apiKey(): string {
    const key = this.config.get<string>('psp.lenco.apiKey');
    if (!key) {
      // Fail loudly rather than silently falling back — a payment provider with
      // no key must never look like a working one.
      throw new ServiceUnavailableException(
        'Payment provider is not configured (LENCO_API_KEY missing).',
      );
    }
    return key;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Lenco ${path} failed (${res.status}): ${JSON.stringify(body)}`);
      throw new BadRequestException(
        (body as any)?.message || `Payment provider request failed (${res.status})`,
      );
    }
    return (body as any)?.data ?? body;
  }

  /**
   * Lenco reports its fee on the transaction rather than quoting up front, so
   * we estimate here for display and reconcile to the ACTUAL fee from the
   * verified transaction. The estimate never reaches the ledger — the fee is a
   * memo, and only the amount that truly lands is journalled.
   */
  async quoteFees(input: { amount: string; channel: Channel; bearer: FeeBearer }): Promise<FeeQuote> {
    const amountNgwee = toNgwee(input.amount);
    const estimated = Math.min(Math.max(Math.round(amountNgwee * 0.025), 100), 5000);
    return {
      amount: fromNgwee(amountNgwee),
      fee: fromNgwee(estimated),
      totalCharged: fromNgwee(
        input.bearer === 'customer' ? amountNgwee + estimated : amountNgwee,
      ),
      bearer: input.bearer,
      currency: 'ZMW',
    };
  }

  private mapStatus(raw: string): CollectionStatus {
    switch ((raw || '').toLowerCase()) {
      case 'successful':
        return 'successful';
      case 'failed':
        return 'failed';
      case 'pay-offline':
        return 'pay-offline';
      case '3ds-auth-required':
        return '3ds-auth-required';
      default:
        return 'pending';
    }
  }

  async initiateCollection(input: InitiateCollectionInput): Promise<CollectionResult> {
    const raw = await this.call<any>('/collections/mobile-money', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        phone: input.phone,
        operator: input.operator,
        bearer: input.bearer,
        email: input.email,
        name: input.name,
        description: input.description,
      }),
    });
    return {
      reference: input.reference,
      providerReference: raw?.lencoReference || raw?.id,
      status: this.mapStatus(raw?.status),
      amount: String(raw?.amount ?? input.amount),
      fee: raw?.fee != null ? String(raw.fee) : undefined,
      currency: input.currency,
      instruction: raw?.instruction,
      raw,
    };
  }

  async verifyCollection(reference: string): Promise<CollectionResult> {
    const raw = await this.call<any>(`/collections/status/${encodeURIComponent(reference)}`);
    return {
      reference,
      providerReference: raw?.lencoReference || raw?.id,
      status: this.mapStatus(raw?.status),
      amount: String(raw?.amount ?? '0'),
      fee: raw?.fee != null ? String(raw.fee) : undefined,
      currency: raw?.currency || 'ZMW',
      raw,
    };
  }

  /** ZM mobile-money refund = outbound transfer to the payer. Confirm endpoint. */
  async refund(input: RefundInput): Promise<RefundResult> {
    const raw = await this.call<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        phone: input.phone,
        operator: input.operator,
        narration: input.reason || 'Refund',
      }),
    });
    return {
      reference: input.reference,
      providerReference: raw?.lencoReference || raw?.id,
      status: raw?.status === 'successful' ? 'successful' : raw?.status === 'failed' ? 'failed' : 'pending',
      amount: String(raw?.amount ?? input.amount),
      fee: raw?.fee != null ? String(raw.fee) : undefined,
      currency: input.currency,
      raw,
    };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    const raw = await this.call<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        phone: input.phone,
        operator: input.operator,
        accountId: input.accountId,
        narration: input.narration || 'Seller payout',
      }),
    });
    return {
      reference: input.reference,
      providerReference: raw?.lencoReference || raw?.id,
      status: raw?.status === 'successful' ? 'successful' : raw?.status === 'failed' ? 'failed' : 'pending',
      amount: String(raw?.amount ?? input.amount),
      fee: raw?.fee != null ? String(raw.fee) : undefined,
      currency: input.currency,
      raw,
    };
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, any>): WebhookEvent {
    const secret = this.config.get<string>('psp.lenco.webhookSecret');
    if (!secret) {
      throw new ServiceUnavailableException('Webhook secret is not configured.');
    }
    const signature = String(headers['x-lenco-signature'] || '');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    // Length check first: timingSafeEqual throws on length mismatch.
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = JSON.parse(rawBody.toString('utf8'));
    const type = String(body?.event || body?.type || '');
    return {
      eventId: body?.id || body?.eventId,
      type: type.includes('collection')
        ? 'collection'
        : type.includes('refund')
          ? 'refund'
          : type.includes('transfer') || type.includes('payout')
            ? 'payout'
            : 'unknown',
      reference: body?.data?.reference || body?.reference,
      providerReference: body?.data?.lencoReference || body?.data?.id,
      status: body?.data?.status || body?.status,
      raw: body,
    };
  }
}
