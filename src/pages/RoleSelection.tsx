import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Package,
  Settings,
  Layers,
  FileText,
  Users,
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { SubRole, HeroContent } from '../types';
import { CATEGORIES_DB, getCategoryNature, Category } from '../services/categories';
import CategorySelection from '../components/CategorySelection';

const HERO_CONTENT: Record<string, HeroContent> = {
  tier1: {
    title: 'Join the Gold Standard of Trade.',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['Efficient Procurement', 'Direct Messaging', 'Verified Suppliers'],
  },
  buyer: {
    title: 'Procure with Confidence.',
    image:
      'https://images.unsplash.com/photo-1556740734-7f95834d0ff9?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['Access Global Markets', 'Secure Transactions', 'Quality Assurance'],
  },
  seller: {
    title: 'Scale Your Business Globally.',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['Reach Verified Buyers', 'Streamlined Logistics', 'Market Insights'],
  },
  categories: {
    title: 'Tailored to Your Industry.',
    image:
      'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['Niche Specialization', 'Relevant Connections', 'Industry Standards'],
  },
};

interface RoleOption {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: any;
  subRole: SubRole;
}

const buyerSubRoles: RoleOption[] = [
  {
    id: 'INDIVIDUAL_BUYER',
    eyebrow: 'Individual · Personal',
    title: 'Personal Account',
    description: 'Shop for yourself and your family.',
    icon: User,
    subRole: 'INDIVIDUAL_BUYER',
  },
  {
    id: 'COMPANY_BUYER',
    eyebrow: 'Business · Corporate',
    title: 'Company Account',
    description: 'Procure materials and services for your business.',
    icon: Building2,
    subRole: 'COMPANY_BUYER',
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

// SERVICE_PROVIDER tier-2: businesses that book/rent/perform/fix.
// Three shapes by company structure, not by what they offer (categories
// in tier 3 narrow that down).
const serviceProviderSubRoles: RoleOption[] = [
  {
    id: 'INDIVIDUAL_PROVIDER',
    eyebrow: 'Solo · Practitioner',
    title: 'Solo',
    description: 'Independent professional — DJ, photographer, planner, consultant.',
    icon: User,
    subRole: 'INDIVIDUAL_PROVIDER',
  },
  {
    id: 'AGENCY_PROVIDER',
    eyebrow: 'Agency · Multi-team',
    title: 'Agency',
    description: 'Multi-person service business — event company, repair shop, catering co.',
    icon: Building2,
    subRole: 'AGENCY_PROVIDER',
  },
  {
    id: 'SKILLED_LABOUR',
    eyebrow: 'Trade · Skilled Labour',
    title: 'Skilled Labour',
    description: 'Tradesperson — carpenter, welder, plumber, electrician.',
    icon: Wrench,
    subRole: 'SKILLED_LABOUR',
  },
];

type MasterRole = 'BUYER' | 'SELLER' | 'SERVICE_PROVIDER';

export default function RoleSelection() {
  const [tier, setTier] = useState(1);
  const [masterRole, setMasterRole] = useState<MasterRole | null>(null);
  const [selectedSubRole, setSelectedSubRole] = useState<SubRole | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);
  const [isViewingSubcategories, setIsViewingSubcategories] = useState(false);
  const navigate = useNavigate();

  const handleMasterSelect = (role: MasterRole) => {
    setMasterRole(role);
    setTier(2);
  };

  const handleSubRoleSelect = (subRole: SubRole) => {
    if (subRole === 'COMPANY_BUYER') {
      setIsCompanyExpanded(true);
      setSelectedSubRole(null);
    } else {
      setSelectedSubRole(subRole);
    }
  };

  const filteredCategories = React.useMemo(() => {
    if (!selectedSubRole) return [];

    // Only root categories for selection
    const rootCategories = CATEGORIES_DB.filter((c) => !c.parentId);

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
      selectedSubRole === 'SKILLED_LABOUR'
    ) {
      return rootCategories.filter((c) => {
        const nature = getCategoryNature(c.id);
        return nature === 'SERVICE' || nature === 'BOTH';
      });
    }
    return rootCategories;
  }, [selectedSubRole]);

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
        navigate(`/register?role=${masterRole}&subRole=${selectedSubRole}`);
      }
    } else if (tier === 3 && selectedCategories.length > 0) {
      // selectedCategories is now an array of stable category IDs
      // (CategorySelection.onChange emits ids per Phase: matching).
      // We pass them as `categoryIds=` so the receiver in Register.tsx
      // routes them to the backend junction tables via updateUser
      // ({ categoryIds: [...] }).
      const categoryIdsParam = selectedCategories.join(',');
      navigate(
        `/register?role=${masterRole}&subRole=${selectedSubRole}&categoryIds=${categoryIdsParam}`
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
      setTier(2);
    }
  };

  const currentHero = useMemo(() => {
    if (tier === 1) return HERO_CONTENT.tier1;
    if (tier === 3) return HERO_CONTENT.categories;
    if (masterRole === 'BUYER') return HERO_CONTENT.buyer;
    if (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER')
      return HERO_CONTENT.seller;
    return HERO_CONTENT.tier1;
  }, [tier, masterRole]);

  return (
    <AuthSplitLayout
      title={
        isViewingSubcategories
          ? tier === 3 && (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER')
            ? 'Choose Specialty'
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
        isViewingSubcategories
          ? tier === 3 && (masterRole === 'SELLER' || masterRole === 'SERVICE_PROVIDER')
            ? <span className="text-[#1a1612]/60">Pick exactly what you sell or repair</span>
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
      onBack={isViewingSubcategories ? undefined : (tier > 1 ? handleBack : () => navigate('/login'))}
      hero={currentHero}
    >
      <div className="relative overflow-hidden min-h-[240px] lg:min-h-100">
        <AnimatePresence mode="wait">
          {tier === 1 ? (
            <motion.div
              key="tier1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {[
                {
                  id: 'BUYER' as const,
                  eyebrow: 'Buyer · Sourcing',
                  title: "I'm Buying",
                  description:
                    'Source products, services and skilled labour from verified providers.',
                  icon: ShoppingBag,
                  selectable: true,
                  onClick: () => handleMasterSelect('BUYER'),
                },
                {
                  id: 'SELLER' as const,
                  eyebrow: 'Seller · Goods',
                  title: "I Sell Goods",
                  description:
                    'Sell physical products — retail, wholesale, or hybrid (with repair).',
                  icon: Store,
                  selectable: true,
                  onClick: () => handleMasterSelect('SELLER'),
                },
                {
                  id: 'SERVICE_PROVIDER' as const,
                  eyebrow: 'Service · Booking',
                  title: 'I Provide Services',
                  description:
                    'Repairs, events, entertainment, skilled labour — anything customers book.',
                  icon: Wrench,
                  selectable: true,
                  onClick: () => handleMasterSelect('SERVICE_PROVIDER'),
                },
              ].map(({ id, eyebrow, title, description, icon: Icon, selectable, onClick }) => {
                const isSelected = selectable && masterRole === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={onClick}
                    aria-pressed={selectable ? isSelected : undefined}
                    className={`group relative p-5 lg:p-6 pl-6 rounded-2xl border text-left transition-all duration-200 flex items-center gap-4 lg:gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
                      isSelected
                        ? 'border-[#C9973A] bg-white shadow-[0_8px_28px_-14px_rgba(201,151,58,0.45)]'
                        : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/40 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)]'
                    }`}
                  >
                    {/* Left-edge gold accent — matches input focus system */}
                    <div
                      className={`absolute left-0 top-4 bottom-4 w-[2px] bg-[#C9973A] rounded-full origin-center transition-all duration-300 ${
                        isSelected ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                      }`}
                    />

                    {/* Uniform icon block — only color changes on selection */}
                    <div
                      className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isSelected ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-brand-dark'
                      }`}
                    >
                      <Icon className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={1.75} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C9973A] mb-1">
                        {eyebrow}
                      </p>
                      <h3 className="text-[17px] lg:text-[19px] font-serif font-bold text-[#1a1612] leading-tight">
                        {title}
                      </h3>
                      <p className="text-[12px] text-[#1a1612]/55 mt-1 leading-snug">
                        {description}
                      </p>
                    </div>

                    {/* Top-right check badge on selection */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-md shadow-[#C9973A]/30"
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          ) : tier === 2 ? (
            <motion.div
              key="tier2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
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

              {(() => {
                const items = isCompanyExpanded
                  ? companySubRoles
                  : masterRole === 'BUYER'
                    ? buyerSubRoles
                    : masterRole === 'SERVICE_PROVIDER'
                      ? serviceProviderSubRoles
                      : sellerSubRoles;
                const isStacked = items.length <= 2;
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
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
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
                    const nature = getCategoryNature(cat.id);
                    if (selectedSubRole === 'PRODUCT_SELLER') {
                      return nature === 'PRODUCT' || nature === 'BOTH';
                    }
                    if (
                      selectedSubRole === 'INDIVIDUAL_PROVIDER' ||
                      selectedSubRole === 'AGENCY_PROVIDER' ||
                      selectedSubRole === 'SKILLED_LABOUR'
                    ) {
                      return nature === 'SERVICE' || nature === 'BOTH';
                    }
                    return true;
                  }}
                  onSubcategoryViewChange={setIsViewingSubcategories}
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
        const showButton = !isViewingSubcategories || (tier === 3 && isSpecialist);
        if (!showButton) return null;

        // For specialists in tier-3, require at least one sub-category to be
        // picked — not just the master. CategorySelection's specialist flow
        // stores the master pseudo-entry first, then appends real subs as
        // the user toggles them, so length >= 2 means "master + at least
        // one specialty". This rule is suffix-agnostic, so it works for
        // categories whose subs carry a variant ("Mobile Phones (Repair)")
        // and ones whose subs don't ("MCs & Hosts", "Event Catering").
        const specialistHasSubPicked =
          tier === 3 && isSpecialist && selectedCategories.length >= 2;

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
                  : isViewingSubcategories && isSpecialist
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
