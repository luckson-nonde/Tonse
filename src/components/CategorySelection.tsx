import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Button from './Button';
import { fetchCategories, Category } from '../services/categories';
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
}

const getCategoryStyles = (id: string) => {
  const styles: Record<string, { icon: any; bg: string }> = {
    electronics: { icon: Smartphone, bg: 'bg-[#f5f2ed]' },
    furniture: { icon: Armchair, bg: 'bg-[#f5f2ed]' },
    fashion: { icon: Shirt, bg: 'bg-[#f5f2ed]' },
    'home-decor': { icon: Home, bg: 'bg-[#f5f2ed]' },
    automotive: { icon: Car, bg: 'bg-[#f5f2ed]' },
    groceries: { icon: ShoppingBasket, bg: 'bg-[#f5f2ed]' },
    beauty: { icon: Sparkles, bg: 'bg-[#f5f2ed]' },
    construction: { icon: Hammer, bg: 'bg-[#f5f2ed]' },
    entertainment: { icon: Music, bg: 'bg-[#f5f2ed]' },
    events: { icon: Calendar, bg: 'bg-[#f5f2ed]' },
    agriculture: { icon: Tractor, bg: 'bg-[#f5f2ed]' },
    'it-services': { icon: Laptop, bg: 'bg-[#f5f2ed]' },
    labour: { icon: HardHat, bg: 'bg-[#f5f2ed]' },
  };
  return styles[id] || { icon: ShoppingBag, bg: 'bg-[#f5f2ed]' };
};

const getSubCategoryIcon = (name: string) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('phone') || lowercaseName.includes('mobile')) return Smartphone;
  if (lowercaseName.includes('laptop') || lowercaseName.includes('computer')) return Laptop;
  if (lowercaseName.includes('tv') || lowercaseName.includes('video') || lowercaseName.includes('audio')) return Tv;
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
}: CategorySelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [generalCategories, setGeneralCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const [activeLabourGroup, setActiveLabourGroup] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [labourSubSearch, setLabourSubSearch] = useState('');
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [parentCategoryVersions, setParentCategoryVersions] = useState<Record<string, Category[]>>({});

  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

  // Notify parent of subcategory view state
  useEffect(() => {
    if (onSubcategoryViewChange) {
      onSubcategoryViewChange(!!activeParent || !!activeLabourGroup);
    }
  }, [activeParent, activeLabourGroup, onSubcategoryViewChange]);

  // Effect to handle real-time changes
  useEffect(() => {
    if (!onChange) return;

    const syncChanges = async () => {
      // Group selected categories by parentId
      const parentGroups: Record<string, Category[]> = {};
      selectedCategories.forEach((c) => {
        if (c.parentId) {
          if (!parentGroups[c.parentId]) parentGroups[c.parentId] = [];
          parentGroups[c.parentId].push(c);
        }
      });

      const parentIds = Object.keys(parentGroups);
      
      // We need the full list of siblings to consolidate
      // For performance, we only fetch what we don't have
      const newVersions = { ...parentCategoryVersions };
      let changed = false;

      for (const pId of parentIds) {
        if (!newVersions[pId]) {
          newVersions[pId] = await fetchCategories(pId);
          changed = true;
        }
      }

      if (changed) {
        setParentCategoryVersions(newVersions);
      }

      const allSubsByParent = Object.entries(newVersions)
        .filter(([pId]) => parentIds.includes(pId))
        .map(([pId, subs]) => ({ pId, subs }));

      const consolidatedNames = consolidateNames(parentGroups, allSubsByParent);
      const noParentCategories = selectedCategories.filter((c) => !c.parentId);
      consolidatedNames.push(...noParentCategories.map((c) => c.name));

      onChange(Array.from(new Set(consolidatedNames)));
    };

    syncChanges();
  }, [selectedCategories, onChange]);

  useEffect(() => {
    fetchCategories(null).then(async (cats) => {
      // ... (keep existing filtering logic)
      let filtered = cats;

      // Filter based on role
      if (role === 'ENTERTAINMENT') {
        filtered = cats.filter((c) => c.id === 'entertainment');
      } else if (role === 'EVENTS') {
        filtered = cats.filter((c) => c.id === 'events');
      } else if (role === 'SERVICE_PROVIDER') {
        const defaultCategory = initialSelectedIds.length > 0 ? initialSelectedIds[0] : null;
        if (defaultCategory) {
          filtered = cats.filter((c) => c.id === defaultCategory || c.parentId === defaultCategory);
        } else {
          filtered = cats.filter((c) =>
            ['construction', 'electronics', 'it-services'].includes(c.id)
          );
        }
      } else if (role === 'SELLER' || role === 'SUPPLIER') {
        // If we have an initial category from role selection, filter to just that
        if (initialSelectedIds.length > 0) {
          const initialParents = cats.filter((c) => initialSelectedIds.includes(c.id));
          if (initialParents.length > 0) {
            filtered = initialParents;
          }
        }
      }

      const finalFiltered = categoryFilter ? filtered.filter(categoryFilter) : filtered;

      // Ensure Labour & Skills is added if it passes the filter or no filter exists
      const showLabour = !categoryFilter || categoryFilter({ id: 'labour', name: 'Labour & Skills', parentId: null } as Category);

      if (showLabour) {
        setGeneralCategories([
          ...finalFiltered,
          { id: 'labour', name: 'Labour & Skills', parentId: null } as Category,
        ]);
      } else {
        setGeneralCategories(finalFiltered);
      }
      setLoading(false);
    });
  }, [role, initialSelectedIds, categoryFilter]);

  const handleGeneralCategoryClick = async (category: any) => {
    if (category.id === 'labour') {
      setActiveLabourGroup('ROOT');
      return;
    }
    setActiveParent(category);
    setSubSearchQuery('');
    setLoadingSub(true);
    const subs = await fetchCategories(category.id);
    setSubcategories(subs);
    setLoadingSub(false);
  };

  const handleLabourGroupClick = (group: any) => {
    setActiveLabourGroup(group);
  };

  const handleLabourSubTypeSelect = (subType: any) => {
    if (role) {
      // For registration flows, labour selection should just toggle the state
      setSelectedCategories((prev) => {
        let basePrev = prev;
        if (prev.length > 0 && prev[0].parentId !== 'labour') {
          basePrev = [];
        }
        return basePrev.find((c) => c.id === subType.id)
          ? basePrev.filter((c) => c.id !== subType.id)
          : [...basePrev, { id: subType.id, name: subType.label, parentId: 'labour' } as Category];
      });
      return;
    }

    if (!onComplete) return;
    onComplete({
      category: subType.label,
      categoryId: subType.id,
      isLabour: true,
      labourGroup: activeLabourGroup.id,
      inquirySchemaKey: subType.inquirySchemaKey,
    });
    setActiveLabourGroup(null);
  };

  // ... (keep existing consolidateNames, etc.)
  // ... (need to update render logic to include Labour & Skills)

  const handleVariantSelect = async (sub: Category) => {
    if (role) {
      // For registration flows, variant selection should just toggle the state
      setSelectedCategories((prev) => {
        let basePrev = prev;
        if (prev.length > 0 && prev[0].parentId !== sub.parentId) {
          basePrev = [];
        }
        return basePrev.find((c) => c.id === sub.id)
          ? basePrev.filter((c) => c.id !== sub.id)
          : [...basePrev, sub];
      });
      return;
    }

    if (!onComplete) return;
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
        parentIds.map(async (pId) => ({
          pId,
          subs: await fetchCategories(pId),
        }))
      );

      const consolidatedNames = consolidateNames(parentGroups, allSubsByParent);

      const noParentCategories = selectedCategories.filter((c) => !c.parentId);
      consolidatedNames.push(...noParentCategories.map((c) => c.name));

      consolidatedNames.push(sub.name);
      const uniqueNames = Array.from(new Set(consolidatedNames));
      onComplete(uniqueNames);
    } catch (error) {
      console.error('Error consolidating categories:', error);
      onComplete([...selectedCategories.map((c) => c.name), sub.name]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubcategory = (category: Category) => {
    setSelectedCategories((prev) => {
      let basePrev = prev;
      if (prev.length > 0 && prev[0].parentId !== category.parentId) {
        basePrev = [];
      }
      return basePrev.find((c) => c.id === category.id)
        ? basePrev.filter((c) => c.id !== category.id)
        : [...basePrev, category];
    });
  };

  const toggleGroup = (variants: Category[]) => {
    if (variants.length === 0) return;
    const parentId = variants[0].parentId;

    const allSelected = variants.every((v) => selectedCategories.some((c) => c.id === v.id));
    if (allSelected) {
      // Deselect all variants in group
      setSelectedCategories((prev) => prev.filter((c) => !variants.some((v) => v.id === c.id)));
    } else {
      // Select all variants in group
      setSelectedCategories((prev) => {
        let basePrev = prev;
        if (prev.length > 0 && prev[0].parentId !== parentId) {
          basePrev = [];
        }
        const newSelections = variants.filter((v) => !basePrev.some((c) => c.id === v.id));
        return [...basePrev, ...newSelections];
      });
    }
  };

  const consolidateNames = (
    parentGroups: Record<string, Category[]>,
    allSubsByParent: { pId: string; subs: Category[] }[]
  ) => {
    const consolidatedNames: string[] = [];
    for (const { pId, subs } of allSubsByParent) {
      const parent = generalCategories.find((c) => c.id === pId);
      const selectedSubs = parentGroups[pId];

      if (parent && selectedSubs.length === subs.length && subs.length > 0) {
        consolidatedNames.push(parent.name);
      } else {
        // If role is present (registration flow), consolidate by baseName
        if (role) {
          const baseGroups: Record<string, Category[]> = {};
          selectedSubs.forEach((s) => {
            const bName = s.baseName || s.name;
            if (!baseGroups[bName]) baseGroups[bName] = [];
            baseGroups[bName].push(s);
          });

          Object.entries(baseGroups).forEach(([bName, group]) => {
            // Check if all variants for this baseName are selected
            const allVariants = subs.filter((s) => s.baseName === bName || s.name === bName);
            if (group.length === allVariants.length && allVariants.length > 0) {
              consolidatedNames.push(bName);
            } else {
              consolidatedNames.push(...group.map((c) => c.name));
            }
          });
        } else {
          // Otherwise, list the individual subcategory names
          consolidatedNames.push(...selectedSubs.map((c) => c.name));
        }
      }
    }
    return consolidatedNames;
  };

  const removeSelected = (id: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredCategories = generalCategories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter((sub) =>
    sub.name.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  const isAllFilteredSelected =
    filteredSubcategories.length > 0 &&
    filteredSubcategories.every((sub) => selectedCategories.some((c) => c.id === sub.id));

  const toggleSelectAllFiltered = () => {
    if (filteredSubcategories.length === 0) return;
    const parentId = filteredSubcategories[0].parentId;

    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedCategories((prev) =>
        prev.filter((c) => !filteredSubcategories.some((sub) => sub.id === c.id))
      );
    } else {
      // Select all filtered (that aren't already selected)
      setSelectedCategories((prev) => {
        let basePrev = prev;
        if (prev.length > 0 && prev[0].parentId !== parentId) {
          basePrev = [];
        }
        const newSelections = filteredSubcategories.filter(
          (sub) => !basePrev.some((c) => c.id === sub.id)
        );
        return [...basePrev, ...newSelections];
      });
    }
  };

  const currentParentSelectedCount = subcategories.filter((sub) =>
    selectedCategories.some((c) => c.id === sub.id)
  ).length;

  const handleComplete = async () => {
    if (!onComplete) return;

    setLoading(true);
    try {
      // Group selected categories by parentId
      const parentGroups: Record<string, Category[]> = {};
      selectedCategories.forEach((c) => {
        if (c.parentId) {
          if (!parentGroups[c.parentId]) parentGroups[c.parentId] = [];
          parentGroups[c.parentId].push(c);
        }
      });

      const parentIds = Object.keys(parentGroups);

      // Fetch all subcategories for all involved parents in parallel for efficiency
      const allSubsByParent = await Promise.all(
        parentIds.map(async (pId) => ({
          pId,
          subs: await fetchCategories(pId),
        }))
      );

      const consolidatedNames = consolidateNames(parentGroups, allSubsByParent);

      // Include any selected categories that don't have a parentId (just in case)
      const noParentCategories = selectedCategories.filter((c) => !c.parentId);
      consolidatedNames.push(...noParentCategories.map((c) => c.name));

      onComplete(consolidatedNames);
    } catch (error) {
      console.error('Error consolidating categories:', error);
      // Fallback to individual names on error
      onComplete(selectedCategories.map((c) => c.name));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        isStandalone
          ? 'max-w-[480px] md:max-w-4xl mx-auto w-full bg-[#f5f2ed] min-h-screen relative'
          : 'w-full relative'
      }
    >
      {activeParent ? (
        <div className={`flex flex-col animate-in slide-in-from-right duration-300 ${isStandalone ? 'min-h-screen bg-[#f5f2ed]' : 'bg-transparent'}`}>
          {/* Subcategory Header */}
          <div className={`sticky top-0 z-20 ${isStandalone ? 'px-6 pt-6 pb-5 bg-[#f5f2ed]' : 'bg-transparent mb-8 lg:mb-10'}`}>
            {isStandalone ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (activeSubGroup) {
                        setActiveSubGroup(null);
                      } else {
                        setActiveParent(null);
                      }
                    }}
                    className="w-10 h-10 -ml-2 flex items-center justify-center bg-white/50 rounded-full hover:bg-white transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
                  </button>
                  <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
                    {activeSubGroup ? 'SELECT SPECIFIC TYPES' : 'SELECT A CATEGORY'}
                  </p>
                </div>
                <div className="mt-4">
                  <h1 className="font-serif text-[28px] font-bold text-[#1a1a2e] leading-tight">
                    {activeSubGroup ? activeSubGroup : activeParent.name}
                  </h1>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                  <h2 className="text-[28px] lg:text-[26px] font-serif font-bold text-brand-dark leading-tight whitespace-nowrap">
                    {activeSubGroup ? activeSubGroup : activeParent.name}
                  </h2>
                  <div className="text-[#C9973A] font-sans font-normal text-xs lg:text-sm leading-relaxed opacity-80 italic">
                    {activeSubGroup ? 'SELECT SPECIFIC TYPES' : 'SELECT A CATEGORY'}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (activeSubGroup) {
                      setActiveSubGroup(null);
                    } else {
                      setActiveParent(null);
                      if (onSubcategoryViewChange) onSubcategoryViewChange(false);
                    }
                  }}
                  className="hidden lg:flex items-center text-slate-400 hover:text-[#C9973A] transition-colors text-base w-fit group"
                >
                  <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>
              </div>
            )}
          </div>

          {/* Subcategory Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className={`flex flex-col gap-6 ${isStandalone ? 'p-6' : ''}`}>
              {/* Select All */}
              <div className="flex justify-start">
                <button
                  onClick={toggleSelectAllFiltered}
                  className="text-[12px] font-bold text-[#C9973A] uppercase tracking-wider hover:opacity-80 transition-opacity bg-[#C9973A]/5 px-4 py-2 rounded-full border border-[#C9973A]/10"
                >
                  {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search */}
              {subcategories.length > 5 && !loadingSub && (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[#C9973A]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search subcategories..."
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#e2e8f0] rounded-2xl text-[15px] focus:border-[#C9973A]/50 focus:bg-white outline-none transition-all placeholder:text-[#94a3b8] font-sans shadow-sm"
                  />
                </div>
              )}

              {/* List */}
              {loadingSub ? (
                <div className="flex flex-col justify-center items-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-[#C9973A]" />
                  <p className="text-[13px] font-medium text-[#94a3b8] font-sans">
                    Loading options...
                  </p>
                </div>
              ) : filteredSubcategories.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f1f5f9]">
                    <Search className="w-8 h-8 text-[#cbd5e1]" />
                  </div>
                  <p className="text-[#94a3b8] font-medium font-sans">No subcategories found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                    // Group subcategories by baseName if they have variants
                    const groups: Record<string, Category[]> = {};
                    const ungrouped: Category[] = [];

                    filteredSubcategories.forEach((sub) => {
                      if (
                        sub.baseName &&
                        (activeParent.id === 'electronics' || activeParent.id === 'furniture' || activeParent.id === 'automotive')
                      ) {
                        if (!groups[sub.baseName]) groups[sub.baseName] = [];
                        groups[sub.baseName].push(sub);
                      } else {
                        ungrouped.push(sub);
                      }
                    });

                    const activeGroupVariants = activeSubGroup ? groups[activeSubGroup] : null;

                    if (activeGroupVariants) {
                      return (
                        <div className="flex flex-col gap-3 animate-in slide-in-from-right duration-300 col-span-full">
                          {activeGroupVariants.map((variant) => {
                            const isSelected = selectedCategories.some((c) => c.id === variant.id);
                            let label = '';
                            if (variant.type === 'buy') label = 'Buy / Custom';
                            else if (variant.type === 'repair') label = 'Repair / Service';
                            else if (variant.type === 'restore') label = 'Repair / Restore';

                            if (activeParent.id === 'electronics') {
                              if (variant.type === 'buy') label = 'Buy New';
                              else if (variant.type === 'repair') label = 'Repair';
                            }

                            return (
                              <div
                                key={variant.id}
                                onClick={() => handleVariantSelect(variant)}
                                className={`p-5 flex items-center justify-between cursor-pointer rounded-2xl transition-all border ${
                                  isSelected
                                    ? 'bg-white border-[#C9973A]/20 shadow-sm'
                                    : 'hover:bg-white border-transparent bg-white/50'
                                }`}
                              >
                                <div className="flex-1">
                                  <span className={`font-sans font-bold text-[15px] transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'}`}>
                                    {label}
                                  </span>
                                </div>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ml-4 shrink-0 ${
                                  isSelected ? 'bg-[#C9973A] border-[#C9973A]' : 'bg-white border-[#e2e8f0]'
                                }`}>
                                  {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <>
                        {Object.entries(groups).map(([baseName, variants], idx) => {
                          const Icon = getSubCategoryIcon(baseName);
                          const hasSelected = variants.some((v) =>
                            selectedCategories.some((c) => c.id === v.id)
                          );
                          return (
                            <div
                              key={`${baseName}-${idx}`}
                              onClick={() => setActiveSubGroup(baseName)}
                              className={`relative h-[120px] rounded-[20px] overflow-hidden cursor-pointer group transition-all duration-300 border-[1.5px] ${
                                hasSelected
                                  ? 'border-[#C9973A] bg-white shadow-[0_4px_16px_rgba(201,151,58,0.12)]'
                                  : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                              }`}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                                  hasSelected
                                    ? 'bg-[#C9973A] text-white'
                                    : 'bg-[#f8fafc] text-[#C9973A] group-hover:bg-[#C9973A] group-hover:text-white'
                                }`}>
                                  <Icon className="w-[26px] h-[26px]" />
                                </div>
                                <h4 className="font-sans text-[13px] font-bold text-[#1a1a2e] leading-tight">
                                  {baseName}
                                </h4>
                              </div>
                              {hasSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-[#C9973A] rounded-full flex items-center justify-center z-20 shadow-sm">
                                  <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {ungrouped.map((sub) => {
                          const Icon = getSubCategoryIcon(sub.name);
                          const isSelected = selectedCategories.some((c) => c.id === sub.id);
                          return (
                            <div
                              key={sub.id}
                              onClick={() => toggleSubcategory(sub)}
                              className={`relative h-[120px] rounded-[20px] overflow-hidden cursor-pointer group transition-all duration-300 border-[1.5px] ${
                                isSelected
                                  ? 'border-[#C9973A] bg-white shadow-[0_4px_16px_rgba(201,151,58,0.12)]'
                                  : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                              }`}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                                  isSelected
                                    ? 'bg-[#C9973A] text-white'
                                    : 'bg-[#f8fafc] text-[#C9973A] group-hover:bg-[#C9973A] group-hover:text-white'
                                }`}>
                                  <Icon className="w-[26px] h-[26px]" />
                                </div>
                                <h4 className="font-sans text-[13px] font-bold text-[#1a1a2e] leading-tight">
                                  {sub.name}
                                </h4>
                              </div>
                              {isSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-[#C9973A] rounded-full flex items-center justify-center z-20 shadow-sm">
                                  <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => {
                        setActiveParent(null);
                        if (onSubcategoryViewChange) onSubcategoryViewChange(false);
                      }}
                      disabled={currentParentSelectedCount === 0}
                      style={{
                        background: 'linear-gradient(to right, #C9973A, #b8861e)',
                        boxShadow: '0 4px 18px rgba(201,151,58,0.38)',
                      }}
                      className={`flex items-center text-white font-[700] text-[13.5px] py-[13px] px-[36px] rounded-[40px] transition-all duration-300 ${
                        currentParentSelectedCount === 0 ? 'opacity-45 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      Done
                      <Check className="w-4 h-4 ml-1.5" strokeWidth={3} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : activeLabourGroup ? (() => {
        const labourGroupIcons: Record<string, any> = {
          CONSTRUCTION: HardHat,
          DOMESTIC: Home,
          INDUSTRIAL: Factory,
          SKILLED_TRADES: Wrench,
          AGRICULTURAL: Sprout,
          TRANSPORT: Truck,
        };

        const isRoot = activeLabourGroup === 'ROOT';
        const currentGroup = !isRoot ? activeLabourGroup : null;
        const groupSubCategories = currentGroup
          ? LABOUR_CATEGORIES.filter((c) => c.category === currentGroup.id)
          : [];
        const filteredGroupSubs = groupSubCategories.filter((s) =>
          s.label.toLowerCase().includes(labourSubSearch.toLowerCase())
        );
        const selectedInGroup = groupSubCategories.filter((s) =>
          selectedCategories.some((c) => c.id === s.id)
        ).length;

        return (
          <div className={`flex flex-col animate-in slide-in-from-right duration-300 ${isStandalone ? 'min-h-screen bg-[#f5f2ed]' : 'bg-transparent'}`}>
            {/* Header */}
            <div className={`sticky top-0 z-20 ${isStandalone ? 'px-6 pt-6 pb-5 bg-[#f5f2ed]' : 'bg-transparent mb-8 lg:mb-10'}`}>
              {isStandalone ? (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveLabourGroup(isRoot ? null : 'ROOT')}
                      className="w-10 h-10 -ml-2 flex items-center justify-center bg-white/50 rounded-full hover:bg-white transition-all"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
                    </button>
                    <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
                      {isRoot ? 'LABOUR & SKILLS' : 'SELECT SPECIALTY'}
                    </p>
                  </div>
                  <div className="mt-4">
                    <h1 className="font-serif text-[28px] font-bold text-[#1a1a2e] leading-tight">
                      {isRoot ? 'Choose a Category' : currentGroup?.label}
                    </h1>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                    <h2 className="text-[28px] lg:text-[26px] font-serif font-bold text-brand-dark leading-tight whitespace-nowrap">
                      {isRoot ? 'Choose a Category' : currentGroup?.label}
                    </h2>
                    <div className="text-[#C9973A] font-sans font-normal text-xs lg:text-sm leading-relaxed opacity-80 italic">
                      {isRoot ? 'LABOUR & SKILLS' : 'SELECT SPECIALTY'}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveLabourGroup(isRoot ? null : 'ROOT');
                      if (isRoot && onSubcategoryViewChange) onSubcategoryViewChange(false);
                    }}
                    className="hidden lg:flex items-center text-slate-400 hover:text-[#C9973A] transition-colors text-base w-fit group"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className={`flex flex-col gap-6 ${isStandalone ? 'p-6' : ''}`}>
                {isRoot ? (
                  /* Labour Group Grid */
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {LABOUR_CATEGORY_GROUPS.map((group) => {
                      const GroupIcon = labourGroupIcons[group.id] || HardHat;
                      const hasSelectedInGroup = selectedCategories.some((c) => {
                        const sub = LABOUR_CATEGORIES.find((s) => s.id === c.id);
                        return sub?.category === group.id;
                      });
                      return (
                        <div
                          key={group.id}
                          onClick={() => handleLabourGroupClick(group)}
                          className={`relative h-[120px] rounded-[20px] overflow-hidden cursor-pointer group transition-all duration-300 border-[1.5px] ${
                            hasSelectedInGroup
                              ? 'border-[#C9973A] bg-white shadow-[0_4px_16px_rgba(201,151,58,0.12)]'
                              : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                          }`}
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                            <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                              hasSelectedInGroup
                                ? 'bg-[#C9973A] text-white'
                                : 'bg-[#f8fafc] text-[#C9973A] group-hover:bg-[#C9973A] group-hover:text-white'
                            }`}>
                              <GroupIcon className="w-[26px] h-[26px]" />
                            </div>
                            <h4 className="font-sans text-[13px] font-bold text-[#1a1a2e] leading-tight">
                              {group.label}
                            </h4>
                          </div>
                          {hasSelectedInGroup && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[#C9973A] rounded-full flex items-center justify-center z-20 shadow-sm">
                              <Check className="w-3 h-3 text-white" strokeWidth={4} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Subcategory list for selected group */
                  <>
                    {/* Select All */}
                    <div className="flex justify-start">
                      <button
                        onClick={() => {
                          const allSelected = groupSubCategories.every((s) =>
                            selectedCategories.some((c) => c.id === s.id)
                          );
                          if (allSelected) {
                            setSelectedCategories((prev) =>
                              prev.filter((c) => !groupSubCategories.some((s) => s.id === c.id))
                            );
                          } else {
                            setSelectedCategories((prev) => {
                              let basePrev = prev;
                              if (prev.length > 0 && prev[0].parentId !== 'labour') {
                                basePrev = [];
                              }
                              const newSels = groupSubCategories.filter(
                                (s) => !basePrev.some((c) => c.id === s.id)
                              );
                              return [...basePrev, ...newSels.map((s) => ({ id: s.id, name: s.label, parentId: 'labour' } as Category))];
                            });
                          }
                        }}
                        className="text-[12px] font-bold text-[#C9973A] uppercase tracking-wider hover:opacity-80 transition-opacity bg-[#C9973A]/5 px-4 py-2 rounded-full border border-[#C9973A]/10"
                      >
                        {groupSubCategories.every((s) => selectedCategories.some((c) => c.id === s.id))
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    {/* Search */}
                    {groupSubCategories.length > 5 && (
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-[#C9973A]" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search specialties..."
                          value={labourSubSearch}
                          onChange={(e) => setLabourSubSearch(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#e2e8f0] rounded-2xl text-[15px] focus:border-[#C9973A]/50 focus:bg-white outline-none transition-all placeholder:text-[#94a3b8] font-sans shadow-sm"
                        />
                      </div>
                    )}

                    {/* Specialty Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                      {filteredGroupSubs.map((sub) => {
                        const isSelected = selectedCategories.some((c) => c.id === sub.id);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => handleLabourSubTypeSelect(sub)}
                            className={`p-5 flex items-center justify-between cursor-pointer rounded-2xl transition-all border ${
                              isSelected
                                ? 'bg-white border-[#C9973A]/20 shadow-sm'
                                : 'hover:bg-white border-transparent bg-white/50'
                            }`}
                          >
                            <div className="flex-1">
                              <span className={`font-sans font-bold text-[15px] transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'}`}>
                                {sub.label}
                              </span>
                              {sub.description && (
                                <p className="text-[12px] text-[#94a3b8] mt-0.5 leading-snug">{sub.description}</p>
                              )}
                            </div>
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ml-4 shrink-0 ${
                              isSelected ? 'bg-[#C9973A] border-[#C9973A]' : 'bg-white border-[#e2e8f0]'
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            {!isRoot && (
              <div className={`sticky bottom-0 p-6 border-t border-[#e2e8f0] z-20 ${isStandalone ? 'bg-[#f5f2ed]' : 'bg-transparent'}`}>
                <button
                  onClick={() => {
                    setActiveLabourGroup('ROOT');
                    if (onSubcategoryViewChange) onSubcategoryViewChange(false);
                  }}
                  className="w-full h-[58px] bg-[#C9973A] text-white text-[16px] font-bold rounded-[50px] shadow-xl shadow-[rgba(201,151,58,0.25)] hover:bg-brand-dark hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Done {selectedInGroup > 0 ? `(${selectedInGroup})` : ''}
                </button>
              </div>
            )}
          </div>
        );
      })() : (
        <>
          {/* Sticky Header */}
          {!hideHeader && isStandalone && (
            <div className="sticky top-0 bg-[#f5f2ed] z-20 px-4 pt-4 pb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="w-10 h-10 -ml-2 flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
                </button>
                <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
                  STEP 1
                </p>
              </div>

              <div className="mt-2">
                <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
                  What are you looking for?
                </h1>
              </div>
            </div>
          )}

          <div
            className={
              isStandalone
                ? 'p-[20px_16px_120px_16px] flex flex-col gap-6'
                : 'flex flex-col gap-6 pb-24'
            }
          >
            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#C9973A]" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#e2e8f0] rounded-xl text-[15px] focus:border-[#C9973A]/50 focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] outline-none transition-all placeholder:text-[#94a3b8] font-sans shadow-sm"
              />
            </div>

            {/* Selection Info */}
            <div className="flex items-center justify-between px-1">
              <div className="bg-[rgba(201,151,58,0.08)] border border-[rgba(201,151,58,0.2)] rounded-full px-4 py-1.5">
                <h3 className="text-[10px] font-sans font-bold text-[#C9973A] tracking-[0.1em] uppercase">
                  MASTER SELECTION
                </h3>
              </div>
              {selectedCategories.length > 0 && (
                <span className="text-[12px] font-semibold text-[#C9973A]">
                  {selectedCategories.length} selected
                </span>
              )}
            </div>

            {/* Selected Tags */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {selectedCategories.map((c) => (
                  <span
                    key={c.id}
                    className="bg-white border border-[#e2e8f0] text-[#1a1a2e] px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-2 shadow-sm"
                  >
                    {c.name}
                    <button
                      onClick={() => removeSelected(c.id)}
                      className="hover:text-[#C9973A] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
              </div>
            ) : (
              <div className={`grid grid-cols-2 sm:grid-cols-3 ${isStandalone ? 'md:grid-cols-4 lg:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
                {filteredCategories.map((category) => {
                  const hasSelectedSub = selectedCategories.some((c) => c.parentId === category.id);
                  const { icon: CategoryIcon } = getCategoryStyles(category.id);

                  return (
                    <div
                      key={category.id}
                      onClick={() => handleGeneralCategoryClick(category)}
                      className={`relative h-[120px] rounded-[20px] overflow-hidden cursor-pointer group transition-all duration-300 border-[1.5px] ${
                        hasSelectedSub || (category.id === 'labour' && activeLabourGroup)
                          ? 'border-[#C9973A] bg-white shadow-[0_4px_16px_rgba(201,151,58,0.12)]'
                          : 'border-[#e2e8f0] bg-white hover:border-[#C9973A]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-sm'
                      }`}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <div
                          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                            hasSelectedSub || (category.id === 'labour' && activeLabourGroup)
                              ? 'bg-[#C9973A] text-white'
                              : 'bg-[#f8fafc] text-[#C9973A] group-hover:bg-[#C9973A] group-hover:text-white'
                          }`}
                        >
                          <CategoryIcon className="w-[26px] h-[26px]" />
                        </div>

                        <h4 className="font-sans text-[13px] font-bold text-[#1a1a2e] leading-tight">
                          {category.name}
                        </h4>
                      </div>

                      {(hasSelectedSub || (category.id === 'labour' && activeLabourGroup)) && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-[#C9973A] rounded-full flex items-center justify-center z-20 shadow-sm">
                          <Check className="w-3 h-3 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}



            {/* Submit Button */}
            {(selectedCategories.length > 0 && !hideSubmitButton) && (
              <div className="pt-4 pb-8">
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full h-13.5 bg-[#C9973A] rounded-[50px] flex items-center justify-center gap-2.5 font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] disabled:opacity-50 hover:bg-brand-dark transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Consolidating...</span>
                    </>
                  ) : (
                    submitLabel
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
