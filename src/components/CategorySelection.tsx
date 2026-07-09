import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Smartphone,
  Armchair,
  Shirt,
  Home,
  Car,
  ShoppingBasket,
  Sparkles,
  Hammer,
  Music,
  ShoppingBag,
  Calendar,
  ChevronLeft,
  ChevronDown,
  Tractor,
  Laptop,
  HardHat,
  Wrench,
  Factory,
  Sprout,
  Truck,
  Tv,
  Gamepad2,
  Sofa,
  Monitor,
  Sun,
  Speaker,
  Briefcase,
  BedDouble,
  ArrowRight,
  Plus,
  FileText,
  MessageSquare,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';

// Custom Category Icons
import electronicsIcon from '../assets/images/empty-states/category_select_icon/01_electronics.png';
import furnitureIcon from '../assets/images/empty-states/category_select_icon/02_furniture.png';
import fashionIcon from '../assets/images/empty-states/category_select_icon/03_fashion.png';
import homeDecorIcon from '../assets/images/empty-states/category_select_icon/04_home_decor.png';
import automotiveIcon from '../assets/images/empty-states/category_select_icon/05_automotive.png';
import groceriesIcon from '../assets/images/empty-states/category_select_icon/06_groceries.png';
import beautyIcon from '../assets/images/empty-states/category_select_icon/07_beauty.png';
import constructionIcon from '../assets/images/empty-states/category_select_icon/08_construction.png';
import entertainmentIcon from '../assets/images/empty-states/category_select_icon/09_entertainment.png';
import eventsIcon from '../assets/images/empty-states/category_select_icon/10_events.png';
import telecomIcon from '../assets/images/empty-states/category_select_icon/11_telecommunications.png';
import itServicesIcon from '../assets/images/empty-states/category_select_icon/12_it_services.png';
import itProductsIcon from '../assets/images/empty-states/category_select_icon/13_it_products.png';
import drillingIcon from '../assets/images/empty-states/category_select_icon/14_drilling_services.png';
import agricultureIcon from '../assets/images/empty-states/category_select_icon/15_agriculture.png';
import labourIcon from '../assets/images/empty-states/category_select_icon/16_labour_skills.png';

import Button from './Button';
import { getCategoryArt, getSpecialtyPreview, getSpecialtyImage, getLabourImage, getLabourGroupImage, type SpecialtyState } from './buyer/categoryMeta';
import { useLiteMotion } from '../hooks/useLiteMotion';
import { nudgeRepaint } from '../utils/forceRepaint';
import { fetchCategories, Category } from '../services/categories';
import { useCategoryAvailability } from '../services/categories/availability';
import { LABOUR_CATEGORY_GROUPS, LABOUR_CATEGORIES } from '../services/labourCategories';

interface CategorySelectionProps {
  onComplete?: (categories: any) => void;
  onChange?: (categories: string[]) => void;
  onBack?: () => void;
  submitLabel?: string;
  hideHeader?: boolean;
  role?: string;
  initialSelectedIds?: string[];
  isStandalone?: boolean;
  categoryFilter?: (category: Category) => boolean;
  hideSubmitButton?: boolean;
  onSubcategoryViewChange?: (isViewing: boolean) => void;
  /** When set, skips the parent-category grid and opens directly into the
   *  specialty step for this parent ID.  Used by the targeted-shop flow. */
  preselectedParentId?: string;
  /** When true, mounts directly in the labour trade picker (skips the single
   *  "Labour & Skills" tile screen). Used by the Skilled Labour sub-role. */
  autoLabour?: boolean;
}

const getCategoryStyles = (id: string) => {
  const styles: Record<
    string,
    { icon: any; bg: string; asset?: string; color: string; description: string }
  > = {
    electronics: {
      icon: Smartphone,
      bg: 'bg-[#fffef9]',
      asset: electronicsIcon,
      color: 'text-amber-600',
      description: 'Advanced gadgets, appliances, and technical systems.',
    },
    furniture: {
      icon: Armchair,
      bg: 'bg-[#fffef9]',
      asset: furnitureIcon,
      color: 'text-orange-600',
      description: 'Modern and ergonomic furniture for home and office.',
    },
    fashion: {
      icon: Shirt,
      bg: 'bg-[#fffef9]',
      asset: fashionIcon,
      color: 'text-rose-600',
      description: 'Apparel, accessories, and styling services.',
    },
    'home-decor': {
      icon: Home,
      bg: 'bg-[#fffef9]',
      asset: homeDecorIcon,
      color: 'text-blue-600',
      description: 'Interior design elements and aesthetic enhancements.',
    },
    automotive: {
      icon: Car,
      bg: 'bg-[#fffef9]',
      asset: automotiveIcon,
      color: 'text-slate-600',
      description: 'Vehicles, maintenance, and transportation solutions.',
    },
    groceries: {
      icon: ShoppingBasket,
      bg: 'bg-[#fffef9]',
      asset: groceriesIcon,
      color: 'text-emerald-600',
      description: 'Fresh products, daily essentials, and supplies.',
    },
    beauty: {
      icon: Sparkles,
      bg: 'bg-[#fffef9]',
      asset: beautyIcon,
      color: 'text-pink-600',
      description: 'Personal care, cosmetics, and wellness products.',
    },
    construction: {
      icon: Hammer,
      bg: 'bg-[#fffef9]',
      asset: constructionIcon,
      color: 'text-yellow-700',
      description: 'Building materials, civil works, and engineering.',
    },
    entertainment: {
      icon: Music,
      bg: 'bg-[#fffef9]',
      asset: entertainmentIcon,
      color: 'text-indigo-600',
      description: 'Multimedia, music, gaming, and leisure experiences.',
    },
    events: {
      icon: Calendar,
      bg: 'bg-[#fffef9]',
      asset: eventsIcon,
      color: 'text-purple-600',
      description: 'Planning, coordination, and logistics for gatherings.',
    },
    telecommunications: {
      icon: Smartphone,
      bg: 'bg-[#fffef9]',
      asset: telecomIcon,
      color: 'text-cyan-600',
      description: 'Network services, data, and communication tech.',
    },
    'it-services': {
      icon: Laptop,
      bg: 'bg-[#fffef9]',
      asset: itServicesIcon,
      color: 'text-sky-600',
      description: 'Software development, support, and infrastructure.',
    },
    'it-products': {
      icon: Monitor,
      bg: 'bg-[#fffef9]',
      asset: itProductsIcon,
      color: 'text-blue-700',
      description: 'Hardware, software licenses, and IT equipment.',
    },
    'drilling-services': {
      icon: Factory,
      bg: 'bg-[#fffef9]',
      asset: drillingIcon,
      color: 'text-orange-800',
      description: 'Specialized drilling, mining, and extraction.',
    },
    agriculture: {
      icon: Sprout,
      bg: 'bg-[#fffef9]',
      asset: agricultureIcon,
      color: 'text-green-600',
      description: 'Farming products, irrigation, and livestock.',
    },
    labour: {
      icon: HardHat,
      bg: 'bg-[#fffef9]',
      asset: labourIcon,
      color: 'text-amber-700',
      description: 'Skilled labour, trades, and professional skills.',
    },
  };
  return (
    styles[id] || {
      icon: ShoppingBag,
      bg: 'bg-[#fffef9]',
      color: 'text-slate-400',
      description: 'Explore various products and services in this category.',
    }
  );
};

const LABOUR_GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CONSTRUCTION: HardHat,
  DOMESTIC: Home,
  INDUSTRIAL: Factory,
  SKILLED_TRADES: Wrench,
  AGRICULTURAL: Sprout,
  TRANSPORT: Truck,
};

// Labour sub-type icons — only includes icons already imported in this file.
// Anything not in this map falls back to the group's icon (or Wrench as a
// final fallback). Add more entries here as new sub-types arrive; expanding
// the lucide imports is the only other thing required.
const LABOUR_SUB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat,
  Hammer,
  Home,
  Sparkles,
  Briefcase,
  Wrench,
  Truck,
  Sprout,
  Factory,
};

const getSubCategoryIcon = (name: string) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('phone') || lowercaseName.includes('mobile')) return Smartphone;
  if (lowercaseName.includes('laptop') || lowercaseName.includes('computer')) return Laptop;
  if (
    lowercaseName.includes('tv') ||
    lowercaseName.includes('video') ||
    lowercaseName.includes('audio')
  )
    return Tv;
  if (lowercaseName.includes('game') || lowercaseName.includes('console')) return Gamepad2;
  if (lowercaseName.includes('living') || lowercaseName.includes('sofa')) return Sofa;
  if (lowercaseName.includes('bed')) return BedDouble;
  if (lowercaseName.includes('office')) return Briefcase;
  if (lowercaseName.includes('outdoor') || lowercaseName.includes('patio')) return Sun;
  if (lowercaseName.includes('speaker') || lowercaseName.includes('sound')) return Speaker;
  if (lowercaseName.includes('home appliance') || lowercaseName.includes('kitchen')) return Home;
  if (lowercaseName.includes('monitor') || lowercaseName.includes('display')) return Monitor;
  return ShoppingBag;
};

interface CategoryCardProps {
  category: Category;
  isSelected: boolean;
  onClick: () => void;
  onHover?: (category: Category | null) => void;
  compact?: boolean;
}

const CategoryCard = ({ category, isSelected, onClick, onHover, compact }: CategoryCardProps) => {
  const [imgError, setImgError] = useState(false);
  // The finished artwork (src/assets/images/categories/<id>.webp) and the
  // legacy PNG track load failures separately — if the artwork errors we fall
  // back to the PNG path, not straight to the bare icon.
  const [artError, setArtError] = useState(false);
  const styles = getCategoryStyles(category.id);
  const Icon = styles.icon;
  const art = getCategoryArt(category.id);
  const showArt = Boolean(art) && !artError;

  if (compact) {
    return (
      <motion.button
        type="button"
        layout
        onMouseEnter={() => onHover?.(category)}
        onMouseLeave={() => onHover?.(null)}
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
          showArt
            ? 'flex flex-col'
            : 'min-h-[104px] flex flex-col items-center justify-start gap-1.5 px-2 py-3'
        } ${
          isSelected
            ? 'border-[#C9973A] bg-white shadow-[0_8px_24px_-14px_rgba(201,151,58,0.45)]'
            : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/40 hover:shadow-[0_6px_18px_-14px_rgba(26,22,18,0.12)]'
        }`}
      >
        {/* Left-edge gold accent — system signature (icon fallback only;
            image cards let the gold border + badge carry selection) */}
        {!showArt && (
          <div
            className={`absolute left-0 top-3 bottom-3 w-[2px] bg-[#C9973A] rounded-full origin-center transition-all duration-300 ${
              isSelected ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
            }`}
          />
        )}

        {showArt ? (
          <div className="relative aspect-4/3 bg-[#f5efe4]">
            <img
              src={art}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out lg:group-hover:scale-[1.04]"
              onError={() => setArtError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            {styles.asset && !imgError ? (
              <img
                src={styles.asset}
                alt={category.name}
                className="w-full h-full object-contain drop-shadow-sm"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg} ${styles.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

        <p
          className={`font-bold uppercase tracking-[0.06em] leading-tight line-clamp-1 transition-colors ${
            showArt
              ? 'mt-auto text-[11px] sm:text-[12px] text-left px-3 py-2.5'
              : 'text-[10px] text-center px-1'
          } ${isSelected ? 'text-[#C9973A]' : 'text-[#1a1612]/85'}`}
        >
          {category.name}
        </p>

        {/* Top-right check badge on selection */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/30"
          >
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </motion.div>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      layout
      onMouseEnter={() => onHover?.(category)}
      onMouseLeave={() => onHover?.(null)}
      onClick={onClick}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative text-left rounded-2xl sm:rounded-[24px] cursor-pointer group transition-all duration-300 overflow-hidden border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
        showArt
          ? 'flex flex-col p-2 sm:p-2.5'
          : 'min-h-[140px] sm:min-h-[160px] md:min-h-[180px]'
      } ${
        isSelected
          ? 'border-[#C9973A] bg-white shadow-[0_15px_30px_rgba(201,151,58,0.12)]'
          : 'border-slate-100 bg-white hover:border-[#C9973A]/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)]'
      }`}
    >
      {showArt ? (
        <>
          <div className="rounded-xl sm:rounded-[18px] overflow-hidden aspect-4/3 bg-[#f5efe4]">
            <img
              src={art}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 ease-out lg:group-hover:scale-[1.04]"
              onError={() => setArtError(true)}
            />
          </div>
          <div className="mt-auto pt-2.5 sm:pt-3 px-1 pb-1">
            <h3
              className={`font-sans text-[12px] sm:text-[13px] font-bold uppercase tracking-tight text-center transition-colors duration-300 ${
                isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'
              }`}
            >
              {category.name}
            </h3>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 p-3 sm:p-4 flex flex-col items-center justify-start text-center gap-2 sm:gap-3">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              isSelected ? 'scale-110' : 'group-hover:scale-110'
            }`}
          >
            {styles.asset && !imgError ? (
              <img
                src={styles.asset}
                alt={category.name}
                className="w-full h-full object-contain drop-shadow-lg"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.bg} ${styles.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
            )}
          </div>

          <div>
            <h3
              className={`font-sans text-[13px] md:text-[14px] font-bold uppercase tracking-tight transition-colors duration-300 ${
                isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'
              }`}
            >
              {category.name}
            </h3>
          </div>
        </div>
      )}

      <div className="absolute top-3 right-3">
        {isSelected ? (
          <div className="w-6 h-6 bg-[#C9973A] rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-3 h-3 text-white" strokeWidth={4} />
          </div>
        ) : (
          <div className="w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
            <Plus className="w-3 h-3 text-slate-300" />
          </div>
        )}
      </div>
    </motion.button>
  );
};

// Options in canonical order; only the ones an item supports are rendered.
const SPECIALTY_OPTIONS: { state: SpecialtyState; label: string; icon: any }[] = [
  { state: 'sell', label: 'Sell New', icon: ShoppingBag },
  { state: 'repair', label: 'Repair', icon: Wrench },
  { state: 'both', label: 'Both', icon: Sparkles },
];

interface SpecialtyImageCardProps {
  baseName: string;
  previews: Partial<Record<SpecialtyState, string>>;
  hasBuy: boolean;
  hasRepair: boolean;
  /** The currently-selected choice, or null when the item isn't selected. */
  current: SpecialtyState | null;
  onChoose: (choice: SpecialtyState) => void;
}

/**
 * Image-led specialty card (Choose Specialty step). A 1:1 preview crossfades
 * between the Sell New / Repair / Both artwork as the seller picks a
 * mutually-exclusive option. Default (unselected) preview is Sell New.
 */
const SpecialtyImageCard = ({
  baseName,
  previews,
  hasBuy,
  hasRepair,
  current,
  onChoose,
}: SpecialtyImageCardProps) => {
  const isSelected = current !== null;
  // Touch devices skip the crossfade entirely (plain keyed <img> swap): its
  // explicit 0.28s opacity transition survives MotionConfig reducedMotion, and
  // the two stacked composited layers it creates ghost on budget Android GPUs.
  const lite = useLiteMotion();
  // Idle preview matches whichever option is actually offered — an item can be
  // repair-only if admin switched its buy variant off.
  const displayState: SpecialtyState = current ?? (hasBuy ? 'sell' : 'repair');
  const imgUrl = previews[displayState] ?? previews.sell ?? previews.repair;

  // Preload the alternates so later crossfades are instant — but AFTER first
  // paint (idle), so the multi-KB visible 'sell' images aren't starved by a
  // heavier repair render racing for the connection budget on mount.
  const { sell: sellUrl, repair: repairUrl, both: bothUrl } = previews;
  useEffect(() => {
    const preload = () => {
      [sellUrl, repairUrl, bothUrl].forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void })
      .cancelIdleCallback;
    const id = ric ? ric(preload) : window.setTimeout(preload, 200);
    return () => {
      if (ric && cic) cic(id);
      else window.clearTimeout(id as number);
    };
  }, [sellUrl, repairUrl, bothUrl]);

  const options = SPECIALTY_OPTIONS.filter((o) => {
    if (o.state === 'sell') return hasBuy;
    if (o.state === 'repair') return hasRepair;
    return hasBuy && hasRepair; // both
  });

  return (
    <div
      className={`group/card relative rounded-2xl bg-white border p-2 pb-2.5 flex flex-col transition-all duration-300 ${
        isSelected
          ? 'border-[#C9973A] shadow-[0_10px_28px_-12px_rgba(201,151,58,0.45)] -translate-y-0.5'
          : 'border-[#e8e4dc] hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(26,22,18,0.18)]'
      }`}
    >
      {/* 1:1 preview with true (overlapping) crossfade — both images are
          absolute inset-0, so the incoming one fades in over the outgoing.
          Touch devices get a plain keyed swap instead (see `lite` above). */}
      <div className="relative rounded-xl overflow-hidden aspect-square bg-[#f5efe4]">
        {lite ? (
          <img
            key={displayState}
            src={imgUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <AnimatePresence initial={false}>
            <motion.img
              key={displayState}
              src={imgUrl}
              alt=""
              loading="lazy"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out lg:group-hover/card:scale-[1.02]"
            />
          </AnimatePresence>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/40">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </div>
        )}
      </div>

      <h3 className="font-bold text-[#1a1612] text-[12px] leading-tight tracking-tight mt-2 mb-2 px-0.5 line-clamp-2">
        {baseName}
      </h3>

      {/* Mutually-exclusive option radios */}
      <div
        role="radiogroup"
        aria-label={`${baseName} — what you offer`}
        className="flex flex-col gap-1.5 mt-auto"
      >
        {options.map((opt) => {
          const active = current === opt.state;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.state}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChoose(opt.state)}
              className={`relative w-full px-2.5 h-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white ${
                active
                  ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white border border-[#a87a1f] shadow-[0_4px_12px_-6px_rgba(201,151,58,0.5)]'
                  : 'bg-white border border-[#C9973A]/30 text-[#C9973A] hover:border-[#C9973A]/60 hover:bg-[#fdf6e9]/50'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  active ? 'border-white' : 'border-[#C9973A]/50'
                }`}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <OptIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SpecialtySingleCardProps {
  baseName: string;
  image: string;
  /** The item's own action label (e.g. "New & Used", "Breakers", "Select"). */
  actionLabel: string;
  selected: boolean;
  onToggle: () => void;
}

/**
 * Image-led card for a single-variant specialty item (no Buy/Repair/Both) —
 * one preview + the item's real action label; the whole card toggles the
 * single underlying subcategory. Used for automotive items, gaming, etc.
 */
const SpecialtySingleCard = ({
  baseName,
  image,
  actionLabel,
  selected,
  onToggle,
}: SpecialtySingleCardProps) => {
  const isRepairLabel = /repair|restoration|upholstery|recovery/i.test(actionLabel);
  const Icon = isRepairLabel ? Wrench : ShoppingBag;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group/card relative rounded-2xl bg-white border p-2 pb-2.5 flex flex-col text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white ${
        selected
          ? 'border-[#C9973A] shadow-[0_10px_28px_-12px_rgba(201,151,58,0.45)] -translate-y-0.5'
          : 'border-[#e8e4dc] hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(26,22,18,0.18)]'
      }`}
    >
      <div className="relative rounded-xl overflow-hidden aspect-square bg-[#f5efe4]">
        <img
          src={image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 ease-out lg:group-hover/card:scale-[1.02]"
        />
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/40">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </div>
        )}
      </div>

      <h3 className="font-bold text-[#1a1612] text-[12px] leading-tight tracking-tight mt-2 mb-2 px-0.5 line-clamp-2">
        {baseName}
      </h3>

      <div
        className={`w-full px-2.5 h-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-2 mt-auto transition-all duration-200 ${
          selected
            ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white border border-[#a87a1f]'
            : 'bg-white border border-[#C9973A]/30 text-[#C9973A] group-hover/card:border-[#C9973A]/60 group-hover/card:bg-[#fdf6e9]/50'
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">{actionLabel}</span>
        {selected && <Check className="w-3 h-3 shrink-0" strokeWidth={3} />}
      </div>
    </button>
  );
};

const WorkflowIllustration = ({
  category,
  onExplore,
}: {
  category: Category | null;
  onExplore: () => void;
}) => {
  const steps = [
    {
      icon: FileText,
      label: 'Quotation Inquiry',
      description: 'Request detailed pricing and availability.',
    },
    {
      icon: Send,
      label: 'Order Processing',
      description: 'System validates and forwards to providers.',
    },
    {
      icon: MessageSquare,
      label: 'Direct Communication',
      description: 'Discuss specific requirements with experts.',
    },
    {
      icon: ShieldCheck,
      label: 'Quality Handling',
      description: 'Assurance of service delivery standards.',
    },
  ];

  if (!category) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full bg-[#f8f6f2] rounded-[40px] p-16 border border-slate-200/50 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]"
      >
        <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center border border-slate-100 mb-2">
          <Sparkles className="w-10 h-10 text-slate-200" />
        </div>
        <h3 className="text-2xl font-serif font-black text-[#1a1a2e]">Intelligence Board</h3>
        <p className="text-slate-400 max-w-md font-medium">
          Select a category above to visualize the smart procurement workflow and service stages.
        </p>
      </motion.div>
    );
  }

  const styles = getCategoryStyles(category.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mt-6"
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3 bg-[#f5f2ed] rounded-[40px] p-12 flex flex-col justify-between relative overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all">
          <div className="relative z-10">
            <p className="text-[#C9973A] text-[11px] font-black uppercase tracking-[0.3em] mb-4">
              Selected Category
            </p>
            <h3 className="text-4xl font-serif font-black text-[#1a1a2e] mb-6 leading-tight">
              {category.name}
            </h3>
            <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-xs">
              {styles.description}
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <button
              onClick={onExplore}
              className="flex items-center gap-3 text-[#1a1a2e] font-bold group"
            >
              <span className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#C9973A] group-hover:border-[#C9973A] group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5" />
              </span>
              View Details
            </button>
          </div>

          <div className="absolute -right-20 -bottom-20 opacity-[0.03]">
            {(getCategoryArt(category.id) ?? styles.asset) ? (
              <img
                src={getCategoryArt(category.id) ?? styles.asset}
                className="w-80 h-80 object-contain rotate-12"
                alt=""
              />
            ) : (
              <styles.icon className="w-80 h-80" />
            )}
          </div>
        </div>

        <div className="flex-1 p-12">
          <div className="flex items-center justify-between mb-12">
            <h4 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">
              Automated Workflow Stages
            </h4>
            <div className="px-4 py-1.5 bg-[#C9973A]/10 text-[#C9973A] rounded-full text-[10px] font-black uppercase">
              Real-time Intelligence
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative z-10 group"
              >
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#C9973A] group-hover:border-[#C9973A] transition-all shadow-sm">
                  <step.icon className="w-6 h-6 text-[#C9973A] group-hover:text-white transition-colors" />
                </div>
                <h5 className="font-bold text-[#1a1a2e] text-[13px] mb-2 uppercase tracking-tight">
                  {step.label}
                </h5>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function CategorySelection({
  onBack,
  onComplete,
  onChange,
  submitLabel = 'Submit Inquiry',
  hideHeader = false,
  role,
  initialSelectedIds = [],
  isStandalone = true,
  categoryFilter,
  hideSubmitButton = false,
  onSubcategoryViewChange,
  preselectedParentId,
  autoLabour = false,
}: CategorySelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<Category | null>(null);
  const [generalCategories, setGeneralCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeParent, setActiveParent] = useState<Category | null>(null);
  // Skilled Labour sub-role lands straight in the trade picker (ROOT), skipping
  // the lone "Labour & Skills" tile.
  const [activeLabourGroup, setActiveLabourGroup] = useState<any | null>(
    autoLabour ? 'ROOT' : null,
  );

  // Android-GPU ghosting guard: after each internal view swap (master grid ⇄
  // specialty ⇄ labour screens) force the compositor to re-raster this region
  // so stale tiles from the previous view can't survive. No-op on desktop.
  const viewWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nudgeRepaint(viewWrapRef.current);
  }, [activeParent, activeLabourGroup]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [labourSubSearch, setLabourSubSearch] = useState('');
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

  const { isAvailable } = useCategoryAvailability();

  // Push the current selection up to the parent (RoleSelection) so its outer
  // Continue button can enable/disable. Was destructured but not wired before —
  // that's why the parent's selectedCategories stayed empty.
  // Phase: matching — emit category IDs (not display names). Stable ids
  // round-trip cleanly to the backend junction tables.
  useEffect(() => {
    if (!onChange) return;
    onChange(selectedCategories.map((c) => c.id));
  }, [selectedCategories, onChange]);

  const nextStepRef = useRef<HTMLDivElement>(null);
  const previousSelectionCount = useRef(0);
  const didAutoExplore = useRef(false);

  // Targeted-shop flow: skip the parent grid and open the specialty step
  // directly for the preselected parent category.
  useEffect(() => {
    if (!preselectedParentId || loading || generalCategories.length === 0 || didAutoExplore.current) return;
    const parentCat = generalCategories.find((c) => c.id === preselectedParentId);
    if (parentCat) {
      didAutoExplore.current = true;
      handleExplore(parentCat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedParentId, loading, generalCategories]);

  // When the user makes their first selection, intentionally reveal the next step
  // (workflow explainer + continue CTA) with a smooth, deliberate scroll.
  useEffect(() => {
    const prev = previousSelectionCount.current;
    const curr = selectedCategories.length;

    if (prev === 0 && curr > 0) {
      const id = window.setTimeout(() => {
        nextStepRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 320);
      previousSelectionCount.current = curr;
      return () => window.clearTimeout(id);
    }

    previousSelectionCount.current = curr;
  }, [selectedCategories.length]);

  // Admin category control: drop any category/subcategory switched off. Done
  // at the render-derived level so it re-filters reactively once the
  // availability status resolves, regardless of when fetchCategories ran.
  const filteredCategories = generalCategories.filter(
    (c) => isAvailable(c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter(
    (sub) => isAvailable(sub.id) && sub.name.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  // Group subcategories by their base name, splitting out the action variant in
  // parentheses (e.g. "Mobile Phones & Accessories (Buy New)" → base "Mobile
  // Phones & Accessories" with a "Buy New" variant). This collapses the flat
  // list into one card per item type with action chips inside.
  const groupedSubcategories = useMemo(() => {
    const map = new Map<
      string,
      { baseName: string; variants: { action: string | null; sub: Category }[] }
    >();
    const isRepair = (s: string | null) =>
      /repair|restoration|upholstery|recovery/i.test(s || '');

    filteredSubcategories.forEach((sub) => {
      const match = sub.name.match(/^(.*?)\s*\((.+)\)\s*$/);
      const baseName = match ? match[1].trim() : sub.name;
      const action = match ? match[2].trim() : null;
      if (!map.has(baseName)) map.set(baseName, { baseName, variants: [] });
      map.get(baseName)!.variants.push({ action, sub });
    });
    for (const group of map.values()) {
      group.variants.sort(
        (a, b) => Number(isRepair(a.action)) - Number(isRepair(b.action))
      );
    }
    return Array.from(map.values());
  }, [filteredSubcategories]);

  useEffect(() => {
    if (onSubcategoryViewChange) {
      onSubcategoryViewChange(!!activeParent || !!activeLabourGroup);
    }
  }, [activeParent, activeLabourGroup, onSubcategoryViewChange]);

  useEffect(() => {
    fetchCategories(null).then(async (cats) => {
      let filtered = cats;
      if (role === 'ENTERTAINMENT') filtered = cats.filter((c) => c.id === 'entertainment');
      else if (role === 'EVENTS') filtered = cats.filter((c) => c.id === 'events');
      else if (role === 'SERVICE_PROVIDER') {
        const defaultCategory = initialSelectedIds.length > 0 ? initialSelectedIds[0] : null;
        if (defaultCategory)
          filtered = cats.filter((c) => c.id === defaultCategory || c.parentId === defaultCategory);
        else
          filtered = cats.filter((c) =>
            ['construction', 'electronics', 'it-services'].includes(c.id)
          );
      }
      const finalFiltered = categoryFilter ? filtered.filter(categoryFilter) : filtered;
      const showLabour =
        !categoryFilter ||
        categoryFilter({ id: 'labour', name: 'Labour & Skills', parentId: null } as Category);
      if (showLabour)
        setGeneralCategories([
          ...finalFiltered,
          { id: 'labour', name: 'Labour & Skills', parentId: null } as Category,
        ]);
      else setGeneralCategories(finalFiltered);
      setLoading(false);
    });
  }, [role, initialSelectedIds, categoryFilter]);

  const handleGeneralCategoryClick = async (category: any) => {
    if (category.id === 'labour') {
      setActiveLabourGroup('ROOT');
      return;
    }

    // Seller flow: clicking a master must lead into the specification step
    // (Buy New / Repair / etc.) — the variant choice is what determines
    // businessType downstream. Without it, an Electronics seller would land
    // on /register with no way to signal they're a repair shop.
    if (role === 'SELLER') {
      // Single-select master, drop any prior subs of a different master.
      setSelectedCategories([
        { id: category.id, name: category.name, parentId: category.id },
      ]);
      setLastSelectedCategory(category);
      setSubSearchQuery('');
      setLoadingSub(true);
      const subs = await fetchCategories(category.id);
      setSubcategories(subs);
      setLoadingSub(false);
      // Drill into the specification view straight away.
      setActiveParent(category);
      return;
    }

    // Buyer flow: stay on the master grid, toggle the master on/off.
    const isAlreadySelected = selectedCategories.some((c) => c.parentId === category.id);
    if (isAlreadySelected) {
      setSelectedCategories([]);
      setLastSelectedCategory(null);
    } else {
      setSelectedCategories([
        { id: category.id, name: category.name, parentId: category.id },
      ]);
      setLastSelectedCategory(category);
    }
    setSubSearchQuery('');
    setLoadingSub(true);
    const subs = await fetchCategories(category.id);
    setSubcategories(subs);
    setLoadingSub(false);
  };

  const handleExplore = async (category: Category) => {
    setActiveParent(category);
    setSubSearchQuery('');
    setLoadingSub(true);
    const subs = await fetchCategories(category.id);
    setSubcategories(subs);
    setLoadingSub(false);
  };

  const handleLabourGroupClick = (group: any) => setActiveLabourGroup(group);

  // Context-aware Back for the labour picker's two dedicated screens (mirrors
  // the specialty view's screen-by-screen flow — no inline accordion):
  //   • Trades screen (a specific track chosen) → back to the track picker.
  //   • Track picker (ROOT) → exit the picker entirely: to the caller's onBack
  //     for the auto-labour sub-role, else back to the master category grid.
  const labourBack = () => {
    if (activeLabourGroup && activeLabourGroup !== 'ROOT') {
      setActiveLabourGroup('ROOT');
    } else if (autoLabour) {
      onBack?.();
    } else {
      setActiveLabourGroup(null);
    }
  };

  const handleLabourSubTypeSelect = (subType: any) => {
    if (role) {
      setSelectedCategories((prev) => {
        let basePrev = prev[0]?.parentId !== 'labour' ? [] : prev;
        return basePrev.find((c) => c.id === subType.id)
          ? basePrev.filter((c) => c.id !== subType.id)
          : [...basePrev, { id: subType.id, name: subType.label, parentId: 'labour' } as Category];
      });
      return;
    }
    if (onComplete)
      onComplete({
        category: subType.label,
        categoryId: subType.id,
        isLabour: true,
        labourGroup: activeLabourGroup.id,
        inquirySchemaKey: subType.inquirySchemaKey,
      });
    setActiveLabourGroup(null);
  };

  const toggleSubcategory = (category: Category) => {
    setSelectedCategories((prev) => {
      if (!role) return prev.find((c) => c.id === category.id) ? [] : [category];
      let basePrev = prev[0]?.parentId !== category.parentId ? [] : prev;
      return basePrev.find((c) => c.id === category.id)
        ? basePrev.filter((c) => c.id !== category.id)
        : [...basePrev, category];
    });
  };

  // Image-led specialty card: one mutually-exclusive choice per item —
  // Sell New (buy variant) / Repair (repair variant) / Both (both). Selecting a
  // choice replaces this item's prior selection; re-picking the active choice
  // clears it (so a card can be switched off). Selecting an item from a
  // different master first drops the other master's subs (same rule as
  // toggleSubcategory), keeping the parentId-grouping contract intact.
  const setSpecialtyChoice = (
    buy: Category | undefined,
    repair: Category | undefined,
    choice: SpecialtyState,
    current: SpecialtyState | null,
  ) => {
    const parentId = (buy ?? repair)?.parentId;
    setSelectedCategories((prev) => {
      const base = prev[0]?.parentId !== parentId ? [] : prev;
      // Clear any prior variant of THIS item, keep the rest.
      const withoutThis = base.filter(
        (c) => c.id !== buy?.id && c.id !== repair?.id,
      );
      if (choice === current) return withoutThis; // toggle off
      const next = [...withoutThis];
      if ((choice === 'sell' || choice === 'both') && buy) next.push(buy);
      if ((choice === 'repair' || choice === 'both') && repair) next.push(repair);
      return next;
    });
  };

  const handleCompleteFinal = async () => {
    if (!onComplete) return;

    // Transition to subcategory view if we're on the main screen and have a single selection
    // or if we want to force the subcategory flow for the first selected item
    if (!activeParent && !activeLabourGroup && selectedCategories.length > 0) {
      // Find the first selected category that isn't already a subcategory selection
      // (In this case, handleGeneralCategoryClick adds the parent itself to selectedCategories)
      const firstParent = selectedCategories[0];
      const parentInGeneral = generalCategories.find((c) => c.id === firstParent.id);
      if (parentInGeneral) {
        handleExplore(parentInGeneral);
        return;
      }
    }

    setLoading(true);
    try {
      const parentGroups: Record<string, Category[]> = {};
      selectedCategories.forEach((c) => {
        if (c.parentId) {
          if (!parentGroups[c.parentId]) parentGroups[c.parentId] = [];
          parentGroups[c.parentId].push(c);
        }
      });
      const parentIds = Object.keys(parentGroups);
      const allSubsByParent = await Promise.all(
        parentIds.map(async (pId) => ({ pId, subs: await fetchCategories(pId) }))
      );
      // Phase: matching — emit category IDs (not display names). The
      // backend stores junction rows keyed by id; frontend rendering
      // looks names up via CATEGORIES_DB. If every sub of a parent is
      // selected, collapse to the parent id; otherwise emit the sub
      // ids individually.
      const consolidated: string[] = [];
      for (const { pId, subs } of allSubsByParent) {
        const selectedSubs = parentGroups[pId];
        if (selectedSubs.length === subs.length && subs.length > 0) {
          consolidated.push(pId);
        } else {
          consolidated.push(...selectedSubs.map((c) => c.id));
        }
      }
      consolidated.push(
        ...selectedCategories.filter((c) => !c.parentId).map((c) => c.id),
      );
      onComplete(Array.from(new Set(consolidated)));
    } catch (e) {
      onComplete(selectedCategories.map((c) => c.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        isStandalone
          ? 'w-full min-h-screen bg-[#f5f2ed] relative font-sans'
          : 'w-full relative font-sans'
      }
    >
      <div
        ref={viewWrapRef}
        className={`${isStandalone ? 'max-w-[1400px] mx-auto px-6 md:px-12 py-10 md:py-20' : 'w-full py-4'}`}
      >
        {activeParent ? (
          <div className="flex flex-col">
            {hideHeader ? (
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => preselectedParentId ? onBack?.() : setActiveParent(null)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9973A] hover:gap-2.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {preselectedParentId ? 'Back to shops' : 'Back'}
                </button>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px]">
                  {activeParent.name}
                </span>
              </div>
            ) : (
              <div className="mb-8 sm:mb-10">
                <button
                  onClick={() => preselectedParentId ? onBack?.() : setActiveParent(null)}
                  className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-5 hover:text-[#C9973A] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> {preselectedParentId ? 'Back to shops' : 'Back to categories'}
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A] mb-3">
                  {activeParent.name} <span className="text-slate-300 mx-1">·</span> Step 02 / Specialty
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a1a2e] tracking-tight leading-[1.1] mb-3 sm:mb-4">
                  Choose your <span className="text-[#C9973A]">specialty</span>
                </h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
                  Pick the item type and tell us whether you're <span className="font-bold text-[#1a1a2e]">buying new</span> or <span className="font-bold text-[#1a1a2e]">repairing</span> the existing one. You can select more than one.
                </p>
              </div>
            )}
            {loadingSub ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#C9973A]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Loading details
                </p>
              </div>
            ) : groupedSubcategories.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-slate-400 font-medium">No specialties available for this category yet.</p>
              </div>
            ) : (
              <div
                className={
                  hideHeader
                    ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 items-start'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5'
                }
              >
                {groupedSubcategories.map((group) => {
                  const SubIcon = getSubCategoryIcon(group.baseName);
                  const hasSelection = group.variants.some((v) =>
                    selectedCategories.some((c) => c.id === v.sub.id)
                  );

                  // Compact specialty card for the embedded registration
                  // shell — header sits in the AuthSplitLayout shell instead
                  // of inside each card.
                  if (hideHeader) {
                    const isRepairVar = (v: (typeof group.variants)[number]) =>
                      v.sub.type === 'repair' ||
                      /repair|restoration|upholstery|recovery/i.test(v.action || '');
                    const buy = group.variants.find((v) => !isRepairVar(v))?.sub;
                    const repair = group.variants.find((v) => isRepairVar(v))?.sub;
                    const stem = group.variants[0].sub.id.replace(/-(buy|repair)$/, '');
                    const isMultiVariant = !!buy && !!repair;

                    // Multi-variant (Buy + Repair) with a per-state preview set →
                    // the dynamic Sell New / Repair / Both card.
                    const sellUrl = isMultiVariant ? getSpecialtyPreview(stem, 'sell') : undefined;
                    if (isMultiVariant && sellUrl) {
                      const hasBuySel = !!buy && selectedCategories.some((c) => c.id === buy.id);
                      const hasRepSel =
                        !!repair && selectedCategories.some((c) => c.id === repair.id);
                      const current: SpecialtyState | null =
                        hasBuySel && hasRepSel
                          ? 'both'
                          : hasBuySel
                            ? 'sell'
                            : hasRepSel
                              ? 'repair'
                              : null;
                      return (
                        <SpecialtyImageCard
                          key={group.baseName}
                          baseName={group.baseName}
                          previews={{
                            sell: sellUrl,
                            repair: getSpecialtyPreview(stem, 'repair'),
                            both: getSpecialtyPreview(stem, 'both'),
                          }}
                          hasBuy={!!buy}
                          hasRepair={!!repair}
                          current={current}
                          onChoose={(choice) =>
                            setSpecialtyChoice(buy, repair, choice, current)
                          }
                        />
                      );
                    }

                    // Single-variant item (automotive, gaming, …) with a single
                    // preview → image-led card using the item's real action label.
                    const singleImg = !isMultiVariant ? getSpecialtyImage(stem) : undefined;
                    if (singleImg) {
                      const v = group.variants[0];
                      return (
                        <SpecialtySingleCard
                          key={group.baseName}
                          baseName={group.baseName}
                          image={singleImg}
                          actionLabel={v.action || 'Select'}
                          selected={selectedCategories.some((c) => c.id === v.sub.id)}
                          onToggle={() => toggleSubcategory(v.sub)}
                        />
                      );
                    }

                    // No artwork → original icon-chip card (until images land, and
                    // multi-variant non-electronics service specialties).
                    return (
                      <div
                        key={group.baseName}
                        className={`group/card relative p-3 rounded-2xl bg-white border transition-all duration-200 ${
                          hasSelection
                            ? 'border-[#C9973A]/60 shadow-[0_8px_24px_-14px_rgba(201,151,58,0.4)]'
                            : 'border-[#e8e4dc] hover:border-[#C9973A]/40 hover:shadow-[0_6px_18px_-14px_rgba(26,22,18,0.12)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A]">
                            <SubIcon className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-[#1a1612] text-[12px] leading-tight tracking-tight line-clamp-2 min-w-0 flex-1">
                            {group.baseName}
                          </h3>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {group.variants.map((variant) => {
                            const selected = selectedCategories.some(
                              (c) => c.id === variant.sub.id
                            );
                            const isRepairAction =
                              /repair|restoration|upholstery|recovery/i.test(
                                variant.action || ''
                              );
                            const ActionIcon = isRepairAction ? Wrench : ShoppingBag;
                            const label = variant.action || 'Select';
                            return (
                              <button
                                key={variant.sub.id}
                                type="button"
                                onClick={() => toggleSubcategory(variant.sub)}
                                className={`relative w-full px-2.5 h-9 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 flex items-center gap-1.5 ${
                                  selected
                                    ? isRepairAction
                                      ? 'bg-gradient-to-b from-[#1a1a2e] to-[#262640] text-white border border-[#0f1023] shadow-[0_4px_12px_-6px_rgba(26,26,46,0.5)]'
                                      : 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white border border-[#a87a1f] shadow-[0_4px_12px_-6px_rgba(201,151,58,0.5)]'
                                    : 'bg-white border border-[#C9973A]/30 text-[#C9973A] hover:border-[#C9973A]/60 hover:bg-[#fdf6e9]/50'
                                }`}
                              >
                                <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="flex-1 text-left truncate">{label}</span>
                                {selected && (
                                  <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Full standalone card — used in the buyer's inquiry page
                  // where there's room for a richer header.
                  return (
                    <div
                      key={group.baseName}
                      className={`group/card relative p-5 sm:p-6 md:p-7 rounded-[20px] bg-white border transition-all duration-500 ease-out ${
                        hasSelection
                          ? 'border-[#C9973A]/60 shadow-[0_18px_40px_-12px_rgba(201,151,58,0.22)]'
                          : 'border-[#C9973A]/20 hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(201,151,58,0.18)]'
                      }`}
                    >
                      {hasSelection && (
                        <div
                          aria-hidden="true"
                          className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#C9973A] shadow-[0_0_0_5px_rgba(201,151,58,0.18)]"
                        />
                      )}

                      <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                          <SubIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="font-bold text-[#1a1a2e] text-[15px] sm:text-base leading-snug tracking-tight break-words">
                            {group.baseName}
                          </h3>
                          {group.variants.length > 1 && (
                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9973A]/55 mt-1.5">
                              Two paths
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`grid gap-2 sm:gap-2.5 ${
                          group.variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {group.variants.map((variant) => {
                          const selected = selectedCategories.some((c) => c.id === variant.sub.id);
                          const isRepairAction = /repair|restoration|upholstery|recovery/i.test(
                            variant.action || ''
                          );
                          const ActionIcon = isRepairAction ? Wrench : ShoppingBag;
                          const label = variant.action || 'Select';
                          return (
                            <button
                              key={variant.sub.id}
                              onClick={() => toggleSubcategory(variant.sub)}
                              className={`relative px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                selected
                                  ? isRepairAction
                                    ? 'bg-gradient-to-br from-[#1a1a2e] to-[#262640] text-white border border-[#0f1023] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_-4px_rgba(26,26,46,0.45)]'
                                    : 'bg-gradient-to-br from-[#C9973A] to-[#b58726] text-white border border-[#a87a1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_18px_-4px_rgba(201,151,58,0.5)]'
                                  : 'bg-white border border-[#C9973A]/30 text-[#C9973A] hover:border-[#C9973A]/60 hover:bg-[#fdf6e9]/50'
                              }`}
                            >
                              <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{label}</span>
                              {selected && (
                                <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!hideSubmitButton && (
              <div className="mt-10 sm:mt-12 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
                <button
                  onClick={() => preselectedParentId ? onBack?.() : setActiveParent(null)}
                  className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-slate-600 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 hover:border-slate-300 hover:text-[#1a1a2e] transition-all border border-slate-200"
                >
                  {preselectedParentId ? 'Back to shops' : 'Change Industry'}
                </button>
                <button
                  onClick={handleCompleteFinal}
                  className="relative overflow-hidden px-8 sm:px-10 py-3.5 sm:py-4 bg-[#C9973A] text-white rounded-full font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#C9973A]/25 hover:bg-[#b8861e] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span className="relative z-10">Complete Selection</span>
                  {/* directional sweep — soft navy comet trails left→right, hinting "press me to continue" */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute bottom-2 left-0 h-[2px] w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#1B3068] to-transparent pointer-events-none"
                    initial={{ x: '-50%' }}
                    animate={{ x: '300%' }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      repeatDelay: 0.25,
                    }}
                  />
                </button>
              </div>
            )}

            {/* Embedded selection counter — visible while picking variants */}
            {hideSubmitButton && selectedCategories.some((c) => c.parentId !== c.id) && (
              <div className="mt-5 flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                  {selectedCategories.filter((c) => c.parentId !== c.id).length} Selected
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#1a1612]/45">
                  Pick all that apply
                </p>
              </div>
            )}
          </div>
        ) : activeLabourGroup ? (
          activeLabourGroup === 'ROOT' ? (
            /* ── Screen A: track picker ───────────────────────────────────
               Pick a track first. Selecting one transitions to its own
               dedicated trades screen (Screen B) — a clean screen swap that
               mirrors the Service specialty flow, never an inline accordion. */
            <div className="flex flex-col">
              {hideHeader ? (
                // Registration shell already shows the "Choose Your Trade"
                // header; keep just a compact back + track chip (no duplicate).
                <div className="mb-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={labourBack}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9973A] hover:gap-2.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px]">
                    Labour &amp; Skills
                  </span>
                </div>
              ) : (
                <div className="mb-8 sm:mb-10">
                  <button
                    onClick={labourBack}
                    className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-5 hover:text-[#C9973A] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A] mb-3">
                    Labour &amp; Skills <span className="text-slate-300 mx-1">·</span> Step 02 / Track
                  </p>
                  <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a1a2e] tracking-tight leading-[1.1] mb-3 sm:mb-4">
                    Choose your <span className="text-[#C9973A]">track</span>
                  </h1>
                  <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
                    Pick the track that best fits your work.
                  </p>
                </div>
              )}

              {/* Track picker — labels like "Construction & Building" need room,
                  so wider cards (2–3 cols), not a cramped 6-up row. */}
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] mb-3">
                Choose a track
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {LABOUR_CATEGORY_GROUPS.map((g) => {
                  const GroupIcon = LABOUR_GROUP_ICONS[g.id] || Wrench;
                  const img = getLabourGroupImage(g.label);
                  const frameCls =
                    'group/card relative rounded-2xl bg-white border border-[#e8e4dc] hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(26,22,18,0.18)] transition-all duration-300 ease-out text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white';

                  // Image-led track card (track has artwork): photo on top, label +
                  // arrow beneath. Falls back to the icon chip when no image.
                  if (img) {
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => handleLabourGroupClick(g)}
                        className={`${frameCls} overflow-hidden flex flex-col`}
                      >
                        <div className="relative aspect-[4/3] bg-[#f5efe4]">
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out lg:group-hover/card:scale-[1.03]"
                          />
                        </div>
                        <div className="p-3 flex items-center gap-2">
                          <h3 className="font-bold text-[#1a1a2e] text-[12px] sm:text-[13px] leading-tight tracking-tight min-w-0 flex-1">
                            {g.label}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-[#C9973A]/40 shrink-0 transition-transform duration-200 group-hover/card:translate-x-0.5 group-hover/card:text-[#C9973A]" />
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handleLabourGroupClick(g)}
                      className={`${frameCls} p-4 flex items-center gap-3`}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <GroupIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-[#1a1a2e] text-[12px] sm:text-[13px] leading-tight tracking-tight min-w-0 flex-1">
                        {g.label}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-[#C9973A]/40 shrink-0 transition-transform duration-200 group-hover/card:translate-x-0.5 group-hover/card:text-[#C9973A]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Screen B: trades for the chosen track ─────────────────────
               A dedicated screen (mirrors the specialty view); Back returns to
               the track picker. The track grid is intentionally absent here. */
            <div className="flex flex-col">
              {hideHeader ? (
                <div className="mb-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={labourBack}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9973A] hover:gap-2.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px]">
                    {activeLabourGroup.label}
                  </span>
                </div>
              ) : (
                <div className="mb-8 sm:mb-10">
                  <button
                    onClick={labourBack}
                    className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-5 hover:text-[#C9973A] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to tracks
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A] mb-3">
                    {activeLabourGroup.label} <span className="text-slate-300 mx-1">·</span> Step 03 / Trade
                  </p>
                  <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a1a2e] tracking-tight leading-[1.1] mb-3 sm:mb-4">
                    Choose your <span className="text-[#C9973A]">trade</span>
                  </h1>
                  <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
                    Pick the specific trade you specialise in.
                  </p>
                </div>
              )}

              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#C9973A]/15" />
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] whitespace-nowrap">
                  {activeLabourGroup.label} · Pick a trade
                </p>
                <div className="h-px flex-1 bg-[#C9973A]/15" />
              </div>
              {/* Embedded (registration pane): cap at 2 cols so the rich
                  icon+label+description cards never clip inside the ~58% pane —
                  `xl:grid-cols-4` fires off the viewport, not this container. */}
              {(() => {
                const trades = LABOUR_CATEGORIES.filter(
                  (c) => c.category === activeLabourGroup.id,
                );
                // A track is image-led only when its trades ship artwork (today:
                // Construction). Image tracks use the compact 2-up grid the
                // specialty screen uses; icon-only tracks keep the roomier
                // horizontal cards. Within a track the layout is uniform.
                const trackHasImages = trades.some((s) => getLabourImage(s.id));
                return (
                  <div
                    className={
                      trackHasImages
                        ? hideHeader
                          ? 'grid grid-cols-2 lg:grid-cols-3 gap-3 items-start'
                          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 items-start'
                        : hideHeader
                          ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5'
                    }
                  >
                    {trades.map((s) => {
                      const TradeIcon =
                        LABOUR_SUB_ICONS[s.icon] ||
                        LABOUR_GROUP_ICONS[activeLabourGroup.id] ||
                        Wrench;
                      const selected = selectedCategories.some((c) => c.id === s.id);
                      const img = getLabourImage(s.id);
                      const frameCls = `group/card relative rounded-[20px] bg-white border text-left transition-all duration-500 ease-out ${
                        selected
                          ? 'border-[#C9973A]/60 shadow-[0_18px_40px_-12px_rgba(201,151,58,0.22)]'
                          : 'border-[#C9973A]/20 hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(201,151,58,0.18)]'
                      }`;

                      // Image-led card (trade has artwork): photo on top, label +
                      // description below — mirrors the specialty image cards.
                      if (img) {
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => handleLabourSubTypeSelect(s)}
                            className={`${frameCls} overflow-hidden flex flex-col`}
                          >
                            <div className="relative aspect-[4/3] bg-[#f5efe4]">
                              <img
                                src={img}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out lg:group-hover/card:scale-[1.03]"
                              />
                              {selected && (
                                <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#C9973A] flex items-center justify-center shadow-md shadow-[#C9973A]/40">
                                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="font-bold text-[#1a1a2e] text-[13px] leading-snug tracking-tight">
                                {s.label}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                                {s.description}
                              </p>
                            </div>
                          </button>
                        );
                      }

                      // No artwork → original icon-chip horizontal card.
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => handleLabourSubTypeSelect(s)}
                          className={`${frameCls} p-5 flex items-start gap-4`}
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                            <TradeIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <h4 className="font-bold text-[#1a1a2e] text-[15px] leading-snug tracking-tight">
                              {s.label}
                            </h4>
                            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                              {s.description}
                            </p>
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-[#C9973A] flex items-center justify-center shrink-0 shadow-sm">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )
        ) : preselectedParentId ? (
          // Targeted-shop flow: skip the parent grid entirely while waiting for
          // handleExplore to fire. Shows the same spinner the specialty view uses
          // so the transition feels like a single continuous load, not a missed step.
          <div className={`flex flex-col items-center justify-center gap-4 ${hideHeader ? 'py-12' : 'py-24'}`}>
            <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Loading specialties
            </p>
          </div>
        ) : (
          <div className={`flex flex-col ${hideHeader ? 'gap-5' : 'gap-10 sm:gap-12 lg:gap-16'}`}>
            {!hideHeader && (
              <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8 xl:gap-12">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 sm:gap-4 mb-6 md:mb-8">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-[#C9973A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                        Master Selection
                      </p>
                      <h2 className="text-[11px] sm:text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">
                        Step 01 / Inquiry Flow
                      </h2>
                    </div>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold text-[#1a1a2e] tracking-tight leading-[1.1] mb-5 sm:mb-6 md:mb-8">
                    What are you{' '}
                    <span className="text-[#C9973A] relative inline-block whitespace-nowrap">
                      looking for?
                      <svg
                        className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2 sm:h-3 text-[#C9973A]/20"
                        viewBox="0 0 100 10"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 5 Q 25 0 50 5 T 100 5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                        />
                      </svg>
                    </span>
                  </h1>
                  <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl leading-relaxed">
                    Choose the categories that align with your requirements. Our intelligent system
                    handles the matching and workflow optimization.
                  </p>
                </div>

                <div className="w-full xl:w-[450px] xl:shrink-0">
                  <div className="relative group">
                    <Search className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-[#C9973A]" />
                    <input
                      type="text"
                      placeholder="Search 500+ categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 md:py-6 bg-white border-2 border-slate-200 focus:border-[#C9973A]/40 rounded-2xl sm:rounded-[28px] xl:rounded-[32px] text-base sm:text-lg outline-none transition-all placeholder:text-slate-300 shadow-sm focus:shadow-[0_8px_24px_rgba(201,151,58,0.08)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Compact search bar — only when header is hidden (embedded mode) */}
            {hideHeader && (
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#C9973A]/55" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search categories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-4 h-[52px] bg-brand-white border border-[#e8e0d0] rounded-2xl text-[14px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1)] outline-none transition-all duration-200 font-medium placeholder:text-[#1a1612]/35"
                />
              </div>
            )}

            {hideHeader ? (
              <div className="relative">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {filteredCategories.map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      isSelected={selectedCategories.some((s) => s.parentId === c.id)}
                      onClick={() => handleGeneralCategoryClick(c)}
                      onHover={setHoveredCategory}
                      compact
                    />
                  ))}
                </div>
                {filteredCategories.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-[12px] font-medium text-[#1a1612]/45">
                      No categories match "{searchQuery}".
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {filteredCategories.map((c) => (
                  <CategoryCard
                    key={c.id}
                    category={c}
                    isSelected={selectedCategories.some((s) => s.parentId === c.id)}
                    onClick={() => handleGeneralCategoryClick(c)}
                    onHover={setHoveredCategory}
                  />
                ))}
              </div>
            )}

            {!hideHeader && (
              <div ref={nextStepRef} className="scroll-mt-6 sm:scroll-mt-10">
                <WorkflowIllustration
                  category={hoveredCategory || lastSelectedCategory}
                  onExplore={() => {
                    const target = hoveredCategory || lastSelectedCategory;
                    if (target) handleExplore(target);
                  }}
                />
              </div>
            )}

            {!hideSubmitButton && (
              <AnimatePresence>
                {selectedCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className="w-full flex justify-center"
                  >
                    <div className="w-full max-w-3xl bg-white rounded-3xl sm:rounded-[40px] p-3 sm:p-4 flex items-center justify-between gap-3 border border-slate-100 shadow-[0_20px_50px_rgba(26,22,18,0.08)]">
                      <div className="flex items-center gap-3 sm:gap-6 pl-3 sm:pl-6 text-[#1a1a2e] min-w-0">
                        <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest truncate">
                          {selectedCategories.length} Selected
                        </span>
                      </div>
                      <button
                        onClick={handleCompleteFinal}
                        className="h-12 sm:h-14 md:h-16 px-5 sm:px-8 md:px-10 bg-[#C9973A] text-white rounded-2xl sm:rounded-[32px] font-black text-[11px] sm:text-[13px] uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-[#b8861e] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 sm:gap-3 shrink-0"
                      >
                        <span className="hidden sm:inline">Continue to Details</span>
                        <span className="sm:hidden">Continue</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Embedded selection counter — small, gold pill */}
            {hideSubmitButton && selectedCategories.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                  {selectedCategories.length} Selected
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#1a1612]/45">
                  Click a category to refine
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
