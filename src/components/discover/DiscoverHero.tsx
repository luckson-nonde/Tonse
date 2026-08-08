import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { uploadUrl } from '../../services/api/client';
import { getCategoryArt, getMeta } from '../buyer/categoryMeta';
import { CATEGORIES_DB } from '../../services/categories';
import type { StorefrontCard, StorefrontCategory } from '../../services/api/storefrontService';

const NAVY = '#1B3068';
const NAVY_DEEP = '#142550';
const ROTATE_MS = 6000;
const MAX_CARD_SLIDES = 6;
/** Rotation is topped up with category showcases until it holds this many
 *  slides — the hero always demonstrates the full design, imagery included,
 *  even before the platform has products or promo tiles. */
const MIN_SLIDES = 5;

interface DiscoverHeroProps {
  shopCount: number;
  categoryCount: number;
  /** Best-sellers + promo tiles from /storefront/home. */
  cards: StorefrontCard[];
  /** Live master categories (real shops behind each) — the showcase-slide
   *  pool that fills whatever the cards don't. */
  categories: StorefrontCategory[];
}

type HeroSlide =
  | { kind: 'PLATFORM' }
  | { kind: 'CARD'; card: StorefrontCard }
  | { kind: 'CATEGORY'; id: string; name: string; tagline: string; image: string };

/** Random index different from the current one — the spec's "never repeat the
 *  same slide back-to-back" rule. */
function randomOtherIndex(current: number, length: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

/**
 * Landing-page hero: the platform pitch plus a rotating showcase of featured
 * listings (best sellers and admin promo tiles). Auto-advances to a RANDOM
 * other slide every 6s; dots jump directly; arrows step sequentially; hover
 * pauses; any manual change restarts the countdown (the interval effect keys
 * on `index`, so rescheduling IS the reset). Reduced motion disables autoplay
 * and cross-fades — manual navigation still works, with instant cuts.
 */
export default function DiscoverHero({
  shopCount,
  categoryCount,
  cards,
  categories,
}: DiscoverHeroProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const slides = useMemo<HeroSlide[]>(() => {
    const deck: HeroSlide[] = [
      { kind: 'PLATFORM' },
      ...cards.slice(0, MAX_CARD_SLIDES).map((card) => ({ kind: 'CARD' as const, card })),
    ];
    // Top up with real-photo category showcases so the rotation is never a
    // lone text slide: local artwork first, then the catalog's own image.
    for (const category of categories) {
      if (deck.length >= MIN_SLIDES) break;
      const image =
        getCategoryArt(category.id) ?? CATEGORIES_DB.find((c) => c.id === category.id)?.image;
      if (!image) continue;
      deck.push({
        kind: 'CATEGORY',
        id: category.id,
        name: category.name,
        tagline: getMeta(category.id).tagline,
        image,
      });
    }
    return deck;
  }, [cards, categories]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // New data (e.g. storefront load finishing) can shrink the deck — never
  // point past its end.
  useEffect(() => {
    setIndex((i) => (i < slides.length ? i : 0));
  }, [slides.length]);

  useEffect(() => {
    if (paused || prefersReducedMotion || slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => randomOtherIndex(i, slides.length));
    }, ROTATE_MS);
    // `index` in the deps: every slide change — auto OR manual — tears the
    // interval down and starts a fresh 6s countdown. That's the dot-click
    // "reset timer" behaviour with no separate reset mechanism.
    return () => clearInterval(timer);
  }, [paused, prefersReducedMotion, slides.length, index]);

  const slide = slides[index] ?? slides[0];
  const slideId = (s: HeroSlide) =>
    s.kind === 'PLATFORM' ? 'platform' : s.kind === 'CARD' ? s.card.id : `cat-${s.id}`;
  const slideKey = slideId(slide);
  const hasRotation = slides.length > 1;

  const scrollToCategories = () =>
    (
      document.getElementById('storefront-categories') ??
      document.getElementById('discover-sections') ??
      document.getElementById('discover-grid')
    )?.scrollIntoView({ behavior: 'smooth' });

  const slideContent = (s: HeroSlide) => {
    if (s.kind === 'PLATFORM') {
      return (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
            Everything Zambia sources, in one place
          </p>
          <h1 className="font-serif font-semibold mt-3 text-[2rem] sm:text-[3.1rem] leading-[1.05] max-w-[15ch]">
            Find a verified shop. <span className="text-[#c9973a]">Get a quote.</span>
          </h1>
          <p className="mt-3.5 max-w-[46ch] text-white/80">
            Browse registered shops and service providers, open a profile, and send a quote request —
            no account needed until you're ready to send it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/register')}
              className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-6 py-3 hover:bg-[#a97c27] transition-colors"
            >
              Start an inquiry
            </button>
            <button
              onClick={scrollToCategories}
              // Opaque border hexes, not border-white/NN: translucent borders
              // on rounded elements mis-rasterize on Mali-GPU Android phones
              // (see the android-gpu-ghosting skill). These are the white/30
              // and white/60 blends over the hero's navy.
              className="rounded-full border border-[#5a6a94] text-white font-semibold text-sm px-6 py-3 hover:border-[#9aa4bf] transition-colors"
            >
              Browse categories
            </button>
          </div>
        </div>
      );
    }

    if (s.kind === 'CATEGORY') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
              Top category
            </p>
            <h1 className="font-serif font-semibold mt-3 text-[1.7rem] sm:text-[2.6rem] leading-[1.08]">
              {s.name}
            </h1>
            {s.tagline && <p className="mt-3 max-w-[46ch] text-white/80">{s.tagline}</p>}
            <div className="mt-5">
              <button
                onClick={() => navigate(`/discover?category=${encodeURIComponent(s.id)}`)}
                className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-6 py-3 hover:bg-[#a97c27] transition-colors"
              >
                Browse {s.name}
              </button>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-56 lg:w-72 aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={s.image}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      );
    }

    const { card } = s;
    const imageSrc = card.imageUrl
      ? card.kind === 'PRODUCT'
        ? card.imageUrl
        : uploadUrl(card.imageUrl)
      : null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
            {card.kind === 'PRODUCT' ? 'Best seller' : 'Featured'}
          </p>
          <h1 className="font-serif font-semibold mt-3 text-[1.7rem] sm:text-[2.6rem] leading-[1.08] line-clamp-2">
            {card.title}
          </h1>
          {card.subtitle && (
            <p className="mt-3 max-w-[46ch] text-white/80 line-clamp-2">{card.subtitle}</p>
          )}
          <p className="mt-3.5 font-serif font-semibold text-[1.35rem] text-[#c9973a]">
            {card.price != null ? `ZMW ${card.price.toLocaleString()}` : card.ctaLabel ?? 'View'}
          </p>
          <div className="mt-5">
            <button
              onClick={() => navigate(card.href)}
              className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-6 py-3 hover:bg-[#a97c27] transition-colors"
            >
              {card.kind === 'PRODUCT' ? 'Shop now' : card.ctaLabel ?? 'Explore'}
            </button>
          </div>
        </div>
        <div
          className="shrink-0 w-full sm:w-56 lg:w-72 aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: card.backgroundColor || '#243a78' }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Sparkles className="w-9 h-9 text-[#c9973a]" />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="px-5 sm:px-8 lg:px-12 pt-6">
      <div
        className="relative overflow-hidden rounded-3xl px-6 sm:px-11 py-9 sm:py-13 text-white"
        style={{
          background: `radial-gradient(120% 140% at 85% -10%, rgba(201,151,58,0.35), transparent 55%), linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {prefersReducedMotion ? (
          <div key={slideKey}>{slideContent(slide)}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={slideKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {slideContent(slide)}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Trust stats — platform-level signals, deliberately OUTSIDE the
            slide swap so they hold steady while slides rotate. */}
        <div className="mt-7 sm:mt-8 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-6 sm:gap-8">
            <div>
              <div className="font-serif font-semibold text-[1.7rem]">{shopCount}+</div>
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                Verified providers
              </div>
            </div>
            <div>
              <div className="font-serif font-semibold text-[1.7rem]">{categoryCount}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/60">Categories</div>
            </div>
          </div>

          {hasRotation && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
                aria-label="Previous slide"
                className="w-8 h-8 rounded-full border border-[#5a6a94] flex items-center justify-center text-white hover:border-[#9aa4bf] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={slideId(s)}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`rounded-full transition-all ${
                      i === index ? 'w-4 h-1.5 bg-[#c9973a]' : 'w-1.5 h-1.5 bg-[#5a6a94] hover:bg-[#9aa4bf]'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setIndex((i) => (i + 1) % slides.length)}
                aria-label="Next slide"
                className="w-8 h-8 rounded-full border border-[#5a6a94] flex items-center justify-center text-white hover:border-[#9aa4bf] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
