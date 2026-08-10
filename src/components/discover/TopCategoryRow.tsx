import React from 'react';
import { motion } from 'motion/react';
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
 * Snap-scrolls on narrow screens and lays out as a grid from `sm` up. Borders
 * are opaque hexes throughout — translucent borders on rounded cards
 * mis-rasterize on Mali-GPU Android phones (see the android-gpu-ghosting skill).
 */
export default function TopCategoryRow({
  categories,
  activeCategoryId,
  onSelect,
}: TopCategoryRowProps) {
  if (categories.length === 0) return null;

  return (
    <section id="storefront-categories" className="px-5 sm:px-8 lg:px-12 mt-9 scroll-mt-24">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068]">
          Top categories
        </h2>
        {activeCategoryId && (
          <button
            onClick={() => onSelect(activeCategoryId)}
            className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2 shrink-0"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Compact action buttons, not display tiles: a small round thumbnail +
          name + count in a pill. Clicking one swaps the section below for
          that category's product grid — the pill is the CONTROL, the grid is
          the display. Horizontal snap-scroll on phones, wrapping from sm up. */}
      <div className="flex gap-2.5 overflow-x-auto snap-x scrollbar-hide sm:flex-wrap sm:overflow-visible -mx-1 px-1 pb-1">
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
              className={`snap-start shrink-0 inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border text-left transition-all duration-150 hover:shadow-[0_8px_18px_-8px_rgba(20,37,80,0.2)] ${
                isActive
                  ? 'border-[#c9973a] bg-[#fdf6e9] shadow-[0_6px_16px_-8px_rgba(201,151,58,0.55)]'
                  : 'border-[#e7e0d5] bg-[#fffaf5] hover:border-[#e9d2aa]'
              }`}
            >
              <span className="w-9 h-9 rounded-full overflow-hidden bg-[#f1ece1] flex items-center justify-center shrink-0">
                {art ? (
                  <img
                    src={art}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span style={{ color: meta.accent }}>
                    <Icon className="w-4 h-4" />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <p className="text-[12px] font-semibold text-[#1B3068] leading-tight whitespace-nowrap">
                  {category.name}
                </p>
                <p className="text-[10.5px] text-[#8a8577] leading-tight whitespace-nowrap">{caption}</p>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
