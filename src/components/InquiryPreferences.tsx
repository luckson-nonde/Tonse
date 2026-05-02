import React, { useState, useEffect } from 'react';
import {
  Check,
  Navigation,
  Settings,
  Clock,
  Building2,
  Store,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  User,
  Star,
  Users,
  Search,
  Award,
  Briefcase,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';

export type CategoryType = 'PRODUCTS' | 'SERVICES' | 'VENUES' | 'LABOR';

interface InquiryPreferencesProps {
  categoryType: CategoryType;
  onBack: () => void;
  onNext: (preferences: any) => void;
}

// Tiered pricing for the quote-count cap. Buyer pays the fee; system auto-closes
// the inquiry once the chosen number of quotes has landed. Prices increment by
// K5 across the eight tiers; quote counts step 5 → 10 → 20 → 70.
const QUOTE_COUNT_TIERS = [
  { count: 5, price: 10 },
  { count: 10, price: 15 },
  { count: 20, price: 20 },
  { count: 30, price: 25 },
  { count: 40, price: 30 },
  { count: 50, price: 35 },
  { count: 60, price: 40 },
  { count: 70, price: 45 },
];

const PREFERENCES_CONFIG = {
  PRODUCTS: {
    section1: {
      title: "Target Destination",
      description: "Where would you like to receive quotes from?",
      icon: Navigation,
      options: [
        { id: "wholesale", label: "Wholesale Markets", icon: Building2 },
        { id: "malls", label: "Shopping Malls", icon: Store },
        { id: "local", label: "Local Shops", icon: Store },
        { id: "distributors", label: "Verified Distributors", icon: CheckCircle2 },
        { id: "any", label: "Any Shop", icon: MapPin }
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important for this product?",
      icon: Settings,
      options: [
        { id: "price", label: "Lowest Price" },
        { id: "authenticity", label: "Brand Authenticity" },
        { id: "delivery", label: "Fastest Delivery" },
        { id: "warranty", label: "Warranty Included" }
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h", label: "24 Hours" },
        { id: "3d", label: "3 Days" },
        { id: "1w", label: "1 Week" },
        { id: "budget", label: "Until Budget Met" }
      ]
    }
  },
  SERVICES: {
    section1: {
      title: "Target Providers",
      description: "Who do you want to hire?",
      icon: Navigation,
      options: [
        { id: "freelancers", label: "Independent Freelancers", icon: User },
        { id: "agencies", label: "Registered Agencies", icon: Building2 },
        { id: "top_rated", label: "Top Rated Only", icon: Star },
        { id: "any", label: "Any Provider", icon: Users }
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important for this service?",
      icon: Settings,
      options: [
        { id: "availability", label: "Fastest Availability" },
        { id: "price", label: "Lowest Price" },
        { id: "rating", label: "Highest Rating" },
        { id: "experience", label: "Most Experience" }
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h", label: "24 Hours" },
        { id: "3d", label: "3 Days" },
        { id: "1w", label: "1 Week" },
        { id: "flexible", label: "Flexible" }
      ]
    }
  },
  VENUES: {
    section1: {
      title: "Target Venues",
      description: "What type of establishment?",
      icon: Navigation,
      options: [
        { id: "hotels", label: "Hotels & Lodges", icon: Building2 },
        { id: "independent", label: "Independent Venues", icon: MapPin },
        { id: "restaurants", label: "Restaurants & Clubs", icon: Store },
        { id: "any", label: "Any Venue", icon: Search }
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important for this booking?",
      icon: Settings,
      options: [
        { id: "price", label: "Lowest Price" },
        { id: "amenities", label: "Best Amenities" },
        { id: "terms", label: "Most Flexible Terms" },
        { id: "rating", label: "Highest Rating" }
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h", label: "24 Hours" },
        { id: "3d", label: "3 Days" },
        { id: "1w", label: "1 Week" },
        { id: "flexible", label: "Flexible" }
      ]
    }
  },
  LABOR: {
    section1: {
      title: "Target Staff",
      description: "Who do you want to hire?",
      icon: Navigation,
      options: [
        { id: "certified", label: "Certified Professionals", icon: Award },
        { id: "experienced", label: "Experienced Workers", icon: Briefcase },
        { id: "trainees", label: "Trainees/Juniors", icon: GraduationCap },
        { id: "any", label: "Any Available", icon: Users }
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important?",
      icon: Settings,
      options: [
        { id: "availability", label: "Immediate Availability" },
        { id: "rate", label: "Lowest Daily Rate" },
        { id: "rating", label: "Highest Rating" },
        { id: "references", label: "Verified References" }
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "12h", label: "12 Hours" },
        { id: "24h", label: "24 Hours" },
        { id: "3d", label: "3 Days" },
        { id: "flexible", label: "Flexible" }
      ]
    }
  }
};

export default function InquiryPreferences({ categoryType, onBack, onNext }: InquiryPreferencesProps) {
  // Ensure we fallback safely if categoryType is missing or invalid
  const config = PREFERENCES_CONFIG[categoryType] || PREFERENCES_CONFIG.PRODUCTS;

  const [targetOption, setTargetOption] = useState<string>(config.section1.options[0].id);
  const [quoteParameter, setQuoteParameter] = useState<string>(config.section2.options[0].id);
  const [validity, setValidity] = useState<string>(config.section3.options[0].id);
  const [quoteCount, setQuoteCount] = useState<number>(QUOTE_COUNT_TIERS[0].count);

  // When categoryType changes (if ever), reset the state to the first option of the new config
  useEffect(() => {
    setTargetOption(PREFERENCES_CONFIG[categoryType]?.section1.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section1.options[0].id);
    setQuoteParameter(PREFERENCES_CONFIG[categoryType]?.section2.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section2.options[0].id);
    setValidity(PREFERENCES_CONFIG[categoryType]?.section3.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section3.options[0].id);
  }, [categoryType]);

  const selectedTier = QUOTE_COUNT_TIERS.find((t) => t.count === quoteCount) ?? QUOTE_COUNT_TIERS[0];

  const handleNext = () => {
    onNext({
      targetOption,
      quoteParameter,
      validity,
      quoteCount,
      quoteFee: selectedTier.price,
    });
  };

  const Section1Icon = config.section1.icon;
  const Section2Icon = config.section2.icon;
  const Section3Icon = config.section3.icon;

  return (
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Mobile-only sticky header */}
      <div className="md:hidden sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            STEP 2 / PREFERENCES
          </p>
        </div>
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Preferences
          </h1>
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-10 xl:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
          {/* Desktop left-side context — sticky */}
          <div className="hidden md:flex flex-col gap-8 w-full md:w-[320px] lg:w-[400px] shrink-0 sticky top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[32px] p-8 shadow-sm">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-8 hover:gap-3 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to inquiry details
              </button>

              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <Settings className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                  Step 02 / Tuning
                </p>
                <h1 className="font-serif text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  Preferences
                </h1>
                <p className="text-[14px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  Tell us where to look, what matters most, and how many quotes you'd like to receive before we close the inquiry.
                </p>
              </div>
            </div>

            {/* Why these settings matter */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[32px] p-7">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                    Tonse Tip
                  </p>
                  <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                    Why preferences matter
                  </h3>
                </div>
              </div>
              <p className="text-[13px] text-[#1a1a2e]/65 leading-relaxed font-medium mb-5">
                These settings tune which providers see your inquiry, how they compete for it, and when we stop accepting more offers.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Navigation className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Target shops</span> narrow your inquiry to the right kind of seller.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Quote priority</span> tells us which offers to surface first.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Quote count</span> caps how many offers you'll receive — we close the inquiry the moment your target is reached.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Validity window</span> keeps offers fresh and easy to compare.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Right-side form */}
          <div className="flex-1 w-full">
            <div className="bg-white border border-[#f1f5f9] rounded-[32px] p-6 md:p-8 xl:p-10 shadow-sm shadow-[#1a1a2e]/[0.02] flex flex-col gap-10">
              {/* Section 1: Target Option */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Section1Icon className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  {config.section1.title}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {config.section1.options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = targetOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setTargetOption(opt.id)}
                        className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all relative flex flex-col items-center gap-2 text-center ${isSelected ? 'border-[#C9973A] bg-[rgba(201,151,58,0.03)]' : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'}`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                          </div>
                        )}
                        <Icon
                          className={`w-6 h-6 transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`}
                        />
                        <p
                          className={`font-sans font-bold text-[11px] leading-tight transition-colors ${isSelected ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}
                        >
                          {opt.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] font-medium text-[#94a3b8] ml-1 leading-relaxed font-sans">
                  {config.section1.description}
                </p>
              </div>

              {/* Section 2: Quote Parameters */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Section2Icon className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  {config.section2.title}
                </h3>
                <p className="text-[11px] font-medium text-[#94a3b8] ml-1 mb-1 leading-relaxed font-sans">
                  {config.section2.description}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {config.section2.options.map((opt) => {
                    const isSelected = quoteParameter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setQuoteParameter(opt.id)}
                        className={`px-4 py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[12px] text-center ${isSelected ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]' : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Number of Quotations (NEW) */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  Number of Quotations
                </h3>
                <p className="text-[11px] font-medium text-[#94a3b8] ml-1 leading-relaxed font-sans">
                  Choose how many quotes you'd like to receive. We'll automatically close the inquiry once your target is reached.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 md:gap-3">
                  {QUOTE_COUNT_TIERS.map((tier) => {
                    const isSelected = quoteCount === tier.count;
                    return (
                      <button
                        key={tier.count}
                        onClick={() => setQuoteCount(tier.count)}
                        className={`relative px-3 py-4 rounded-2xl border-[1.5px] transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] shadow-[0_8px_20px_-12px_rgba(201,151,58,0.35)]'
                            : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                          </div>
                        )}
                        <span
                          className={`font-serif text-2xl font-bold leading-none transition-colors ${
                            isSelected ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'
                          }`}
                        >
                          {tier.count}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${
                            isSelected ? 'text-[#C9973A]' : 'text-[#cbd5e1]'
                          }`}
                        >
                          quotes
                        </span>
                        <span
                          className={`text-[12px] font-black mt-1 transition-colors ${
                            isSelected ? 'text-[#C9973A]' : 'text-[#94a3b8]'
                          }`}
                        >
                          K{tier.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#fdf6e9]/60 border border-[#C9973A]/15 mt-1">
                  <p className="text-[11px] font-medium text-[#1a1a2e]/70 leading-snug">
                    Inquiry auto-closes after <span className="font-black text-[#1a1a2e]">{selectedTier.count} quotes</span>
                  </p>
                  <p className="text-[12px] font-black text-[#C9973A] shrink-0">
                    Service fee: K{selectedTier.price}
                  </p>
                </div>
              </div>

              {/* Section 4: Timeline & Validity */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Section3Icon className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  {config.section3.title}
                </h3>
                <p className="text-[11px] font-medium text-[#94a3b8] ml-1 mb-1 leading-relaxed font-sans">
                  {config.section3.description}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {config.section3.options.map((opt) => {
                    const isSelected = validity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setValidity(opt.id)}
                        className={`py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[12px] ${isSelected ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]' : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-6 border-t border-[#f1f5f9] flex justify-center sm:justify-end">
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto sm:px-16 h-13.5 py-3 bg-[#C9973A] rounded-[50px] flex flex-col items-center justify-center gap-0.5 font-sans text-white shadow-[0_8px_24px_-8px_rgba(201,151,58,0.45)] hover:bg-[#b8861e] transition-all active:scale-[0.98]"
                >
                  <span className="text-[15px] font-bold leading-none">Confirm &amp; Continue</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-70">
                    Finalize Inquiry Preferences · K{selectedTier.price}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
