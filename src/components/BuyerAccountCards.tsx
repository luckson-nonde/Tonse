import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import type { SubRole } from '../types';

/**
 * Photo-forward account-type card used on the "Buyer Setup" step (tier-2,
 * BUYER). Replaces the old icon-in-square rows with the same composed 60/40
 * photo-card DNA as the tier-1 RoleCardStack, so the onboarding flow reads as
 * one continuous surface. Artwork lives in src/assets/images/onboarding/ —
 * `individual account.webp` and `company account.webp`.
 */
export interface AccountTypeOption {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  subRole: SubRole;
  /** Artwork file stem in src/assets/images/onboarding/ (spaces allowed). */
  artKey?: string;
  /** object-position for the photo crop, e.g. '58% 40%'. Defaults to center. */
  focalPoint?: string;
  /** Small affordance line under the copy (defaults to "Select"). */
  hint?: string;
  /** Photo used when no local artwork resolves for `artKey`. */
  fallbackImage?: string;
}

// Same eager-glob lookup RoleCardStack uses, so both surfaces resolve the
// exact same onboarding assets (webp/png/jpg). Spaces in filenames are fine —
// the glob keys keep them and we match on the lowercased stem.
const ONBOARDING_ART = import.meta.glob(
  '../assets/images/onboarding/*.{png,jpg,jpeg,webp}',
  { eager: true, import: 'default' }
) as Record<string, string>;

function artFor(key?: string): string | undefined {
  if (!key) return undefined;
  const target = key.toLowerCase();
  for (const [path, url] of Object.entries(ONBOARDING_ART)) {
    const stem = path
      .split('/')
      .pop()
      ?.replace(/\.(png|jpe?g|webp)$/i, '')
      .toLowerCase();
    if (stem === target) return url;
  }
  return undefined;
}

interface BuyerAccountCardsProps {
  options: AccountTypeOption[];
  selectedSubRole: SubRole | null;
  /** Mirrors RoleSelection.handleSubRoleSelect (Company expands, Personal selects). */
  onSelect: (subRole: SubRole) => void;
}

export default function BuyerAccountCards({
  options,
  selectedSubRole,
  onSelect,
}: BuyerAccountCardsProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-[600px] mx-auto">
      <AnimatePresence mode="popLayout">
        {options.map((option) => {
          const isSelected = selectedSubRole === option.subRole;
          const photo = artFor(option.artKey) ?? option.fallbackImage;

          return (
            <motion.button
              type="button"
              key={option.id}
              layoutId={option.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={() => onSelect(option.subRole)}
              aria-pressed={isSelected}
              className={`group relative w-full overflow-hidden rounded-3xl border text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
                isSelected
                  ? 'border-[#C9973A] shadow-[0_20px_44px_-20px_rgba(201,151,58,0.55)]'
                  : 'border-[#e8e4dc] shadow-[0_16px_38px_-26px_rgba(10,25,49,0.35)] hover:border-[#C9973A]/50 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-22px_rgba(10,25,49,0.42)]'
              } bg-white`}
            >
              {/* col-reverse on mobile → photo on top, copy below.
                  grid on sm+ → copy left (60%), photo right (40%). */}
              <div className="flex flex-col-reverse sm:grid sm:grid-cols-[1.35fr_1fr] sm:items-stretch">
                {/* Copy column */}
                <div className="p-5 sm:p-6 flex flex-col items-start">
                  <span className="px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] text-[9px] font-black uppercase tracking-[0.18em]">
                    {option.eyebrow}
                  </span>
                  <h3 className="font-serif text-[19px] sm:text-[22px] font-bold text-[#0A1931] leading-[1.2] mt-3">
                    {option.title}
                  </h3>
                  <p className="text-[12px] text-[#1a1612]/60 leading-relaxed mt-2">
                    {option.description}
                  </p>
                  <span
                    className={`mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                      isSelected ? 'text-[#C9973A]' : 'text-[#1a1612]/45 group-hover:text-[#C9973A]'
                    }`}
                  >
                    {isSelected ? 'Selected' : option.hint ?? 'Select'}
                    <span className="text-xs leading-none transition-transform duration-300 group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>

                {/* Photo column */}
                <div className="relative p-3 sm:pl-0">
                  <div className="relative h-40 w-full sm:h-full sm:min-h-[188px] overflow-hidden rounded-2xl bg-[#f5f2ee]">
                    {photo && (
                      <img
                        src={photo}
                        alt={option.title}
                        loading="lazy"
                        style={{ objectPosition: option.focalPoint ?? 'center' }}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                    {/* Left-edge fade so the photo melts into the card body
                        (stronger on sm+ where the copy sits beside it). */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-transparent sm:from-white/70" />
                  </div>
                </div>
              </div>

              {/* Selected checkmark badge */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/40"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
