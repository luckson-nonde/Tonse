import React from 'react';
import { motion } from 'motion/react';
import { getCategoryArt, getMeta } from '../buyer/categoryMeta';
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

      <div className="flex gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-6 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1 pb-1">
        {categories.map((category, i) => {
          const art = getCategoryArt(category.id);
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
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
              className={`snap-start shrink-0 w-28 sm:w-auto bg-[#fffaf5] border rounded-2xl overflow-hidden text-left transition-all duration-150 hover:-translate-y-1 hover:shadow-[0_12px_26px_-8px_rgba(20,37,80,0.18)] ${
                isActive
                  ? 'border-[#c9973a] shadow-[0_10px_24px_-10px_rgba(201,151,58,0.5)]'
                  : 'border-[#e7e0d5] hover:border-[#e9d2aa]'
              }`}
            >
              <div className="relative aspect-square bg-[#f1ece1] flex items-center justify-center overflow-hidden">
                {art ? (
                  <img
                    src={art}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${meta.accent}1a`, color: meta.accent }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[12px] font-semibold text-[#1B3068] leading-tight truncate">
                  {category.name}
                </p>
                <p className="text-[10.5px] text-[#8a8577] mt-0.5 truncate">{caption}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
