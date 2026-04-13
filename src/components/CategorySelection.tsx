import React, { useState, useEffect } from 'react';
import { Search, Check, X, Loader2, Smartphone, Armchair, Shirt, Home, Car, ShoppingBasket, Sparkles, Hammer, Music, ShoppingBag, Calendar, ChevronLeft, ChevronDown, Tractor, Laptop, HardHat } from 'lucide-react';
import Button from './Button';
import { fetchCategories, Category } from '../services/categories';
import { LABOUR_CATEGORY_GROUPS, LABOUR_CATEGORIES } from '../services/labourCategories';

interface CategorySelectionProps {
  onBack?: () => void;
  onComplete?: (selectedCategories: any) => void;
  submitLabel?: string;
  hideHeader?: boolean;
  role?: string;
  initialSelectedIds?: string[];
  isStandalone?: boolean;
}

const getCategoryStyles = (id: string) => {
  const styles: Record<string, { icon: any, bg: string }> = {
    'electronics': { icon: Smartphone, bg: 'bg-[#f5f2ed]' },
    'furniture': { icon: Armchair, bg: 'bg-[#f5f2ed]' },
    'fashion': { icon: Shirt, bg: 'bg-[#f5f2ed]' },
    'home-decor': { icon: Home, bg: 'bg-[#f5f2ed]' },
    'automotive': { icon: Car, bg: 'bg-[#f5f2ed]' },
    'groceries': { icon: ShoppingBasket, bg: 'bg-[#f5f2ed]' },
    'beauty': { icon: Sparkles, bg: 'bg-[#f5f2ed]' },
    'construction': { icon: Hammer, bg: 'bg-[#f5f2ed]' },
    'entertainment': { icon: Music, bg: 'bg-[#f5f2ed]' },
    'events': { icon: Calendar, bg: 'bg-[#f5f2ed]' },
    'agriculture': { icon: Tractor, bg: 'bg-[#f5f2ed]' },
    'it-services': { icon: Laptop, bg: 'bg-[#f5f2ed]' },
    'labour': { icon: HardHat, bg: 'bg-[#f5f2ed]' },
  };
  return styles[id] || { icon: ShoppingBag, bg: 'bg-[#f5f2ed]' };
};

export default function CategorySelection({ onBack, onComplete, submitLabel = 'Submit Inquiry', hideHeader = false, role, initialSelectedIds = [], isStandalone = true }: CategorySelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [generalCategories, setGeneralCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const [activeLabourGroup, setActiveLabourGroup] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories(null).then(async (cats) => {
      // ... (keep existing filtering logic)
      let filtered = cats;
      
      // Filter based on role
      if (role === 'ENTERTAINMENT') {
        filtered = cats.filter(c => c.id === 'entertainment');
      } else if (role === 'EVENTS') {
        filtered = cats.filter(c => c.id === 'events');
      } else if (role === 'SERVICE_PROVIDER') {
        const defaultCategory = initialSelectedIds.length > 0 ? initialSelectedIds[0] : null;
        if (defaultCategory) {
          filtered = cats.filter(c => c.id === defaultCategory || c.parentId === defaultCategory);
        } else {
          filtered = cats.filter(c => ['construction', 'electronics', 'it-services'].includes(c.id));
        }
      } else if (role === 'SELLER' || role === 'SUPPLIER') {
        // If we have an initial category from role selection, filter to just that
        if (initialSelectedIds.length > 0) {
          const initialParents = cats.filter(c => initialSelectedIds.includes(c.id));
          if (initialParents.length > 0) {
            filtered = initialParents;
          } else {
            // It might be a subcategory ID, but usually it's a parent ID from RoleSelection
            filtered = cats.filter(c => !['entertainment', 'events'].includes(c.id));
          }
        } else {
          filtered = cats.filter(c => !['entertainment', 'events'].includes(c.id));
        }
      }

      setGeneralCategories([...filtered, { id: 'labour', name: 'Labour & Skills', parentId: null } as Category]);
      setLoading(false);
    });
  }, [role, initialSelectedIds]);

  const handleGeneralCategoryClick = async (category: any) => {
    if (category.id === 'labour') {
      setActiveLabourGroup('ROOT');
      return;
    }
    setActiveParent(category);
    setSubSearchQuery('');
    setExpandedSubcategory(null);
    setLoadingSub(true);
    const subs = await fetchCategories(category.id);
    setSubcategories(subs);
    setLoadingSub(false);
  };

  const handleLabourGroupClick = (group: any) => {
    setActiveLabourGroup(group);
  };

  const handleLabourSubTypeSelect = (subType: any) => {
    if (!onComplete) return;
    onComplete({
      category: subType.label,
      categoryId: subType.id,
      isLabour: true,
      labourGroup: activeLabourGroup.id,
      inquirySchemaKey: subType.inquirySchemaKey
    });
  };

  // ... (keep existing consolidateNames, etc.)
  // ... (need to update render logic to include Labour & Skills)

  const handleVariantSelect = async (sub: Category) => {
    if (!onComplete) return;
    setLoading(true);
    try {
      const parentGroups: Record<string, Category[]> = {};
      selectedCategories.forEach(c => {
        if (c.parentId) {
          if (!parentGroups[c.parentId]) parentGroups[c.parentId] = [];
          parentGroups[c.parentId].push(c);
        }
      });

      const parentIds = Object.keys(parentGroups);
      const allSubsByParent = await Promise.all(
        parentIds.map(async (pId) => ({
          pId,
          subs: await fetchCategories(pId)
        }))
      );

      const consolidatedNames = consolidateNames(parentGroups, allSubsByParent);

      const noParentCategories = selectedCategories.filter(c => !c.parentId);
      consolidatedNames.push(...noParentCategories.map(c => c.name));

      consolidatedNames.push(sub.name);
      const uniqueNames = Array.from(new Set(consolidatedNames));
      onComplete(uniqueNames);
    } catch (error) {
      console.error("Error consolidating categories:", error);
      onComplete([...selectedCategories.map(c => c.name), sub.name]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubcategory = (category: Category) => {
    setSelectedCategories(prev => 
      prev.find(c => c.id === category.id)
        ? prev.filter(c => c.id !== category.id)
        : [...prev, category]
    );
  };

  const toggleGroup = (variants: Category[]) => {
    const allSelected = variants.every(v => selectedCategories.some(c => c.id === v.id));
    if (allSelected) {
      // Deselect all variants in group
      setSelectedCategories(prev => prev.filter(c => !variants.some(v => v.id === c.id)));
    } else {
      // Select all variants in group
      setSelectedCategories(prev => {
        const newSelections = variants.filter(v => !prev.some(c => c.id === v.id));
        return [...prev, ...newSelections];
      });
    }
  };

  const consolidateNames = (parentGroups: Record<string, Category[]>, allSubsByParent: { pId: string, subs: Category[] }[]) => {
    const consolidatedNames: string[] = [];
    for (const { pId, subs } of allSubsByParent) {
      const parent = generalCategories.find(c => c.id === pId);
      const selectedSubs = parentGroups[pId];

      if (parent && selectedSubs.length === subs.length && subs.length > 0) {
        consolidatedNames.push(parent.name);
      } else {
        // If role is present (registration flow), consolidate by baseName
        if (role) {
          const baseGroups: Record<string, Category[]> = {};
          selectedSubs.forEach(s => {
            const bName = s.baseName || s.name;
            if (!baseGroups[bName]) baseGroups[bName] = [];
            baseGroups[bName].push(s);
          });
          
          Object.entries(baseGroups).forEach(([bName, group]) => {
            // Check if all variants for this baseName are selected
            const allVariants = subs.filter(s => s.baseName === bName || s.name === bName);
            if (group.length === allVariants.length && allVariants.length > 0) {
              consolidatedNames.push(bName);
            } else {
              consolidatedNames.push(...group.map(c => c.name));
            }
          });
        } else {
          // Otherwise, list the individual subcategory names
          consolidatedNames.push(...selectedSubs.map(c => c.name));
        }
      }
    }
    return consolidatedNames;
  };

  const removeSelected = (id: string) => {
    setSelectedCategories(prev => prev.filter(c => c.id !== id));
  };

  const filteredCategories = generalCategories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter(sub => 
    sub.name.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  const isAllFilteredSelected = filteredSubcategories.length > 0 && 
    filteredSubcategories.every(sub => selectedCategories.some(c => c.id === sub.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedCategories(prev => prev.filter(c => !filteredSubcategories.some(sub => sub.id === c.id)));
    } else {
      // Select all filtered (that aren't already selected)
      setSelectedCategories(prev => {
        const newSelections = filteredSubcategories.filter(sub => !prev.some(c => c.id === sub.id));
        return [...prev, ...newSelections];
      });
    }
  };

  const currentParentSelectedCount = subcategories.filter(sub => 
    selectedCategories.some(c => c.id === sub.id)
  ).length;

  const handleComplete = async () => {
    if (!onComplete) return;

    setLoading(true);
    try {
      // Group selected categories by parentId
      const parentGroups: Record<string, Category[]> = {};
      selectedCategories.forEach(c => {
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
          subs: await fetchCategories(pId)
        }))
      );

      const consolidatedNames = consolidateNames(parentGroups, allSubsByParent);

      // Include any selected categories that don't have a parentId (just in case)
      const noParentCategories = selectedCategories.filter(c => !c.parentId);
      consolidatedNames.push(...noParentCategories.map(c => c.name));

      onComplete(consolidatedNames);
    } catch (error) {
      console.error("Error consolidating categories:", error);
      // Fallback to individual names on error
      onComplete(selectedCategories.map(c => c.name));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isStandalone ? "max-w-[480px] md:max-w-4xl mx-auto w-full bg-[#f5f2ed] min-h-screen relative" : "w-full relative"}>
      {activeParent ? (
        <div className="flex flex-col min-h-screen bg-[#f5f2ed] animate-in slide-in-from-right duration-300">
          {/* Subcategory Header */}
          <div className="sticky top-0 bg-[#f5f2ed] z-20 px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveParent(null)} 
                className="w-10 h-10 -ml-2 flex items-center justify-center bg-white/50 rounded-full hover:bg-white transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
              </button>
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">SELECT SPECIFIC TYPES</p>
            </div>
            
            <div className="mt-4">
              <h1 className="font-serif text-[28px] font-bold text-[#1a1a2e] leading-tight">
                {activeParent.name}
              </h1>
            </div>
          </div>

          {/* Subcategory Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-6 flex flex-col gap-6">
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
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#f1f5f9] rounded-2xl text-[15px] focus:border-[#C9973A]/50 focus:bg-white outline-none transition-all placeholder:text-[#94a3b8] font-sans"
                  />
                </div>
              )}

              {/* List */}
              {loadingSub ? (
                <div className="flex flex-col justify-center items-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-[#C9973A]" />
                  <p className="text-[13px] font-medium text-[#94a3b8] font-sans">Loading options...</p>
                </div>
              ) : filteredSubcategories.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f1f5f9]">
                    <Search className="w-8 h-8 text-[#cbd5e1]" />
                  </div>
                  <p className="text-[#94a3b8] font-medium font-sans">No subcategories found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                  {(() => {
                    // Group subcategories by baseName if they have variants
                    const groups: Record<string, Category[]> = {};
                    const ungrouped: Category[] = [];

                    filteredSubcategories.forEach(sub => {
                      if (sub.baseName && (activeParent.id === 'electronics' || activeParent.id === 'furniture')) {
                        if (!groups[sub.baseName]) groups[sub.baseName] = [];
                        groups[sub.baseName].push(sub);
                      } else {
                        ungrouped.push(sub);
                      }
                    });

                    return (
                      <>
                        {Object.entries(groups).map(([baseName, variants], idx) => {
                          const isExpanded = expandedSubcategory === baseName;
                          const hasSelected = variants.some(v => selectedCategories.some(c => c.id === v.id));

                          return (
                            <div key={`${baseName}-${idx}`} className="flex flex-col">
                              <div 
                                className={`p-5 flex items-center justify-between hover:bg-white rounded-2xl transition-all group cursor-pointer border ${
                                  role && hasSelected ? 'bg-white border-[#C9973A]/20' : 'border-transparent bg-white/50'
                                }`}
                                onClick={() => {
                                  if (role) {
                                    toggleGroup(variants);
                                  } else {
                                    setExpandedSubcategory(isExpanded ? null : baseName);
                                  }
                                }}
                              >
                                <div className="flex-1">
                                  <span className={`font-sans font-bold text-[15px] transition-colors ${
                                    (role && hasSelected) || (!role && (isExpanded || hasSelected)) 
                                      ? 'text-[#C9973A]' 
                                      : 'text-[#1a1a2e]'
                                  }`}>
                                    {baseName}
                                  </span>
                                </div>
                                <div 
                                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                    (role && hasSelected) 
                                      ? 'bg-[#C9973A] border-[#C9973A]' 
                                      : 'bg-white border-[#f1f5f9]'
                                  } group-hover:border-[#C9973A]/30`}
                                >
                                  {role ? (
                                    hasSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />
                                  ) : (
                                    <ChevronDown className={`w-4 h-4 text-[#94a3b8] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  )}
                                </div>
                              </div>
                              {!role && isExpanded && (
                                <div className="px-4 py-3 flex flex-col gap-3 bg-white/50 rounded-2xl mt-2 mb-4 border border-[#f1f5f9]">
                                  {variants.map(variant => {
                                    const isSelected = selectedCategories.some(c => c.id === variant.id);
                                    let label = '';
                                    if (variant.type === 'buy') label = 'Buy / Custom';
                                    else if (variant.type === 'repair') label = 'Repair / Service';
                                    else if (variant.type === 'restore') label = 'Repair / Restore';
                                    
                                    if (activeParent.id === 'electronics') {
                                      if (variant.type === 'buy') label = 'Buy New';
                                      else if (variant.type === 'repair') label = 'Repair';
                                    }

                                    return (
                                      <button 
                                        key={variant.id}
                                        onClick={() => handleVariantSelect(variant)}
                                        className={`text-left px-5 py-4 rounded-xl transition-all flex items-center justify-between ${
                                          isSelected ? 'bg-white border-[#C9973A] shadow-sm' : 'bg-white hover:bg-[#f1f5f9] border-[#f1f5f9]'
                                        } border-[1.5px]`}
                                      >
                                        <span className={`text-[14px] font-bold ${isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'}`}>
                                          {label}
                                        </span>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                          isSelected ? 'bg-[#C9973A] border-[#C9973A]' : 'border-[#f1f5f9]'
                                        }`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {ungrouped.map(sub => {
                          const isSelected = selectedCategories.some(c => c.id === sub.id);
                          return (
                            <div 
                              key={sub.id}
                              onClick={() => toggleSubcategory(sub)}
                              className={`p-5 flex items-center justify-between cursor-pointer rounded-2xl transition-all border ${
                                isSelected ? 'bg-white border-[#C9973A]/20 shadow-sm' : 'hover:bg-white border-transparent bg-white/50'
                              }`}
                            >
                              <span className={`font-sans font-bold text-[15px] transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#1a1a2e]'}`}>
                                {sub.name}
                              </span>
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-[#C9973A] border-[#C9973A]' 
                                  : 'bg-white border-[#f1f5f9]'
                              }`}>
                                {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 p-6 bg-[#f5f2ed] border-t border-[#e2e8f0]">
            <button 
              onClick={() => setActiveParent(null)} 
              className="w-full h-[58px] bg-[#C9973A] text-white text-[16px] font-bold rounded-[50px] shadow-xl shadow-[rgba(201,151,58,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Done {currentParentSelectedCount > 0 ? `(${currentParentSelectedCount})` : ''}
            </button>
          </div>
        </div>
      ) : (
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
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">STEP 1</p>
            </div>
            
            <div className="mt-2">
              <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
                What are you looking for?
              </h1>
            </div>
          </div>
          )}

          <div className={isStandalone ? "p-[20px_16px_120px_16px] flex flex-col gap-6" : "flex flex-col gap-6 pb-24"}>
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
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#f1f5f9] rounded-[12px] text-[15px] focus:border-[#C9973A]/50 focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] outline-none transition-all placeholder:text-[#94a3b8] font-sans"
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
                {selectedCategories.map(c => (
                   <span key={c.id} className="bg-white border border-[#f1f5f9] text-[#1a1a2e] px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-2 shadow-sm">
                     {c.name}
                     <button onClick={() => removeSelected(c.id)} className="hover:text-[#C9973A] transition-colors">
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredCategories.map((category) => {
                  const hasSelectedSub = selectedCategories.some(c => c.parentId === category.id);
                  const { icon: CategoryIcon } = getCategoryStyles(category.id);
                  
                  return (
                    <div 
                      key={category.id}
                      onClick={() => handleGeneralCategoryClick(category)}
                      className={`relative h-[120px] rounded-[20px] overflow-hidden cursor-pointer group transition-all duration-300 border-[1.5px] ${
                        hasSelectedSub || (category.id === 'labour' && activeLabourGroup)
                          ? 'border-[#C9973A] bg-white shadow-[0_4px_16px_rgba(201,151,58,0.12)]' 
                          : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                      }`}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                          hasSelectedSub || (category.id === 'labour' && activeLabourGroup) ? 'bg-[#C9973A] text-white' : 'bg-[#f8fafc] text-[#C9973A] group-hover:bg-[#C9973A] group-hover:text-white'
                        }`}>
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

            {activeLabourGroup && (
              <div className="fixed inset-0 bg-[#f5f2ed] z-50 p-6 overflow-y-auto">
                <button onClick={() => setActiveLabourGroup(null)} className="mb-4">Back</button>
                {activeLabourGroup === 'ROOT' ? (
                  <div className="grid grid-cols-2 gap-4">
                    {LABOUR_CATEGORY_GROUPS.map(group => (
                      <div key={group.id} onClick={() => handleLabourGroupClick(group)} className="p-4 bg-white rounded-xl cursor-pointer">
                        {group.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {LABOUR_CATEGORIES.filter(c => c.category === activeLabourGroup.id).map(sub => (
                      <div key={sub.id} onClick={() => handleLabourSubTypeSelect(sub)} className="p-4 bg-white rounded-xl cursor-pointer">
                        {sub.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {selectedCategories.length > 0 && (
              <div className="pt-4 pb-8">
                <button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full h-[54px] bg-[#C9973A] rounded-[50px] flex items-center justify-center gap-[10px] font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] disabled:opacity-50 transition-all"
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
