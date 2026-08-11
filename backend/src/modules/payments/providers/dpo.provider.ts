import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * Live DPO (Direct Pay Online) adapter — SERVER SIDE ONLY.
 *
 * DPO is primarily a HOSTED-PAGE provider, which differs from a push-to-handset
 * PSP in three ways the rest of the system has to respect:
 *
 *   1. `initiateCollection` does not charge anyone. It calls `createToken` and
 *      returns a `redirectUrl` — the payer must be sent to DPO's page to pay by
 *      card or mobile money. A collection with no redirect is a dead end.
 *      EXCEPTION: for mobile money with a phone number supplied, this adapter
 *      first attempts DPO's in-app path (`ChargeTokenMobile` — a push to the
 *      payer's handset, approved in our own UI with no redirect). If the
 *      operator isn't enabled on this DPO account, or DPO demands a redirect
 *      (RedirectOption=1), it falls back to the hosted page — the fancier path
 *      must never be the reason a payment can't start. Cards ALWAYS use the
 *      hosted page: collecting card numbers ourselves would put us in PCI scope.
 *   2. There is no signed webhook. DPO's "Payment Notification" carries no HMAC,
 *      so `parseWebhook` CANNOT authenticate it the way a signature would. The
 *      real authentication is `verifyCollection` → DPO's `verifyToken`, which
 *      CheckoutService already calls before every journal. The optional shared
 *      secret checked below only keeps strangers from spamming the endpoint.
 *   3. DPO charges the payer exactly the amount we ask for and deducts its own
 *      fee at settlement. There is no fee to pass on to the customer, so this
 *      adapter always reports `bearer: 'merchant'` regardless of PSP_FEE_BEARER
 *      (grossing the payer up would over-fund escrow relative to what settles).
 *
 * The API is XML over POST to a single endpoint. Requests are small and flat,
 * so they are built and read with string helpers rather than pulling in an XML
 * dependency for four message shapes.
 */
@Injectable()
export class DpoPaymentProvider implements PaymentProvider {
  readonly name = 'dpo';
  private readonly logger = new Logger(DpoPaymentProvider.name);

  /**
   * Result codes, per DPO's published verifyToken table. Anything not listed
   * falls through to 'pending', which never moves money.
   */
  /** The money is in. */
  private static readonly PAID = new Set(['000']);
  /**
   * Terminal — the payer will not complete this transaction.
   * 901 declined · 903 passed the Payment Time Limit · 904 cancelled.
   */
  private static readonly DEAD = new Set(['901', '903', '904']);
  /**
   * OUR request was wrong. Never a payment status — these say nothing about
   * whether the payer paid, so treating them as "failed" could mark a genuinely
   * paid transaction dead. They raise 503 instead.
   * 801 missing company token · 802 token doesn't exist · 803 bad request type
   * · 804 error in XML · 902 data mismatch in one of the fields · 950 missing
   * transaction-level mandatory fields.
   */
  private static readonly REQUEST_ERROR = new Set(['801', '802', '803', '804', '902', '950']);
  /**
   * Explicitly known non-final states, listed so their meaning is on the record:
   * 001 authorised (not captured) · 002 over/underpaid · 003 pending bank
   * · 005 queued authorization · 007 pending split payment · 900 not paid yet.
   */
  private static readonly PENDING = new Set(['001', '002', '003', '005', '007', '900']);

  constructor(private readonly config: ConfigService) {
    if (this.config.get<string>('psp.feeBearer') === 'customer') {
      this.logger.warn(
        'PSP_FEE_BEARER=customer is ignored by DPO — DPO deducts its fee at ' +
          'settlement, so the payer is charged the deal amount exactly.',
      );
    }
  }

  private get baseUrl(): string {
    return this.config.get<string>('psp.dpo.baseUrl');
  }

  private get companyToken(): string {
    const token = this.config.get<string>('psp.dpo.companyToken');
    if (!token) {
      // Fail loudly rather than silently falling back — a payment provider with
      // no credential must never look like a working one.
      throw new ServiceUnavailableException(
        'Payment provider is not configured (DPO_COMPANY_TOKEN missing).',
      );
    }
    return token;
  }

  private get serviceType(): string {
    const type = this.config.get<string>('psp.dpo.defaultServiceType');
    if (!type) {
      throw new ServiceUnavailableException(
        'Payment provider is not configured (DPO_DEFAULT_SERVICE_TYPE missing).',
      );
    }
    return type;
  }

  // ── XML plumbing ────────────────────────────────────────────────────────

  private esc(value: string | number | undefined | null): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** First occurrence of a top-level-ish tag. DPO responses are flat. */
  private read(xml: string, tag: string): string | undefined {
    const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
    const value = m?.[1]?.trim();
    return value ? value : undefined;
  }

  /**
   * POST an `<API3G>` document and return the raw XML.
   *
   * The company token is injected here so no caller has to handle it, and it is
   * never logged — an error log carrying the merchant credential would leak it
   * into every log sink downstream.
   */
  private async call(request: string, inner: string): Promise<string> {
    const body =
      `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<API3G>` +
      `<CompanyToken>${this.esc(this.companyToken)}</CompanyToken>` +
      `<Request>${request}</Request>` +
      inner +
      `</API3G>`;

    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body,
      });
    } catch (e) {
      throw new ServiceUnavailableException(
        `Could not reach the payment provider: ${(e as Error).message}`,
      );
    }

    const xml = await res.text();
    if (!res.ok) {
      this.logger.error(`DPO ${request} HTTP ${res.status}: ${xml.slice(0, 500)}`);
      throw new BadRequestException(`Payment provider request failed (${res.status})`);
    }
    return xml;
  }

  /** Throw on a result code that means OUR REQUEST was wrong, not that the
   *  payment failed — those must surface as 5xx, not as "payment declined". */
  private assertNotRequestError(request: string, result: string, explanation?: string): void {
    if (DpoPaymentProvider.REQUEST_ERROR.has(result)) {
      this.logger.error(`DPO ${request} rejected (${result}): ${explanation ?? ''}`);
      throw new ServiceUnavailableException(
        `Payment provider rejected the request (${result}). Check the DPO configuration.`,
      );
    }
  }

  private mapStatus(result: string, reference?: string): CollectionStatus {
    if (DpoPaymentProvider.PAID.has(result)) return 'successful';
    if (DpoPaymentProvider.DEAD.has(result)) return 'failed';
    if (result === '002') {
      // Over/underpaid. Never auto-settles — the amounts wouldn't reconcile and
      // funding escrow with the wrong figure is worse than a delay.
      this.logger.warn(`DPO reports ${reference ?? 'transaction'} over/underpaid (002) — needs manual review`);
    } else if (!DpoPaymentProvider.PENDING.has(result)) {
      this.logger.warn(`DPO returned undocumented result code ${result} for ${reference ?? 'transaction'} — treating as pending`);
    }
    // Pending never moves money, so an unknown code can only delay a payment —
    // it can never mint escrow.
    return 'pending';
  }

  /** `YYYY/MM/DD HH:MM` — the format DPO's ServiceDate expects. */
  private serviceDate(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // ── PaymentProvider ─────────────────────────────────────────────────────

  /**
   * DPO takes its cut at settlement rather than quoting per transaction, so the
   * fee here is an ESTIMATE for display and for the ledger memo. The payer is
   * charged the deal amount exactly (`totalCharged === amount`) and the whole
   * amount is what we expect to land, so escrow is funded with the real figure.
   */
  async quoteFees(input: { amount: string; channel: Channel; bearer: FeeBearer }): Promise<FeeQuote> {
    const amountNgwee = toNgwee(input.amount);
    const percent = this.config.get<number>('psp.dpo.estimatedFeePercent') ?? 3.5;
    const estimated = Math.max(Math.round((amountNgwee * percent) / 100), 0);
    return {
      amount: fromNgwee(amountNgwee),
      fee: fromNgwee(estimated),
      totalCharged: fromNgwee(amountNgwee),
      // Not `input.bearer` — see the class doc. DPO cannot charge the fee on.
      bearer: 'merchant',
      currency: 'ZMW',
    };
  }

  /**
   * `createToken` — reserves the transaction and returns the hosted page to send
   * the payer to. Nothing is charged here; `status` is deliberately 'pending'
   * even on success, because success means "token created", not "money paid".
   *
   * `CompanyRefUnique` makes DPO itself reject a duplicate of our reference, so
   * a retried checkout can never open two payable transactions for one deal.
   */
  async initiateCollection(input: InitiateCollectionInput): Promise<CollectionResult> {
    const redirectUrl = this.config.get<string>('psp.dpo.redirectUrl');
    const backUrl = this.config.get<string>('psp.dpo.backUrl');
    const ptl = this.config.get<number>('psp.dpo.ptlHours') ?? 24;

    const xml = await this.call(
      'createToken',
      `<Transaction>` +
        `<PaymentAmount>${this.esc(input.amount)}</PaymentAmount>` +
        `<PaymentCurrency>${this.esc(input.currency)}</PaymentCurrency>` +
        `<CompanyRef>${this.esc(input.reference)}</CompanyRef>` +
        `<CompanyRefUnique>1</CompanyRefUnique>` +
        // PTLtype is stated explicitly: DPO's default unit is hours, but
        // leaving it implicit makes a 24 that silently became minutes a
        // one-character bug in a config file nobody reads.
        `<PTL>${this.esc(ptl)}</PTL>` +
        `<PTLtype>hours</PTLtype>` +
        (redirectUrl ? `<RedirectURL>${this.esc(redirectUrl)}</RedirectURL>` : '') +
        (backUrl ? `<BackURL>${this.esc(backUrl)}</BackURL>` : '') +
        (input.email ? `<customerEmail>${this.esc(input.email)}</customerEmail>` : '') +
        (input.phone ? `<customerPhone>${this.esc(input.phone)}</customerPhone>` : '') +
        (input.name ? `<customerFirstName>${this.esc(input.name)}</customerFirstName>` : '') +
        // Preselects the tab on DPO's page; the payer can still switch.
        `<DefaultPayment>${input.channel === 'card' ? 'CC' : 'MO'}</DefaultPayment>` +
        `</Transaction>` +
        `<Services>` +
        `<Service>` +
        `<ServiceType>${this.esc(this.serviceType)}</ServiceType>` +
        `<ServiceDescription>${this.esc(input.description || 'Nyuwe payment')}</ServiceDescription>` +
        `<ServiceDate>${this.serviceDate()}</ServiceDate>` +
        `</Service>` +
        `</Services>`,
    );

    const result = this.read(xml, 'Result') ?? '';
    const explanation = this.read(xml, 'ResultExplanation');
    this.assertNotRequestError('createToken', result, explanation);

    const transToken = this.read(xml, 'TransToken');
    if (result !== '000' || !transToken) {
      this.logger.error(`DPO createToken failed (${result}): ${explanation ?? ''}`);
      throw new BadRequestException(
        explanation || `Could not start the payment (${result || 'no result code'})`,
      );
    }

    // In-app mobile money first: push the charge to the payer's handset so
    // they approve inside OUR payment sheet, no redirect. Any miss — operator
    // not on this DPO account, DPO insisting on a redirect, a request error —
    // falls through to the hosted page below.
    if (input.channel === 'mobile-money' && input.phone) {
      try {
        const push = await this.chargeTokenMobile(transToken, input);
        if (push) {
          return {
            reference: input.reference,
            providerReference: transToken,
            // 'pay-offline' is exactly what this is: the payer approves
            // out-of-band on their handset, and we learn the outcome from
            // verifyToken (polled) or the payment notification.
            status: 'pay-offline',
            amount: input.amount,
            currency: input.currency,
            instruction: push.instruction,
            raw: {
              result,
              resultExplanation: explanation,
              transToken,
              transRef: this.read(xml, 'TransRef'),
              mno: push.mno,
              chargeStatusCode: push.statusCode,
            },
          };
        }
      } catch (e) {
        this.logger.warn(
          `In-app mobile push unavailable for ${input.reference}: ${(e as Error).message} — using the hosted page`,
        );
      }
    }

    const pageUrl = this.config.get<string>('psp.dpo.paymentPageUrl');
    return {
      reference: input.reference,
      // The TransToken IS the handle for verify/refund — persisted as
      // psp_transactions.providerReference and required by verifyCollection.
      providerReference: transToken,
      status: 'pending',
      amount: input.amount,
      currency: input.currency,
      redirectUrl: `${pageUrl}?ID=${encodeURIComponent(transToken)}`,
      instruction: 'Complete your payment on the secure DPO page.',
      raw: {
        result,
        resultExplanation: explanation,
        transToken,
        transRef: this.read(xml, 'TransRef'),
      },
    };
  }

  /** Payer-facing text arrives with XML/HTML entities (DPO even omits the
   *  trailing `;` — "Shortly&#8218 you will…"), so decode before display. */
  private decodeEntities(text: string): string {
    return text
      .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /** Local Zambian MSISDN → the international digits-only form DPO expects
   *  (097… → 26097…, +260… → 260…). */
  private normalizeMsisdn(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('260')) return digits;
    if (digits.startsWith('0')) return `260${digits.slice(1)}`;
    return `260${digits}`;
  }

  /**
   * Attempt DPO's in-app mobile-money push for a fresh TransactionToken.
   *
   * Returns null (→ hosted-page fallback) rather than throwing whenever the
   * path simply isn't available: no Zambian mobile option on this account, no
   * option matching the payer's chosen network, DPO answering anything but
   * "invoice created", or DPO demanding a redirect. Request errors from the
   * underlying calls still throw and are caught by the caller.
   *
   * The MNO identifier is DISCOVERED per transaction via
   * `GetMobilePaymentOptions` instead of hardcoding DPO's spelling of each
   * network — their catalogue names ('MTNZambia', 'AirtelZM', …) are account
   * configuration, not stable API constants.
   */
  private async chargeTokenMobile(
    transToken: string,
    input: InitiateCollectionInput,
  ): Promise<{ instruction: string; mno: string; statusCode: string } | null> {
    const optionsXml = await this.call(
      'GetMobilePaymentOptions',
      `<TransactionToken>${this.esc(transToken)}</TransactionToken>`,
    );

    const options = [...optionsXml.matchAll(/<mobileoption>([\s\S]*?)<\/mobileoption>/gi)]
      .map((m) => ({
        paymentname: this.read(m[1], 'paymentname'),
        country: this.read(m[1], 'country'),
        instructions: this.read(m[1], 'instructions'),
      }))
      .filter(
        (o): o is { paymentname: string; country: string | undefined; instructions: string | undefined } =>
          Boolean(o.paymentname),
      );

    const zambian = options.filter((o) => (o.country ?? '').toLowerCase().includes('zambia'));
    const wanted = (input.operator ?? '').trim().toLowerCase();
    const match =
      (wanted && zambian.find((o) => o.paymentname.toLowerCase().includes(wanted))) ||
      (zambian.length === 1 ? zambian[0] : undefined);
    if (!match) {
      this.logger.warn(
        `No Zambian mobile option matching "${input.operator ?? '(none)'}" on this DPO account ` +
          `(available: ${options.map((o) => o.paymentname).join(', ') || 'none'})`,
      );
      return null;
    }

    const xml = await this.call(
      'ChargeTokenMobile',
      `<TransactionToken>${this.esc(transToken)}</TransactionToken>` +
        `<PhoneNumber>${this.esc(this.normalizeMsisdn(input.phone!))}</PhoneNumber>` +
        `<MNO>${this.esc(match.paymentname)}</MNO>` +
        `<MNOcountry>${this.esc(match.country ?? 'zambia')}</MNOcountry>`,
    );

    // Per DPO's spec: 130 = "New invoice" (charge request accepted, prompt on
    // its way to the handset). RedirectOption is deliberately IGNORED: the
    // Zambian MNOs return RedirectOption=1 with no RedirectUrl anywhere in the
    // v6 response and instructions that explicitly describe a handset push —
    // verified against the live API — so gating on it would permanently
    // disable the in-app path for exactly the networks it exists for.
    const statusCode = this.read(xml, 'StatusCode') ?? '';
    if (statusCode !== '130' && statusCode !== '000') {
      this.logger.warn(
        `ChargeTokenMobile declined the in-app path (StatusCode ${statusCode || '?'}): ` +
          `${this.read(xml, 'ResultExplanation') ?? ''}`,
      );
      return null;
    }

    const instruction = this.decodeEntities(
      this.read(xml, 'instructions') ??
        match.instructions ??
        'Approve the payment prompt on your phone to complete this payment.',
    );
    return { instruction, mno: match.paymentname, statusCode };
  }

  /**
   * `verifyToken` — the authoritative answer, and the ONLY thing that authorises
   * a funding journal. Takes DPO's transaction token, not our reference, so the
   * caller passes the `providerReference` stored at createToken time.
   */
  async verifyCollection(reference: string, providerReference?: string): Promise<CollectionResult> {
    // Prefer the token. Falling back to CompanyRef is safe ONLY because
    // createToken sets CompanyRefUnique=1, so our reference identifies exactly
    // one transaction at DPO; without that guarantee this could verify the
    // wrong payment.
    const xml = await this.call(
      'verifyToken',
      providerReference
        ? `<TransactionToken>${this.esc(providerReference)}</TransactionToken>`
        : `<CompanyRef>${this.esc(reference)}</CompanyRef>`,
    );

    const result = this.read(xml, 'Result') ?? '';
    const explanation = this.read(xml, 'ResultExplanation');
    this.assertNotRequestError('verifyToken', result, explanation);

    const status = this.mapStatus(result, reference);
    const amount = this.read(xml, 'TransactionAmount');
    const netAmount = this.read(xml, 'TransactionNetAmount');
    const currency = this.read(xml, 'TransactionCurrency') || 'ZMW';

    if (status === 'successful' && !amount) {
      // A "paid" verdict with no amount cannot be journalled. Treat the
      // response as unusable rather than funding escrow with a guess.
      throw new ServiceUnavailableException(
        `DPO reported ${reference} paid but returned no TransactionAmount`,
      );
    }

    // DPO's fee is the gap between what the payer paid and what settles to us.
    let fee: string | undefined;
    if (amount && netAmount) {
      const gap = toNgwee(amount) - toNgwee(netAmount);
      if (gap > 0) fee = fromNgwee(gap);
    }

    const fraud = this.read(xml, 'FraudAlert');
    if (fraud && fraud !== '0') {
      this.logger.warn(
        `DPO flagged ${reference} (FraudAlert ${fraud}): ${this.read(xml, 'FraudExplnation') ?? ''}`,
      );
    }

    return {
      reference,
      providerReference,
      status,
      amount: amount ?? '0',
      fee,
      currency,
      raw: {
        result,
        resultExplanation: explanation,
        transactionApproval: this.read(xml, 'TransactionApproval'),
        transactionNetAmount: netAmount,
        transactionSettlementDate: this.read(xml, 'TransactionSettlementDate'),
        customerName: this.read(xml, 'CustomerName'),
        customerPhone: this.read(xml, 'CustomerPhone'),
        fraudAlert: fraud,
      },
    };
  }

  /** `refundToken` — refunds against the ORIGINAL transaction token. */
  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.originalProviderReference) {
      throw new BadRequestException(
        'A DPO refund needs the original transaction token to refund against',
      );
    }

    const xml = await this.call(
      'refundToken',
      `<TransactionToken>${this.esc(input.originalProviderReference)}</TransactionToken>` +
        `<refundAmount>${this.esc(input.amount)}</refundAmount>` +
        `<refundDetails>${this.esc(input.reason || 'Refund')}</refundDetails>`,
    );

    const result = this.read(xml, 'Result') ?? '';
    const explanation = this.read(xml, 'ResultExplanation');
    this.assertNotRequestError('refundToken', result, explanation);

    return {
      reference: input.reference,
      providerReference: input.originalProviderReference,
      status: result === '000' ? 'successful' : DpoPaymentProvider.DEAD.has(result) ? 'failed' : 'pending',
      amount: input.amount,
      currency: input.currency,
      raw: { result, resultExplanation: explanation },
    };
  }

  /**
   * DPO has no merchant-initiated payout API — collected funds settle to the
   * merchant's bank account on DPO's own cycle, and paying a seller out is a
   * bank instruction, not an API call. Failing loudly is the honest answer;
   * silently returning 'pending' would leave a payout that never happens
   * looking like one in flight.
   */
  async payout(_input: PayoutInput): Promise<PayoutResult> {
    throw new ServiceUnavailableException(
      'DPO does not support API payouts — seller withdrawals settle off-platform.',
    );
  }

  /**
   * Parse a DPO Payment Notification (their `pushPayments` callback).
   *
   * IMPORTANT: the pushed payload identifies the transaction by
   * `TransactionToken` and DPO's own `TransactionRef` — it does NOT echo our
   * `CompanyRef`. So this returns no `reference`, and the caller resolves our
   * transaction by looking the token up in `psp_transactions.providerReference`.
   * Requiring a CompanyRef here would reject every genuine notification.
   *
   * UNLIKE a signed webhook, this CANNOT prove the sender is DPO: the product
   * has no callback signature. Two things keep that safe:
   *
   *   • the optional shared secret on the notification URL, checked here, which
   *     stops casual spam of the endpoint; and
   *   • CheckoutService re-verifying every event with `verifyToken` before it
   *     posts anything, so a forged "paid" notification for a real token is
   *     simply contradicted by DPO and dropped.
   *
   * A notification is therefore a HINT that something changed, never evidence.
   */
  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, any>,
    query?: Record<string, any>,
  ): WebhookEvent {
    const expected = this.config.get<string>('psp.dpo.notificationSecret');
    if (expected) {
      const supplied = String(query?.secret ?? headers['x-dpo-notification-secret'] ?? '');
      if (supplied !== expected) {
        throw new BadRequestException('Invalid notification secret');
      }
    }

    const body = this.parseNotificationBody(rawBody.toString('utf8'));

    const token = body.TransactionToken || body.TransToken;
    // Not documented as part of the push, but accepted if a portal setting or a
    // future version starts including it — it saves a lookup when present.
    const companyRef = body.CompanyRef;
    const result = body.Result;

    if (!token && !companyRef) {
      throw new BadRequestException('Notification identified no transaction');
    }

    return {
      // DPO sends no event id. Keying on the transaction + result means a retry
      // of the same notification is deduplicated, while a genuine later change
      // (unpaid → paid) still gets through as a distinct event.
      eventId: `dpo:${companyRef ?? token}:${result ?? 'notify'}`,
      type: 'collection',
      reference: companyRef ? String(companyRef) : undefined,
      providerReference: token ? String(token) : undefined,
      status: result ? String(result) : undefined,
      raw: body,
    };
  }

  /** DPO posts XML, form-encoded, or JSON depending on portal settings. */
  private parseNotificationBody(text: string): Record<string, any> {
    const trimmed = text.trim();
    if (!trimmed) return {};

    if (trimmed.startsWith('<')) {
      const out: Record<string, any> = {};
      for (const [, tag, value] of trimmed.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g)) {
        out[tag] = value.trim();
      }
      return out;
    }
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new BadRequestException('Notification body is not valid JSON');
      }
    }
    return Object.fromEntries(new URLSearchParams(trimmed));
  }
}
