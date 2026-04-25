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
  GraduationCap
} from 'lucide-react';

export type CategoryType = 'PRODUCTS' | 'SERVICES' | 'VENUES' | 'LABOR';

interface InquiryPreferencesProps {
  categoryType: CategoryType;
  onBack: () => void;
  onNext: (preferences: any) => void;
}

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

  // When categoryType changes (if ever), reset the state to the first option of the new config
  useEffect(() => {
    setTargetOption(PREFERENCES_CONFIG[categoryType]?.section1.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section1.options[0].id);
    setQuoteParameter(PREFERENCES_CONFIG[categoryType]?.section2.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section2.options[0].id);
    setValidity(PREFERENCES_CONFIG[categoryType]?.section3.options[0].id || PREFERENCES_CONFIG.PRODUCTS.section3.options[0].id);
  }, [categoryType]);

  const handleNext = () => {
    onNext({
      targetOption,
      quoteParameter,
      validity
    });
  };

  const Section1Icon = config.section1.icon;
  const Section2Icon = config.section2.icon;
  const Section3Icon = config.section3.icon;

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-[#f5f2ed]/80 backdrop-blur-md z-20 px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            STEP 2
          </p>
        </div>

        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Preferences
          </h1>
        </div>
      </div>

      <div className="p-[20px_16px_140px_16px] flex flex-col gap-8">
        {/* Section 1: Target Option */}
        <div className="flex flex-col gap-5">
          <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
              <Section1Icon className="w-4 h-4 text-[#C9973A]" />
            </div>
            {config.section1.title}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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

        {/* Section 3: Timeline & Validity */}
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
          <div className="flex flex-wrap gap-2">
            {config.section3.options.map((opt) => {
              const isSelected = validity === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setValidity(opt.id)}
                  className={`flex-1 min-w-[100px] py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[12px] ${isSelected ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]' : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 pb-12 flex justify-center sm:justify-end">
          <button
            onClick={handleNext}
            className="w-full sm:w-auto sm:px-16 h-13.5 bg-[#C9973A] rounded-[50px] flex flex-col items-center justify-center gap-0.5 font-sans text-white shadow-[0_4px_16_rgba(201,151,58,0.35)] transition-all active:scale-[0.98]"
          >
            <span className="text-[15px] font-bold leading-none">Confirm & Continue</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-70">
              Finalize Inquiry Preferences
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
