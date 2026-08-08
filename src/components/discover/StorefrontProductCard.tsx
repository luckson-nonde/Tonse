import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { uploadUrl } from '../../services/api/client';
import type { StorefrontCard } from '../../services/api/storefrontService';

interface StorefrontProductCardProps {
  /** Home cards (PRODUCT/PROMO) and category-grid cards share this one
   *  component; only category cards carry `originalPrice`. */
  card: StorefrontCard & { originalPrice?: number | null };
  /** Position in its grid — drives the stagger delay. */
  index: number;
  onOpen: (href: string) => void;
}

/**
 * One storefront card, extracted from StorefrontCardGrid so the curated home
 * band and the category-driven product grid render pixel-identical cards.
 *
 * Opaque border hexes only — translucent borders on rounded cards
 * mis-rasterize on Mali-GPU Android phones (see the android-gpu-ghosting
 * skill).
 */
export default function StorefrontProductCard({ card, index, onOpen }: StorefrontProductCardProps) {
  const hasDiscount =
    card.price != null && card.originalPrice != null && card.originalPrice > card.price;

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card.href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(card.href);
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
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
            {hasDiscount && (
              <span className="ml-1.5 text-[#8a8577] line-through font-normal">
                {card.originalPrice!.toLocaleString()}
              </span>
            )}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#a97c27] shrink-0" />
        </div>
      </div>
    </motion.article>
  );
}
