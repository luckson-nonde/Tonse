import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

/** Left-heavy scrim over a full-bleed slide image: text column stays fully
 *  legible while the right side shows the photograph, plus a bottom band so
 *  the stats/controls row never sits on a bright area. */
const IMAGE_OVERLAY = `linear-gradient(to top, rgba(15,26,54,0.88) 0%, rgba(15,26,54,0.25) 34%, transparent 55%), linear-gradient(100deg, rgba(15,26,54,0.95) 0%, rgba(20,37,80,0.82) 38%, rgba(20,37,80,0.45) 68%, rgba(20,37,80,0.18) 100%)`;

/** Heavier, near-uniform scrim for the platform slide — its backdrop is
 *  texture, not subject, so the message owns the frame. */
const PLATFORM_OVERLAY = `radial-gradient(120% 140% at 85% -10%, rgba(201,151,58,0.32), transparent 55%), linear-gradient(120deg, rgba(20,37,80,0.96) 0%, rgba(20,37,80,0.9) 55%, rgba(15,26,54,0.86) 100%)`;

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

function categoryImage(id: string): string | undefined {
  return getCategoryArt(id) ?? CATEGORIES_DB.find((c) => c.id === id)?.image;
}

/**
 * Landing-page hero: a tall, full-bleed image banner. Every slide's photo
 * COVERS the whole section behind a navy scrim (never an inset thumbnail);
 * the platform pitch is slide 0 over a heavily-dimmed backdrop. Random
 * auto-advance every 6s; dots jump directly; arrows step sequentially; hover
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
      const image = categoryImage(category.id);
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

  // The platform slide's backdrop texture — the first live category's photo,
  // dimmed almost flat by PLATFORM_OVERLAY. Falls back to the plain gradient.
  const platformBackdrop = useMemo(() => {
    for (const category of categories) {
      const image = categoryImage(category.id);
      if (image) return image;
    }
    return null;
  }, [categories]);

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

  /** Full-bleed background layer for a slide: cover image + scrim. */
  const slideBackground = (s: HeroSlide) => {
    let image: string | null = null;
    let overlay = PLATFORM_OVERLAY;
    if (s.kind === 'PLATFORM') {
      image = platformBackdrop;
    } else if (s.kind === 'CATEGORY') {
      image = s.image;
      overlay = IMAGE_OVERLAY;
    } else {
      image = s.card.imageUrl
        ? s.card.kind === 'PRODUCT'
          ? s.card.imageUrl
          : uploadUrl(s.card.imageUrl)
        : null;
      overlay = image ? IMAGE_OVERLAY : PLATFORM_OVERLAY;
    }
    return (
      <>
        {image && (
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0" style={{ background: overlay }} />
      </>
    );
  };

  /** Foreground text column — the photo lives in the background layer now,
   *  never as an inset panel. */
  const slideContent = (s: HeroSlide) => {
    if (s.kind === 'PLATFORM') {
      return (
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
            Everything Zambia sources, in one place
          </p>
          <h1 className="font-serif font-semibold mt-3 text-[2.1rem] sm:text-[3.4rem] leading-[1.05] max-w-[15ch]">
            Find a verified shop. <span className="text-[#c9973a]">Get a quote.</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-white/85 sm:text-[1.05rem]">
            Browse registered shops and service providers, open a profile, and send a quote request —
            no account needed until you're ready to send it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/register')}
              className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-7 py-3.5 hover:bg-[#a97c27] transition-colors"
            >
              Start an inquiry
            </button>
            <button
              onClick={scrollToCategories}
              // Opaque border hexes, not border-white/NN: translucent borders
              // on rounded elements mis-rasterize on Mali-GPU Android phones
              // (see the android-gpu-ghosting skill). These are the white/30
              // and white/60 blends over the hero's navy.
              className="rounded-full border border-[#5a6a94] text-white font-semibold text-sm px-7 py-3.5 hover:border-[#9aa4bf] transition-colors"
            >
              Browse categories
            </button>
          </div>
        </div>
      );
    }

    if (s.kind === 'CATEGORY') {
      return (
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
            Top category
          </p>
          <h1 className="font-serif font-semibold mt-3 text-[2rem] sm:text-[3.1rem] leading-[1.06]">
            {s.name}
          </h1>
          {s.tagline && (
            <p className="mt-3.5 max-w-[46ch] text-white/85 sm:text-[1.05rem]">{s.tagline}</p>
          )}
          <div className="mt-7">
            <button
              onClick={() => navigate(`/discover?category=${encodeURIComponent(s.id)}`)}
              className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-7 py-3.5 hover:bg-[#a97c27] transition-colors"
            >
              Browse {s.name}
            </button>
          </div>
        </div>
      );
    }

    const { card } = s;
    return (
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9973a]">
          {card.kind === 'PRODUCT' ? 'Best seller' : 'Featured'}
        </p>
        <h1 className="font-serif font-semibold mt-3 text-[2rem] sm:text-[3.1rem] leading-[1.06] line-clamp-2">
          {card.title}
        </h1>
        {card.subtitle && (
          <p className="mt-3.5 max-w-[46ch] text-white/85 sm:text-[1.05rem] line-clamp-2">
            {card.subtitle}
          </p>
        )}
        <p className="mt-4 font-serif font-semibold text-[1.5rem] sm:text-[1.8rem] text-[#c9973a]">
          {card.price != null ? `ZMW ${card.price.toLocaleString()}` : card.ctaLabel ?? 'View'}
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate(card.href)}
            className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-7 py-3.5 hover:bg-[#a97c27] transition-colors"
          >
            {card.kind === 'PRODUCT' ? 'Shop now' : card.ctaLabel ?? 'Explore'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="px-5 sm:px-8 lg:px-12 pt-6">
      <div
        className="relative overflow-hidden rounded-3xl px-6 sm:px-11 py-8 sm:py-10 text-white min-h-[26rem] sm:min-h-[34rem] flex flex-col"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Full-bleed background — the slide's photo covers the WHOLE hero. */}
        {prefersReducedMotion ? (
          <div key={`${slideKey}-bg`} className="absolute inset-0">
            {slideBackground(slide)}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${slideKey}-bg`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {slideBackground(slide)}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Foreground copy, vertically centred in the taller frame. */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-4">
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
        </div>

        {/* Trust stats + controls — platform-level, deliberately OUTSIDE the
            slide swap so they hold steady while slides rotate. */}
        <div className="relative z-10 mt-6 flex flex-wrap items-end justify-between gap-6">
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
