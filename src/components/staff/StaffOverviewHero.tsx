/**
 * Shared "control centre" Overview layout for staff accounts (Technician,
 * Collection Officer, Quotation Manager, Loan Officer). Pure presentational —
 * per-role wrappers in StaffOverview.tsx fetch the data and feed this.
 *
 * Layout mirrors the reference console: hero card (eyebrow, headline,
 * welcome, chips, date, icon tile) → metric cards → run-down list card.
 * Border colors are opaque hexes on purpose — translucent borders on rounded
 * cards mis-rasterize on Mali-GPU Android phones.
 */
import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StaffOverviewMetric {
  id: string;
  label: string;
  value: string | number;
  footnote?: string;
  icon: LucideIcon;
}

export interface StaffOverviewRundownItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  date?: string;
}

export interface StaffOverviewHeroProps {
  eyebrow: string;
  headline: string;
  firstName: string;
  chips: string[];
  icon: LucideIcon;
  metrics: StaffOverviewMetric[];
  rundownTitle: string;
  rundownSubtitle: string;
  rundown: StaffOverviewRundownItem[];
  rundownEmpty: string;
  ctaLabel: string;
  onCta: () => void;
  onRowClick?: (id: string) => void;
  loading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-[#fdf6e9] text-[#8a6118]',
  PENDING_COLLECTION: 'bg-[#fdf6e9] text-[#8a6118]',
  AWAITING_PICKUP: 'bg-[#eef4ff] text-[#3556a8]',
  COMPLETED: 'bg-[#e9f8f0] text-[#1c7a4d]',
  HANDED_OVER: 'bg-[#e9f8f0] text-[#1c7a4d]',
  PENDING: 'bg-[#f4f4f6] text-[#5b5b6b]',
  ACCEPTED: 'bg-[#e9f8f0] text-[#1c7a4d]',
  OPEN: 'bg-[#f4f4f6] text-[#5b5b6b]',
};

export default function StaffOverviewHero({
  eyebrow,
  headline,
  firstName,
  chips,
  icon: Icon,
  metrics,
  rundownTitle,
  rundownSubtitle,
  rundown,
  rundownEmpty,
  ctaLabel,
  onCta,
  onRowClick,
  loading,
}: StaffOverviewHeroProps) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="bg-[#1a1a2e] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 100% 0%, rgba(201,151,58,0.5) 0%, transparent 55%)',
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C9973A] mb-3">
              {eyebrow}
            </p>
            <h1 className="font-serif font-black text-[clamp(1.5rem,4vw,2.4rem)] leading-tight tracking-tight mb-3">
              {headline}
            </h1>
            <p className="text-[13px] text-white/60 font-medium mb-4">
              Welcome back{firstName ? `, ${firstName}` : ''}. Here's where your work stands.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="px-3.5 py-1 rounded-full bg-[#2a2a44] text-[10px] font-black uppercase tracking-[0.12em] text-white/85"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 shrink-0">
            <p className="text-[11px] font-bold text-white/50">{today}</p>
            <div className="w-24 h-20 rounded-2xl bg-[#C9973A] flex items-center justify-center shadow-lg">
              <Icon className="w-9 h-9 text-white" strokeWidth={1.8} />
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const MetricIcon = m.icon;
          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-[#ecd9b3] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  {m.label}
                </p>
                <div className="w-8 h-8 rounded-xl bg-[#fdf6e9] flex items-center justify-center">
                  <MetricIcon className="w-4 h-4 text-[#C9973A]" />
                </div>
              </div>
              <p className="text-3xl font-serif font-black text-slate-900 leading-none mb-2">
                {loading ? '—' : m.value}
              </p>
              {m.footnote && (
                <p className="text-[11px] font-semibold text-slate-400">{m.footnote}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Run-down card */}
      <div className="bg-white rounded-3xl border border-[#ecd9b3] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f3ead6] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">{rundownTitle}</h2>
            <p className="text-[12px] text-slate-400 font-medium mt-0.5">{rundownSubtitle}</p>
          </div>
          {rundown.length > 0 && (
            <button
              onClick={onCta}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a1a2e] text-white text-[11px] font-black uppercase tracking-wider hover:bg-[#C9973A] transition-all"
            >
              {ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-[13px] font-semibold text-slate-400">
            Loading…
          </div>
        ) : rundown.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[13px] font-semibold text-slate-500 mb-5">{rundownEmpty}</p>
            <button
              onClick={onCta}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9973A] text-white text-[12px] font-black uppercase tracking-wider hover:bg-[#1a1a2e] transition-all"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#f3ead6]">
            {rundown.slice(0, 8).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onRowClick?.(item.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-[#fdfaf2] transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#fdf6e9] text-[#8a6118] flex items-center justify-center text-[13px] font-black shrink-0">
                    {(item.title || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] font-medium text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.status && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        STATUS_STYLES[item.status] ?? 'bg-[#f4f4f6] text-[#5b5b6b]'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {item.date && (
                    <span className="hidden sm:block text-[11px] font-semibold text-slate-400 shrink-0">
                      {item.date}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
