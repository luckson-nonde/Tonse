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
  title: string;
  description: string;
  icon: any;
  subRole: SubRole;
}

const buyerSubRoles: RoleOption[] = [
  {
    id: 'INDIVIDUAL_BUYER',
    title: 'Personal Account',
    description: 'Shop for yourself and your family.',
    icon: User,
    subRole: 'INDIVIDUAL_BUYER',
  },
  {
    id: 'COMPANY_BUYER',
    title: 'Company Account',
    description: 'Procure materials and services for your business.',
    icon: Building2,
    subRole: 'COMPANY_BUYER',
  },
];

const companySubRoles: RoleOption[] = [
  {
    id: 'COMPANY_PROCUREMENT_OFFICER',
    title: 'Procurement Officer',
    description: 'Manage purchasing and supplier relationships.',
    icon: ShoppingBag,
    subRole: 'COMPANY_PROCUREMENT_OFFICER',
  },
  {
    id: 'COMPANY_SECRETARY',
    title: 'Secretary',
    description: 'Handle administrative tasks and communications.',
    icon: FileText,
    subRole: 'COMPANY_SECRETARY',
  },
  {
    id: 'COMPANY_RECEPTIONIST',
    title: 'Receptionist',
    description: 'Manage front desk and initial inquiries.',
    icon: Users,
    subRole: 'COMPANY_RECEPTIONIST',
  },
  {
    id: 'COMPANY_MANAGER',
    title: 'Manager/Owner',
    description: 'Full access to company account and settings.',
    icon: Building2,
    subRole: 'COMPANY_MANAGER',
  },
];

const sellerSubRoles: RoleOption[] = [
  {
    id: 'PRODUCT_SELLER',
    title: 'Products Only',
    description: 'Sell physical goods and inventory.',
    icon: Package,
    subRole: 'PRODUCT_SELLER',
  },
  {
    id: 'SERVICE_SELLER',
    title: 'Services Only',
    description: 'Offer professional skills and services.',
    icon: Settings,
    subRole: 'SERVICE_SELLER',
  },
  {
    id: 'HYBRID_SELLER',
    title: 'Products & Services',
    description: 'Sell both goods and professional services.',
    icon: Layers,
    subRole: 'HYBRID_SELLER',
  },
];

export default function RoleSelection() {
  const [tier, setTier] = useState(1);
  const [masterRole, setMasterRole] = useState<'BUYER' | 'SELLER' | null>(null);
  const [selectedSubRole, setSelectedSubRole] = useState<SubRole | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);
  const navigate = useNavigate();

  const handleMasterSelect = (role: 'BUYER' | 'SELLER') => {
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
    if (selectedSubRole === 'SERVICE_SELLER') {
      return rootCategories.filter((c) => {
        const nature = getCategoryNature(c.id);
        return nature === 'SERVICE' || nature === 'BOTH';
      });
    }
    return rootCategories; // HYBRID_SELLER
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
      if (masterRole === 'SELLER') {
        setTier(3);
      } else {
        navigate(`/register?role=${masterRole}&subRole=${selectedSubRole}`);
      }
    } else if (tier === 3 && selectedCategories.length > 0) {
      const categoriesParam = selectedCategories.join(',');
      navigate(
        `/register?role=${masterRole}&subRole=${selectedSubRole}&categories=${categoriesParam}`
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
    if (masterRole === 'SELLER') return HERO_CONTENT.seller;
    return HERO_CONTENT.tier1;
  }, [tier, masterRole]);

  return (
    <AuthSplitLayout
      title={
        tier === 1
          ? 'Select Your Role'
          : tier === 2
            ? `Configure your ${masterRole === 'BUYER' ? 'Buyer' : 'Seller'} Account`
            : 'Business Categories'
      }
      subtitle={
        <span className="text-[#1a1612]/60">
          {tier === 1
            ? 'Choose how you want to use TONSE'
            : tier === 2
              ? `Select the sub-role that best fits your ${masterRole === 'BUYER' ? 'needs' : 'business model'}`
              : 'Select the categories that best describe your business.'}
        </span>
      }
      onBack={tier > 1 ? handleBack : () => navigate('/login')}
      hero={currentHero}
    >
      <div className="relative overflow-hidden min-h-100">
        <AnimatePresence mode="wait">
          {tier === 1 ? (
            <motion.div
              key="tier1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-4 lg:gap-6"
            >
              <button
                type="button"
                onClick={() => handleMasterSelect('BUYER')}
                aria-pressed={masterRole === 'BUYER'}
                className={`group p-6 lg:p-8 rounded-3xl lg:rounded-4xl border text-left transition-all duration-200 flex items-center gap-4 lg:gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  masterRole === 'BUYER'
                    ? 'border-[#C9973A] bg-[#C9973A]/10 shadow-[0_16px_40px_rgba(201,151,58,0.18)]'
                    : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/30 hover:shadow-sm'
                }`}
              >
                <div
                  className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-colors shrink-0 ${masterRole === 'BUYER' ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-brand-dark'}`}
                >
                  <ShoppingBag className="w-6 h-6 lg:w-8 lg:h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg lg:text-xl font-serif font-bold text-[#1a1612]">
                    I'm Looking For...
                  </h3>
                  <p className="text-[13px] lg:text-sm text-[#1a1612]/50 mt-1">
                    Request products, services and skilled labour.
                  </p>
                </div>
                {masterRole === 'BUYER' && (
                  <div className="w-9 h-9 rounded-full bg-[#C9973A] text-white flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleMasterSelect('SELLER')}
                aria-pressed={masterRole === 'SELLER'}
                className={`group p-6 lg:p-8 rounded-3xl lg:rounded-4xl border text-left transition-all duration-200 flex items-center gap-4 lg:gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  masterRole === 'SELLER'
                    ? 'border-[#C9973A] bg-[#C9973A]/10 shadow-[0_16px_40px_rgba(201,151,58,0.18)]'
                    : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/30 hover:shadow-sm'
                }`}
              >
                <div
                  className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-colors shrink-0 ${masterRole === 'SELLER' ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-brand-dark'}`}
                >
                  <Store className="w-6 h-6 lg:w-8 lg:h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg lg:text-xl font-serif font-bold text-[#1a1612]">
                    We're Offering...
                  </h3>
                  <p className="text-[13px] lg:text-sm text-[#1a1612]/50 mt-1">
                    Offer your products or business services.
                  </p>
                </div>
                {masterRole === 'SELLER' && (
                  <div className="w-9 h-9 rounded-full bg-[#C9973A] text-white flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register/labour')}
                className="group p-6 lg:p-8 rounded-2xl lg:rounded-4xl border text-left transition-all duration-200 flex items-center gap-4 lg:gap-6 border-[#e8e4dc] bg-white hover:border-[#C9973A]/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-colors shrink-0 bg-[#f5f2ee] text-brand-dark">
                  <Wrench className="w-6 h-6 lg:w-8 lg:h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg lg:text-xl font-serif font-bold text-[#1a1612]">
                    I Offer My Skills
                  </h3>
                  <p className="text-[13px] lg:text-sm text-[#1a1612]/50 mt-1">
                    Offer your labour and expertise to employers.
                  </p>
                </div>
              </button>
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
                    className="group p-5 rounded-2xl border border-brand-yellow bg-brand-yellow/5 shadow-md text-left flex items-center gap-4 mb-4"
                  >
                    <div className="p-3 rounded-xl shrink-0 bg-brand-yellow text-white">
                      <Building2 className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-[#1a1612]">Company Account</h3>
                      <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5">
                        Select your role within the company.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {(isCompanyExpanded
                    ? companySubRoles
                    : masterRole === 'BUYER'
                      ? buyerSubRoles
                      : sellerSubRoles
                  ).map((option) => {
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
                        className={`group p-5 rounded-4xl border text-left transition-all duration-200 flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          isSelected
                            ? 'border-[#C9973A] bg-[#C9973A]/10 shadow-[0_16px_40px_rgba(201,151,58,0.18)]'
                            : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/30 hover:shadow-sm'
                        }`}
                      >
                        <div
                          className={`p-3 rounded-xl transition-colors shrink-0 ${isSelected ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-brand-dark'}`}
                        >
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}
                          >
                            {option.title}
                          </h3>
                          <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-[#C9973A] text-white' : 'bg-[#f5f2ee] text-transparent'}`}
                        >
                          {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
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
                  role={masterRole === 'SELLER' ? 'SELLER' : undefined}
                  categoryFilter={(cat) => {
                    if (selectedSubRole === 'PRODUCT_SELLER') {
                      const nature = getCategoryNature(cat.id);
                      return nature === 'PRODUCT' || nature === 'BOTH';
                    }
                    if (selectedSubRole === 'SERVICE_SELLER') {
                      const nature = getCategoryNature(cat.id);
                      return nature === 'SERVICE' || nature === 'BOTH';
                    }
                    return true;
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-8">
        <Button
          onClick={handleContinue}
          disabled={
            tier === 1
              ? !masterRole
              : tier === 2
                ? !selectedSubRole
                : selectedCategories.length === 0
          }
          className="w-full py-5 px-4 shadow-lg flex justify-center items-center gap-3 text-[18px] font-serif font-bold disabled:opacity-50 rounded-4xl"
        >
          {tier === 1 ? 'Next Step' : tier === 2 ? 'Continue' : 'Initialize Membership'}
          <span className="text-xl leading-none">→</span>
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
