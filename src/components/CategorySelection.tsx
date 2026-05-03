import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const styles = getCategoryStyles(category.id);
  const Icon = styles.icon;

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
        className={`group relative h-[104px] rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 px-2 py-3 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white ${
          isSelected
            ? 'border-[#C9973A] bg-white shadow-[0_8px_24px_-14px_rgba(201,151,58,0.45)]'
            : 'border-[#e8e4dc] bg-white hover:border-[#C9973A]/40 hover:shadow-[0_6px_18px_-14px_rgba(26,22,18,0.12)]'
        }`}
      >
        {/* Left-edge gold accent — system signature */}
        <div
          className={`absolute left-0 top-3 bottom-3 w-[2px] bg-[#C9973A] rounded-full origin-center transition-all duration-300 ${
            isSelected ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
          }`}
        />

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

        <p
          className={`text-[10px] font-bold uppercase tracking-[0.06em] leading-tight text-center px-1 line-clamp-1 transition-colors ${
            isSelected ? 'text-[#C9973A]' : 'text-[#1a1612]/85'
          }`}
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
    <motion.div
      layout
      onMouseEnter={() => onHover?.(category)}
      onMouseLeave={() => onHover?.(null)}
      onClick={onClick}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative h-[140px] sm:h-[160px] md:h-[180px] rounded-2xl sm:rounded-[24px] cursor-pointer group transition-all duration-300 overflow-hidden border-2 ${
        isSelected
          ? 'border-[#C9973A] bg-white shadow-[0_15px_30px_rgba(201,151,58,0.12)]'
          : 'border-slate-100 bg-white hover:border-[#C9973A]/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="absolute inset-0 p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
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
    </motion.div>
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
            {styles.asset ? (
              <img src={styles.asset} className="w-80 h-80 object-contain rotate-12" alt="" />
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
}: CategorySelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<Category | null>(null);
  const [generalCategories, setGeneralCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const [activeLabourGroup, setActiveLabourGroup] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [labourSubSearch, setLabourSubSearch] = useState('');
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

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

  const filteredCategories = generalCategories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter((sub) =>
    sub.name.toLowerCase().includes(subSearchQuery.toLowerCase())
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
        className={`${isStandalone ? 'max-w-[1400px] mx-auto px-6 md:px-12 py-10 md:py-20' : 'w-full py-4'}`}
      >
        {activeParent ? (
          <div className="flex flex-col animate-in slide-in-from-right duration-500">
            {hideHeader ? (
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveParent(null)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9973A] hover:gap-2.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px]">
                  {activeParent.name}
                </span>
              </div>
            ) : (
              <div className="mb-8 sm:mb-10">
                <button
                  onClick={() => setActiveParent(null)}
                  className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-5 hover:text-[#C9973A] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to categories
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
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1.5 tonse-scrollbar'
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
                  // of inside each card; variant chips stack vertically so
                  // labels like "Buy New" / "Repair" don't truncate at narrow
                  // column widths.
                  if (hideHeader) {
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
                  onClick={() => setActiveParent(null)}
                  className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-slate-600 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 hover:border-slate-300 hover:text-[#1a1a2e] transition-all border border-slate-200"
                >
                  Change Industry
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
          <div className="animate-in slide-in-from-right duration-500">
            <button
              onClick={() => setActiveLabourGroup(null)}
              className="flex items-center gap-2 text-slate-400 font-bold mb-8 hover:text-[#C9973A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <h1 className="text-4xl font-serif font-black text-[#1a1a2e] mb-12">Labour & Skills</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
              {LABOUR_CATEGORY_GROUPS.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleLabourGroupClick(g)}
                  className={`p-6 rounded-[24px] bg-white border-2 text-center cursor-pointer transition-all ${activeLabourGroup.id === g.id ? 'border-[#C9973A]' : 'border-slate-200'}`}
                >
                  <h4 className="font-bold text-xs uppercase tracking-tight text-[#1a1a2e]">
                    {g.label}
                  </h4>
                </div>
              ))}
            </div>
            {activeLabourGroup !== 'ROOT' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LABOUR_CATEGORIES.filter((c) => c.category === activeLabourGroup.id).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleLabourSubTypeSelect(s)}
                    className={`p-6 rounded-[24px] bg-white border-2 flex items-center justify-between cursor-pointer transition-all ${selectedCategories.some((c) => c.id === s.id) ? 'border-[#C9973A]' : 'border-slate-200'}`}
                  >
                    <span className="font-bold text-sm text-[#1a1a2e]">{s.label}</span>
                    {selectedCategories.some((c) => c.id === s.id) && (
                      <Check className="w-5 h-5 text-[#C9973A]" />
                    )}
                  </div>
                ))}
              </div>
            )}
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
                <div
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto pr-1.5 scroll-smooth tonse-scrollbar"
                  style={{
                    maskImage:
                      'linear-gradient(to bottom, black 0, black calc(100% - 24px), transparent 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to bottom, black 0, black calc(100% - 24px), transparent 100%)',
                  }}
                >
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
