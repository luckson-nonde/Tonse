import { Plus, Trash2 } from 'lucide-react';

/**
 * Plain-string bullet list builder — one input per bullet, remove per row,
 * "add another" at the bottom. Parent owns the array (value/onChange), same
 * contract as SocialLinksEditor. Used for a vacancy's Key Responsibilities
 * and Minimum Requirements, which are the two places a job ad needs a real
 * list rather than one prose blob.
 */
interface BulletListEditorProps {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  maxItems?: number;
  /** Marks the first empty row invalid — set when the parent's validation
   *  failed because the list is empty. */
  error?: boolean;
}

export default function BulletListEditor({
  value,
  onChange,
  placeholder,
  addLabel = 'Add another',
  maxItems = 20,
  error,
}: BulletListEditorProps) {
  // Always render at least one row so the control never looks broken/empty.
  const rows = value.length ? value : [''];

  const patch = (i: number, text: string) =>
    onChange(rows.map((row, idx) => (idx === i ? text : row)));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <span className="shrink-0 mt-3 w-1.5 h-1.5 rounded-full bg-[#C9973A]" aria-hidden />
          <input
            type="text"
            value={row}
            onChange={(e) => patch(i, e.target.value)}
            maxLength={200}
            placeholder={placeholder}
            className={`flex-1 min-w-0 px-3 py-2.5 rounded-xl border bg-white text-[13px] font-medium text-[#1a1a2e] placeholder:text-slate-400 focus:outline-none focus:border-[#C9973A]/60 ${
              error && !row.trim() ? 'border-[#fda4af]' : 'border-slate-200'
            }`}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            className="shrink-0 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, ''])}
        disabled={rows.length >= maxItems}
        className="flex items-center gap-1.5 text-[12px] font-bold text-[#C9973A] hover:text-[#b8852f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

/** Trim and drop empties — call before validating or submitting. */
export function cleanBulletList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}
