import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  Calendar,
  MapPin,
  User,
  Minus,
  Plus,
  Ticket as TicketIcon,
  Check,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import Logo from '../components/Logo';
import { formatCurrency } from '../utils/financeUtils';
import {
  ticketsService,
  PublicTicketEvent,
  PaidTicketOrder,
} from '../services/api/ticketsService';

const OPERATORS = ['Airtel', 'MTN', 'ZAMTEL'] as const;

const prettyDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) +
        ' · ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

type Step = 'details' | 'processing' | 'done';

/**
 * The public ticket page behind a seller's share link (`/e/:code`) —
 * deliberately guest-first: no account, no login, no ProtectedRoute. A
 * visitor picks their tickets, leaves a name and phone/email, "pays" via the
 * simulated mobile-money step, and gets their ticket codes on screen. The
 * seller's venture balance is credited for real on the backend commit.
 */
export default function TicketPurchasePage() {
  const { code } = useParams<{ code: string }>();

  const [event, setEvent] = useState<PublicTicketEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [operator, setOperator] = useState<(typeof OPERATORS)[number]>('MTN');

  const [step, setStep] = useState<Step>('details');
  const [submitError, setSubmitError] = useState('');
  const [order, setOrder] = useState<PaidTicketOrder | null>(null);
  const [copiedCode, setCopiedCode] = useState('');

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    const data = await ticketsService.getPublicEvent(code);
    setEvent(data);
    setNotFound(!data);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const setQty = (tierId: string, next: number, max: number) => {
    setSubmitError('');
    setQuantities((q) => ({ ...q, [tierId]: Math.max(0, Math.min(next, max)) }));
  };

  const selections = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([tierId, quantity]) => ({ tierId, quantity }));

  const totalZmw = (event?.tiers ?? []).reduce(
    (sum, tier) => sum + tier.priceZmw * (quantities[tier.id] ?? 0),
    0,
  );

  const handleBuy = async () => {
    if (!code || !event) return;
    setSubmitError('');
    if (selections.length === 0) {
      setSubmitError('Pick at least one ticket.');
      return;
    }
    if (!buyerName.trim()) {
      setSubmitError('Enter your name — it goes on the ticket.');
      return;
    }
    if (!buyerPhone.trim() && !buyerEmail.trim()) {
      setSubmitError('Enter a phone number or an email so your tickets can be labelled.');
      return;
    }

    setStep('processing');
    try {
      const checkout = await ticketsService.checkoutTickets(code, {
        selections,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
      });
      // Simulated mobile-money approval — the same fake-delay rhythm every
      // other payment in the app uses (the ledger credit behind it is real).
      await new Promise((resolve) => setTimeout(resolve, 1600));
      const paid = await ticketsService.simulateTicketPayment(checkout.reference);
      setOrder(paid);
      setStep('done');
    } catch (e: any) {
      setStep('details');
      setSubmitError(e?.message || 'Payment failed. You have not been charged — please try again.');
      // Stock may have moved (e.g. sold out mid-payment) — refresh what's left.
      load();
    }
  };

  const handleCopyTickets = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedCode(key);
    window.setTimeout(() => setCopiedCode(''), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo className="text-3xl" />
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="font-black text-slate-900">This event isn't available</p>
        <p className="text-[13px] text-slate-400 font-medium max-w-xs">
          The link may be wrong, or the organiser has taken the event off sale.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Slim public header — this page is often the visitor's first contact
          with the platform, so brand it but don't demand anything. */}
      <header className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
        <Logo className="text-2xl" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          Secure ticket checkout
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-0 mt-6 space-y-5">
        {/* ── Event details ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {event.posterUrl && (
            <img src={event.posterUrl} alt="" className="w-full max-h-72 object-cover" />
          )}
          <div className="p-6 space-y-3">
            <h1 className="font-black text-slate-900 text-xl leading-tight">{event.title}</h1>
            <div className="space-y-1.5 text-[13px] text-slate-600 font-medium">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C9973A] shrink-0" /> {prettyDateTime(event.eventDate)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9973A] shrink-0" /> {event.venue}
              </p>
              {event.organizerName && (
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#C9973A] shrink-0" /> Organised by {event.organizerName}
                </p>
              )}
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        </div>

        {/* ── Success ── */}
        {step === 'done' && order ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="font-black text-slate-900">You're going, {order.buyerName.split(' ')[0]}!</h2>
              <p className="text-[12px] text-slate-400 font-medium">
                Paid ZMW {formatCurrency(order.totalAmountZmw)} · ref {order.reference}
              </p>
            </div>

            <div className="space-y-2.5">
              {order.tickets.map((ticket) => (
                <div
                  key={ticket.code}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#ecd9b3] bg-[#fdf6e9] px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TicketIcon className="w-5 h-5 text-[#b07f24] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 tracking-widest text-[15px]">{ticket.code}</p>
                      <p className="text-[11px] text-[#b07f24] font-bold">{ticket.tierName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTickets(ticket.code, ticket.code)}
                    className="shrink-0 p-2 rounded-xl text-[#b07f24] hover:bg-[#ecd9b3] transition-colors"
                    aria-label={`Copy ticket code ${ticket.code}`}
                  >
                    {copiedCode === ticket.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                handleCopyTickets(order.tickets.map((t) => `${t.tierName}: ${t.code}`).join('\n'), 'all')
              }
              className="w-full py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {copiedCode === 'all' ? 'Copied all codes' : 'Copy all codes'}
            </button>
            <p className="text-[11px] text-slate-400 font-medium text-center leading-relaxed">
              Screenshot or copy these codes — you'll show them at the door. They were sold to{' '}
              <span className="font-bold text-slate-500">{order.buyerName}</span>.
            </p>
          </div>
        ) : step === 'processing' ? (
          /* ── Fake mobile-money processing ── */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
            <p className="font-black text-slate-900">Processing {operator} payment…</p>
            <p className="text-[12px] text-slate-400 font-medium max-w-xs">
              Approve the prompt on your phone. Don't close this page.
            </p>
          </div>
        ) : (
          /* ── Ticket picker + buyer details + pay ── */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="font-black text-slate-900">Get your tickets</h2>

            <div className="space-y-2.5">
              {event.tiers.map((tier) => {
                const qty = quantities[tier.id] ?? 0;
                return (
                  <div
                    key={tier.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 ${
                      tier.soldOut ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-slate-900 truncate">{tier.name}</p>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        ZMW {formatCurrency(tier.priceZmw)}
                        {tier.soldOut ? (
                          <span className="text-rose-500 font-bold"> · Sold out</span>
                        ) : (
                          tier.remainingQuantity <= 10 && (
                            <span className="text-amber-500 font-bold"> · Only {tier.remainingQuantity} left</span>
                          )
                        )}
                      </p>
                    </div>
                    {!tier.soldOut && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(tier.id, qty - 1, tier.remainingQuantity)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50"
                          aria-label={`Fewer ${tier.name} tickets`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-black text-slate-900 text-[14px]">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(tier.id, qty + 1, tier.remainingQuantity)}
                          disabled={qty >= tier.remainingQuantity}
                          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50"
                          aria-label={`More ${tier.name} tickets`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Buyer details */}
            <div className="space-y-3">
              <input
                value={buyerName}
                onChange={(e) => { setBuyerName(e.target.value); setSubmitError(''); }}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={buyerPhone}
                  onChange={(e) => { setBuyerPhone(e.target.value); setSubmitError(''); }}
                  inputMode="tel"
                  placeholder="Phone number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                />
                <input
                  value={buyerEmail}
                  onChange={(e) => { setBuyerEmail(e.target.value); setSubmitError(''); }}
                  inputMode="email"
                  placeholder="Email (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                />
              </div>
            </div>

            {/* Mobile-money operator */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Pay with mobile money
              </p>
              <div className="grid grid-cols-3 gap-2">
                {OPERATORS.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-colors ${
                      operator === op ? 'border-[#d49b35] bg-[#fdf6e9]' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] ${
                        op === 'Airtel' ? 'bg-red-600' : op === 'MTN' ? 'bg-yellow-500' : 'bg-emerald-600'
                      }`}
                    >
                      {op[0]}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{op}</span>
                  </button>
                ))}
              </div>
            </div>

            {submitError && (
              <p className="text-[12px] font-semibold text-rose-500">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleBuy}
              disabled={selections.length === 0}
              className="w-full py-4 rounded-2xl bg-[#1B3068] text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#142450] transition-colors"
            >
              <TicketIcon className="w-4 h-4" />
              {totalZmw > 0 ? `Pay ZMW ${formatCurrency(totalZmw)}` : 'Pick your tickets'}
            </button>
            <p className="text-[11px] text-slate-400 font-medium text-center">
              No account needed — your ticket codes appear right here after payment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
