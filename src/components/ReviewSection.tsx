import { Pencil } from 'lucide-react';

/**
 * A titled card of label/value rows shown on a registration Review step,
 * shared across onboarding flows. The whole card is clickable — tap anywhere
 * (not just "Edit") to jump back to that step — and any missing/incomplete
 * detail is highlighted in amber so it's obvious what's left to fill in.
 *
 * `rows` is an array of [label, value] pairs; an empty/placeholder value
 * ("Not added" / "Not pinned" / "—") renders in the amber "missing" style.
 */
export default function ReviewSection({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: string[][];
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group block w-full text-left rounded-2xl border border-[#e8e0d0]/70 bg-brand-white overflow-hidden hover:border-[#C9973A]/50 hover:shadow-[0_4px_18px_-12px_rgba(201,151,58,0.35)] transition-all"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e4dc] bg-[#faf6ee]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">{title}</p>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] group-hover:text-[#B08432] inline-flex items-center gap-1 transition-colors">
          <Pencil className="w-3 h-3" /> Edit
        </span>
      </div>
      <dl className="divide-y divide-[#f1ede5]">
        {rows.map((row) => {
          const missing = !row[1] || ['Not added', 'Not pinned', '—'].includes(row[1]);
          return (
            <div key={row[0]} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-[11px] font-medium text-[#1a1612]/50 shrink-0">{row[0]}</dt>
              <dd
                className={`text-[13px] font-semibold text-right min-w-0 truncate ${
                  missing ? 'text-amber-600' : 'text-[#1a1612]'
                }`}
              >
                {row[1] || 'Not added'}
              </dd>
            </div>
          );
        })}
      </dl>
    </button>
  );
}
