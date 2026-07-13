import React, { useEffect, useState } from 'react';
import { FileText, MessageSquare, CheckCircle, Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { loanService } from '../../services/api/loanService';

const zmw = (v: any) =>
  `ZMW ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Lender home — mirrors the LENDING process (requests → offers → accepted
 * loans → portfolio), not the generic marketplace/booking dashboard.
 * Self-contained (loanService), like the other loan views.
 */
export const LoanHomeView: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, o] = await Promise.all([
          loanService.listRequests({ status: 'OPEN' }),
          loanService.listOffers(),
        ]);
        setRequests(r);
        setOffers(o);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const accepted = offers.filter(
    (o) => o.status === 'ACCEPTED' || o.status === 'PAID' || o.status === 'COMPLETED',
  );
  const pending = offers.filter((o) => o.status === 'PENDING').length;
  const portfolio = accepted.reduce((s, o) => s + Number(o.price || 0), 0);

  const balance = (user as any)?.virtualAccountBalance ?? 0;
  const acct = (user as any)?.virtualAccountNumber || (user as any)?.phone || '';

  const tiles = [
    { icon: FileText, label: 'Loan Requests', value: requests.length, sub: 'Applications awaiting review' },
    { icon: MessageSquare, label: 'Offers Made', value: offers.length, sub: `${pending} pending decision` },
    { icon: CheckCircle, label: 'Accepted Loans', value: accepted.length, sub: 'Approved by borrowers' },
    { icon: TrendingUp, label: 'Portfolio Value', value: zmw(portfolio), sub: 'Principal on accepted loans' },
  ];

  return (
    <div className="space-y-6">
      {/* Lending wallet */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-dark p-7 text-white">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#C9973A]">Lending Wallet</p>
        <h2 className="text-4xl font-serif font-black mt-1">{zmw(balance)}</h2>
        <p className="text-white/50 text-sm mt-1">Available capital for disbursement</p>
        {acct && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl border border-[#C9973A]/40 text-[#C9973A] text-sm font-bold">
            <Wallet className="w-4 h-4" /> Lending Account {acct}
          </div>
        )}
      </div>

      {/* Lending stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{loading ? '—' : t.value}</p>
              <p className="text-[11px] text-slate-400 mt-1">{t.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Recent loan requests */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold text-lg text-slate-900">Recent Loan Requests</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9973A] bg-[#fdf8f0] px-2.5 py-1 rounded-full">
            {requests.length} open
          </span>
        </div>
        {requests.length === 0 ? (
          <p className="text-slate-400 text-sm italic py-6 text-center">No open loan requests right now.</p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <div
                key={String(r.id)}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{r.title || 'Loan Request'}</p>
                  <p className="text-xs text-slate-500">
                    {r.buyerName || 'Borrower'}
                    {r.category ? ` · ${r.category}` : ''}
                  </p>
                </div>
                <span className="text-sm font-black text-[#C9973A] shrink-0">{zmw(r.attributes?.loanAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
