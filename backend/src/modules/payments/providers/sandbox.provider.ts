import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  Channel,
  CollectionResult,
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
 * Sandbox PSP — a real implementation of the provider contract with no network.
 *
 * This is NOT a stub that always says yes. It models the provider's actual
 * lifecycle (pending → pay-offline → successful/failed), charges a realistic
 * fee, and requires a signed webhook to confirm anything — so the whole money
 * path (checkout → webhook → verify → journal) is exercised for real today,
 * and swapping in live Lenco changes one env var, not the design.
 *
 * Deterministic test hooks (amount-driven, so no magic flags):
 *   • amount ending .13 → the collection FAILS
 *   • amount ending .99 → stays pending (simulates a payer who never approves)
 *   • anything else     → pay-offline, then successful once confirmed
 */
@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = 'sandbox';
  private readonly logger = new Logger(SandboxPaymentProvider.name);

  /** In-memory state — the sandbox's "PSP-side" record. */
  private readonly collections = new Map<string, CollectionResult>();

  /** Fee model: 2.5% capped at K50, min K1 — same shape as ZM mobile money. */
  private feeFor(amount: string): number {
    const ngwee = toNgwee(amount);
    const pct = Math.round(ngwee * 0.025);
    return Math.min(Math.max(pct, 100), 5000);
  }

  async quoteFees(input: { amount: string; channel: Channel; bearer: FeeBearer }): Promise<FeeQuote> {
    const amountNgwee = toNgwee(input.amount);
    const feeNgwee = this.feeFor(input.amount);
    return {
      amount: fromNgwee(amountNgwee),
      fee: fromNgwee(feeNgwee),
      // bearer 'customer': payer is charged amount + fee, and only `amount`
      // reaches the holding account (the provider keeps the fee).
      totalCharged: fromNgwee(
        input.bearer === 'customer' ? amountNgwee + feeNgwee : amountNgwee,
      ),
      bearer: input.bearer,
      currency: 'ZMW',
    };
  }

  async initiateCollection(input: InitiateCollectionInput): Promise<CollectionResult> {
    const cents = toNgwee(input.amount) % 100;
    const status: CollectionResult['status'] =
      cents === 13 ? 'failed' : cents === 99 ? 'pending' : 'pay-offline';

    const result: CollectionResult = {
      reference: input.reference,
      providerReference: `SBX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      status,
      amount: input.amount,
      fee: fromNgwee(this.feeFor(input.amount)),
      currency: input.currency,
      instruction:
        status === 'pay-offline'
          ? 'Approve the prompt on your phone to complete payment.'
          : undefined,
      raw: { sandbox: true, channel: input.channel, phone: input.phone },
    };
    this.collections.set(input.reference, result);
    this.logger.log(`sandbox collection ${input.reference} → ${status}`);
    return result;
  }

  async verifyCollection(reference: string): Promise<CollectionResult> {
    const found = this.collections.get(reference);
    if (!found) {
      throw new BadRequestException(`Unknown sandbox collection ${reference}`);
    }
    return found;
  }

  /**
   * Test-only: move a pay-offline collection to its final state, as if the
   * payer approved on their handset. The webhook it triggers is emitted by the
   * controller, not here — the sandbox never posts journals directly.
   */
  async simulateConfirm(reference: string, outcome: 'successful' | 'failed'): Promise<CollectionResult> {
    const found = this.collections.get(reference);
    if (!found) throw new BadRequestException(`Unknown sandbox collection ${reference}`);
    const updated = { ...found, status: outcome };
    this.collections.set(reference, updated);
    return updated;
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      reference: input.reference,
      providerReference: `SBXR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      // Async in reality — a ZM refund is an outbound transfer that can fail.
      status: 'pending',
      amount: input.amount,
      fee: fromNgwee(this.feeFor(input.amount)),
      currency: input.currency,
      raw: { sandbox: true, reason: input.reason },
    };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    return {
      reference: input.reference,
      providerReference: `SBXP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      status: 'pending',
      amount: input.amount,
      fee: fromNgwee(this.feeFor(input.amount)),
      currency: input.currency,
      raw: { sandbox: true },
    };
  }

  /** Signed exactly like the real thing, so signature handling is exercised. */
  parseWebhook(rawBody: Buffer, headers: Record<string, any>): WebhookEvent {
    const secret = process.env.PSP_WEBHOOK_SECRET || 'sandbox-secret';
    const signature = String(headers['x-tonse-signature'] || headers['x-lenco-signature'] || '');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = JSON.parse(rawBody.toString('utf8'));
    return {
      eventId: body.eventId || body.id,
      type: body.type || 'collection',
      reference: body.reference,
      providerReference: body.providerReference,
      status: body.status,
      raw: body,
    };
  }
}
