import type { Category } from '../../../services/categories';
import { getMeta, getCategoryArt } from '../categoryMeta';

interface Props {
  items: Category[];
  subCounts: Record<string, number>;
  onPick: (master: Category) => void;
}

export default function MasterGrid({ items, subCounts, onPick }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
      {items.map((c) => {
        const meta = getMeta(c.id);
        const Icon = meta.icon;
        const art = getCategoryArt(c.id);
        const total = subCounts[c.id] ?? 0;

        // Image-led card: the artwork ships on a cream field that matches the
        // app background, so it sits inset on its own rounded panel with the
        // name below — no overlay text fighting the render.
        if (art) {
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="group relative bg-white border border-slate-200 rounded-[20px] p-2 sm:p-2.5 text-left flex flex-col shadow-[0_1px_0_rgba(30,41,59,0.02)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-[#c9973a]/40 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
            >
              <div className="rounded-[13px] overflow-hidden aspect-4/3 bg-[#f5efe4]">
                <img
                  src={art}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="min-w-0 px-1.5 sm:px-2 pt-2.5 pb-1.5 mt-auto">
                <div className="text-[13px] sm:text-[13.5px] font-bold text-brand-dark leading-tight tracking-tight line-clamp-2">
                  {c.name}
                </div>
                <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-1 font-semibold tracking-wide">
                  {total > 0 ? `${total} item types` : 'Custom'}
                </div>
              </div>
            </button>
          );
        }

        // No artwork yet — original icon-chip card.
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="group relative bg-white border border-slate-200 rounded-[20px] p-4 sm:p-5 text-left flex flex-col gap-2.5 min-h-[130px] sm:min-h-[140px] lg:min-h-[150px] shadow-[0_1px_0_rgba(30,41,59,0.02)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-[#c9973a]/40 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
          >
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: meta.accent + '1f', color: meta.accent }}
            >
              <Icon size={22} strokeWidth={1.8} />
            </div>
            <div className="mt-auto min-w-0">
              <div className="text-[13.5px] sm:text-sm font-bold text-brand-dark leading-tight tracking-tight line-clamp-2">
                {c.name}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-1 font-semibold tracking-wide">
                {total > 0 ? `${total} item types` : 'Custom'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
