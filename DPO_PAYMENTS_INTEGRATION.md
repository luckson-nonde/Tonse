# DPO Payments Integration

Reference for the DPO (Direct Pay Online) integration in the Nyuwe platform.
Replaces the previous Lenco integration; the `PaymentProvider` interface it
plugs into is unchanged.

## Shape of the thing

DPO is a **hosted-page** provider. We never see card or wallet details:

1. Server calls `createToken` → gets a `TransToken`.
2. Payer is redirected to DPO's page (`payv3.php?ID=<TransToken>`) and pays
   there by card or mobile money.
3. DPO returns the payer to `DPO_REDIRECT_URL` (or `DPO_BACK_URL` if they back
   out), and *may* also POST a Payment Notification to our webhook.
4. Server calls `verifyToken` and only then posts to the ledger.

That third step is why there are **two** settlement triggers, not one — see
"Two triggers" below.

## Configuration

Backend only. The company token must never appear in a frontend bundle, a
commit, or a log line.

| Variable | Notes |
| --- | --- |
| `PAYMENT_PROVIDER` | `sandbox` (default) or `dpo` |
| `DPO_COMPANY_TOKEN` | Merchant credential. Treat as a password. Test vs live account is decided by *which token you set* — the host is the same. |
| `DPO_DEFAULT_SERVICE_TYPE` | Numeric service id from the DPO portal. Not secret, but `createToken` fails without it. |
| `DPO_REDIRECT_URL` | Frontend `/payment/return` |
| `DPO_BACK_URL` | Frontend `/payment/return?cancelled=1` |
| `DPO_PAYMENT_PAGE_URL` | Hosted page, default `payv3.php` |
| `DPO_PTL_HOURS` | How long a created token stays payable — sent with `PTLtype=hours` (our default 24; DPO's own default is 96) |
| `DPO_NOTIFICATION_SECRET` | Optional shared secret on the notification URL |
| `DPO_ESTIMATED_FEE_PERCENT` | Display/memo only (default 3.5) |

In the DPO portal, set the **Payment Notification URL** to:

```
https://<api-host>/webhooks/psp?secret=<DPO_NOTIFICATION_SECRET>
```

## API calls used

Single XML endpoint, `POST https://secure.3gdirectpay.com/API/v6/`.

| Request | Used for | Key response fields |
| --- | --- | --- |
| `createToken` | Start a collection | `Result`, `TransToken`, `TransRef` |
| `verifyToken` | Authoritative status | `Result`, `TransactionAmount`, `TransactionNetAmount`, `TransactionApproval`, `FraudAlert` |
| `refundToken` | Refund against the original token | `Result` |

`verifyToken` accepts **either** `TransactionToken` **or** `CompanyRef`. We
prefer the token and fall back to `CompanyRef`, which is unambiguous only
because `createToken` sends `CompanyRefUnique=1` — if that flag is ever removed,
remove the fallback with it.

## Sandbox

DPO's published test credentials (same host as live):

- Company token `B3F59BE7-0756-420E-BB88-1D98E7A6B040`
- Service types: `54841` (product), `85325` (service)
- Test cards: Visa `4012 8888 8888 1881`, Mastercard `5436 8862 6984 8367`,
  any future expiry, CVV `123`

Useful for a real end-to-end run before your own token arrives. Note this still
makes live HTTP calls to DPO — it is not the same as `PAYMENT_PROVIDER=sandbox`,
which makes none.

Result-code handling in `dpo.provider.ts`, from DPO's published verifyToken
table:

| Code | DPO's meaning | We treat it as |
| --- | --- | --- |
| `000` | Transaction Paid | **successful** |
| `001` | Authorized | pending (authorised ≠ captured) |
| `002` | Transaction overpaid/underpaid | pending + warning; never auto-settles |
| `003` | Pending Bank | pending |
| `005` | Queued Authorization | pending |
| `007` | Pending Split Payment | pending |
| `900` | Transaction not paid yet | pending |
| `901` | Transaction declined | **failed** |
| `902` | Data mismatch in one of the fields | **503** — see below |
| `903` | Passed the Payment Time Limit | **failed** (terminal) |
| `904` | Transaction cancelled | **failed** |
| `801`/`802`/`803`/`804`/`950` | Missing token / bad token / bad request type / XML error / missing mandatory fields | **503** |
| anything else | undocumented | pending + warning |

Two of these are deliberate and easy to get wrong:

- **`902` is not a payment failure.** "Data mismatch in one of the fields" means
  *our request* was wrong; it says nothing about whether the payer paid. Marking
  it `failed` could kill a genuinely paid transaction, so it raises 503 instead.
- **`903` is terminal.** The token expired and can never be paid, so it must be
  `failed` — leaving it pending would strand the checkout forever.

Pending never moves money, so an undocumented code can only delay a payment — it
can never mint escrow.

## The callback (`pushPayments`)

DPO pushes an `<API3G>` XML document to the Payment Notification URL after a
successful payment. Two properties of it drive the design:

**1. It does not contain `CompanyRef`.** The pushed payload identifies the
transaction by `TransactionToken` and DPO's own `TransactionRef` only. So
`parseWebhook` returns no `reference`, and `CheckoutService` resolves ours by
looking the token up in `psp_transactions.providerReference` (indexed). Any code
that requires a `CompanyRef` on the callback will reject every genuine
notification.

**2. It must be acknowledged with an exact document**, or DPO re-pushes:

```xml
<?xml version="1.0" encoding="utf-8"?>
<API3G><Response>OK</Response></API3G>
```

`WebhookController.receive` returns exactly that, with
`Content-Type: application/xml`, whatever the settlement outcome — the
notification *was* received; whether it settled is our business, not a delivery
failure worth retrying.

## Security model — read this before changing anything

**DPO does not sign its callbacks.** There is no HMAC, signature or shared
secret in the product; the notification proves nothing about who sent it. This
is confirmed by DPO's own documentation, not assumed.

What keeps this safe is that the notification is treated as a *hint*, never as
evidence:

- `CheckoutService.verifyAndSettle` calls `verifyToken` on every event and
  journals only what DPO itself confirms. A forged "paid" notification for a
  real token is simply contradicted and dropped.
- The token used for verification is read from **our own** `psp_transactions`
  row, not from the callback body.
- An unknown token is ignored, so the endpoint cannot be used to enumerate or
  touch transactions we never created.
- `DPO_NOTIFICATION_SECRET` is a spam gate on the endpoint, nothing more. Do not
  start trusting the payload because the secret matched.

**Amount is verified, not accepted.** `verifyAndSettle` refuses to settle when
DPO's `TransactionAmount` differs from the amount we recorded at checkout: it
logs, stamps `lastError`, and holds the transaction for review. Without that, a
short payment would fund escrow for less than the deal price and still mark the
quote PAID. The amount is also never taken from the client or the callback.

**DPO expects verification.** Their docs state that failing to verify a token
within 30 minutes of payment raises an alert email to the merchant — which is
the other reason the payer's return trip triggers verification rather than
waiting on the callback alone.

## Two triggers, one settlement path

A hosted-page provider's notification is best-effort and is not ordered against
the payer landing back on the site. So settlement can be triggered by:

1. `POST /webhooks/psp` — DPO's notification, or
2. `POST /payments/checkout/:reference/verify` — the payer's return trip,
   called by `PaymentReturnPage`.

Both funnel into `verifyAndSettle`. Racing is safe because every funding step is
idempotent: `fundEscrow`, `fundVentureDeposit` and `fundAdPurchase` all bail on
an already-`SUCCESSFUL` transaction under `SELECT … FOR UPDATE`, and the ledger
journal's `idempotencyKey` no-ops a replay.

## Fee model

DPO charges the payer exactly the amount requested and deducts its own fee at
settlement. There is no per-transaction fee to pass on, so the adapter always
reports `bearer: 'merchant'` and **ignores `PSP_FEE_BEARER`** (which now only
affects the sandbox). `quoteFees` returns an estimate for display and for the
ledger memo; the real fee is derived from `TransactionAmount −
TransactionNetAmount` at verification time.

## Payouts

Not supported. DPO settles collected funds to the merchant bank account on its
own cycle; there is no merchant-initiated payout API. `payout()` throws rather
than returning a `pending` that would never resolve. Seller withdrawals remain
an off-platform step.

## Local development

Leave `PAYMENT_PROVIDER=sandbox`. The sandbox adapter models a push-to-handset
PSP, returns **no** `redirectUrl`, and keeps the in-app "simulate approval"
button working. Deterministic hooks (amount-driven):

- amount ending `.13` → collection fails
- amount ending `.99` → stays pending
- anything else → pay-offline, then successful once confirmed

Because the sandbox returns no redirect, every call site must handle both cases
— redirect when there is one, in-app pending UI when there isn't. See
`beginHostedPayment` in `src/services/api/paymentsService.ts`.

## Files

| File | Role |
| --- | --- |
| `backend/src/config/psp.config.ts` | All PSP configuration |
| `backend/src/modules/payments/providers/dpo.provider.ts` | The adapter |
| `backend/src/modules/payments/providers/sandbox.provider.ts` | Dev/test adapter |
| `backend/src/modules/payments/checkout.service.ts` | Collections, verification, ledger posting |
| `src/services/api/paymentsService.ts` | Frontend hand-off + return verification |
| `src/pages/PaymentReturnPage.tsx` | Where the payer lands after DPO |
