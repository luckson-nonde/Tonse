import type { FieldSchema, Category } from './types';
import { mobilePhonesBuySchema, mobilePhonesRepairSchema, laptopsBuySchema, laptopsRepairSchema, homeAppliancesBuySchema, homeAppliancesRepairSchema, audioVideoBuySchema, audioVideoRepairSchema, gamingBuySchema } from './schemas/electronics';
import { entertainmentPerformersSchema } from './schemas/entertainment';
import { venuesClubsSchema, equipmentRentalSchema, eventManagementSchema, eventCateringSchema, eventPlanningSchema, eventDecorSchema } from './schemas/events';
import { fashionSchema, shoesFootwearSchema, accessoriesJewelrySchema } from './schemas/fashion';
import { skincareSchema, makeupCosmeticsSchema, haircareSchema, fragrancesSchema } from './schemas/beauty';
import { livingRoomBuySchema, livingRoomRepairSchema, bedroomBuySchema, bedroomRepairSchema, officeBuySchema, officeRepairSchema, outdoorBuySchema, outdoorRepairSchema } from './schemas/furniture';
import { carPartsNewSchema, carPartsBreakersSchema, vehiclesBuySchema, carAccessoriesSchema, carBreakdownRecoverySchema, motorcyclesPartsSchema, automotiveToolsSchema } from './schemas/automotive';
import { buildingMaterialsSchema, plumbingFixturesSchema, electricalSuppliesSchema, hardwareToolsSchema, constructionMachinerySchema } from './schemas/construction';
import { freshProduceSchema, pantryStaplesSchema, beveragesSchema, snacksSweetsSchema } from './schemas/groceries';
import { lightingLampsSchema, wallArtMirrorsSchema, rugsCarpetsSchema, curtainsBlindsSchema } from './schemas/homeDecor';
import { softwareWebDevSchema, networkingSecuritySchema, itSupportMaintenanceSchema } from './schemas/itServices';
import { ispSchema, mobileNetworkServicesSchema, satelliteVsatInstallationSchema } from './schemas/telecommunications';
import { boreholeDrillingSchema, miningExplorationSchema, geotechnicalDrillingSchema } from './schemas/drillingServices';
import { hospitalLabsSchema, pharmaciesSchema } from './schemas/clinicalServices';
import { longTermRentalsSchema, shortStayServicedSchema, boardingStudentSchema } from './schemas/apartments';
import { businessComputersSchema, serversStorageSchema, networkingHardwareSchema, softwareLicensesSchema, printersOfficeEquipmentSchema } from './schemas/itProducts';
import { poultryFarmingSchema, aquacultureSchema, cropProductionSchema, livestockVeterinarySchema, irrigationHardwareSchema, agroTechServicesSchema } from './schemas/agriculture';
import { loanCollateralSchema, loanSalarySchema, loanGovernmentSchema } from './schemas/loans';
import { customCakesSchema, breadPastriesSchema } from './schemas/pastryBakery';
import { keyReplacementSchema } from './schemas/keyServices';

export const GENERIC_FALLBACK_SCHEMA: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "Describe the product or service" },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Samsung, Nike, Any brand" },
  { name: "description", label: "Details", type: "textarea", required: false, placeholder: "Any specific requirements..." },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["ASAP (Same day)", "Within 3 days", "Within a week", "Flexible / No rush"] }
];


const BASE_CATEGORIES_DB: Category[] = [
  // General Categories
  {
    id: 'electronics',
    name: 'Electronics',
    image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'furniture',
    name: 'Furniture',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'fashion',
    name: 'Fashion',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'home-decor',
    name: 'Home Decor',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'automotive',
    name: 'Automotive',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'groceries',
    name: 'Groceries',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'beauty',
    name: 'Beauty',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'construction',
    name: 'Construction',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb1924015?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'events',
    name: 'Events',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'telecommunications',
    name: 'Telecommunications',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'it-services',
    name: 'IT Services',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'it-products',
    name: 'IT Products',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'drilling-services',
    name: 'Drilling Services',
    image: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Agro-Dealers',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'clinical-services',
    name: 'Clinical Services',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'locksmith-key-services',
    name: 'Locksmith & Key Services',
    image: 'https://images.unsplash.com/photo-1609770231080-e321deccc34c?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'apartments',
    name: 'Apartments & Housing',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'loans',
    name: 'Loans',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },
  {
    id: 'pastry-bakery',
    name: 'Pastry and Bakery',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800&h=800',
    parentId: null
  },

  // Subcategories - Electronics
  { id: 'mobile-phones-buy', name: 'Mobile Phones & Accessories (Buy New)', baseName: 'Mobile Phones & Accessories', type: 'buy', parentId: 'electronics', formSchema: mobilePhonesBuySchema },
  { id: 'mobile-phones-repair', name: 'Mobile Phones & Accessories (Repair)', baseName: 'Mobile Phones & Accessories', type: 'repair', parentId: 'electronics', formSchema: mobilePhonesRepairSchema },
  { id: 'laptops-buy', name: 'Laptops & Computers (Buy New)', baseName: 'Laptops & Computers', type: 'buy', parentId: 'electronics', formSchema: laptopsBuySchema },
  { id: 'laptops-repair', name: 'Laptops & Computers (Repair)', baseName: 'Laptops & Computers', type: 'repair', parentId: 'electronics', formSchema: laptopsRepairSchema },
  { id: 'home-appliances-buy', name: 'Home Appliances (Buy New)', baseName: 'Home Appliances', type: 'buy', parentId: 'electronics', formSchema: homeAppliancesBuySchema },
  { id: 'home-appliances-repair', name: 'Home Appliances (Repair)', baseName: 'Home Appliances', type: 'repair', parentId: 'electronics', formSchema: homeAppliancesRepairSchema },
  { id: 'audio-video-buy', name: 'Audio & Video Equipment (Buy New)', baseName: 'Audio & Video Equipment', type: 'buy', parentId: 'electronics', formSchema: audioVideoBuySchema },
  { id: 'audio-video-repair', name: 'Audio & Video Equipment (Repair)', baseName: 'Audio & Video Equipment', type: 'repair', parentId: 'electronics', formSchema: audioVideoRepairSchema },
  { id: 'gaming-buy', name: 'Gaming Consoles & Accessories (Buy)', baseName: 'Gaming Consoles & Accessories', type: 'buy', parentId: 'electronics', formSchema: gamingBuySchema },

  // Subcategories - Furniture
  { id: 'living-room-buy', name: 'Living Room Furniture (Buy / Custom)', baseName: 'Living Room Furniture', type: 'buy', parentId: 'furniture', formSchema: livingRoomBuySchema },
  { id: 'living-room-repair', name: 'Living Room Furniture (Repair / Upholstery)', baseName: 'Living Room Furniture', type: 'repair', parentId: 'furniture', formSchema: livingRoomRepairSchema },
  { id: 'bedroom-buy', name: 'Bedroom Furniture (Buy / Custom)', baseName: 'Bedroom Furniture', type: 'buy', parentId: 'furniture', formSchema: bedroomBuySchema },
  { id: 'bedroom-repair', name: 'Bedroom Furniture (Repair / Restoration)', baseName: 'Bedroom Furniture', type: 'restore', parentId: 'furniture', formSchema: bedroomRepairSchema },
  { id: 'office-buy', name: 'Office Furniture (Buy / Custom)', baseName: 'Office Furniture', type: 'buy', parentId: 'furniture', formSchema: officeBuySchema },
  { id: 'office-repair', name: 'Office Furniture (Repair)', baseName: 'Office Furniture', type: 'repair', parentId: 'furniture', formSchema: officeRepairSchema },
  { id: 'outdoor-buy', name: 'Outdoor & Patio (Buy / Custom)', baseName: 'Outdoor & Patio', type: 'buy', parentId: 'furniture', formSchema: outdoorBuySchema },
  { id: 'outdoor-repair', name: 'Outdoor & Patio (Repair)', baseName: 'Outdoor & Patio', type: 'repair', parentId: 'furniture', formSchema: outdoorRepairSchema },

  // Subcategories - Fashion
  { id: 'mens-clothing', name: 'Men\'s Clothing', parentId: 'fashion', formSchema: fashionSchema },
  { id: 'womens-clothing', name: 'Women\'s Clothing', parentId: 'fashion', formSchema: fashionSchema },
  { id: 'shoes-footwear', name: 'Shoes & Footwear', parentId: 'fashion', formSchema: shoesFootwearSchema },
  { id: 'accessories-jewelry', name: 'Accessories & Jewelry', parentId: 'fashion', formSchema: accessoriesJewelrySchema },

  // Subcategories - Home Decor
  { id: 'lighting-lamps', name: 'Lighting & Lamps', parentId: 'home-decor', formSchema: lightingLampsSchema },
  { id: 'wall-art-mirrors', name: 'Wall Art & Mirrors', parentId: 'home-decor', formSchema: wallArtMirrorsSchema },
  { id: 'rugs-carpets', name: 'Rugs & Carpets', parentId: 'home-decor', formSchema: rugsCarpetsSchema },
  { id: 'curtains-blinds', name: 'Curtains & Blinds', parentId: 'home-decor', formSchema: curtainsBlindsSchema },

  // Subcategories - Automotive
  { id: 'vehicles-buy', name: 'Vehicles (New & Used)', parentId: 'automotive', formSchema: vehiclesBuySchema },
  { id: 'car-parts-new', name: 'New Car Parts', parentId: 'automotive', formSchema: carPartsNewSchema },
  { id: 'car-parts-breakers', name: 'Used Car Parts (Breakers)', parentId: 'automotive', formSchema: carPartsBreakersSchema },
  { id: 'car-accessories', name: 'Car Accessories', parentId: 'automotive', formSchema: carAccessoriesSchema },
  { id: 'car-breakdown-recovery', name: 'Car Breakdown & Recovery', parentId: 'automotive', formSchema: carBreakdownRecoverySchema },
  { id: 'motorcycles-parts', name: 'Motorcycles & Parts', parentId: 'automotive', formSchema: motorcyclesPartsSchema },
  { id: 'automotive-tools', name: 'Automotive Tools', parentId: 'automotive', formSchema: automotiveToolsSchema },

  // Subcategories - Groceries
  { id: 'fresh-produce', name: 'Fresh Produce', parentId: 'groceries', formSchema: freshProduceSchema },
  { id: 'pantry-staples', name: 'Pantry Staples', parentId: 'groceries', formSchema: pantryStaplesSchema },
  { id: 'beverages', name: 'Beverages', parentId: 'groceries', formSchema: beveragesSchema },
  { id: 'snacks-sweets', name: 'Snacks & Sweets', parentId: 'groceries', formSchema: snacksSweetsSchema },

  // Subcategories - Beauty
  { id: 'skincare', name: 'Skincare', parentId: 'beauty', formSchema: skincareSchema },
  { id: 'makeup-cosmetics', name: 'Makeup & Cosmetics', parentId: 'beauty', formSchema: makeupCosmeticsSchema },
  { id: 'haircare', name: 'Haircare', parentId: 'beauty', formSchema: haircareSchema },
  { id: 'fragrances', name: 'Fragrances', parentId: 'beauty', formSchema: fragrancesSchema },

  // Subcategories - Construction
  { id: 'building-materials', name: 'Building Materials', parentId: 'construction', formSchema: buildingMaterialsSchema },
  { id: 'plumbing-fixtures', name: 'Plumbing & Fixtures', parentId: 'construction', formSchema: plumbingFixturesSchema },
  { id: 'electrical-supplies', name: 'Electrical Supplies', parentId: 'construction', formSchema: electricalSuppliesSchema },
  { id: 'hardware-tools', name: 'Hardware & Tools', parentId: 'construction', formSchema: hardwareToolsSchema },
  { id: 'construction-machinery', name: 'Construction Machinery', parentId: 'construction', formSchema: constructionMachinerySchema },

  // Subcategories - Entertainment
  { id: 'djs', name: 'DJs', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'live-bands', name: 'Live Bands', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'mc-hosts', name: 'MCs & Hosts', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'dancers', name: 'Dancers', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'public-speaker', name: 'Public Speaker', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'comedians', name: 'Comedians', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'influencers', name: 'Influencers', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },
  { id: 'spoken-word', name: 'Spoken Word Artists', parentId: 'entertainment', formSchema: entertainmentPerformersSchema },

  // Subcategories - Events
  { id: 'event-equipment-rental', name: 'Event Equipment Rental', parentId: 'events', formSchema: equipmentRentalSchema },
  { id: 'event-management', name: 'Event Management', parentId: 'events', formSchema: eventManagementSchema },
  { id: 'event-catering', name: 'Event Catering', parentId: 'events', formSchema: eventCateringSchema },
  { id: 'event-planning', name: 'Event Planning', parentId: 'events', formSchema: eventPlanningSchema },
  { id: 'event-venues', name: 'Event Venues', parentId: 'events', formSchema: venuesClubsSchema },
  { id: 'event-decor', name: 'Event Decor', parentId: 'events', formSchema: eventDecorSchema },

  // Subcategories - Telecommunications
  { id: 'internet-service-providers', name: 'Internet Service Providers (ISP)', parentId: 'telecommunications', formSchema: ispSchema },
  { id: 'mobile-network-services', name: 'Mobile Network Services', parentId: 'telecommunications', formSchema: mobileNetworkServicesSchema },
  { id: 'satellite-vsat-installation', name: 'Satellite & VSAT Installation', parentId: 'telecommunications', formSchema: satelliteVsatInstallationSchema },

  // Subcategories - IT Services
  { id: 'software-web-development', name: 'Software & Web Development', parentId: 'it-services', formSchema: softwareWebDevSchema },
  { id: 'networking-security', name: 'Networking & Security', parentId: 'it-services', formSchema: networkingSecuritySchema },
  { id: 'it-support-maintenance', name: 'IT Support & Maintenance', parentId: 'it-services', formSchema: itSupportMaintenanceSchema },

  // Subcategories - IT Products
  { id: 'business-computers', name: 'Computers & Laptops (Business)', parentId: 'it-products', formSchema: businessComputersSchema },
  { id: 'servers-storage', name: 'Servers & Storage', parentId: 'it-products', formSchema: serversStorageSchema },
  { id: 'networking-hardware', name: 'Networking Hardware', parentId: 'it-products', formSchema: networkingHardwareSchema },
  { id: 'software-licenses', name: 'Software Licenses', parentId: 'it-products', formSchema: softwareLicensesSchema },
  { id: 'printers-office-equipment', name: 'Printers & Office Equipment', parentId: 'it-products', formSchema: printersOfficeEquipmentSchema },

  // Subcategories - Drilling Services
  { id: 'borehole-drilling', name: 'Borehole Drilling', parentId: 'drilling-services', formSchema: boreholeDrillingSchema },
  { id: 'mining-exploration', name: 'Mining Exploration', parentId: 'drilling-services', formSchema: miningExplorationSchema },
  { id: 'geotechnical-drilling', name: 'Geotechnical Drilling', parentId: 'drilling-services', formSchema: geotechnicalDrillingSchema },

  // Subcategories - Agriculture
  { id: 'poultry-farming', name: 'Poultry Farming', parentId: 'agriculture', formSchema: poultryFarmingSchema },
  { id: 'aquaculture', name: 'Aquaculture (Fish)', parentId: 'agriculture', formSchema: aquacultureSchema },
  { id: 'crop-production', name: 'Crop Production', parentId: 'agriculture', formSchema: cropProductionSchema },
  { id: 'livestock-veterinary', name: 'Livestock & Veterinary', parentId: 'agriculture', formSchema: livestockVeterinarySchema },
  { id: 'irrigation-hardware', name: 'Irrigation & Hardware', parentId: 'agriculture', formSchema: irrigationHardwareSchema },
  { id: 'agro-tech-services', name: 'Agro-Tech & Services', parentId: 'agriculture', formSchema: agroTechServicesSchema },

  // Subcategories - Clinical Services (labs fulfil test orders, pharmacies
  // fulfil prescriptions; the buyer's prescription PHOTO is first-class
  // request content — see schemas/clinicalServices.ts)
  { id: 'hospital-labs', name: 'Hospital Labs', parentId: 'clinical-services', formSchema: hospitalLabsSchema },
  { id: 'pharmacies', name: 'Pharmacies', parentId: 'clinical-services', formSchema: pharmaciesSchema },

  // Subcategories - Locksmith & Key Services (locksmiths fulfil buyer key/lock
  // requests; the buyer's photo of the key/lock/vehicle helps identify the
  // right blank — see schemas/keyServices.ts)
  { id: 'key-replacement', name: 'Key Replacement', parentId: 'locksmith-key-services', formSchema: keyReplacementSchema },

  // Subcategories - Apartments & Housing (tenure-split: a monthly lease, a
  // furnished short stay, and a student room are three different landlord
  // conversations; unit SIZE is a field inside each form)
  { id: 'long-term-rentals', name: 'Long-Term Rentals', parentId: 'apartments', formSchema: longTermRentalsSchema },
  { id: 'short-stay-serviced', name: 'Short Stay & Serviced', parentId: 'apartments', formSchema: shortStayServicedSchema },
  { id: 'boarding-student-rooms', name: 'Boarding & Student Rooms', parentId: 'apartments', formSchema: boardingStudentSchema },

  // Subcategories - Loans (loan TYPE selects the request form)
  { id: 'loan-collateral', name: 'Collateral Loan', parentId: 'loans', formSchema: loanCollateralSchema },
  { id: 'loan-salary', name: 'Salary Loan', parentId: 'loans', formSchema: loanSalarySchema },
  { id: 'loan-government', name: 'Government Employee Loan', parentId: 'loans', formSchema: loanGovernmentSchema },

  // Subcategories - Pastry and Bakery (BOOKING archetype like Apartments —
  // a baker quotes a made-to-order commitment against a needed-by date,
  // not an off-the-shelf SKU; see schemas/pastryBakery.ts)
  { id: 'custom-cakes', name: 'Custom Cakes', parentId: 'pastry-bakery', formSchema: customCakesSchema },
  { id: 'bread-pastries', name: 'Bread & Pastries', parentId: 'pastry-bakery', formSchema: breadPastriesSchema },
];

export type CategoryNature = 'PRODUCT' | 'SERVICE' | 'BOTH';

export const getCategoryNature = (categoryId: string): CategoryNature => {
  const productParents = ['fashion', 'groceries', 'beauty', 'home-decor', 'it-products', 'electronics', 'furniture'];
  const serviceParents = ['entertainment', 'events', 'telecommunications', 'it-services', 'drilling-services', 'clinical-services', 'locksmith-key-services', 'apartments', 'loans', 'pastry-bakery'];
  
  const category = CATEGORIES_DB.find(c => c.id === categoryId);
  if (!category) return 'BOTH';

  const rootId = category.parentId || category.id;

  if (productParents.includes(rootId)) return 'PRODUCT';
  if (serviceParents.includes(rootId)) return 'SERVICE';

  // Specific subcategories
  if (category.id.includes('-buy')) return 'PRODUCT';
  if (category.id.includes('-repair') || category.id.includes('-restore')) return 'SERVICE';

  if (category.parentId === 'construction') {
    if (category.id === 'building-materials') return 'PRODUCT';
    return 'BOTH';
  }

  if (category.parentId === 'automotive') {
    if (category.id.includes('parts') || category.id === 'car-accessories' || category.id === 'automotive-tools') return 'PRODUCT';
    return 'SERVICE';
  }

  if (category.parentId === 'agriculture') {
    if (category.id === 'agro-tech-services') return 'SERVICE';
    return 'PRODUCT';
  }

  return 'BOTH';
};

export const CATEGORIES_DB: Category[] = BASE_CATEGORIES_DB.map(cat => ({
  ...cat,
  formSchema: cat.formSchema || GENERIC_FALLBACK_SCHEMA
}));

export const isRelatedCategory = (cat1Name: string, cat2Name: string): boolean => {
  const c1 = CATEGORIES_DB.find(c => c.name.toLowerCase() === cat1Name.toLowerCase());
  const c2 = CATEGORIES_DB.find(c => c.name.toLowerCase() === cat2Name.toLowerCase());

  if (!c1 || !c2) return cat1Name.toLowerCase().includes(cat2Name.toLowerCase()) || cat2Name.toLowerCase().includes(cat1Name.toLowerCase());

  // Direct match
  if (c1.id === c2.id) return true;

  // Parent/Child relationship
  if (c1.parentId === c2.id || c2.parentId === c1.id) return true;

  return false;
};

export const fetchCategories = async (parentId: string | null = null): Promise<Category[]> => {
  // Simulate network delay to mimic database fetch
  await new Promise(resolve => setTimeout(resolve, 400));
  return CATEGORIES_DB.filter(c => c.parentId === parentId);
};

export const getCategorySchema = (categoryName: string | null | undefined): FieldSchema[] => {
  // Inquiries no longer carry the legacy `category` display string by
  // default — they live in the inquiry_categories junction. Callers
  // that haven't been migrated to read `categoryIds` still pass the
  // (now undefined) `inquiry.category` field. Guard against that
  // instead of crashing with `Cannot read properties of undefined
  // (reading 'toLowerCase')` and quietly fall back to the generic
  // schema (same outcome the function already produced for unknown
  // category names).
  if (!categoryName) return GENERIC_FALLBACK_SCHEMA;
  const category = CATEGORIES_DB.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.id === categoryName);
  return category?.formSchema || GENERIC_FALLBACK_SCHEMA;
};
