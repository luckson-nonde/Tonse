/**
 * Shared dashboard primitives — extracted from AdminDashboard.tsx so the
 * promoter dashboard (and future consoles) reuse the exact same tiles,
 * funnel bars and switches instead of copy-pasting styled JSX.
 *
 * StatTile / Switch are verbatim moves. FunnelCard's stage list was
 * generalized into FunnelStagesCard (any labels/values); the original
 * admin-stats-shaped FunnelCard remains as a thin wrapper so its call
 * site didn't change.
 */
import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  onClick,
  badge,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'gold' | 'navy' | 'amber';
  /** When set, the tile becomes a button that jumps elsewhere. */
  onClick?: () => void;
  /** Optional attention badge (e.g. a pending count) shown top-right. */
  badge?: string | number;
}) {
  const toneClasses =
    tone === 'gold'
      ? 'bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
      : tone === 'navy'
        ? 'bg-[#0f1023] text-[#C9973A]'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-500'
          : 'bg-slate-50 text-slate-400';

  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`relative text-left w-full bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] ${
        onClick
          ? 'transition-all hover:border-[#C9973A]/40 hover:shadow-[0_10px_26px_-14px_rgba(201,151,58,0.5)] cursor-pointer group'
          : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge != null && Number(badge) > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-black">
            {badge}
          </span>
        )}
        {onClick && badge == null && (
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#C9973A] transition-colors" />
        )}
      </div>
      <p className="font-serif text-[28px] sm:text-[32px] font-black text-[#1a1a2e] leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
        {label}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-slate-400 font-medium">{hint}</p>}
    </Tag>
  );
}

export interface FunnelStage {
  label: string;
  value: number;
  /** Conversion-rate badge (e.g. "62%"); null/undefined hides the badge. */
  conv?: string | null;
}

export function FunnelStagesCard({
  title = 'Conversion funnel',
  stages,
}: {
  title?: string;
  stages: FunnelStage[];
}) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const pct = (n: number) => `${Math.round((n / max) * 100)}%`;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#fdf6e9]/60 text-[#C9973A] flex items-center justify-center">
          <TrendingUp className="w-4 h-4" />
        </div>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
          {title}
        </h3>
      </div>
      <ul className="space-y-4">
        {stages.map((s) => (
          <li key={s.label}>
            <div className="flex items-center justify-between text-[12px] font-bold mb-1.5">
              <span className="text-[#1a1a2e]/75">{s.label}</span>
              <span className="flex items-center gap-2">
                {s.conv && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {s.conv}
                  </span>
                )}
                <span className="text-[#C9973A]">{s.value}</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9973A] to-[#e0b45f]"
                style={{ width: pct(s.value) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Admin-stats-shaped wrapper — preserves the original FunnelCard API. */
export function FunnelCard({
  funnel,
}: {
  funnel?: { inquiries: number; quotes: number; paidQuotes: number };
}) {
  const inquiries = funnel?.inquiries ?? 0;
  const quotes = funnel?.quotes ?? 0;
  const paid = funnel?.paidQuotes ?? 0;
  const rate = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');
  return (
    <FunnelStagesCard
      stages={[
        { label: 'Inquiries', value: inquiries, conv: null },
        { label: 'Quotes', value: quotes, conv: rate(quotes, inquiries) },
        { label: 'Paid', value: paid, conv: rate(paid, quotes) },
      ]}
    />
  );
}

export function Switch({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#C9973A]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
