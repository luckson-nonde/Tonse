import React from 'react';
import type { StorefrontCard, StorefrontMode } from '../../services/api/storefrontService';
import StorefrontProductCard from './StorefrontProductCard';

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
 * deliberate rather than like two sections collided. The card itself lives in
 * StorefrontProductCard, shared with the category-driven product grid.
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
          <StorefrontProductCard key={`${card.kind}-${card.id}`} card={card} index={i} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
