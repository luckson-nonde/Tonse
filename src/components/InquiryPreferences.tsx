import React, { useState, useEffect, useMemo } from 'react';
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
  Hotel,
  TreePine,
  Wrench,
  Recycle,
  Globe,
  Truck,
  ShieldCheck,
  PackageOpen,
  Car,
  Landmark,
  Coins,
} from 'lucide-react';
import { getBillingSettings, type BillingSettingsPublic } from '../services/api/billingService';

export type CategoryType = 'PRODUCTS' | 'SERVICES' | 'VENUES' | 'LABOR';

interface InquiryPreferencesProps {
  categoryType: CategoryType;
  onBack: () => void;
  onNext: (preferences: any) => void;
  /** When set, the form is in targeted-shop mode: "Target Destination" is replaced
   *  with a two-option "Delivery Scope" (this shop only vs. all branches). */
  targetedShop?: { id: string; sellerId: string; name: string; categoryIds?: string[] };
  /** Optional category id (e.g. 'event-equipment-rental'). When present and a
   *  matching override exists in PREFERENCES_OVERRIDES, the per-category
   *  labels/options replace the archetype defaults. Falls back to the
   *  archetype config when missing or unknown. */
  categoryKey?: string;
}

// Tiered pricing for the quote-count cap. Buyer pays the fee; system auto-closes
// the inquiry once the chosen number of quotes has landed.
// The COUNTS are the platform invariant; the PRICES are admin-editable
// (billing_settings.quoteTiers, fetched on mount) with these as the offline
// fallback — a settings fetch hiccup must fall back to paid behaviour, never
// accidentally waive fees. When the admin turns monetization OFF, every fee
// on this screen renders FREE and handleNext emits quoteFee: 0 (which makes
// BuyerDashboard skip the payment step entirely).
const QUOTE_COUNT_TIERS = [
  { count: 5,  price: 10 },
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
        { id: "wholesale",    label: "Wholesale Markets",    icon: Building2     },
        { id: "malls",        label: "Shopping Malls",       icon: Store         },
        { id: "local",        label: "Local Shops",          icon: Store         },
        { id: "distributors", label: "Verified Distributors",icon: CheckCircle2  },
        { id: "any",          label: "Any Shop",             icon: MapPin        },
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important for this product?",
      icon: Settings,
      options: [
        { id: "price",        label: "Lowest Price"       },
        { id: "authenticity", label: "Brand Authenticity" },
        { id: "delivery",     label: "Fastest Delivery"   },
        { id: "warranty",     label: "Warranty Included"  },
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h",    label: "24 Hours"       },
        { id: "3d",     label: "3 Days"         },
        { id: "1w",     label: "1 Week"         },
        { id: "budget", label: "Until Budget Met"},
      ]
    }
  },
  SERVICES: {
    section1: {
      title: "Target Providers",
      description: "Who do you want to hire?",
      icon: Navigation,
      options: [
        { id: "freelancers", label: "Independent Freelancers", icon: User      },
        { id: "agencies",    label: "Registered Agencies",     icon: Building2 },
        { id: "top_rated",   label: "Top Rated Only",          icon: Star      },
        { id: "any",         label: "Any Provider",            icon: Users     },
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important for this service?",
      icon: Settings,
      options: [
        { id: "availability", label: "Fastest Availability" },
        { id: "price",        label: "Lowest Price"         },
        { id: "rating",       label: "Highest Rating"       },
        { id: "experience",   label: "Most Experience"      },
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h",      label: "24 Hours" },
        { id: "3d",       label: "3 Days"   },
        { id: "1w",       label: "1 Week"   },
        { id: "flexible", label: "Flexible" },
      ]
    }
  },
  VENUES: {
    section1: {
      title: "Venue Setting",
      description: "Where should the venue be located?",
      icon: Building2,
      options: [
        { id: "standalone",      label: "Standalone Venue",   icon: Building2 },
        { id: "lodge_hotel",     label: "Lodge / Hotel",      icon: Hotel     },
        { id: "outdoor_garden",  label: "Outdoor / Garden",   icon: TreePine  },
        { id: "restaurant_club", label: "Restaurant / Club",  icon: Store     },
        { id: "any",             label: "Any Setting",        icon: Search    },
      ]
    },
    section2: {
      title: "What Matters Most",
      description: "What's your top priority for this venue booking?",
      icon: Settings,
      options: [
        { id: "capacity",  label: "Capacity & Space"  },
        { id: "amenities", label: "Best Amenities"    },
        { id: "terms",     label: "Flexible Terms"    },
        { id: "price",     label: "Best Price"        },
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "24h",      label: "24 Hours" },
        { id: "3d",       label: "3 Days"   },
        { id: "1w",       label: "1 Week"   },
        { id: "flexible", label: "Flexible" },
      ]
    }
  },
  LABOR: {
    section1: {
      title: "Target Staff",
      description: "Who do you want to hire?",
      icon: Navigation,
      options: [
        { id: "certified",   label: "Certified Professionals", icon: Award         },
        { id: "experienced", label: "Experienced Workers",     icon: Briefcase     },
        { id: "trainees",    label: "Trainees/Juniors",        icon: GraduationCap },
        { id: "any",         label: "Any Available",           icon: Users         },
      ]
    },
    section2: {
      title: "Quote Parameters",
      description: "What's most important?",
      icon: Settings,
      options: [
        { id: "availability", label: "Immediate Availability" },
        { id: "rate",         label: "Lowest Daily Rate"      },
        { id: "rating",       label: "Highest Rating"         },
        { id: "references",   label: "Verified References"    },
      ]
    },
    section3: {
      title: "Timeline & Validity",
      description: "How long should quotes remain valid?",
      icon: Clock,
      options: [
        { id: "12h",      label: "12 Hours" },
        { id: "24h",      label: "24 Hours" },
        { id: "3d",       label: "3 Days"   },
        { id: "flexible", label: "Flexible" },
      ]
    }
  }
};

type SectionShape = typeof PREFERENCES_CONFIG.SERVICES.section1;
type ParamSection = typeof PREFERENCES_CONFIG.SERVICES.section2;

// Per-category overrides keyed by the stable category id. Each section is
// replaced wholesale; sections not overridden fall back to the archetype
// default. Use this when the labels should differ for the specific subtype
// even though the archetype is the same — e.g. all event subtypes are
// SERVICES, but the trade-offs a buyer cares about for renting equipment are
// not the trade-offs they care about for hiring a planner.
// Shared by every loan type — how long a lender's offer stays open for the
// borrower to compare before it lapses. (Loans reuse the SERVICES base, so
// without this the borrower would see generic "how long should quotes remain
// valid" copy.)
const LOAN_VALIDITY: ParamSection = {
  title: 'Offer Validity',
  description: 'How long should lender offers stay open for you to compare?',
  icon: Clock,
  options: [
    { id: '24h', label: '24 Hours' },
    { id: '3d', label: '3 Days' },
    { id: '1w', label: '1 Week' },
    { id: 'flexible', label: 'Flexible' },
  ],
};

const PREFERENCES_OVERRIDES: Record<
  string,
  Partial<{ section1: SectionShape; section2: ParamSection; section3: ParamSection }>
> = {
  'event-equipment-rental': {
    section1: {
      title: 'Target Suppliers',
      description: 'Where would you like to source the equipment from?',
      icon: Store,
      options: [
        { id: 'local',       label: 'Local Rental Houses',   icon: Store     },
        { id: 'established', label: 'Established Suppliers', icon: Building2 },
        { id: 'top_rated',   label: 'Top Rated Only',        icon: Star      },
        { id: 'any',         label: 'Any Supplier',          icon: Users     },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for this rental?",
      icon: Settings,
      options: [
        { id: 'price',     label: 'Lowest Price'     },
        { id: 'condition', label: 'Newest Equipment' },
        { id: 'selection', label: 'Widest Selection' },
        { id: 'setup',     label: 'Fastest Setup'    },
      ],
    },
  },
  'event-catering': {
    section1: {
      title: 'Target Caterers',
      description: 'Who do you want preparing your menu?',
      icon: Navigation,
      options: [
        { id: 'independent', label: 'Independent Caterers', icon: User      },
        { id: 'companies',   label: 'Catering Companies',   icon: Building2 },
        { id: 'hotel',       label: 'Hotel Kitchens',       icon: Hotel     },
        { id: 'any',         label: 'Any Caterer',          icon: Users     },
      ],
    },
    section2: {
      title: 'Quote Parameters',
      description: "What's most important for the catering?",
      icon: Settings,
      options: [
        { id: 'price',      label: 'Lowest Price'        },
        { id: 'variety',    label: 'Menu Variety'        },
        { id: 'dietary',    label: 'Dietary Specialists' },
        { id: 'experience', label: 'Most Experience'     },
      ],
    },
  },
  'event-decor': {
    section1: {
      title: 'Target Decorators',
      description: 'Who do you want styling the event?',
      icon: Navigation,
      options: [
        { id: 'independent', label: 'Independent Decorators', icon: User      },
        { id: 'studios',     label: 'Decor Studios',          icon: Building2 },
        { id: 'top_rated',   label: 'Top Rated Only',         icon: Star      },
        { id: 'any',         label: 'Any Decorator',          icon: Users     },
      ],
    },
    section2: {
      title: 'Quote Parameters',
      description: "What's most important for the decor?",
      icon: Settings,
      options: [
        { id: 'price',      label: 'Lowest Price'    },
        { id: 'creativity', label: 'Most Creative'   },
        { id: 'catalog',    label: 'Largest Catalog' },
        { id: 'specialty',  label: 'Theme Specialty' },
      ],
    },
  },
  'event-planning': {
    section1: {
      title: 'Target Planners',
      description: 'Who do you want planning the event?',
      icon: Navigation,
      options: [
        { id: 'independent', label: 'Independent Planners', icon: User      },
        { id: 'agencies',    label: 'Planning Agencies',    icon: Building2 },
        { id: 'top_rated',   label: 'Top Rated Only',       icon: Star      },
        { id: 'any',         label: 'Any Planner',          icon: Users     },
      ],
    },
    section2: {
      title: 'Quote Parameters',
      description: "What's most important for planning?",
      icon: Settings,
      options: [
        { id: 'price',      label: 'Lowest Price'    },
        { id: 'experience', label: 'Most Experience' },
        { id: 'network',    label: 'Vendor Network'  },
        { id: 'reviews',    label: 'Best Reviews'    },
      ],
    },
  },
  'event-management': {
    section1: {
      title: 'Target Managers',
      description: 'Who do you want running the event?',
      icon: Navigation,
      options: [
        { id: 'independent', label: 'Independent Managers',  icon: Briefcase },
        { id: 'agencies',    label: 'Management Agencies',   icon: Building2 },
        { id: 'top_rated',   label: 'Top Rated Only',        icon: Star      },
        { id: 'any',         label: 'Any Manager',           icon: Users     },
      ],
    },
    section2: {
      title: 'Quote Parameters',
      description: "What's most important for event management?",
      icon: Settings,
      options: [
        { id: 'price',        label: 'Lowest Price'         },
        { id: 'experience',   label: 'Most Experience'      },
        { id: 'coordination', label: 'On-Day Coordination'  },
        { id: 'reviews',      label: 'Best Reviews'         },
      ],
    },
  },

  // ─── AUTOMOTIVE ─────────────────────────────────────────────────────
  // Each automotive subcategory replaces Section 1 ("target destination")
  // with the right counterparty type. Sections 2 (priority) and 3
  // (timeline) inherit the base PRODUCTS / SERVICES template — for
  // car-breakdown-recovery the base is SERVICES (overridden in
  // categories.ts:SUB_CATEGORY_TYPE_OVERRIDES), so the priority options
  // already read as "Fastest Availability / Lowest Price" etc.

  'vehicles-buy': {
    section1: {
      title: 'Target Dealers',
      description: 'Who do you want to receive quotes from?',
      icon: Car,
      options: [
        { id: 'authorized',  label: 'Authorised Dealers',     icon: ShieldCheck },
        { id: 'independent', label: 'Independent Dealers',    icon: Store       },
        { id: 'preowned',    label: 'Pre-owned Specialists',  icon: Truck       },
        { id: 'showroom',    label: 'Showrooms Only',         icon: Building2   },
        { id: 'any',         label: 'Any Dealer',             icon: Users       },
      ],
    },
  },
  'car-parts-new': {
    section1: {
      title: 'Target Suppliers',
      description: 'Where should the parts come from?',
      icon: PackageOpen,
      options: [
        { id: 'oem',          label: 'OEM Parts Suppliers',  icon: ShieldCheck },
        { id: 'aftermarket',  label: 'Aftermarket Suppliers', icon: PackageOpen },
        { id: 'distributors', label: 'Wholesale Distributors', icon: Truck      },
        { id: 'workshops',    label: 'Local Workshops',       icon: Wrench      },
        { id: 'any',          label: 'Any Supplier',          icon: Users       },
      ],
    },
  },
  'car-parts-breakers': {
    section1: {
      title: 'Target Breaker Yards',
      description: 'Who should source the used part?',
      icon: Recycle,
      options: [
        { id: 'local',      label: 'Local Breakers',          icon: MapPin      },
        { id: 'national',   label: 'National Network',        icon: Globe       },
        { id: 'specialist', label: 'Make-specialist Breakers', icon: ShieldCheck },
        { id: 'any',        label: 'Any Breaker',             icon: Users       },
      ],
    },
  },
  'car-accessories': {
    section1: {
      title: 'Target Stores',
      description: 'Where should we source the accessory from?',
      icon: Store,
      options: [
        { id: 'specialty', label: 'Specialty Auto Stores', icon: ShieldCheck },
        { id: 'general',   label: 'General Auto Shops',    icon: Store       },
        { id: 'online',    label: 'Online Retailers',      icon: Globe       },
        { id: 'any',       label: 'Any Store',             icon: Users       },
      ],
    },
  },
  'car-breakdown-recovery': {
    section1: {
      title: 'Recovery Service Type',
      description: 'What kind of recovery operator do you need?',
      icon: Truck,
      options: [
        { id: 'local24',   label: 'Local 24/7 Service',   icon: Clock       },
        { id: 'insurance', label: 'Insurance-affiliated', icon: ShieldCheck },
        { id: 'heavy',     label: 'Heavy-duty Recovery',  icon: Truck       },
        { id: 'any',       label: 'Any Operator',         icon: Users       },
      ],
    },
  },
  'motorcycles-parts': {
    section1: {
      title: 'Target Suppliers',
      description: 'Where should the bike parts come from?',
      icon: PackageOpen,
      options: [
        { id: 'specialists', label: 'Bike Specialists',      icon: ShieldCheck },
        { id: 'general',     label: 'General Auto Suppliers', icon: Store      },
        { id: 'online',      label: 'Online Retailers',      icon: Globe       },
        { id: 'any',         label: 'Any Supplier',          icon: Users       },
      ],
    },
  },
  'automotive-tools': {
    section1: {
      title: 'Target Suppliers',
      description: 'Where should the tools come from?',
      icon: Wrench,
      options: [
        { id: 'specialty',  label: 'Tool Specialists',     icon: ShieldCheck },
        { id: 'hardware',   label: 'Hardware Stores',      icon: Store       },
        { id: 'industrial', label: 'Industrial Suppliers', icon: Truck       },
        { id: 'any',        label: 'Any Supplier',         icon: Users       },
      ],
    },
  },

  // ── Clinical Services ────────────────────────────────────────────────
  'pharmacies': {
    section1: {
      title: 'Target Pharmacies',
      description: 'Who should fill this prescription?',
      icon: Navigation,
      options: [
        { id: 'registered', label: 'Registered Pharmacies', icon: ShieldCheck },
        { id: 'hospital',   label: 'Hospital Pharmacies',   icon: Building2   },
        { id: 'nearby',     label: 'Nearest To Me',         icon: MapPin      },
        { id: 'any',        label: 'Any Pharmacy',          icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for this medication?",
      icon: Settings,
      options: [
        { id: 'speed',    label: 'Fastest Availability' },
        { id: 'price',    label: 'Lowest Price'         },
        { id: 'distance', label: 'Nearest Pharmacy'     },
        { id: 'brand',    label: 'Exact Brand Only'     },
      ],
    },
  },
  'home-care': {
    section1: {
      title: 'Target Caregivers',
      description: 'Who should provide this care?',
      icon: Navigation,
      options: [
        { id: 'nurses',   label: 'Registered Nurses',      icon: ShieldCheck },
        { id: 'doctors',  label: 'Doctors',                icon: User        },
        { id: 'agencies', label: 'Care Agencies',          icon: Building2   },
        { id: 'any',      label: 'Any Qualified Provider', icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for this care?",
      icon: Settings,
      options: [
        { id: 'qualifications', label: 'Qualifications & Experience' },
        { id: 'price',          label: 'Lowest Price'                },
        { id: 'availability',   label: 'Soonest Available'           },
        { id: 'distance',       label: 'Nearest To Me'               },
      ],
    },
  },
  'hospital-labs': {
    section1: {
      title: 'Target Labs',
      description: 'Who should run these tests?',
      icon: Navigation,
      options: [
        { id: 'accredited', label: 'Accredited Labs',    icon: ShieldCheck },
        { id: 'hospital',   label: 'Hospital Labs',      icon: Building2   },
        { id: 'nearby',     label: 'Nearest To Me',      icon: MapPin      },
        { id: 'any',        label: 'Any Lab',            icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for the tests?",
      icon: Settings,
      options: [
        { id: 'turnaround', label: 'Fastest Results'        },
        { id: 'price',      label: 'Lowest Price'           },
        { id: 'home',       label: 'Home Sample Collection' },
        { id: 'accuracy',   label: 'Accredited / Certified' },
      ],
    },
  },

  // ── Apartments & Housing ─────────────────────────────────────────────
  'long-term-rentals': {
    section1: {
      title: 'Target Landlords',
      description: 'Who should offer you a unit?',
      icon: Navigation,
      options: [
        { id: 'agents',    label: 'Registered Agents',  icon: ShieldCheck },
        { id: 'landlords', label: 'Private Landlords',  icon: User        },
        { id: 'verified',  label: 'Verified Only',      icon: CheckCircle2 },
        { id: 'any',       label: 'Anyone With a Unit', icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for the home?",
      icon: Settings,
      options: [
        { id: 'price',    label: 'Lowest Rent'    },
        { id: 'area',     label: 'Best Area'      },
        { id: 'ready',    label: 'Move-In Ready'  },
        { id: 'security', label: 'Most Secure'    },
      ],
    },
  },
  'short-stay-serviced': {
    section1: {
      title: 'Target Hosts',
      description: 'Who should host your stay?',
      icon: Navigation,
      options: [
        { id: 'serviced',  label: 'Serviced Apartments', icon: Building2   },
        { id: 'private',   label: 'Private Hosts',       icon: User        },
        { id: 'verified',  label: 'Verified Only',       icon: ShieldCheck },
        { id: 'any',       label: 'Any Host',            icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for the stay?",
      icon: Settings,
      options: [
        { id: 'price',     label: 'Best Price'     },
        { id: 'dates',     label: 'My Exact Dates' },
        { id: 'amenities', label: 'Most Amenities' },
        { id: 'location',  label: 'Best Location'  },
      ],
    },
  },
  'boarding-student-rooms': {
    section1: {
      title: 'Target Boarding Houses',
      description: 'Who should offer you a room?',
      icon: Navigation,
      options: [
        { id: 'registered', label: 'Registered Boarding Houses', icon: ShieldCheck },
        { id: 'private',    label: 'Private Landlords',          icon: User        },
        { id: 'campus',     label: 'Near-Campus Only',           icon: MapPin      },
        { id: 'any',        label: 'Any Boarding House',         icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for the room?",
      icon: Settings,
      options: [
        { id: 'price',    label: 'Cheapest'           },
        { id: 'distance', label: 'Closest to Campus'  },
        { id: 'meals',    label: 'Meals Included'     },
        { id: 'security', label: 'Most Secure'        },
      ],
    },
  },

  // ─── LOANS ──────────────────────────────────────────────────────────
  // Each loan TYPE gets its own preferences: which lenders to reach and what
  // the borrower optimises for differ by how the loan is secured. Loans reuse
  // the SERVICES base, so these fully replace all three sections; the component
  // also switches its language to lenders/offers when the key starts with 'loan'.

  'loan-collateral': {
    section1: {
      title: 'Target Lenders',
      description: 'Which kind of lender should see your secured loan request?',
      icon: Navigation,
      options: [
        { id: 'banks',        label: 'Banks',                 icon: Landmark    },
        { id: 'asset_backed', label: 'Asset-backed Lenders',  icon: ShieldCheck },
        { id: 'microfinance', label: 'Microfinance',          icon: Building2   },
        { id: 'any',          label: 'Any Lender',            icon: Users       },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority in an offer?",
      icon: Settings,
      options: [
        { id: 'interest',     label: 'Lowest Interest'      },
        { id: 'ltv',          label: 'Highest Loan-to-Value'},
        { id: 'disbursement', label: 'Fastest Disbursement' },
        { id: 'fees',         label: 'Lowest Fees'          },
      ],
    },
    section3: LOAN_VALIDITY,
  },

  'loan-salary': {
    section1: {
      title: 'Target Lenders',
      description: 'Which kind of lender should see your salary-based request?',
      icon: Navigation,
      options: [
        { id: 'banks',        label: 'Banks',         icon: Landmark  },
        { id: 'microfinance', label: 'Microfinance',  icon: Building2 },
        { id: 'saccos',       label: 'SACCOs',        icon: Coins     },
        { id: 'any',          label: 'Any Lender',    icon: Users     },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority in an offer?",
      icon: Settings,
      options: [
        { id: 'interest',     label: 'Lowest Interest'         },
        { id: 'repayment',    label: 'Lowest Monthly Repayment'},
        { id: 'tenure',       label: 'Longest Tenure'          },
        { id: 'disbursement', label: 'Fastest Disbursement'    },
      ],
    },
    section3: LOAN_VALIDITY,
  },

  'loan-government': {
    section1: {
      title: 'Target Lenders',
      description: 'Which kind of lender should see your public-sector request?',
      icon: Navigation,
      options: [
        { id: 'banks',        label: 'Banks',                  icon: Landmark  },
        { id: 'payroll',      label: 'Payroll-linked Lenders', icon: Briefcase },
        { id: 'microfinance', label: 'Microfinance',           icon: Building2 },
        { id: 'any',          label: 'Any Lender',             icon: Users     },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority in an offer?",
      icon: Settings,
      options: [
        { id: 'interest', label: 'Lowest Interest'   },
        { id: 'payroll',  label: 'Payroll Deduction' },
        { id: 'tenure',   label: 'Longest Tenure'    },
        { id: 'approval', label: 'Fastest Approval'  },
      ],
    },
    section3: LOAN_VALIDITY,
  },

  // ── Pastry & Bakery ─────────────────────────────────────────────────────
  'custom-cakes': {
    section1: {
      title: 'Target Bakers',
      description: 'Who should bake your cake?',
      icon: Navigation,
      options: [
        { id: 'home_bakers', label: 'Home Bakers',         icon: User      },
        { id: 'bakeries',    label: 'Registered Bakeries', icon: Building2 },
        { id: 'top_rated',   label: 'Top Rated Only',      icon: Star      },
        { id: 'any',         label: 'Any Baker',           icon: Users     },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for the cake?",
      icon: Settings,
      options: [
        { id: 'price',  label: 'Lowest Price'         },
        { id: 'design', label: 'Design Matching'      },
        { id: 'taste',  label: 'Best Reviews / Taste' },
        { id: 'speed',  label: 'Fastest Turnaround'   },
      ],
    },
  },
  'bread-pastries': {
    section1: {
      title: 'Target Bakeries',
      description: 'Who should fill this order?',
      icon: Navigation,
      options: [
        { id: 'bakeries',    label: 'Registered Bakeries', icon: Building2 },
        { id: 'home_bakers', label: 'Home Bakers',         icon: User      },
        { id: 'nearby',      label: 'Nearest To Me',       icon: MapPin    },
        { id: 'any',         label: 'Any Baker',           icon: Users     },
      ],
    },
    section2: {
      title: 'What Matters Most',
      description: "What's your top priority for this order?",
      icon: Settings,
      options: [
        { id: 'price',       label: 'Lowest Price'             },
        { id: 'freshness',   label: 'Freshest / Same-Day'      },
        { id: 'variety',     label: 'Widest Selection'         },
        { id: 'reliability', label: 'Reliable Standing Orders' },
      ],
    },
  },
};

function resolveConfig(categoryType: CategoryType, categoryKey?: string) {
  const base = PREFERENCES_CONFIG[categoryType] || PREFERENCES_CONFIG.PRODUCTS;
  const overrides = categoryKey ? PREFERENCES_OVERRIDES[categoryKey] : undefined;
  return {
    section1: overrides?.section1 ?? base.section1,
    section2: overrides?.section2 ?? base.section2,
    section3: overrides?.section3 ?? base.section3,
  };
}

export default function InquiryPreferences({ categoryType, onBack, onNext, targetedShop, categoryKey }: InquiryPreferencesProps) {
  const isTargeted = !!targetedShop;
  const config = resolveConfig(categoryType, categoryKey);

  // In targeted mode the first section is replaced with a two-option scope picker.
  // Wording adapts to what the buyer is actually targeting — "Shop"
  // reads wrong when the target is a venue, service provider, or labour
  // worker. (Spotted on the screenshot: "This Shop Only" appearing
  // when sending direct to an event venue.)
  // Loan mode: a loan request negotiates OFFERS from LENDERS, not quotes from
  // shops. Detected off the sub-category key ('loan-collateral' etc.) so the
  // whole screen speaks the right language without a new CategoryType.
  const isLoan = (categoryKey || '').startsWith('loan');
  const nounSingular = isLoan ? 'offer' : 'quote';
  const nounPlural = isLoan ? 'offers' : 'quotes';

  const targetNoun =
    isLoan ? 'Lender'
    : categoryType === 'VENUES'   ? 'Venue'
    : categoryType === 'SERVICES' ? 'Provider'
    : categoryType === 'LABOR'    ? 'Worker'
    : 'Shop';
  const PrimaryIcon = isLoan ? Landmark : categoryType === 'VENUES' ? Building2 : Store;

  const section1 = isTargeted
    ? {
        title: 'Delivery Scope',
        description: `Send to ${targetedShop!.name} only, or broadcast to all its branch locations.`,
        icon: PrimaryIcon,
        options: [
          { id: 'this_shop', label: `This ${targetNoun} Only`,       icon: PrimaryIcon },
          { id: 'chain',     label: 'This & All Branches',           icon: Building2   },
        ],
      }
    : config.section1;

  const [targetOption,   setTargetOption]   = useState<string>(section1.options[0].id);
  const [quoteParameter, setQuoteParameter] = useState<string>(config.section2.options[0].id);
  const [validity,       setValidity]       = useState<string>(config.section3.options[0].id);
  const [quoteCount,     setQuoteCount]     = useState<number>(QUOTE_COUNT_TIERS[0].count);

  // Admin-set monetization settings (master switch + tier prices). null while
  // loading — every derived value below falls back to the paid hardcoded
  // defaults until the fetch lands, so the screen never flashes FREE by
  // accident.
  const [billing, setBilling] = useState<BillingSettingsPublic | null>(null);
  useEffect(() => {
    let cancelled = false;
    getBillingSettings().then((s) => {
      if (!cancelled) setBilling(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subsEnabled = billing?.subscriptionsEnabled ?? true;
  const thisShopFee = billing?.targetedInquiryFee ?? 10;
  // Counts are the platform invariant — graft admin prices onto the fixed
  // counts (match by count) so a malformed settings row can never break the
  // picker or leave quoteCount pointing at a missing tier.
  const priceTiers = useMemo(() => {
    const remote = billing?.quoteTiers;
    if (!Array.isArray(remote) || remote.length === 0) return QUOTE_COUNT_TIERS;
    return QUOTE_COUNT_TIERS.map((tier) => {
      const match = remote.find((r) => Number(r?.count) === tier.count);
      const price = Number(match?.price);
      return Number.isFinite(price) && price >= 0 ? { count: tier.count, price } : tier;
    });
  }, [billing]);
  // Reduced tiers for chain-store targeting — more than ~10 quotes from
  // branches of one chain is rarely useful.
  const chainTiers = priceTiers.slice(0, 3); // 5 / 10 / 20

  // Reset when categoryType or categoryKey changes (preserves targeted defaults)
  useEffect(() => {
    const cfg = resolveConfig(categoryType, categoryKey);
    if (!isTargeted) {
      setTargetOption(cfg.section1.options[0].id);
    }
    setQuoteParameter(cfg.section2.options[0].id);
    setValidity(cfg.section3.options[0].id);
  }, [categoryType, categoryKey, isTargeted]);

  // When the user flips to "chain", ensure the active quoteCount is within the
  // reduced tier set.
  useEffect(() => {
    if (isTargeted && targetOption === 'chain') {
      if (!chainTiers.find((t) => t.count === quoteCount)) {
        setQuoteCount(chainTiers[0].count);
      }
    }
  }, [targetOption, isTargeted, quoteCount, chainTiers]);

  // "This Shop Only" always = 1 quote at minimum fee.
  const isThisShopOnly = isTargeted && targetOption === 'this_shop';
  const activeTiers    = isTargeted ? chainTiers : priceTiers;
  const selectedTier   = activeTiers.find((t) => t.count === quoteCount) ?? activeTiers[0];

  const handleNext = () => {
    onNext({
      targetOption,
      quoteParameter,
      validity,
      quoteCount:  isThisShopOnly ? 1 : quoteCount,
      // quoteFee 0 = monetization OFF — BuyerDashboard skips the payment step.
      quoteFee:    subsEnabled ? (isThisShopOnly ? thisShopFee : selectedTier.price) : 0,
    });
  };

  const Section1Icon = section1.icon;
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
                  {isTargeted
                    ? `Fine-tune how your ${isLoan ? 'request' : 'inquiry'} reaches ${targetedShop!.name} and tell us how many ${nounPlural} you'd like back.`
                    : isLoan
                      ? 'Tell us which lenders to reach, what matters most in an offer, and how many offers you want to compare before we close the request.'
                      : "Tell us where to look, what matters most, and how many quotes you'd like to receive before we close the inquiry."}
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
                    ProQuote Tip
                  </p>
                  <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                    Why preferences matter
                  </h3>
                </div>
              </div>
              <p className="text-[13px] text-[#1a1a2e]/65 leading-relaxed font-medium mb-5">
                {isLoan
                  ? 'These settings tune which lenders see your request, how they compete for it, and when we stop accepting more offers.'
                  : 'These settings tune which providers see your inquiry, how they compete for it, and when we stop accepting more offers.'}
              </p>
              <ul className="space-y-3">
                {isTargeted ? (
                  <>
                    <li className="flex items-start gap-3">
                      <Store className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                        <span className="font-bold text-[#1a1a2e]">Delivery scope</span> controls whether only this specific location or all its branches can respond.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                        <span className="font-bold text-[#1a1a2e]">All branches</span> is useful when you want the best deal across multiple locations of the same chain.
                      </p>
                    </li>
                  </>
                ) : (
                  <li className="flex items-start gap-3">
                    <Navigation className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                      <span className="font-bold text-[#1a1a2e]">{isLoan ? 'Target lenders' : 'Target shops'}</span>{' '}
                      {isLoan
                        ? 'narrow your request to the right kind of lender.'
                        : 'narrow your inquiry to the right kind of seller.'}
                    </p>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">{isLoan ? 'Offer priority' : 'Quote priority'}</span> tells us which offers to surface first.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">{isLoan ? 'Offer count' : 'Quote count'}</span> caps how many {nounPlural} you'll receive — we close the {isLoan ? 'request' : 'inquiry'} the moment your target is reached.
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

              {/* Targeted shop context banner */}
              {isTargeted && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#fdf6e9]/70 border border-[#C9973A]/20 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-[#C9973A]/10 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">Targeted Inquiry</p>
                    <p className="text-[12px] font-semibold text-[#1a1a2e] truncate">
                      Sending to <span className="font-bold">{targetedShop!.name}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: Target / Delivery Scope */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Section1Icon className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  {section1.title}
                </h3>
                <div className={`grid gap-3 ${
                  isTargeted
                    ? 'grid-cols-2'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {section1.options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = targetOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setTargetOption(opt.id)}
                        className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all relative flex flex-col items-center gap-2 text-center ${
                          isSelected
                            ? 'border-[#C9973A] bg-[rgba(201,151,58,0.03)]'
                            : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                          </div>
                        )}
                        <Icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`} />
                        <p className={`font-sans font-bold text-[11px] leading-tight transition-colors ${isSelected ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}>
                          {opt.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] font-medium text-[#94a3b8] ml-1 leading-relaxed font-sans">
                  {section1.description}
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
                        className={`px-4 py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[12px] text-center ${
                          isSelected
                            ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]'
                            : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Number of Quotations */}
              <div className="flex flex-col gap-5">
                <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
                  <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  {isLoan ? 'Number of Lender Offers' : 'Number of Quotations'}
                </h3>

                {isThisShopOnly ? (
                  /* Fixed: exactly 1 quote from this specific shop */
                  <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-[#fdf6e9]/60 border border-[#C9973A]/20">
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1a2e]">1 {nounSingular} expected</p>
                      <p className="text-[11px] text-[#94a3b8] font-medium mt-0.5">
                        You're sending directly to one {targetNoun.toLowerCase()} — one {nounSingular} is all you need.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-black text-[#C9973A]">
                        {subsEnabled ? `K${thisShopFee}` : 'FREE'}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Service fee</p>
                    </div>
                  </div>
                ) : (
                  /* Normal / chain picker */
                  <>
                    <p className="text-[11px] font-medium text-[#94a3b8] ml-1 leading-relaxed font-sans">
                      {isTargeted
                        ? "Choose how many branch locations can respond before we close the inquiry."
                        : isLoan
                          ? "Choose how many lender offers you'd like to receive. We'll automatically close the request once your target is reached."
                          : "Choose how many quotes you'd like to receive. We'll automatically close the inquiry once your target is reached."}
                    </p>
                    <div className={`grid gap-2 md:gap-3 ${
                      isTargeted
                        ? 'grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-8'
                    }`}>
                      {activeTiers.map((tier) => {
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
                            <span className={`font-serif text-2xl font-bold leading-none transition-colors ${isSelected ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}>
                              {tier.count}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#cbd5e1]'}`}>
                              {nounPlural}
                            </span>
                            <span className={`text-[12px] font-black mt-1 transition-colors ${isSelected ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`}>
                              {subsEnabled ? `K${tier.price}` : 'FREE'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#fdf6e9]/60 border border-[#C9973A]/15 mt-1">
                      <p className="text-[11px] font-medium text-[#1a1a2e]/70 leading-snug">
                        {isLoan ? 'Request' : 'Inquiry'} auto-closes after{' '}
                        <span className="font-black text-[#1a1a2e]">{selectedTier.count} {nounPlural}</span>
                      </p>
                      <p className="text-[12px] font-black text-[#C9973A] shrink-0">
                        Service fee: {subsEnabled ? `K${selectedTier.price}` : 'FREE'}
                      </p>
                    </div>
                  </>
                )}
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
                        className={`py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[12px] ${
                          isSelected
                            ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]'
                            : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'
                        }`}
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
                    Finalize Inquiry Preferences ·{' '}
                    {subsEnabled ? `K${isThisShopOnly ? thisShopFee : selectedTier.price}` : 'FREE'}
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
