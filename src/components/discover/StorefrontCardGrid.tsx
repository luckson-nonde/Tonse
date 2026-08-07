import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { uploadUrl } from '../../services/api/client';
import type { StorefrontCard, StorefrontMode } from '../../services/api/storefrontService';

interface StorefrontCardGridProps {
  cards: StorefrontCard[];
  mode: StorefrontMode;
  onOpen: (href: string) => void;
}

/** Heading follows what's actually in the grid, so the page never claims
 *  "trending" while showing placeholders nobody has bought. */
const HEADINGS: Record<StorefrontMode, { title: string; blurb: string }> = {
  PROMO: { title: 'Featured', blurb: 'Hand-picked by the Nyuwe team' },
  MIXED: { title: 'Trending now', blurb: 'What buyers are ordering, plus our picks' },
  BESTSELLERS: { title: 'Trending now', blurb: 'The most-ordered listings on Nyuwe' },
};

/**
 * The storefront band: one grid, one card, two kinds of content.
 *
 * Best-selling products and admin promo tiles share an identical footprint on
 * purpose — the backend merges them into a single ordered list (products first,
 * tiles topping up the remainder), so mixing them mid-grid has to look
 * deliberate rather than like two sections collided. `kind` only changes the
 * price/badge line and the surface colour.
 *
 * Opaque border hexes only — translucent borders on rounded cards mis-rasterize
 * on Mali-GPU Android phones (see the android-gpu-ghosting skill).
 */
export default function StorefrontCardGrid({ cards, mode, onOpen }: StorefrontCardGridProps) {
  if (cards.length === 0) return null;
  const heading = HEADINGS[mode];

  return (
    <section className="px-5 sm:px-8 lg:px-12 mt-9">
      <div className="flex items-baseline justify-between mb-4 gap-4">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068]">
            {heading.title}
          </h2>
          <p className="text-[12.5px] text-[#8a8577] mt-0.5 truncate">{heading.blurb}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5 items-stretch">
        {cards.map((card, i) => (
          <motion.article
            key={`${card.kind}-${card.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(card.href)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpen(card.href);
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
            className="w-full h-full bg-[#fffaf5] border border-[#e7e0d5] rounded-[18px] overflow-hidden cursor-pointer flex flex-col transition-all duration-150 hover:-translate-y-1 hover:shadow-[0_14px_32px_-6px_rgba(20,37,80,0.16)] hover:border-[#e9d2aa]"
          >
            <div
              className="relative aspect-[4/3] flex items-center justify-center overflow-hidden shrink-0"
              // Promo tiles carry an admin-chosen surface colour; products sit
              // on the neutral cream so the seller's photo does the talking.
              style={{ backgroundColor: card.backgroundColor || '#f1ece1' }}
            >
              {card.imageUrl ? (
                <img
                  // Products hold base64 data URLs (written client-side, render
                  // as-is); promo tiles hold an /uploads/… path that must be
                  // resolved against the API origin. uploadUrl handles both.
                  src={card.kind === 'PRODUCT' ? card.imageUrl : uploadUrl(card.imageUrl)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Sparkles className="w-7 h-7 text-[#c9973a]" />
              )}
              {card.badge && (
                <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-[#1B3068] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                  {card.badge}
                </span>
              )}
            </div>

            <div className="px-4 pt-3 pb-3.5 flex flex-col flex-1 gap-1">
              <h3 className="font-serif text-[15px] font-semibold text-[#1B3068] leading-snug line-clamp-2">
                {card.title}
              </h3>
              {card.subtitle && (
                <p className="text-[12.5px] text-[#6b7280] truncate">{card.subtitle}</p>
              )}
              <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-[#f1ece1] gap-2">
                <span className="text-[12px] font-semibold text-[#a97c27] truncate">
                  {card.price != null
                    ? `ZMW ${card.price.toLocaleString()}`
                    : card.ctaLabel || (card.kind === 'PRODUCT' ? 'Price on request' : 'View')}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#a97c27] shrink-0" />
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
