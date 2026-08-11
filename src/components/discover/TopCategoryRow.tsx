import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCategoryArt, getMeta } from '../buyer/categoryMeta';
import { CATEGORIES_DB } from '../../services/categories';
import type { StorefrontCategory } from '../../services/api/storefrontService';

interface TopCategoryRowProps {
  categories: StorefrontCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}

/**
 * "Top Categories" band — the entry point into the marketplace, ordered by how
 * much is actually behind each one.
 *
 * Artwork comes from the same glob the buyer dashboard's master picker uses
 * (`getCategoryArt`), so a category only needs a file dropped in
 * src/assets/images/categories/ to get a photo here; anything without one keeps
 * the icon-chip treatment rather than rendering a hole.
 *
 * ONE line at every width — never wraps. Overflow is reached by scrolling the
 * row sideways (drag/wheel on touch and trackpads, arrow buttons on desktop
 * where neither is natural). Wrapping was the old behaviour from `sm` up; it
 * grew the band a row at a time as categories were added and pushed the
 * storefront below the fold.
 *
 * Borders are opaque hexes throughout — translucent borders on rounded cards
 * mis-rasterize on Mali-GPU Android phones (see the android-gpu-ghosting skill).
 */
export default function TopCategoryRow({
  categories,
  activeCategoryId,
  onSelect,
}: TopCategoryRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  /** One "page" is most of the visible width, so a click always leaves a
   *  partial pill in view as a hint that the row continues. */
  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (categories.length === 0) return null;

  return (
    <section id="storefront-categories" className="px-5 sm:px-8 lg:px-12 mt-9 scroll-mt-24">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068]">
          Top categories
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {activeCategoryId && (
            <button
              onClick={() => onSelect(activeCategoryId)}
              className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
          {/* Desktop-only: touch and trackpads scroll the row natively, a
              mouse can't. Mirrors the hero carousel's arrow pair. */}
          <div className="hidden sm:flex items-center gap-1.5 self-center">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll categories left"
              className="w-7 h-7 rounded-full border border-[#e7e0d5] bg-[#fffaf5] text-[#1B3068] flex items-center justify-center hover:border-[#e9d2aa] hover:bg-[#fdf6e9] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Scroll categories right"
              className="w-7 h-7 rounded-full border border-[#e7e0d5] bg-[#fffaf5] text-[#1B3068] flex items-center justify-center hover:border-[#e9d2aa] hover:bg-[#fdf6e9] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact action buttons, not display tiles: a small round thumbnail +
          name + count in a pill. Clicking one swaps the section below for
          that category's product grid — the pill is the CONTROL, the grid is
          the display. Horizontal snap-scroll on phones, wrapping from sm up. */}
      {/* flex-nowrap at EVERY width — the band stays exactly one pill tall
          however many categories exist, and the rest are a scroll away. */}
      <div
        ref={scrollerRef}
        className="flex flex-nowrap gap-3 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1 pb-1"
      >
        {categories.map((category, i) => {
          // Photo resolution: dropped local artwork first, then the catalog's
          // own image URL — every button gets a real photo; the icon chip is
          // a last resort, never the default look.
          const art =
            getCategoryArt(category.id) ??
            CATEGORIES_DB.find((c) => c.id === category.id)?.image;
          const meta = getMeta(category.id);
          const Icon = meta.icon;
          const isActive = activeCategoryId === category.id;
          // Listings are the honest headline where they exist; a services
          // category with no catalogue still has real shops behind it.
          const caption =
            category.productCount > 0
              ? `${category.productCount} listing${category.productCount === 1 ? '' : 's'}`
              : `${category.shopCount} shop${category.shopCount === 1 ? '' : 's'}`;

          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              className={`snap-start shrink-0 inline-flex items-center gap-3 pl-2 pr-5 py-2 rounded-full border text-left transition-all duration-150 hover:shadow-[0_8px_18px_-8px_rgba(20,37,80,0.2)] ${
                isActive
                  ? 'border-[#c9973a] bg-[#fdf6e9] shadow-[0_6px_16px_-8px_rgba(201,151,58,0.55)]'
                  : 'border-[#e7e0d5] bg-[#fffaf5] hover:border-[#e9d2aa]'
              }`}
            >
              {/* Thumbnail sized so the category photo actually reads as a
                  photo, not a dot — the pill shape is unchanged. */}
              <span className="w-14 h-14 rounded-full overflow-hidden bg-[#f1ece1] flex items-center justify-center shrink-0">
                {art ? (
                  <img
                    src={art}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span style={{ color: meta.accent }}>
                    <Icon className="w-6 h-6" />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1B3068] leading-tight whitespace-nowrap">
                  {category.name}
                </p>
                <p className="text-[12px] text-[#8a8577] leading-tight whitespace-nowrap mt-0.5">{caption}</p>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
