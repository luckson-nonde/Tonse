import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, Truck, Wrench, Check, Music, Calendar, Smartphone, Armchair, Shirt, Home, Car, Hammer, Tractor, Laptop, User, Building2, Package, Settings, Layers } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { SubRole } from '../types';
import { CATEGORIES_DB, getCategoryNature } from '../services/categories';

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
    subRole: 'INDIVIDUAL_BUYER'
  },
  {
    id: 'COMPANY_BUYER',
    title: 'Company Account',
    description: 'Procure materials and services for your business.',
    icon: Building2,
    subRole: 'COMPANY_BUYER'
  }
];

const sellerSubRoles: RoleOption[] = [
  {
    id: 'PRODUCT_SELLER',
    title: 'Products Only',
    description: 'Sell physical goods and inventory.',
    icon: Package,
    subRole: 'PRODUCT_SELLER'
  },
  {
    id: 'SERVICE_SELLER',
    title: 'Services Only',
    description: 'Offer professional skills and services.',
    icon: Settings,
    subRole: 'SERVICE_SELLER'
  },
  {
    id: 'HYBRID_SELLER',
    title: 'Products & Services',
    description: 'Sell both goods and professional services.',
    icon: Layers,
    subRole: 'HYBRID_SELLER'
  }
];

export default function RoleSelection() {
  const [tier, setTier] = useState(1);
  const [masterRole, setMasterRole] = useState<'BUYER' | 'SELLER' | null>(null);
  const [selectedSubRole, setSelectedSubRole] = useState<SubRole | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleMasterSelect = (role: 'BUYER' | 'SELLER') => {
    setMasterRole(role);
    setTier(2);
  };

  const filteredCategories = React.useMemo(() => {
    if (!selectedSubRole) return [];
    
    // Only root categories for selection
    const rootCategories = CATEGORIES_DB.filter(c => !c.parentId);

    if (selectedSubRole === 'PRODUCT_SELLER') {
      return rootCategories.filter(c => {
        const nature = getCategoryNature(c.id);
        return nature === 'PRODUCT' || nature === 'BOTH';
      });
    }
    if (selectedSubRole === 'SERVICE_SELLER') {
      return rootCategories.filter(c => {
        const nature = getCategoryNature(c.id);
        return nature === 'SERVICE' || nature === 'BOTH';
      });
    }
    return rootCategories; // HYBRID_SELLER
  }, [selectedSubRole]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId) 
        : [...prev, catId]
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
      navigate(`/register?role=${masterRole}&subRole=${selectedSubRole}&categories=${categoriesParam}`);
    }
  };

  const handleBack = () => {
    if (tier === 2) {
      setTier(1);
      setSelectedSubRole(null);
    } else if (tier === 3) {
      setTier(2);
    }
  };

  return (
    <AuthLayout 
      title={
        tier === 1 ? "Select Your Role" : 
        tier === 2 ? `Configure your ${masterRole === 'BUYER' ? 'Buyer' : 'Seller'} Account` :
        "Business Categories"
      }
      titleClassName={tier === 3 ? "text-2xl sm:text-3xl" : "text-3xl"}
      subtitle={
        <span className="text-[#1a1612]/60">
          {tier === 1 
            ? "Choose how you want to use TONSE" 
            : tier === 2 
            ? `Select the sub-role that best fits your ${masterRole === 'BUYER' ? 'needs' : 'business model'}`
            : "Select the categories that best describe your business."
          }
        </span>
      }
      onBack={tier > 1 ? handleBack : () => navigate('/login')}
    >
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {tier === 1 ? (
            <motion.div 
              key="tier1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="grid grid-cols-1 gap-4"
            >
              <button 
                onClick={() => handleMasterSelect('BUYER')}
                className={`group p-8 rounded-3xl border text-left transition-all flex items-center gap-6 ${
                  masterRole === 'BUYER' 
                    ? 'border-brand-yellow bg-brand-yellow/5 shadow-lg' 
                    : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                }`}
              >
                <div className={`p-4 rounded-2xl transition-colors shrink-0 ${masterRole === 'BUYER' ? 'bg-brand-yellow text-white' : 'bg-[#f5f2ee] text-[#1e293b]'}`}>
                  <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif font-bold text-[#1a1612]">I want to Buy</h3>
                  <p className="text-sm text-[#1a1612]/50 mt-1">Discover products and request specialized services.</p>
                </div>
              </button>

              <button 
                onClick={() => handleMasterSelect('SELLER')}
                className={`group p-8 rounded-3xl border text-left transition-all flex items-center gap-6 ${
                  masterRole === 'SELLER' 
                    ? 'border-brand-yellow bg-brand-yellow/5 shadow-lg' 
                    : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                }`}
              >
                <div className={`p-4 rounded-2xl transition-colors shrink-0 ${masterRole === 'SELLER' ? 'bg-brand-yellow text-white' : 'bg-[#f5f2ee] text-[#1e293b]'}`}>
                  <Store className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif font-bold text-[#1a1612]">I want to Sell</h3>
                  <p className="text-sm text-[#1a1612]/50 mt-1">Grow your business by reaching local customers.</p>
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
              <div className="grid grid-cols-1 gap-3">
                {(masterRole === 'BUYER' ? buyerSubRoles : sellerSubRoles).map((option) => {
                  const isSelected = selectedSubRole === option.subRole;
                  const Icon = option.icon;
                  
                  return (
                    <button 
                      key={option.id}
                      onClick={() => setSelectedSubRole(option.subRole)}
                      className={`group p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                        isSelected 
                          ? 'border-brand-yellow bg-brand-yellow/5 shadow-md' 
                          : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-colors shrink-0 ${isSelected ? 'bg-brand-yellow text-white' : 'bg-[#f5f2ee] text-[#1e293b]'}`}>
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}>
                          {option.title}
                        </h3>
                        <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5">{option.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center">
                          <Check className="w-4 h-4 text-[#1a1612]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
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
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button 
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`group p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-3 relative ${
                        isSelected 
                          ? 'border-brand-yellow bg-brand-yellow/5 shadow-md' 
                          : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30 shadow-sm'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-[#e8e4dc] shadow-sm">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-[#1a1612]' : 'text-[#1e293b]'}`}>
                        {cat.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-yellow flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-[#1a1612]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-8">
        <Button 
          onClick={handleContinue}
          disabled={
            tier === 1 ? !masterRole : 
            tier === 2 ? !selectedSubRole :
            selectedCategories.length === 0
          }
          className="w-full py-5 px-4 shadow-lg flex justify-center items-center gap-3 text-[18px] font-serif font-bold disabled:opacity-50"
        >
          {tier === 1 ? 'Next Step' : tier === 2 ? 'Continue' : 'Initialize Membership'}
          <span className="text-xl leading-none">→</span>
        </Button>
      </div>
    </AuthLayout>
  );
}
