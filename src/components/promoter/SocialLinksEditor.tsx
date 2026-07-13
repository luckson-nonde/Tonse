import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SocialLink } from '../../services/api/promoterService';

const PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'X (Twitter)',
  'WhatsApp Channel',
  'Telegram',
  'Other',
];

/**
 * Dynamic platform + URL rows for the social accounts an artist runs.
 * Used by the promoter signup (step 2) and the promoter Profile page.
 * The parent owns the array; empty rows are the parent's job to strip
 * before submit (see `cleanSocialLinks`).
 */
export default function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const rows = value.length ? value : [{ platform: 'Instagram', url: '' }];

  const patch = (i: number, partial: Partial<SocialLink>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...partial } : r)));

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <select
            value={row.platform}
            onChange={(e) => patch(i, { platform: e.target.value })}
            className="w-[38%] px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/60"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="url"
            placeholder="https://instagram.com/yourhandle"
            value={row.url}
            onChange={(e) => patch(i, { url: e.target.value })}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/60"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            className="shrink-0 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Remove link"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { platform: 'Instagram', url: '' }])}
        className="flex items-center gap-1.5 text-[12px] font-bold text-[#C9973A] hover:text-[#b8852f] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add another platform
      </button>
    </div>
  );
}

/** Drop rows without a URL; trim what remains. */
export function cleanSocialLinks(links: SocialLink[]): SocialLink[] {
  return links
    .map((l) => ({ ...l, url: l.url.trim() }))
    .filter((l) => l.url.length > 0);
}
