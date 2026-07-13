import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Truck,
  Wrench,
  Check,
  Music,
  Calendar,
  Smartphone,
  Armchair,
  Shirt,
  Home,
  Car,
  Hammer,
  Tractor,
  Laptop,
  User,
  Building2,
  Briefcase,
  Package,
  Settings,
  Layers,
  FileText,
  Users,
  ShieldCheck,
  Star,
  MapPin,
  TrendingUp,
  CreditCard,
  BadgeCheck,
  CalendarCheck,
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { SubRole } from '../types';
import { CATEGORIES_DB, getCategoryNature, Category } from '../services/categories';
import { useCategoryAvailability } from '../services/categories/availability';
import CategorySelection from '../components/CategorySelection';
import RoleCardStack, { type RoleBanner } from '../components/RoleCardStack';
import BuyerAccountCards from '../components/BuyerAccountCards';
import { normalizeSpecialtyKey } from '../components/buyer/categoryMeta';
import { useLiteMotion } from '../hooks/useLiteMotion';
import { nudgeRepaint } from '../utils/forceRepaint';

// ─── Tier-1 role-card config ────────────────────────────────────────
// Each entry renders as one composed 60/40 card in the vertical stack.
// The photo side crops the banner artwork in src/assets/images/onboarding/
// to its photographic right half (falling back to the Unsplash photo).
const ROLE_BANNERS: RoleBanner[] = [
  {
    id: 'BUYER',
    artKey: 'buyer',
    eyebrow: 'Premium · Shopping',
    headline: "I'm a Buyer",
    description: 'Source products, services & skilled labour from verified Zambian providers.',
    valueProps: [
      { icon: ShieldCheck, label: 'Verified Sellers' },
      { icon: Star, label: 'Trusted Reviews' },
      { icon: MapPin, label: 'Nearby Businesses' },
    ],
    cta: 'Start Shopping',
    fallbackImage:
      'https://images.unsplash.com/photo-1556740734-7f95834d0ff9?auto=format&fit=crop&q=80&w=1200&h=675',
  },
  {
    id: 'SELLER',
    artKey: 'seller',
    eyebrow: 'Seller · Business',
    headline: "I'm a Seller",
    description: 'Turn stock into sales — reach serious buyers and quote on real demand.',
    valueProps: [
      { icon: Store, label: 'Digital Store' },
      { icon: TrendingUp, label: 'Business Growth' },
      { icon: CreditCard, label: 'Secure Payments' },
    ],
    cta: 'Start Selling',
    fallbackImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200&h=675',
  },
  {
    id: 'SERVICE_PROVIDER',
    artKey: 'provider',
    eyebrow: 'Service · Professional',
    headline: "I'm a Service Provider",
    description: 'Repairs, events, entertainment, skilled trades — customers book you.',
    valueProps: [
      { icon: BadgeCheck, label: 'Verified Pro' },
      { icon: CalendarCheck, label: 'Easy Booking' },
      { icon: Star, label: 'Customer Rated' },
    ],
    cta: 'Offer Services',
    fallbackImage:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200&h=675',
  },
];



// ─── Company position artwork ("Your Position" step) ────────────────
// Photos live in src/assets/images/onboarding/company onboarding/, named for
// the position LABEL ("Procurement Officer.webp", "Manager  Owner.webp"). Keyed
// via the shared `normalizeSpecialtyKey`, so "/"→space and "&" collapse to the
// card title with no rename ("Manager / Owner" → `manager-owner`). Missing ⇒
// the position card keeps its icon chip.
const POSITION_ART = import.meta.glob(
  '../assets/images/onboarding/company onboarding/*.{png,jpg,jpeg,webp}',
  { eager: true, import: 'default' },
) as Record<string, string>;

const POSITION_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(POSITION_ART)) {
  POSITION_BY_KEY[normalizeSpecialtyKey(path.split('/').pop()!)] = url;
}

const getPositionImage = (title: string): string | undefined =>
  POSITION_BY_KEY[normalizeSpecialtyKey(title)];

interface RoleOption {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: any;
  subRole: SubRole;
  /** Photo-forward account cards only: artwork stem + crop + affordance. */
  artKey?: string;
  focalPoint?: string;
  hint?: string;
  fallbackImage?: string;
}

const buyerSubRoles: RoleOption[] = [
  {
    id: 'INDIVIDUAL_BUYER',
    eyebrow: 'Individual · Personal',
    title: 'Personal Account',
    description: 'Shop for yourself and your family — everyday goods, services & more.',
    icon: User,
    subRole: 'INDIVIDUAL_BUYER',
    artKey: 'individual account',
    focalPoint: '58% 38%',
    hint: 'Select',
    fallbackImage:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800&h=800',
  },
  {
    id: 'COMPANY_BUYER',
    eyebrow: 'Business · Corporate',
    title: 'Company Account',
    description: 'Procure materials and services for your business, with team roles.',
    icon: Building2,
    subRole: 'COMPANY_BUYER',
    artKey: 'company account',
    focalPoint: '76% 35%',
    hint: 'View positions',
    fallbackImage:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800&h=800',
  },
];

const companySubRoles: RoleOption[] = [
  {
    id: 'COMPANY_PROCUREMENT_OFFICER',
    eyebrow: 'Procurement',
    title: 'Procurement Officer',
    description: 'Manage purchasing and supplier relationships.',
    icon: ShoppingBag,
    subRole: 'COMPANY_PROCUREMENT_OFFICER',
  },
  {
    id: 'COMPANY_SECRETARY',
    eyebrow: 'Administration',
    title: 'Secretary',
    description: 'Handle administrative tasks and communications.',
    icon: FileText,
    subRole: 'COMPANY_SECRETARY',
  },
  {
    id: 'COMPANY_RECEPTIONIST',
    eyebrow: 'Front Desk',
    title: 'Receptionist',
    description: 'Manage front desk and initial inquiries.',
    icon: Users,
    subRole: 'COMPANY_RECEPTIONIST',
  },
  {
    id: 'COMPANY_MANAGER',
    eyebrow: 'Leadership',
    title: 'Manager / Owner',
    description: 'Full access to company account and settings.',
    icon: Building2,
    subRole: 'COMPANY_MANAGER',
  },
];

// SELLER tier-2: only goods-shaped business models. The "Services Only" card
// moved to the SERVICE_PROVIDER role (where it belongs); a service business
// doesn't transfer ownership of goods. Hybrid (goods + repair) and Wholesale
// were retired as separate subRoles in Phase 1.5 — both are now expressed
// natively via the archetype set on the active profile (a phone shop that
// repairs ends up with archetypes=['RETAIL','REPAIR']; a wholesaler picks
// wholesale-tagged categories and resolves to archetype=WHOLESALE).
const sellerSubRoles: RoleOption[] = [
  {
    id: 'PRODUCT_SELLER',
    eyebrow: 'Goods · Inventory',
    title: 'Products',
    description: 'Sell physical goods and stocked inventory.',
    icon: Package,
    subRole: 'PRODUCT_SELLER',
  },
];

// SERVICE_PROVIDER tier-2: two kinds of provider —
//   Service  → books/rents/performs/fixes (solo pro OR agency; identical
//              downstream, so they're one option). Sees service categories.
//   Skilled Labour → tradespeople. Goes straight to the trade picker.
// Tier 3 shows each its own category set (see categoryFilter below).
const serviceProviderSubRoles: RoleOption[] = [
  {
    id: 'INDIVIDUAL_PROVIDER',
    eyebrow: 'Service · Professional',
    title: 'Service',
    description: 'Solo pro or agency — repairs, events, entertainment, IT, consulting.',
    icon: Briefcase,
    subRole: 'INDIVIDUAL_PROVIDER',
  },
  {
    id: 'SKILLED_LABOUR',
    eyebrow: 'Trade · Hands-on',
    title: 'Labour',
    description: 'Tradesperson — carpenter, welder, plumber, electrician.',
    icon: Wrench,
    subRole: 'SKILLED_LABOUR',
  },
  {
    id: 'MACHINERY_HIRE',
    eyebrow: 'Equipment · Hire',
    title: 'Heavy Machinery for Hire',
    description: 'Rent out plant & equipment — excavators, cranes, tippers, generators.',
    icon: Truck,
    subRole: 'MACHINERY_HIRE',
  },
];

type MasterRole = 'BUYER' | 'SELLER' | 'SERVICE_PROVIDER';

export default function RoleSelection() {
  const [tier, setTier] = useState(1);
  // Tier-1 is a carousel now — the visible banner IS the selection, so a
  // role is always chosen (defaults to the first banner, Buyer).
  const [masterRole, setMasterRole] = useState<MasterRole | null>('BUYER');
  const [selectedSubRole, setSelectedSubRole] = useState<SubRole | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);
  const [isViewingSubcategories, setIsViewingSubcategories] = useState(false);
  const navigate = useNavigate();
  // Promoter referral attribution: a shared link lands here as
  // /role-selection?ref=REF-XXXXXXXX. Carry the code through every hop to
  // /register so it reaches the backend with the account creation itself.
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const refSuffix = referralCode ? `&ref=${encodeURIComponent(referralCode)}` : '';

  // Android-GPU ghosting guard (see useLiteMotion.ts). On touch devices the
  // tier slides are stripped entirely — prop ABSENCE (not duration:0) is what
  // makes AnimatePresence mode="wait" unmount the outgoing tier synchronously,
  // guaranteeing exactly one tier subtree in the DOM at any moment. NB: this
  // relies on every nested motion element keeping its own AnimatePresence
  // wrapper (true today); a bare motion.* with an `exit` prop directly inside
  // a tier div would re-introduce an exit wait.
  const lite = useLiteMotion();
  const slide = (dir: number) =>
    lite
      ? {}
      : {
          initial: { x: dir * 20, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: dir * 20, opacity: 0 },
        };

  // Belt-and-braces: after each step swap, force the compositor to re-raster
  // the wizard region so stale tiles from the previous step can't survive.
  const tierWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nudgeRepaint(tierWrapRef.current);
  }, [tier]);

  const handleSubRoleSelect = (subRole: SubRole) => {
    if (subRole === 'COMPANY_BUYER') {
      setIsCompanyExpanded(true);
      setSelectedSubRole(null);
    } else {
      setSelectedSubRole(subRole);
    }
  };

  const { isAvailable, disabledIds } = useCategoryAvailability();

  const filteredCategories = React.useMemo(() => {
    if (!selectedSubRole) return [];

    // Only root categories for selection — and only ones the admin hasn't
    // switched off (category control).
    const rootCategories = CATEGORIES_DB.filter((c) => !c.parentId && isAvailable(c.id));

    if (selectedSubRole === 'PRODUCT_SELLER') {
      return rootCategories.filter((c) => {
        const nature = getCategoryNature(c.id);
        return nature === 'PRODUCT' || nature === 'BOTH';
      });
    }
    // SERVICE_PROVIDER subRoles all see service categories. Tier-3 click
    // drills into the specialty step where the variant (Repair / Hire /
    // Performance / etc.) is picked.
    if (
      selectedSubRole === 'INDIVIDUAL_PROVIDER' ||
      selectedSubRole === 'AGENCY_PROVIDER' ||
      selectedSubRole === 'SKILLED_LABOUR' ||
      selectedSubRole === 'MACHINERY_HIRE'
    ) {
      // Services + labour only — pure-SERVICE categories. BOTH-nature
      // categories (Automotive, Agriculture) are product catalogs that belong
      // to the seller flow, so they're excluded here to avoid repeats.
      return rootCategories.filter((c) => getCategoryNature(c.id) === 'SERVICE');
    }
    return rootCategories;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubRole, disabledIds]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleContinue = () => {
    if (tier === 1 && masterRole) {
      setTier(2);
    } else if (tier === 2 && selectedSubRole) {
      // Both SELLER and SERVICE_PROVIDER need to pick categories at tier 3.
      // BUYER skips it — they pick categories at inquiry time, not at registration.
      if (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER') {
        setTier(3);
      } else {
        navigate(`/register?role=${masterRole}&subRole=${selectedSubRole}${refSuffix}`);
      }
    } else if (tier === 3 && selectedCategories.length > 0) {
      // selectedCategories is now an array of stable category IDs
      // (CategorySelection.onChange emits ids per Phase: matching).
      // We pass them as `categoryIds=` so the receiver in Register.tsx
      // routes them to the backend junction tables via updateUser
      // ({ categoryIds: [...] }).
      const categoryIdsParam = selectedCategories.join(',');
      navigate(
        `/register?role=${masterRole}&subRole=${selectedSubRole}&categoryIds=${categoryIdsParam}${refSuffix}`
      );
    }
  };

  const handleBack = () => {
    if (tier === 2) {
      if (isCompanyExpanded) {
        setIsCompanyExpanded(false);
        setSelectedSubRole(null);
      } else {
        setTier(1);
        setSelectedSubRole(null);
      }
    } else if (tier === 3) {
      // Returning to the specialist step: also clear the subcategory-view flag
      // the tier-3 child pushed up, so it can't strand `true` and blank the
      // tier-2 header/Continue button.
      setTier(2);
      setIsViewingSubcategories(false);
    }
  };

  // `isViewingSubcategories` is a tier-3-only concept, pushed up from the
  // CategorySelection child. Because the child unmounts on some back paths
  // without ever pushing `false`, a stale `true` could leak into tier 2 and
  // blank the header + hide the Continue button. Gate every read behind
  // `tier === 3` so a stale value is inert everywhere else.
  const inSubcategoryView = tier === 3 && isViewingSubcategories;

  return (
    <AuthSplitLayout
      stickyHeader={tier === 3}
      title={
        inSubcategoryView
          ? tier === 3 && (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER')
            ? selectedSubRole === 'SKILLED_LABOUR'
              ? 'Choose Your Trade'
              : selectedSubRole === 'MACHINERY_HIRE'
                ? 'Select Machinery'
                : 'Choose Specialty'
            : null
          : tier === 1
            ? 'Select Your Role'
            : tier === 2
              ? isCompanyExpanded
                ? 'Your Position'
                : masterRole === 'BUYER'
                  ? 'Buyer Setup'
                  : masterRole === 'SERVICE_PROVIDER'
                    ? 'Provider Setup'
                    : 'Seller Setup'
              : 'Business Categories'
      }
      subtitle={
        inSubcategoryView
          ? tier === 3 && (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER')
            ? <span className="text-[#1a1612]/60">
                {selectedSubRole === 'SKILLED_LABOUR'
                  ? 'Pick the trade you specialise in'
                  : selectedSubRole === 'MACHINERY_HIRE'
                    ? 'Pick the equipment you hire out'
                    : 'Pick exactly what you sell or repair'}
              </span>
            : null
          : <span className="text-[#1a1612]/60">
              {tier === 1
                ? 'Choose how you want to use TONSE'
                : tier === 2
                  ? isCompanyExpanded
                    ? 'Select your role within the company'
                    : masterRole === 'BUYER'
                      ? "Tell us how you'll buy on Tonse"
                      : masterRole === 'SERVICE_PROVIDER'
                        ? 'Tell us what kind of provider you are'
                        : "Tell us how you'll sell on Tonse"
                  : 'Select the categories that best describe your business.'}
            </span>
      }
      onBack={inSubcategoryView ? undefined : (tier > 1 ? handleBack : () => navigate('/login'))}
    >
      <div ref={tierWrapRef} className="relative overflow-hidden min-h-[240px] lg:min-h-100">
        <AnimatePresence mode="wait">
          {tier === 1 ? (
            <motion.div
              key="tier1"
              data-tier-panel="1"
              {...slide(-1)}
              // Constrained column: the 16:9 artwork stays elegant on wide
              // panes (aspect-ratio sizing — never height-cropped).
              className="flex flex-col w-full max-w-[520px] mx-auto"
            >
              {/* Vertical role stack — all three roles visible at once, each
                  with its artwork, description, and its own Continue button.
                  One tap selects the role AND advances to its next step. */}
              <RoleCardStack
                banners={ROLE_BANNERS}
                onSelect={(id) => {
                  setMasterRole(id as MasterRole);
                  setTier(2);
                }}
              />

            </motion.div>
          ) : tier === 2 ? (
            <motion.div
              key="tier2"
              data-tier-panel="2"
              {...slide(1)}
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {isCompanyExpanded && (
                  <motion.div
                    key="company-header"
                    layoutId="COMPANY_BUYER"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="group relative p-4 pl-5 rounded-2xl border border-[#C9973A]/40 bg-white shadow-[0_6px_18px_-14px_rgba(201,151,58,0.3)] text-left flex items-center gap-3 mb-3"
                  >
                    <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-[#C9973A] rounded-full" />
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#C9973A] text-white">
                      <Building2 className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C9973A] mb-0.5">
                        Company Account
                      </p>
                      <h3 className="text-[14px] font-bold text-[#1a1612] leading-tight">
                        Select your role within the company
                      </h3>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buyer account-type step gets the photo-forward cards
                  (Personal / Company) — the icon-row layout below still
                  drives every other tier-2 surface (company positions,
                  seller, service provider). */}
              {masterRole === 'BUYER' && !isCompanyExpanded ? (
                <BuyerAccountCards
                  options={buyerSubRoles}
                  selectedSubRole={selectedSubRole}
                  onSelect={handleSubRoleSelect}
                />
              ) : (() => {
                const items = isCompanyExpanded
                  ? companySubRoles
                  : masterRole === 'SERVICE_PROVIDER'
                    ? serviceProviderSubRoles
                    : sellerSubRoles;
                // Provider menu stays a vertical stack even at 3 cards (Service /
                // Labour / Heavy Machinery) — the large stacked cards read better
                // than a 2-col grid with an orphaned third card.
                const isStacked = items.length <= 2 || masterRole === 'SERVICE_PROVIDER';
                return (
                  <div
                    className={
                      isStacked
                        ? 'flex flex-col gap-3'
                        : 'grid grid-cols-1 md:grid-cols-2 gap-3'
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {items.map((option) => {
                        const isSelected = selectedSubRole === option.subRole;
                        const Icon = option.icon;
                        const positionImg = getPositionImage(option.title);

                        // Photo-led card — company positions ship a 16:9 scene
                        // photo (Procurement / Secretary / Receptionist /
                        // Manager). Same image-top DNA as the labour trade
                        // cards. Roles without art (seller/provider) fall
                        // through to the icon-chip row below.
                        if (positionImg) {
                          return (
                            <motion.button
                              type="button"
                              layoutId={option.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              key={option.id}
                              onClick={() => handleSubRoleSelect(option.subRole)}
                              aria-pressed={isSelected}
                              className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
                                isSelected
                                  ? 'border-[#C9973A] bg-white shadow-[0_8px_28px_-14px_rgba(201,151,58,0.45)]'
                                  : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)]'
                              }`}
                            >
                              <div className="relative aspect-video overflow-hidden bg-[#f5f2ee]">
                                <img
                                  src={positionImg}
                                  alt={option.title}
                                  loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out lg:group-hover:scale-[1.04]"
                                />
                                {isSelected && (
                                  <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#C9973A] text-white shadow-md shadow-[#C9973A]/30">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#C9973A]">
                                  {option.eyebrow}
                                </p>
                                <h3
                                  className={`text-[15px] font-bold leading-tight transition-colors ${
                                    isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/85'
                                  }`}
                                >
                                  {option.title}
                                </h3>
                                <p className="mt-0.5 text-[12px] leading-snug text-[#1a1612]/55">
                                  {option.description}
                                </p>
                              </div>
                            </motion.button>
                          );
                        }

                        return (
                          <motion.button
                            type="button"
                            layoutId={option.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={option.id}
                            onClick={() => handleSubRoleSelect(option.subRole)}
                            aria-pressed={isSelected}
                            className={`group relative ${
                              isStacked ? 'p-5 lg:p-6 pl-6' : 'p-4 pl-5'
                            } rounded-2xl border text-left transition-all duration-200 flex items-center ${
                              isStacked ? 'gap-4 lg:gap-5' : 'gap-3'
                            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
                              isSelected
                                ? 'border-[#C9973A] bg-white shadow-[0_8px_28px_-14px_rgba(201,151,58,0.45)]'
                                : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)]'
                            }`}
                          >
                            <div
                              className={`absolute left-0 ${
                                isStacked ? 'top-4 bottom-4' : 'top-3 bottom-3'
                              } w-[2px] bg-[#C9973A] rounded-full origin-center transition-all duration-300 ${
                                isSelected ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                              }`}
                            />
                            <div
                              className={`${
                                isStacked ? 'w-12 h-12 lg:w-14 lg:h-14 rounded-xl' : 'w-10 h-10 rounded-lg'
                              } flex items-center justify-center transition-colors shrink-0 ${
                                isSelected ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-brand-dark'
                              }`}
                            >
                              <Icon
                                className={isStacked ? 'w-5 h-5 lg:w-6 lg:h-6' : 'w-4 h-4'}
                                strokeWidth={1.75}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C9973A] mb-1">
                                {option.eyebrow}
                              </p>
                              <h3
                                className={`${
                                  isStacked ? 'text-[17px] lg:text-[19px] font-serif' : 'text-[14px]'
                                } font-bold leading-tight transition-colors ${
                                  isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/85'
                                }`}
                              >
                                {option.title}
                              </h3>
                              <p
                                className={`${
                                  isStacked ? 'text-[12px] mt-1' : 'text-[12px] mt-0.5'
                                } text-[#1a1612]/55 leading-snug`}
                              >
                                {option.description}
                              </p>
                            </div>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className={`absolute ${
                                  isStacked ? 'top-3 right-3 w-6 h-6' : 'top-2.5 right-2.5 w-5 h-5'
                                } rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/30`}
                              >
                                <Check
                                  className={isStacked ? 'w-3 h-3' : 'w-2.5 h-2.5'}
                                  strokeWidth={3}
                                />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="tier3"
              data-tier-panel="3"
              {...slide(1)}
              className="space-y-4"
            >
              <div className="h-full min-h-100">
                <CategorySelection
                  onChange={setSelectedCategories}
                  hideHeader={true}
                  hideSubmitButton={true}
                  isStandalone={false}
                  // SELLER and SERVICE_PROVIDER both get the auto-drill +
                  // single-master-select behaviour; CategorySelection treats
                  // any non-buyer role as a "specialist" picker.
                  role={
                    masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER'
                      ? 'SELLER'
                      : undefined
                  }
                  categoryFilter={(cat) => {
                    // Each provider type sees only its own group. The synthetic
                    // "Labour & Skills" tile (cat.id === 'labour') is the trade
                    // picker's entry point.
                    const nature = getCategoryNature(cat.id);
                    if (masterRole === 'SERVICE_PROVIDER') {
                      // Skilled Labour → only the trade picker.
                      if (selectedSubRole === 'SKILLED_LABOUR') return cat.id === 'labour';
                      // Machinery Hire → nothing in the master grid; autoMachinery
                      // drills straight into the equipment list.
                      if (selectedSubRole === 'MACHINERY_HIRE') return false;
                      // Service → pure-service categories, no Labour tile, no
                      // BOTH-nature product categories (Automotive, Agriculture).
                      return cat.id !== 'labour' && nature === 'SERVICE';
                    }
                    // Seller — Labour never applies here.
                    if (cat.id === 'labour') return false;
                    if (selectedSubRole === 'PRODUCT_SELLER') {
                      return nature === 'PRODUCT' || nature === 'BOTH';
                    }
                    return true;
                  }}
                  onSubcategoryViewChange={setIsViewingSubcategories}
                  autoLabour={selectedSubRole === 'SKILLED_LABOUR'}
                  autoMachinery={selectedSubRole === 'MACHINERY_HIRE'}
                  onBack={() => {
                    // Labour trade-picker's Back unmounts this child; clear the
                    // subcategory-view flag it pushed so tier 2 renders cleanly.
                    setTier(2);
                    setIsViewingSubcategories(false);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(() => {
        // Hide the outer Continue button on the buyer subcategory view (the
        // CategorySelection component has its own "Complete Selection" CTA
        // there). For sellers + service providers we keep it visible across
        // master AND specialty views so they have a single, predictable
        // continue affordance.
        const isSpecialist = masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER';
        // Tier-1 renders its own Continue inline (right under the carousel
        // dots) so the teaser sections can sit below it — skip the shared one.
        const showButton =
          tier !== 1 && (!inSubcategoryView || (tier === 3 && isSpecialist));
        if (!showButton) return null;

        // For specialists in tier-3, require at least one sub-category to be
        // picked — not just the master. CategorySelection's specialist flow
        // stores the master pseudo-entry first, then appends real subs as
        // the user toggles them, so length >= 2 means "master + at least
        // one specialty". This rule is suffix-agnostic, so it works for
        // categories whose subs carry a variant ("Mobile Phones (Repair)")
        // and ones whose subs don't ("MCs & Hosts", "Event Catering").
        // Labour trades AND machinery items carry no master pseudo-entry
        // (CategorySelection emits just the ids), so one pick is enough; other
        // specialists need the master + ≥1 sub (length >= 2).
        const isLabourSelection =
          selectedSubRole === 'SKILLED_LABOUR' || selectedSubRole === 'MACHINERY_HIRE';
        const specialistHasSubPicked =
          tier === 3 &&
          isSpecialist &&
          (isLabourSelection ? selectedCategories.length >= 1 : selectedCategories.length >= 2);

        const disabled =
          tier === 1
            ? !masterRole
            : tier === 2
              ? !selectedSubRole
              : tier === 3 && isSpecialist
                ? !specialistHasSubPicked
                : selectedCategories.length === 0;

        return (
          <div className="pt-7">
            <Button
              onClick={handleContinue}
              disabled={disabled}
              className="w-full h-[58px] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/30 disabled:shadow-none disabled:cursor-not-allowed text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
            >
              {tier === 1
                ? 'Next Step'
                : tier === 2
                  ? 'Continue'
                  : inSubcategoryView && isSpecialist
                    ? 'Initialize Membership'
                    : 'Continue'}
              <span className="text-base leading-none">→</span>
            </Button>
          </div>
        );
      })()}
    </AuthSplitLayout>
  );
}
