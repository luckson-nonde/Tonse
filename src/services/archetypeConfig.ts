
export type Archetype = 'PRODUCT' | 'SERVICE' | 'RENTAL';

export interface ArchetypeConfig {
  categoryName: string;
  archetype: Archetype;
  quoteMapping: Record<string, string>;
  requiredAdditions: string[];
}

export const ARCHETYPE_CONFIG: Record<string, ArchetypeConfig> = {
  "electronics": {
    "categoryName": "Electronics",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "furniture": {
    "categoryName": "Furniture",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "fashion": {
    "categoryName": "Fashion",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "home-decor": {
    "categoryName": "Home Decor",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "automotive": {
    "categoryName": "Automotive",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "groceries": {
    "categoryName": "Groceries",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "beauty": {
    "categoryName": "Beauty",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "construction": {
    "categoryName": "Construction",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "entertainment": {
    "categoryName": "Entertainment",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "events": {
    "categoryName": "Events",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "telecommunications": {
    "categoryName": "Telecommunications",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "it-services": {
    "categoryName": "IT Services",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "it-products": {
    "categoryName": "IT Products",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "drilling-services": {
    "categoryName": "Drilling Services",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "agriculture": {
    "categoryName": "Agriculture & Agro-Dealers",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "mobile-phones-buy": {
    "categoryName": "Mobile Phones & Accessories (Buy New)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "mobile-phones-repair": {
    "categoryName": "Mobile Phones & Accessories (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "laptops-buy": {
    "categoryName": "Laptops & Computers (Buy New)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "laptops-repair": {
    "categoryName": "Laptops & Computers (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "home-appliances-buy": {
    "categoryName": "Home Appliances (Buy New)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "home-appliances-repair": {
    "categoryName": "Home Appliances (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "audio-video-buy": {
    "categoryName": "Audio & Video Equipment (Buy New)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "audio-video-repair": {
    "categoryName": "Audio & Video Equipment (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "gaming-buy": {
    "categoryName": "Gaming Consoles & Accessories (Buy)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "living-room-buy": {
    "categoryName": "Living Room Furniture (Buy / Custom)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "living-room-repair": {
    "categoryName": "Living Room Furniture (Repair / Upholstery)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "bedroom-buy": {
    "categoryName": "Bedroom Furniture (Buy / Custom)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "bedroom-repair": {
    "categoryName": "Bedroom Furniture (Repair / Restoration)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "office-buy": {
    "categoryName": "Office Furniture (Buy / Custom)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "office-repair": {
    "categoryName": "Office Furniture (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "outdoor-buy": {
    "categoryName": "Outdoor & Patio (Buy / Custom)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "outdoor-repair": {
    "categoryName": "Outdoor & Patio (Repair)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "mens-clothing": {
    "categoryName": "Men's Clothing",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "womens-clothing": {
    "categoryName": "Women's Clothing",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "shoes-footwear": {
    "categoryName": "Shoes & Footwear",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "accessories-jewelry": {
    "categoryName": "Accessories & Jewelry",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "lighting-lamps": {
    "categoryName": "Lighting & Lamps",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "wall-art-mirrors": {
    "categoryName": "Wall Art & Mirrors",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "rugs-carpets": {
    "categoryName": "Rugs & Carpets",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "curtains-blinds": {
    "categoryName": "Curtains & Blinds",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "vehicles-buy": {
    "categoryName": "Vehicles (New & Used)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "car-parts-new": {
    "categoryName": "Car Parts & Spares (Buy New)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "car-parts-breakers": {
    "categoryName": "Car Parts & Spares (Buy from Car Breakers)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "car-accessories": {
    "categoryName": "Car Accessories",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "car-breakdown-recovery": {
    "categoryName": "Car Breakdown & Recovery",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "motorcycles-parts": {
    "categoryName": "Motorcycles & Parts",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "automotive-tools": {
    "categoryName": "Automotive Tools",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "fresh-produce": {
    "categoryName": "Fresh Produce",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "pantry-staples": {
    "categoryName": "Pantry Staples",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "beverages": {
    "categoryName": "Beverages",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "snacks-sweets": {
    "categoryName": "Snacks & Sweets",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "skincare": {
    "categoryName": "Skincare",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "makeup-cosmetics": {
    "categoryName": "Makeup & Cosmetics",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "haircare": {
    "categoryName": "Haircare",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "fragrances": {
    "categoryName": "Fragrances",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "building-materials": {
    "categoryName": "Building Materials",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "plumbing-fixtures": {
    "categoryName": "Plumbing & Fixtures",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "electrical-supplies": {
    "categoryName": "Electrical Supplies",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "hardware-tools": {
    "categoryName": "Hardware & Tools",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "construction-machinery": {
    "categoryName": "Construction Machinery",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "djs": {
    "categoryName": "DJs",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "live-bands": {
    "categoryName": "Live Bands",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "mc-hosts": {
    "categoryName": "MCs & Hosts",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "dancers": {
    "categoryName": "Dancers",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "public-speaker": {
    "categoryName": "Public Speaker",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "comedians": {
    "categoryName": "Comedians",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "influencers": {
    "categoryName": "Influencers",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "spoken-word": {
    "categoryName": "Spoken Word Artists",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "event-equipment-rental": {
    "categoryName": "Event Equipment Rental",
    "archetype": "RENTAL",
    "quoteMapping": {},
    "requiredAdditions": [
      "deliveryFee",
      "setupFee",
      "securityDeposit"
    ]
  },
  "event-management": {
    "categoryName": "Event Management",
    "archetype": "SERVICE",
    "quoteMapping": {},
    "requiredAdditions": [
      "managementFee",
      "availabilityDate"
    ]
  },
  "event-catering": {
    "categoryName": "Event Catering",
    "archetype": "SERVICE",
    "quoteMapping": {},
    "requiredAdditions": [
      "pricePerPlate",
      "serviceFee",
      "availabilityDate"
    ]
  },
  "event-planning": {
    "categoryName": "Event Planning",
    "archetype": "SERVICE",
    "quoteMapping": {},
    "requiredAdditions": [
      "planningFee",
      "availabilityDate"
    ]
  },
  "event-venues": {
    "categoryName": "Event Venues",
    "archetype": "RENTAL",
    "quoteMapping": {},
    "requiredAdditions": [
      "cleaningFee",
      "damageDeposit",
      "securityDeposit"
    ]
  },
  "event-decor": {
    "categoryName": "Event Decor",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "internet-service-providers": {
    "categoryName": "Internet Service Providers (ISP)",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "mobile-network-services": {
    "categoryName": "Mobile Network Services",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "satellite-vsat-installation": {
    "categoryName": "Satellite & VSAT Installation",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "software-web-development": {
    "categoryName": "Software & Web Development",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "networking-security": {
    "categoryName": "Networking & Security",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "it-support-maintenance": {
    "categoryName": "IT Support & Maintenance",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "business-computers": {
    "categoryName": "Computers & Laptops (Business)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "servers-storage": {
    "categoryName": "Servers & Storage",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "networking-hardware": {
    "categoryName": "Networking Hardware",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "software-licenses": {
    "categoryName": "Software Licenses",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "printers-office-equipment": {
    "categoryName": "Printers & Office Equipment",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "borehole-drilling": {
    "categoryName": "Borehole Drilling",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "mining-exploration": {
    "categoryName": "Mining Exploration",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "geotechnical-drilling": {
    "categoryName": "Geotechnical Drilling",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "hospital-labs": {
    "categoryName": "Hospital Labs",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "pharmacies": {
    "categoryName": "Pharmacies",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "leadTime"
    ]
  },
  "long-term-rentals": {
    "categoryName": "Long-Term Rentals",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "short-stay-serviced": {
    "categoryName": "Short Stay & Serviced",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "boarding-student-rooms": {
    "categoryName": "Boarding & Student Rooms",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "poultry-farming": {
    "categoryName": "Poultry Farming",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "aquaculture": {
    "categoryName": "Aquaculture (Fish)",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "crop-production": {
    "categoryName": "Crop Production",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "livestock-veterinary": {
    "categoryName": "Livestock & Veterinary",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "irrigation-hardware": {
    "categoryName": "Irrigation & Hardware",
    "archetype": "PRODUCT",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "warranty",
      "deliveryFee",
      "leadTime"
    ]
  },
  "agro-tech-services": {
    "categoryName": "Agro-Tech & Services",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "loans": {
    "categoryName": "Loans",
    "archetype": "SERVICE",
    "quoteMapping": {
      "loanAmount": "principal",
      "tenureMonths": "tenureMonths"
    },
    "requiredAdditions": [
      "interestRate",
      "processingFee",
      "monthlyRepayment"
    ]
  },
  "loan-collateral": {
    "categoryName": "Collateral Loan",
    "archetype": "SERVICE",
    "quoteMapping": {
      "loanAmount": "principal",
      "tenureMonths": "tenureMonths"
    },
    "requiredAdditions": [
      "interestRate",
      "processingFee",
      "monthlyRepayment"
    ]
  },
  "loan-salary": {
    "categoryName": "Salary Loan",
    "archetype": "SERVICE",
    "quoteMapping": {
      "loanAmount": "principal",
      "tenureMonths": "tenureMonths"
    },
    "requiredAdditions": [
      "interestRate",
      "processingFee",
      "monthlyRepayment"
    ]
  },
  "loan-government": {
    "categoryName": "Government Employee Loan",
    "archetype": "SERVICE",
    "quoteMapping": {
      "loanAmount": "principal",
      "tenureMonths": "tenureMonths"
    },
    "requiredAdditions": [
      "interestRate",
      "processingFee",
      "monthlyRepayment"
    ]
  },
  "custom-cakes": {
    "categoryName": "Custom Cakes",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "availabilityDate"
    ]
  },
  "bread-pastries": {
    "categoryName": "Bread & Pastries",
    "archetype": "SERVICE",
    "quoteMapping": {
      "quantity": "unitPrice",
      "duration": "rate"
    },
    "requiredAdditions": [
      "leadTime"
    ]
  }
};
