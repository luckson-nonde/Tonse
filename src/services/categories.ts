export interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'daterange' | 'currency' | 'image_upload' | 'toggle' | 'counter' | 'gps';
  placeholder?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  helpText?: string;
  group?: string;
  dependsOn?: {
    field: string;
    value: any;
  };
}

export interface Category {
  id: string;
  name: string;
  baseName?: string;
  type?: 'buy' | 'repair' | 'restore';
  image?: string;
  parentId: string | null;
  formSchema?: FieldSchema[];
}

export const GENERIC_FALLBACK_SCHEMA: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "Describe the product or service" },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Samsung, Nike, Any brand" },
  { name: "description", label: "Details", type: "textarea", required: false, placeholder: "Any specific requirements..." },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["ASAP (Same day)", "Within 3 days", "Within a week", "Flexible / No rush"] }
];

const mobilePhonesBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of what you are looking for" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. iPhone 15 Pro Max" },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. Samsung, Apple, Huawei, Tecno" },
  { name: "model", label: "Model / Spec", type: "text", required: false, placeholder: "e.g. iPhone 15 Pro 256GB, Samsung S24" },
  { name: "storage", label: "Storage / RAM", type: "text", required: false, placeholder: "e.g. 256GB storage, 8GB RAM" },
  { name: "colorPreference", label: "Color Preference", type: "text", required: false, placeholder: "e.g. Midnight Black, Any color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Excellent", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, accessories needed, etc." }
];

const mobilePhonesRepairSchema: FieldSchema[] = [
  { name: "images", label: "Device Photos", type: "image_upload", required: false, helpText: "Photos help technicians diagnose the issue faster" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Smartphone", "Tablet", "Smartwatch", "Feature Phone", "Accessory"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Samsung Galaxy S24 Ultra, iPhone 15 Pro" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Won't turn on, screen cracked, battery drains fast, phone gets hot, no sound" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "dataCritical", label: "Is Data on Device Critical?", type: "toggle", required: false, helpText: "Toggle if you have important files that must be saved" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] }
];

const laptopsBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. MacBook Pro 14-inch" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Laptop", "Desktop PC", "All-in-One PC", "Mini PC", "Workstation"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. HP, Dell, Lenovo, Apple, Any" },
  { name: "processor", label: "Processor", type: "text", required: false, placeholder: "e.g. Intel Core i5, AMD Ryzen 7, Apple M3" },
  { name: "ram", label: "RAM", type: "select", required: false, options: ["4GB", "8GB", "16GB", "32GB", "64GB", "Any"] },
  { name: "storage", label: "Storage", type: "select", required: false, options: ["256GB SSD", "512GB SSD", "1TB SSD", "1TB HDD", "2TB HDD", "Any"] },
  { name: "screenSize", label: "Screen Size", type: "select", required: false, options: ["13 inch", "14 inch", "15.6 inch", "17 inch", "Any size"] },
  { name: "primaryUse", label: "Primary Use", type: "select", required: true, options: ["Office / Business", "Gaming", "Design / Creative", "Programming", "General Use", "School / Student"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Excellent", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Any specific software, accessories, or requirements..." }
];

const laptopsRepairSchema: FieldSchema[] = [
  { name: "images", label: "Device Photos", type: "image_upload", required: false, helpText: "Clear photos help technicians assess the damage" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Laptop", "Desktop PC", "All-in-One PC", "Monitor"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. HP Pavilion 15, MacBook Pro 2021" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Won't turn on, very slow, screen cracked, keyboard not working, overheating" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "dataRecoveryNeeded", label: "Data Recovery Needed?", type: "toggle", required: false, helpText: "Toggle if you need files recovered from the device" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] }
];

const homeAppliancesBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Double Door Refrigerator" },
  { name: "applianceType", label: "Appliance Type", type: "select", required: true, options: ["Refrigerator", "Washing Machine", "Microwave", "Electric Stove", "Air Conditioner", "Water Heater", "Dishwasher", "Vacuum Cleaner", "Iron", "Blender / Mixer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. LG, Samsung, Hisense, Any" },
  { name: "capacity", label: "Size / Capacity", type: "text", required: false, placeholder: "e.g. 300 litre fridge, 7kg washing machine" },
  { name: "powerType", label: "Power Type", type: "select", required: false, options: ["Electric", "Gas", "Solar Compatible", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features, color, or requirements..." }
];

const homeAppliancesRepairSchema: FieldSchema[] = [
  { name: "images", label: "Appliance Photos", type: "image_upload", required: false, helpText: "Photos help technicians diagnose the issue faster" },
  { name: "applianceType", label: "Appliance Type", type: "select", required: true, options: ["Refrigerator", "Washing Machine", "Microwave", "Electric Stove", "Air Conditioner", "Water Heater", "Dishwasher", "Vacuum Cleaner", "Iron", "Blender / Mixer", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. LG, Samsung, Hisense, GR-B247SLUV" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Fridge is making a loud buzzing sound and not cooling" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "applianceAge", label: "How Old is the Appliance?", type: "select", required: false, options: ["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years", "Not sure"] },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] }
];

const audioVideoBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 65 Inch 4K Smart TV" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System / Speakers", "Home Theatre", "Projector", "Camera / DSLR", "Microphone", "Amplifier", "Subwoofer", "Headphones", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Sony, LG, JBL, Any" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 65 inch 4K TV, 2000W sound system" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features or requirements..." }
];

const audioVideoRepairSchema: FieldSchema[] = [
  { name: "images", label: "Equipment Photos", type: "image_upload", required: false },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System", "Home Theatre", "Projector", "Camera", "Microphone", "Amplifier", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Sony, Samsung, LG, Model number" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. TV screen is black but sound is working" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] }
];

const gamingBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. PlayStation 5 Console" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Gaming Console", "Controller", "Game Title / CD", "Headset", "Gaming Chair", "Gaming Monitor", "Memory Card", "Other Accessory"] },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Sony, Microsoft, Nintendo, Razer" },
  { name: "platform", label: "Platform", type: "select", required: true, options: ["PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch", "PC Gaming", "Any / Not Sure"] },
  { name: "specificTitle", label: "Specific Game or Model", type: "text", required: false, placeholder: "e.g. FIFA 25, Spider-Man 2, DualSense Controller" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific version, bundle, or requirements..." }
];

const entertainmentPerformersSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos / Portfolio", type: "image_upload", required: false, group: "Performance Requirements" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Concert", "Festival", "Private Party", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "duration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 24, group: "Event Details" },
  { name: "location_name", label: "Venue Location", type: "text", required: true, placeholder: "e.g. Lusaka, Levy Mall", group: "Event Details" },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "performanceType", label: "Performance Type", type: "select", required: true, options: ["Live Band", "DJ", "Solo Artist", "MC/Host", "Dancer", "Comedian", "Public Speaker", "Influencer", "Spoken Word", "Other"], group: "Performance Requirements" },
  { name: "musicGenre", label: "Music Genre", type: "select", required: false, options: ["Afrobeats", "Zambian Music", "Gospel", "RnB/Soul", "Hip Hop", "Jazz", "Classical", "Pop", "Any"], group: "Performance Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Terms", helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequests", label: "Special Requirements", type: "textarea", required: false, placeholder: "Any special requests or rider requirements...", group: "Budget & Terms" }
];

const venuesClubsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "venueType", label: "Venue Type", type: "select", required: true, options: ["Nightclub", "Conference Hall", "Garden / Outdoor Venue", "Restaurant / Private Dining", "Hotel Ballroom", "Other"], placeholder: "Select Venue Type" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Conference", "Exhibition", "Private Party", "Other"], placeholder: "Select Event Type" },
  { name: "eventDate", label: "Event Date", type: "date", required: true },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, placeholder: "e.g. 300" },
  { name: "amenitiesNeeded", label: "Amenities Needed", type: "textarea", required: false, placeholder: "e.g. Sound system, Projector, Catering, Bar service, Security" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false, placeholder: "Parking, accessibility, early setup..." }
];

export const RENTAL_CATALOG_ITEMS: { id: string; name: string; image: string; schema: FieldSchema[] }[] = [
  { 
    id: "chairs", 
    name: "Chairs", 
    image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "chairType", label: "Chair Type", type: "select", required: true, options: ["Plastic (Standard)", "Plastic (Heavy Duty)", "Wooden (Folding)", "Wooden (Crossback)", "Metal / Banquet", "Ghost / Acrylic", "Tiffany / Chiavari", "Wimbledon", "Bar Stools", "Lounge Seating", "Other"] },
      { name: "chairQuantity", label: "Quantity", type: "number", required: true, placeholder: "e.g. 100" },
      { name: "chairDetails", label: "Details / Color", type: "textarea", required: false, placeholder: "Mention colors or specific styles..." }
    ]
  },
  { 
    id: "tables", 
    name: "Tables", 
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "tableType", label: "Table Type", type: "select", required: true, options: ["Round (10-seater)", "Round (8-seater)", "Rectangular (Trestle)", "Cocktail / High Table", "Square", "Coffee Table", "Cake Table", "Other"] },
      { name: "tableQuantity", label: "Quantity", type: "number", required: true, placeholder: "e.g. 10" },
      { name: "tableDetails", label: "Details / Linens", type: "textarea", required: false, placeholder: "Mention linens, sizes, etc..." }
    ]
  },
  { 
    id: "tents", 
    name: "Tents", 
    image: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "tentType", label: "Tent / Marquee Type", type: "select", required: true, options: ["Peg and Pole", "Stretch / Bedouin", "Frame Tent", "Gazebo", "Alpine", "Clear Span / Glass", "Other"] },
      { name: "tentSize", label: "Tent Size / Capacity", type: "text", required: true, placeholder: "e.g. 20x30m or for 200 people" },
      { name: "tentDetails", label: "Details", type: "textarea", required: false, placeholder: "Mention flooring, lighting, etc..." }
    ]
  },
  { 
    id: "catering", 
    name: "Catering", 
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "cateringItems", label: "Items Needed", type: "textarea", required: true, placeholder: "e.g. Plates, Side plates, Dessert bowls, Spoons, Forks..." },
      { name: "cateringQuantity", label: "Quantity per Item", type: "number", required: true, placeholder: "e.g. 200" }
    ]
  },
  { 
    id: "decor", 
    name: "Decor", 
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "decorItems", label: "Decor Items", type: "textarea", required: true, placeholder: "e.g. Red carpet, Centerpieces, Flower vases..." },
      { name: "decorDetails", label: "Style / Theme", type: "text", required: false, placeholder: "e.g. Rustic, Gold & White" }
    ]
  }
];

export const equipmentRentalCoreSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, group: "Core Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate", "Birthday", "Festival", "Exhibition", "Conference", "Funeral", "Other"], group: "Core Details" },
  { name: "quantity", label: "Estimated Guest Count", type: "number", required: true, placeholder: "e.g. 200 guests", group: "Core Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Core Details" },
  { name: "duration", label: "Rental Duration (days)", type: "counter", required: true, min: 1, group: "Core Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Core Details", helpText: "Optional - leave blank to receive price offers" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Core Details" }
];

const equipmentRentalSchema: FieldSchema[] = [
  ...equipmentRentalCoreSchema
];

const fashionSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload inspiration or reference images" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Slim fit suit, Ankara dress" },
  { name: "brand", label: "Preferred Brand", type: "text", required: false, placeholder: "Leave blank if any brand is okay" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. M, L, 32, UK10" },
  { name: "colorPreference", label: "Color", type: "text", required: false, placeholder: "e.g. Navy blue, Any dark color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const shoesFootwearSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style you want" },
  { name: "footwearType", label: "Type", type: "select", required: true, options: ["Sneakers", "Formal Shoes", "Heels", "Sandals", "Boots", "Loafers", "Sports Shoes", "Flats", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Nike, Adidas, Any brand" },
  { name: "size", label: "Size", type: "text", required: true, placeholder: "e.g. UK 9, EU 43, US 10" },
  { name: "gender", label: "For Who?", type: "select", required: true, options: ["Men", "Women", "Boys", "Girls", "Unisex"] },
  { name: "colorPreference", label: "Color", type: "text", required: false, placeholder: "e.g. All black, White, Any" },
  { name: "material", label: "Material Preference", type: "select", required: false, options: ["Leather", "Suede", "Canvas", "Rubber", "Synthetic", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific style details..." }
];

const accessoriesJewelrySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload inspiration or reference images" },
  { name: "accessoryType", label: "Type", type: "select", required: true, options: ["Necklace", "Ring", "Bracelet", "Earrings", "Watch", "Belt", "Handbag", "Wallet", "Sunglasses", "Hat / Cap", "Scarf", "Other"] },
  { name: "material", label: "Material", type: "select", required: false, options: ["Gold", "Silver", "Rose Gold", "Platinum", "Leather", "Fabric", "Beaded", "Any"] },
  { name: "gender", label: "For Who?", type: "select", required: true, options: ["Men", "Women", "Unisex", "Child"] },
  { name: "occasion", label: "Occasion", type: "select", required: false, options: ["Everyday Wear", "Wedding", "Corporate / Formal", "Party", "Gift", "Any"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Gucci, Local brand, Any" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Size, engraving, color details..." }
];

const skincareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload product images if you have a specific product in mind" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Moisturizer", "Serum", "Sunscreen", "Face Wash / Cleanser", "Toner", "Eye Cream", "Face Mask", "Exfoliator / Scrub", "Body Lotion", "Body Wash", "Other"] },
  { name: "skinType", label: "Skin Type", type: "select", required: true, options: ["Oily", "Dry", "Combination", "Sensitive", "Normal", "Not Sure"] },
  { name: "skinConcern", label: "Skin Concern", type: "select", required: false, options: ["Acne / Pimples", "Dark Spots", "Anti-Aging / Wrinkles", "Hyperpigmentation", "Dryness", "Brightening / Glow", "Even Skin Tone", "General Hydration", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. CeraVe, Neutrogena, Black Girl Sunscreen, Any" },
  { name: "preferNatural", label: "Prefer Natural / Organic?", type: "toggle", required: false, helpText: "Toggle if you prefer natural or organic ingredients" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any allergies, ingredients to avoid, or specific needs..." }
];

const makeupCosmeticsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the look or product you are trying to achieve" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Foundation", "Concealer", "Lipstick / Lip Gloss", "Mascara", "Eyeshadow Palette", "Eyeliner", "Blush / Bronzer", "Setting Powder", "Setting Spray", "Primer", "Makeup Brushes / Tools", "Full Makeup Kit", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. MAC, Fenty Beauty, NYX, Maybelline, Any" },
  { name: "shade", label: "Shade / Color", type: "text", required: false, placeholder: "e.g. NC42, Warm Beige, Red, Nude, Not sure" },
  { name: "skinTone", label: "Skin Tone", type: "select", required: false, options: ["Fair", "Light", "Medium", "Tan", "Deep", "Rich / Dark"] },
  { name: "finish", label: "Finish Preference", type: "select", required: false, options: ["Matte", "Dewy / Glow", "Satin", "Natural", "No Preference"] },
  { name: "isVegan", label: "Vegan / Cruelty Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, occasion, or allergies..." }
];

const haircareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or product you have in mind" },
  { name: "serviceOrProduct", label: "What do you need?", type: "select", required: true, options: ["Hair Product", "Hair Service", "Hair Extensions / Weave", "Wigs", "Hair Tools"] },
  { name: "hairType", label: "Hair Type", type: "select", required: false, options: ["Natural / Afro", "Relaxed", "Locs / Dreadlocks", "Braided", "Wavy", "Straight", "Curly"] },
  { name: "productType", label: "Product Type", type: "select", required: false, options: ["Shampoo", "Conditioner", "Hair Oil / Serum", "Edge Control", "Hair Cream / Moisturizer", "Hair Colour / Dye", "Hair Treatment / Mask", "Relaxer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. ORS, Dark & Lovely, Cantu, Any" },
  { name: "hairConcern", label: "Hair Concern", type: "select", required: false, options: ["Hair Growth", "Breakage / Damage", "Dryness", "Dandruff", "Thinning Hair", "General Care"] },
  { name: "preferNatural", label: "Prefer Natural / Chemical Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Hair length, color, any allergies or preferences..." }
];

const fragrancesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the specific bottle or fragrance you want" },
  { name: "fragranceType", label: "Type", type: "select", required: true, options: ["Perfume / EDP", "Eau de Toilette", "Body Mist / Spray", "Cologne", "Roll-On", "Arabian / Oud", "Body Oil Fragrance", "Other"] },
  { name: "brand", label: "Brand / Name", type: "text", required: false, placeholder: "e.g. Chanel No.5, Versace Eros, Lattafa Ameer, Any" },
  { name: "scentFamily", label: "Scent Family", type: "select", required: false, options: ["Floral", "Woody / Oud", "Fresh / Citrus", "Oriental / Spicy", "Aquatic", "Gourmand / Sweet", "Musk", "No Preference"] },
  { name: "gender", label: "For Who?", type: "select", required: true, options: ["Men", "Women", "Unisex", "Not Sure"] },
  { name: "size", label: "Bottle Size", type: "select", required: false, options: ["30ml", "50ml", "75ml", "100ml", "150ml+", "Any Size"] },
  { name: "occasion", label: "Occasion", type: "select", required: false, options: ["Everyday", "Office / Work", "Evening / Night Out", "Special Event", "Gift", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New Sealed", "Used - More than half full", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any similar scents you like, gift wrapping needed, etc..." }
];

const livingRoomBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. L-Shaped Leather Sofa" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Sofa / Couch", "Coffee Table", "TV Stand / Unit", "Armchair", "Bookshelf", "Sideboard", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Ashley, IKEA, Local Artisan" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Fabric", "Leather", "Wood", "Metal", "Glass", "Any"] },
  { name: "dimensions", label: "Dimensions", type: "text", required: false, placeholder: "e.g. 2m x 1.5m or any size" },
  { name: "colorFinish", label: "Color / Finish", type: "text", required: false, placeholder: "e.g. Walnut brown, Matte black" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

const livingRoomRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false, helpText: "Photos help technicians assess the repair needed" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Sofa", "Armchair", "Dining Chair", "Ottoman", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Fabric is torn on the left armrest, frame is wobbly" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const bedroomBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Queen Size Bed with Headboard" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Bed Frame", "Mattress", "Wardrobe", "Chest of Drawers", "Nightstand / Bedside Table", "Dressing Table", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Slumberland, Restonic, Custom" },
  { name: "size", label: "Size", type: "select", required: false, options: ["Single", "Double", "Queen", "King", "Super King", "Any"] },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Wood", "Metal", "Upholstered", "Any"] },
  { name: "colorFinish", label: "Color / Finish", type: "text", required: false, placeholder: "e.g. White, Oak, Dark Grey" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

const bedroomRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Bed Frame", "Wardrobe", "Chest of Drawers", "Nightstand", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Wardrobe door broken, bed frame creaking, drawer stuck" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const officeBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Ergonomic Office Chair" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Desk", "Office Chair", "Bookshelf", "Filing Cabinet", "Meeting Table", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Herman Miller, Steelcase, Local" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Wood", "Metal", "Glass", "Mesh (for chairs)", "Any"] },
  { name: "ergonomicFeatures", label: "Ergonomic Features?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

const officeRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Chair", "Desk", "Cabinet", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Chair wheels broken, desk surface scratched, lock broken" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const outdoorBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 6-Seater Patio Dining Set" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Patio Set", "Garden Bench", "Sun Lounger", "Swing Chair", "Outdoor Umbrella", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Keter, Lifetime, Custom Wood" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Rattan / Wicker", "Teak / Wood", "Metal / Aluminum", "Plastic", "Any"] },
  { name: "weatherResistant", label: "Weather Resistant?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

const outdoorRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Rattan Furniture", "Garden Bench", "Umbrella", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Rattan unraveling, wood rot, umbrella mechanism broken" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const carPartsNewSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Photos of the part or your car's license disc help shops match the part" },
  { name: "title", label: "What part are you looking for?", type: "text", required: true, placeholder: "e.g. Front Brake Pads" },
  { name: "carMake", label: "Car Make", type: "text", required: true, placeholder: "e.g. Toyota, Nissan, Ford" },
  { name: "carModel", label: "Car Model", type: "text", required: true, placeholder: "e.g. Corolla, Navara, Ranger" },
  { name: "year", label: "Year of Manufacture", type: "number", required: true, min: 1950, max: 2026 },
  { name: "engineSize", label: "Engine Size / Code", type: "text", required: false, placeholder: "e.g. 1.8L, 2JZ-GTE" },
  { name: "partNumber", label: "Part Number (if known)", type: "text", required: false, placeholder: "e.g. 04465-02220" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }
];

const carPartsBreakersSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Car breakers are individuals or companies that buy vehicles that were in an accident and sell parts from them." },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Used Door, Engine Block, Gearbox" },
  { name: "carMake", label: "Car Make", type: "text", required: true, placeholder: "e.g. Toyota, Nissan, Ford" },
  { name: "carModel", label: "Car Model", type: "text", required: true, placeholder: "e.g. Corolla, Navara, Ranger" },
  { name: "year", label: "Year of Manufacture", type: "number", required: true, min: 1950, max: 2026 },
  { name: "engineSize", label: "Engine Size / Code", type: "text", required: false, placeholder: "e.g. 1.8L, 2JZ-GTE" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Describe the part and its condition requirements" }
];

const carAccessoriesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the accessory you are looking for", group: "Vehicle Details" },
  { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "e.g. Toyota, BMW, Ford, Mazda", group: "Vehicle Details" },
  { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "e.g. Hilux, X5, Ranger, CX-5", group: "Vehicle Details" },
  { name: "vehicleYear", label: "Year of Vehicle", type: "text", required: false, placeholder: "e.g. 2019, 2022", group: "Vehicle Details" },
  { name: "accessoryType", label: "Accessory Type", type: "select", required: true, options: ["Seat Covers", "Car Mats", "Steering Wheel Cover", "Dashboard Camera / Dash Cam", "Car Audio / Speakers", "Roof Rack / Carrier", "Tow Bar / Hitch", "Bull Bar / Nudge Bar", "Window Tinting", "Reverse Camera", "Car Alarm / Security", "LED Lights / Lighting", "Spoiler / Body Kit", "Alloy Wheels / Rims", "Other"], group: "Accessory Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Thule, Pioneer, Any", group: "Accessory Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Accessory Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need the accessory fitted / installed", group: "Accessory Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Accessory Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific color, size, compatibility requirements...", group: "Budget & Urgency" }
];

const carBreakdownRecoverySchema: FieldSchema[] = [
  { name: "images", label: "Vehicle Photos", type: "image_upload", required: false, helpText: "Photos of the breakdown situation help providers prepare the right equipment", group: "Vehicle Details" },
  { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "e.g. Toyota, BMW, Ford", group: "Vehicle Details" },
  { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "e.g. Hilux, X5, Ranger", group: "Vehicle Details" },
  { name: "vehicleYear", label: "Year", type: "text", required: false, placeholder: "e.g. 2018", group: "Vehicle Details" },
  { name: "vehicleColor", label: "Vehicle Color", type: "text", required: false, placeholder: "e.g. White, Silver, Black", group: "Vehicle Details" },
  { name: "breakdownType", label: "Type of Breakdown", type: "select", required: true, options: ["Flat Tyre / Puncture", "Dead Battery / Jump Start Needed", "Engine Failure / Won't Start", "Accident / Collision", "Out of Fuel", "Overheating", "Transmission / Gearbox", "Locked Out of Vehicle", "Other"], group: "Breakdown Details" },
  { name: "location_name", label: "Current Vehicle Location", type: "text", required: true, placeholder: "e.g. Great East Road near Arcades, Kafue Road km 10", group: "Breakdown Details" },
  { name: "destinationLocation", label: "Destination (if towing needed)", type: "text", required: false, placeholder: "e.g. Nearest garage, Home address", group: "Breakdown Details" },
  { name: "serviceNeeded", label: "Service Needed", type: "select", required: true, options: ["Towing to Garage", "Roadside Repair / Fix on Spot", "Jump Start Only", "Tyre Change Only", "Fuel Delivery", "Not Sure - Need Assessment"], group: "Breakdown Details" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Within 1 hour", "Within a few hours", "Today", "Not Urgent"], group: "Breakdown Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other relevant information about the breakdown situation...", group: "Budget" }
];

const motorcyclesPartsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the motorcycle or part you need", group: "What Are You Looking For?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Complete Motorcycle", "Motorcycle Parts / Spares", "Motorcycle Accessories", "Motorcycle Repair Service"], group: "What Are You Looking For?" },
  { name: "motorcycleType", label: "Motorcycle Type", type: "select", required: false, options: ["Sports Bike", "Cruiser", "Off-Road / Dirt Bike", "Scooter / Moped", "Delivery Bike", "Electric Motorcycle", "Other"], group: "Motorcycle Details" },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Honda, Yamaha, Suzuki, TVS, Any", group: "Motorcycle Details" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "e.g. Honda CG125, Yamaha YBR, Any", group: "Motorcycle Details" },
  { name: "year", label: "Year", type: "text", required: false, placeholder: "e.g. 2020", group: "Motorcycle Details" },
  { name: "partDescription", label: "Part / Item Description", type: "textarea", required: false, placeholder: "e.g. Front brake pads, Chain and sprocket kit, Side mirrors", group: "Motorcycle Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Used - Fair", "Any"], group: "Motorcycle Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Motorcycle Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements or additional information...", group: "Budget & Urgency" }
];

const automotiveToolsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the specific tool or equipment you need", group: "Tool Details" },
  { name: "toolType", label: "Tool / Equipment Type", type: "select", required: true, options: ["Diagnostic Scanner / OBD Tool", "Jack / Jack Stands", "Air Compressor", "Impact Wrench / Driver", "Torque Wrench", "Battery Charger / Jump Starter", "Tyre Changer / Balancer", "Engine Hoist / Crane", "Welding Equipment", "Workshop Tool Set", "Other"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Snap-on, Bosch, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 3 ton hydraulic jack, OBD2 compatible scanner", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Personal / Home Use", "Professional Workshop", "Fleet Management", "One-Time Project", "Other"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget & Urgency" }
];

const eventManagementSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload mood board or theme inspiration images", group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Conference", "Birthday Party", "Graduation", "Product Launch", "Funeral / Memorial", "Fundraiser / Gala", "Festival", "Baby Shower", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "duration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 72, group: "Event Overview" },
  { name: "quantity", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "location_name", label: "Event Location / Venue", type: "text", required: true, placeholder: "e.g. Lusaka, Heroes Stadium, Radisson Blu Hotel", group: "Event Overview" },
  { name: "servicesNeeded", label: "Services Required", type: "select", required: true, options: ["Full Event Management", "Partial Coordination Only", "Day-Of Coordination Only", "Planning & Vendor Sourcing", "Not Sure - Need Consultation"], group: "Services Required" },
  { name: "cateringRequired", label: "Catering Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "decorRequired", label: "Decor & Styling Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "entertainmentRequired", label: "Entertainment Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "photographyRequired", label: "Photography / Videography?", type: "toggle", required: false, group: "Services Required" },
  { name: "theme", label: "Event Theme", type: "text", required: false, placeholder: "e.g. Black & Gold, Garden Party, Rustic, Traditional", group: "Theme & Style" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, cultural considerations, or special requests...", group: "Budget & Timeline" }
];

const eventCateringSchema: FieldSchema[] = [
  { name: "images", label: "Food Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of food styles or presentation you prefer", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday Party", "Graduation", "Funeral / Memorial", "Conference", "Baby Shower", "Private Dinner", "Festival / Outdoor", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "quantity", label: "Number of Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "location_name", label: "Event Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, specific venue name", group: "Event Details" },
  { name: "serviceStyle", label: "Service Style", type: "select", required: true, options: ["Buffet", "Plated / Sit Down", "Cocktail / Finger Foods", "Food Stations", "Box Meals", "BBQ / Braai", "Not Sure"], group: "Catering Requirements" },
  { name: "cuisineType", label: "Cuisine Preference", type: "select", required: false, options: ["Zambian / African Traditional", "International / Continental", "Indian", "Chinese", "Italian", "Mixed / Variety", "No Preference"], group: "Catering Requirements" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, options: ["None", "Vegetarian Options Needed", "Vegan Options Needed", "Halal Only", "Gluten Free", "Multiple Requirements"], group: "Catering Requirements" },
  { name: "drinksIncluded", label: "Drinks / Beverages Included?", type: "toggle", required: false, group: "Catering Requirements" },
  { name: "staffRequired", label: "Serving Staff Required?", type: "toggle", required: false, helpText: "Toggle if you need waiters and serving staff provided", group: "Catering Requirements" },
  { name: "equipmentRequired", label: "Equipment / Crockery Included?", type: "toggle", required: false, helpText: "Plates, cutlery, chafing dishes etc.", group: "Catering Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "budgetType", label: "Budget Type", type: "select", required: false, options: ["Total Budget for Event", "Per Person / Per Head", "Not Sure"], group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Menu preferences, allergies, cultural food requirements...", group: "Budget" }
];

const eventPlanningSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday", "Graduation", "Fundraiser", "Religious Event", "Product Launch", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "quantity", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "eventLocation", label: "Event Location", type: "text", required: true, placeholder: "City or specific venue", group: "Event Overview" },
  { name: "planningStage", label: "Current Planning Stage", type: "select", required: true, options: ["Just Starting - Need Full Help", "Have Venue - Need Other Vendors", "Have Most Vendors - Need Coordinator", "Need Day-Of Management Only"], group: "Planning Needs" },
  { name: "vendorsNeeded", label: "Vendors Still Needed", type: "select", required: false, options: ["Venue", "Catering", "Decor", "Photography", "Entertainment", "Transportation", "Cake", "All of the above", "Not Sure"], group: "Planning Needs" },
  { name: "theme", label: "Event Theme / Style", type: "text", required: false, placeholder: "e.g. Elegant Gold, Traditional Zambian, Modern Minimalist", group: "Planning Needs" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific vision, cultural requirements, or special requests...", group: "Budget & Timeline" }
];

const eventDecorSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload photos of decor styles you love - this is very helpful", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday Party", "Corporate Event", "Graduation", "Baby Shower", "Bridal Shower", "Funeral / Memorial", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "location_name", label: "Venue / Location", type: "text", required: true, placeholder: "e.g. Lusaka, specific venue", group: "Event Details" },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "decorStyle", label: "Decor Style", type: "select", required: true, options: ["Elegant / Luxury", "Traditional / Cultural", "Modern / Minimalist", "Rustic / Natural", "Floral / Garden", "Themed / Specific Concept", "Not Sure - Open to Ideas"], group: "Decor Requirements" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Gold & White, Navy & Blush, Not decided", group: "Decor Requirements" },
  { name: "decorElements", label: "Decor Elements Needed", type: "select", required: false, options: ["Full Venue Decor", "Table Centerpieces Only", "Backdrop / Stage Only", "Floral Arrangements", "Lighting & Ambiance", "Chair Covers & Sashes", "Balloon Installations", "Complete Package"], group: "Decor Requirements" },
  { name: "setupRequired", label: "Setup & Breakdown Required?", type: "toggle", required: false, helpText: "Toggle if you need the decorator to set up and pack down after the event", group: "Decor Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "urgency", label: "How Soon?", type: "select", required: true, options: ["Less than 2 weeks", "2 weeks - 1 month", "1 - 3 months", "More than 3 months"], group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific flowers, cultural elements, any must-haves...", group: "Budget" }
];

const buildingMaterialsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the materials or project reference", group: "Project Details" },
  { name: "projectType", label: "Type of Project", type: "select", required: true, options: ["New House Construction", "Renovation / Remodeling", "Extension / Addition", "Commercial Building", "Boundary Wall / Fence", "Roofing Project", "Flooring Project", "Other"], group: "Project Details" },
  { name: "materialType", label: "Material Needed", type: "select", required: true, options: ["Cement / Concrete", "Bricks / Blocks", "Sand & Aggregates", "Steel / Iron Bars / Rebar", "Roofing Sheets / Tiles", "Timber / Wood", "Glass", "Paint & Finishes", "Tiles / Flooring", "Insulation Materials", "Multiple Materials", "Other"], group: "Material Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Zambezi Portland, Any brand", group: "Material Details" },
  { name: "specifications", label: "Specifications / Grade", type: "text", required: false, placeholder: "e.g. 42.5N cement, 6mm rebar, 600x600 tiles", group: "Material Details" },
  { name: "quantity", label: "Quantity", type: "text", required: true, placeholder: "e.g. 50 bags, 1000 bricks, 20 sheets", group: "Material Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Delivery & Timeline" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Project size, site access, any specific requirements...", group: "Budget & Urgency" }
];

const plumbingFixturesSchema: FieldSchema[] = [
  { name: "images", label: "Photos", type: "image_upload", required: false, helpText: "Photos of the problem area or fixture you need", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Plumbing Repair Service", "Plumbing Installation", "Supply of Plumbing Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Pipe Repair / Replacement", "Tap / Faucet Installation", "Toilet Installation / Repair", "Shower / Bathtub Installation", "Water Heater / Geyser", "Water Tank Installation", "Drainage / Sewer", "Borehole Pump / Water Pump", "General Plumbing", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial", "Other"], group: "Service Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Chilanga, Kitwe", group: "Service Details" },
  { name: "issueDescription", label: "Describe the Issue or Requirement", type: "textarea", required: true, placeholder: "e.g. Burst pipe in kitchen, Need new toilet installed, Water not reaching upper floor", group: "Service Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other details that would help the provider...", group: "Budget & Urgency" }
];

const electricalSuppliesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the electrical work area or materials needed", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Electrical Repair Service", "New Installation", "Supply of Electrical Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Wiring / Rewiring", "DB Board / Circuit Breaker", "Solar Panel Installation", "Inverter / Battery Backup", "Security Lighting", "CCTV Installation", "Generator Installation", "Electrical Fault Finding", "Light Fitting Installation", "Power Outlet / Socket", "Other"], group: "Work Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial / Factory", "Other"], group: "Work Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Work Details" },
  { name: "issueDescription", label: "Describe the Work Required", type: "textarea", required: true, placeholder: "e.g. Rewire 3 bedroom house, Install solar system 5KVA, Fix electrical fault in kitchen", group: "Work Details" },
  { name: "materialsRequired", label: "Materials Required?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply materials", group: "Work Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Property size, number of rooms, existing electrical setup...", group: "Budget & Urgency" }
];

const hardwareToolsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the tool or hardware you need", group: "Tool Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Hand Tools", "Power Tools", "Safety Equipment / PPE", "Fasteners / Fixings", "Adhesives / Sealants", "Painting Tools & Equipment", "Measuring Tools", "Ladders & Access Equipment", "Storage / Toolboxes", "Other Hardware"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Makita, Bosch, Stanley, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 18V cordless drill, 5 metre tape measure", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Home / DIY Use", "Professional / Trade Use", "Construction Site", "Workshop", "One-Time Project"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget & Urgency" }
];

const constructionMachinerySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the machinery or project site", group: "Machinery Details" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Hire / Rent Machinery", "Purchase Machinery", "Machinery Operator Only", "Machinery with Operator"], group: "Machinery Details" },
  { name: "machineryType", label: "Type of Machinery", type: "select", required: true, options: ["Excavator / Digger", "Bulldozer", "Grader", "Tipper Truck", "Concrete Mixer", "Crane", "Forklift", "Compactor / Roller", "Generator", "Scaffolding", "Concrete Pump", "Other"], group: "Machinery Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "location_name", label: "Project / Site Location", type: "text", required: true, placeholder: "e.g. Lusaka, Kafue, Ndola", group: "Project Details" },
  { name: "projectDescription", label: "Project Description", type: "textarea", required: true, placeholder: "e.g. Excavation for foundation of 4 bedroom house, Road grading 2km stretch", group: "Project Details" },
  { name: "duration", label: "Duration Needed (Days)", type: "counter", required: true, min: 1, group: "Project Details" },
  { name: "operatorRequired", label: "Operator Required?", type: "toggle", required: false, helpText: "Toggle if you need a qualified operator provided with the machinery", group: "Project Details" },
  { name: "equipmentTransfer", label: "Equipment Handover", type: "select", required: true, options: ["I will collect from your yard (standard)", "Deliver to my site (additional transport fee)", "Operator brings to site (included with operator service)"], group: "Project Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Site access details, soil type, project scope, any special requirements...", group: "Budget & Urgency" }
];

const freshProduceSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the produce quality or type you want", group: "Produce Details" },
  { name: "produceType", label: "Type of Produce", type: "select", required: true, options: ["Vegetables", "Fruits", "Herbs & Spices", "Mushrooms", "Mixed Vegetables & Fruits", "Organic Produce", "Other"], group: "Produce Details" },
  { name: "specificItems", label: "Specific Items Needed", type: "textarea", required: true, placeholder: "e.g. 5kg tomatoes, 2kg onions, 1 bunch spinach", group: "Produce Details" },
  { name: "qualityGrade", label: "Quality / Grade", type: "select", required: false, options: ["Premium / Grade A", "Standard / Grade B", "Any Quality", "Organic Only"], group: "Produce Details" },
  { name: "isOrganic", label: "Organic Only?", type: "toggle", required: false, helpText: "Toggle if you strictly require organic produce", group: "Produce Details" },
  { name: "quantity", label: "Approximate Total Quantity", type: "text", required: true, placeholder: "e.g. 10kg mixed vegetables, Weekly supply for family of 5", group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Daily Supply", "Weekly Supply", "Bi-Weekly Supply", "Monthly Supply"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Ripeness preference, packaging requirements, any allergies...", group: "Budget & Urgency" }
];

const pantryStaplesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific products you are looking for", group: "Product Details" },
  { name: "stapleType", label: "Type of Staple", type: "select", required: true, options: ["Mealie Meal / Maize Flour", "Rice", "Cooking Oil", "Sugar", "Salt & Condiments", "Flour / Baking Ingredients", "Canned / Tinned Foods", "Dried Beans & Legumes", "Pasta & Noodles", "Cereals & Oats", "Tea & Coffee", "Mixed Pantry Items", "Other"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Maize: Roller Meal, Breakfast Meal, Any", group: "Product Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 25kg Roller Meal x2, 5L cooking oil x3, 2kg sugar x4", group: "Product Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale Order"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging size preference, bulk discount requirements...", group: "Budget & Urgency" }
];

const beveragesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific drinks you are looking for", group: "Beverage Details" },
  { name: "beverageType", label: "Type of Beverage", type: "select", required: true, options: ["Water / Mineral Water", "Soft Drinks / Sodas", "Juices", "Energy Drinks", "Beer / Cider", "Wine", "Spirits / Whiskey", "Traditional Drinks", "Tea & Coffee", "Dairy Drinks / Milk", "Mixed / Variety Pack", "Other"], group: "Beverage Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Coca-Cola, Mosi, Vimto, Any", group: "Beverage Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 24 x 500ml Coke, 2 x 5L water bottles, 1 case Mosi", group: "Beverage Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if beverages are for a party or event", group: "Order Details" },
  { name: "quantity", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Temperature requirements, packaging preferences, any specific needs...", group: "Budget & Urgency" }
];

const snacksSweetsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific snacks you are looking for", group: "Snack Details" },
  { name: "snackType", label: "Type of Snack", type: "select", required: true, options: ["Crisps / Chips", "Biscuits / Cookies", "Chocolates / Sweets", "Nuts & Dried Fruits", "Popcorn", "Local / Traditional Snacks", "Cakes & Pastries", "Sweets / Candy", "Healthy Snacks", "Mixed / Variety", "Other"], group: "Snack Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Simba, Cadbury, Lay's, Any", group: "Snack Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 10 x Simba chips, 5 x Cadbury Dairy Milk, Mixed sweets 2kg", group: "Snack Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if snacks are for a party or event", group: "Order Details" },
  { name: "quantity", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, options: ["None", "Halal Only", "Vegetarian", "Vegan", "Gluten Free", "Sugar Free / Diabetic Friendly", "Nut Free"], group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging preferences, gift wrapping needed, any allergies...", group: "Budget & Urgency" }
];

const lightingLampsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the lighting style or room you want to light", group: "Product Details" },
  { name: "lightingType", label: "Type of Lighting", type: "select", required: true, options: ["Ceiling Light / Chandelier", "Pendant Light", "Wall Light / Sconce", "Floor Lamp", "Table / Desk Lamp", "LED Strip Lights", "Outdoor / Garden Lights", "Solar Lights", "Spotlights / Downlights", "Emergency / Backup Lights", "Other"], group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Office / Study", "Outdoor / Garden", "Commercial Space", "Other"], group: "Product Details" },
  { name: "style", label: "Style Preference", type: "select", required: false, options: ["Modern / Contemporary", "Classic / Traditional", "Industrial", "Minimalist", "Luxury / Crystal", "Rustic / Natural", "No Preference"], group: "Product Details" },
  { name: "lightColor", label: "Light Color", type: "select", required: false, options: ["Warm White", "Cool White / Daylight", "RGB / Color Changing", "Any"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Philips, Any brand", group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need the lighting fitted and installed", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Room dimensions, ceiling height, wattage requirements...", group: "Budget & Urgency" }
];

const wallArtMirrorsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or look you are going for", group: "Product Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Wall Art / Painting", "Framed Print / Poster", "Mirror", "Wall Sculpture / 3D Art", "Canvas Print", "Photo Frame / Gallery Wall", "African / Cultural Art", "Abstract Art", "Other"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "African / Cultural", "Abstract", "Landscape / Nature", "Geometric", "Minimalist", "Religious / Inspirational", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Earth tones, Black & White, Match my living room", group: "Product Details" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. Large (above 100cm), Medium (60-100cm), Small (under 60cm)", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Bathroom", "Office", "Hallway", "Other"], group: "Product Details" },
  { name: "isCustom", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom commissioned piece", group: "Order Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Wall dimensions, existing decor style, any specific themes...", group: "Budget & Urgency" }
];

const rugsCarpetsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style or pattern you want", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Area Rug", "Runner Rug", "Wall to Wall Carpet", "Outdoor Rug", "Prayer Mat", "Doormat", "Other"], group: "Product Details" },
  { name: "size", label: "Size / Dimensions", type: "text", required: true, placeholder: "e.g. 2m x 3m, Runner 0.8m x 2.5m, Not sure - whole room", group: "Product Details" },
  { name: "material", label: "Material Preference", type: "select", required: false, options: ["Wool", "Nylon / Synthetic", "Cotton", "Jute / Natural Fibre", "Polypropylene", "Silk / Luxury", "Any"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "Traditional / Oriental", "African / Cultural", "Geometric", "Plain / Solid Color", "Shaggy / Fluffy", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Neutral tones, Blue & Grey, Match my sofa", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Hallway", "Office", "Outdoor", "Other"], group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Traffic level in room, children or pets at home, any specific requirements...", group: "Budget & Urgency" }
];

const curtainsBlindsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style you want or the window space", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Curtains / Drapes", "Roller Blinds", "Venetian Blinds", "Vertical Blinds", "Roman Blinds", "Sheer / Voile Curtains", "Blackout Curtains", "Both Curtains & Blinds", "Other"], group: "Product Details" },
  { name: "windowDimensions", label: "Window Dimensions", type: "text", required: true, placeholder: "e.g. Width 2m x Drop 2.5m, 3 windows same size", group: "Product Details" },
  { name: "fabric", label: "Fabric / Material", type: "select", required: false, options: ["Blackout / Block Out", "Sheer / Light Filter", "Velvet / Heavy", "Linen / Natural", "Polyester", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. White, Grey, Match my walls", group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Minimalist", "Classic / Traditional", "Patterned / Printed", "Plain / Solid", "No Preference"], group: "Product Details" },
  { name: "quantity", label: "Number of Windows", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need curtains fitted and hung", group: "Order Details" },
  { name: "isCustomMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you need made-to-measure curtains", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Existing curtain rail type, room style, any specific requirements...", group: "Budget & Urgency" }
];

const softwareWebDevSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Inspiration", type: "image_upload", required: false, helpText: "Upload screenshots or examples of what you want built", group: "Project Overview" },
  { name: "projectType", label: "Type of Project", type: "select", required: true, options: ["Website / Landing Page", "E-Commerce / Online Store", "Mobile App (Android)", "Mobile App (iOS)", "Mobile App (Both)", "Web Application / System", "Custom Software", "API / Backend Development", "Database Design", "UI/UX Design Only", "WordPress / CMS Website", "Other"], group: "Project Overview" },
  { name: "projectDescription", label: "Project Description", type: "textarea", required: true, placeholder: "Describe what you want built. What does it do? Who will use it?", group: "Project Overview" },
  { name: "targetUsers", label: "Who Will Use This?", type: "select", required: false, options: ["General Public / Customers", "Internal Staff Only", "Business to Business", "Students / Education", "Government / Public Sector", "Other"], group: "Project Overview" },
  { name: "featuresNeeded", label: "Key Features Needed", type: "textarea", required: false, placeholder: "e.g. User login, Payment gateway, Admin dashboard, Mobile responsive", group: "Technical Requirements" },
  { name: "existingSystem", label: "Existing System / Website?", type: "toggle", required: false, helpText: "Toggle if you have an existing system that needs updating", group: "Technical Requirements" },
  { name: "techPreference", label: "Technology Preference", type: "text", required: false, placeholder: "e.g. React, Laravel, WordPress, No preference", group: "Technical Requirements" },
  { name: "hostingRequired", label: "Hosting & Domain Required?", type: "toggle", required: false, helpText: "Toggle if you need the developer to set up hosting and domain", group: "Technical Requirements" },
  { name: "timeline", label: "Project Timeline", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "maintenanceRequired", label: "Ongoing Maintenance Required?", type: "toggle", required: false, helpText: "Toggle if you need monthly support after launch", group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other requirements, integrations needed, competitors to reference...", group: "Budget & Timeline" }
];

const networkingSecuritySchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the premises or existing network setup", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Network Setup / Installation", "WiFi Setup & Configuration", "Network Troubleshooting", "CCTV / Security Camera Setup", "Access Control System", "Firewall / Cybersecurity", "Server Setup & Configuration", "VPN Setup", "Network Cabling", "Biometric System", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Home / Residential", "Small Office", "Medium Business", "Large Corporate", "School / Institution", "Warehouse / Industrial", "Other"], group: "Service Details" },
  { name: "propertySize", label: "Property Size / Coverage Area", type: "text", required: false, placeholder: "e.g. 3 bedroom house, 2 floor office building, 500 sqm warehouse", group: "Service Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Service Details" },
  { name: "quantity", label: "Number of Devices / Users", type: "number", required: false, min: 1, helpText: "Approximate number of computers, phones, cameras etc.", group: "Service Details" },
  { name: "issueDescription", label: "Describe Your Requirements", type: "textarea", required: true, placeholder: "e.g. Need WiFi covering entire office, CCTV for 4 entry points, Network keeps dropping", group: "Service Details" },
  { name: "existingInfrastructure", label: "Existing Infrastructure?", type: "toggle", required: false, helpText: "Toggle if you have existing network equipment installed", group: "Technical Details" },
  { name: "equipmentSupplyNeeded", label: "Equipment Supply Needed?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply routers, cameras etc.", group: "Technical Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific brands, security certifications required, other details...", group: "Budget & Urgency" }
];

const itSupportMaintenanceSchema: FieldSchema[] = [
  { name: "images", label: "Screenshots / Photos", type: "image_upload", required: false, helpText: "Upload screenshots of errors or photos of hardware issues", group: "Support Details" },
  { name: "supportType", label: "Type of Support Needed", type: "select", required: true, options: ["Computer / Laptop Repair", "Software Installation", "Virus / Malware Removal", "Data Recovery", "System Upgrade", "Printer Setup / Repair", "Email Setup & Configuration", "Remote Support / Online Help", "Regular Maintenance Contract", "Staff IT Training", "Other"], group: "Support Details" },
  { name: "deviceType", label: "Device Type", type: "select", required: false, options: ["Desktop PC", "Laptop", "Server", "Printer", "POS System", "Multiple Devices", "Other"], group: "Support Details" },
  { name: "operatingSystem", label: "Operating System", type: "select", required: false, options: ["Windows 10", "Windows 11", "Windows 7 / 8", "macOS", "Linux", "Not Sure"], group: "Support Details" },
  { name: "issueDescription", label: "Describe the Issue", type: "textarea", required: true, placeholder: "e.g. Laptop very slow, Blue screen error, Cannot connect to internet, Need antivirus installed", group: "Support Details" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: false, min: 1, group: "Support Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka CBD, Woodlands, Ndola", group: "Support Details" },
  { name: "remoteSupport", label: "Remote Support Acceptable?", type: "toggle", required: false, helpText: "Toggle if the technician can assist you remotely without visiting", group: "Support Details" },
  { name: "ongoingContract", label: "Ongoing Support Contract?", type: "toggle", required: false, helpText: "Toggle if you need regular monthly IT support", group: "Contract Details" },
  { name: "numberOfStaff", label: "Number of Staff / Users", type: "number", required: false, min: 1, group: "Contract Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any error messages, when issue started, previous repairs done...", group: "Budget & Urgency" }
];

const ispSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of your premises or location", group: "Connection Details" },
  { name: "connectionType", label: "Type of Connection Needed", type: "select", required: true, options: ["Home WiFi / Broadband", "Business Fibre", "LTE / 4G / 5G Router", "Satellite Internet", "Dedicated Leased Line", "VSAT", "Not Sure - Need Advice"], group: "Connection Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Home", "Small Office", "Medium Business", "Large Corporate", "School / Institution", "Farm / Rural Area", "Other"], group: "Connection Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka - Rhodespark, Ndola - Kansenshi, Choma Town", group: "Connection Details" },
  { name: "numberOfUsers", label: "Number of Users / Devices", type: "number", required: false, min: 1, helpText: "How many people or devices will use the connection?", group: "Connection Details" },
  { name: "speedRequired", label: "Speed Required", type: "select", required: false, options: ["Basic - Browsing & Email", "Standard - Streaming & Video Calls", "Fast - Multiple Users & Downloads", "Ultra Fast - Business Critical", "Not Sure"], group: "Connection Details" },
  { name: "primaryUse", label: "Primary Use", type: "select", required: true, options: ["Home Use / Entertainment", "Remote Work / Work From Home", "Business Operations", "Gaming", "CCTV / IoT Devices", "Mixed Use"], group: "Connection Details" },
  { name: "existingProvider", label: "Current Internet Provider", type: "text", required: false, placeholder: "e.g. Airtel, MTN, Liquid, None", group: "Current Situation" },
  { name: "currentIssue", label: "Current Issue / Reason for Inquiry", type: "select", required: false, options: ["No Internet Currently", "Too Slow", "Too Expensive", "Unreliable Connection", "New Property / Installation", "Upgrading Plan", "Other"], group: "Current Situation" },
  { name: "contractPreference", label: "Contract Preference", type: "select", required: false, options: ["Month to Month", "6 Month Contract", "12 Month Contract", "24 Month Contract", "No Preference"], group: "Budget & Preferences" },
  { name: "budget_limit", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Building type, floor level, any specific requirements...", group: "Budget & Preferences" }
];

const mobileNetworkServicesSchema: FieldSchema[] = [
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["SIM Card / New Line", "Business SIM / Corporate Lines", "Data Bundles / Packages", "Bulk SMS Services", "USSD / Mobile Money Integration", "Corporate Mobile Plan", "International Roaming", "Other"], group: "Service Details" },
  { name: "networkPreference", label: "Network Preference", type: "select", required: false, options: ["Airtel Zambia", "MTN Zambia", "Zamtel", "No Preference"], group: "Service Details" },
  { name: "quantity", label: "Number of Lines / SIMs", type: "counter", required: true, min: 1, group: "Service Details" },
  { name: "planType", label: "Plan Type", type: "select", required: false, options: ["Prepaid / Pay As You Go", "Postpaid / Contract", "Hybrid Plan", "No Preference"], group: "Service Details" },
  { name: "dataRequirement", label: "Monthly Data Requirement", type: "select", required: false, options: ["Basic - Under 5GB", "Standard - 5 to 20GB", "Heavy - 20 to 50GB", "Unlimited Data", "Not Sure"], group: "Service Details" },
  { name: "businessUse", label: "For Business Use?", type: "toggle", required: false, helpText: "Toggle if this is for a business or organisation", group: "Service Details" },
  { name: "companyName", label: "Company / Organisation Name", type: "text", required: false, placeholder: "e.g. ABC Company Ltd", group: "Service Details" },
  { name: "budget_limit", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Number portability needed, specific features required, coverage area concerns...", group: "Budget & Urgency" }
];

const satelliteVsatInstallationSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the installation site and surrounding area", group: "Installation Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["VSAT Internet Installation", "Satellite TV Installation", "DSTV Installation / Relocation", "DSTV Repair / Signal Fix", "OpenView / FreeView Installation", "Starlink Setup", "Other Satellite Service"], group: "Installation Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Home", "Farm / Rural Property", "Small Business", "Large Business / Corporate", "School / Institution", "Mining / Industrial Site", "Other"], group: "Installation Details" },
  { name: "location", label: "Installation Location", type: "text", required: true, placeholder: "e.g. Lusaka, Mumbwa District, Mpika - Remote Farm", group: "Installation Details" },
  { name: "isRemoteArea", label: "Remote / Rural Area?", type: "toggle", required: false, helpText: "Toggle if the installation site is in a remote area with limited road access", group: "Installation Details" },
  { name: "existingEquipment", label: "Existing Equipment?", type: "toggle", required: false, helpText: "Toggle if you already have a dish or decoder installed", group: "Installation Details" },
  { name: "quantity", label: "Number of Connection Points", type: "counter", required: false, min: 1, helpText: "Number of TVs or devices to connect", group: "Installation Details" },
  { name: "roofType", label: "Roof / Mounting Type", type: "select", required: false, options: ["Tiled Roof", "Iron Sheet Roof", "Concrete / Flat Roof", "Wall Mount", "Ground Mount / Pole", "Not Sure"], group: "Technical Details" },
  { name: "powerAvailable", label: "Reliable Power Available?", type: "toggle", required: false, helpText: "Toggle if site has reliable electricity. If not, solar options may be discussed", group: "Technical Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need Installation?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "GPS coordinates if remote, access road details, power situation...", group: "Budget & Urgency" }
];

const boreholeDrillingSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the site and access gate/road", group: "Site Details" },
  { name: "location", label: "Drilling Location", type: "text", required: true, placeholder: "e.g. Lusaka West, Chongwe, Plot Number", group: "Site Details" },
  { name: "purpose", label: "Purpose of Borehole", type: "select", required: true, options: ["Domestic / Home Use", "Agricultural / Irrigation", "Industrial / Commercial", "Community Water Point", "Construction Site", "Other"], group: "Site Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Plot", "Farm / Smallholding", "Commercial Property", "Industrial Site", "Unfinished Site", "Other"], group: "Site Details" },
  { name: "siteAccessibility", label: "Rig Accessibility", type: "select", required: true, options: ["Easy Access (Wide Gate/Road)", "Limited Access (Narrow)", "Difficult Terrain", "Not Sure - Need Site Visit"], helpText: "Drilling rigs are large trucks; they need space to maneuver.", group: "Site Details" },
  { name: "requiredDepth", label: "Estimated Depth (Meters)", type: "number", required: false, placeholder: "e.g. 60", helpText: "If unknown, the driller will estimate based on local water table.", group: "Technical Requirements" },
  { name: "casingType", label: "Casing Preference", type: "select", required: false, options: ["Class 9 PVC (Standard)", "Class 12 PVC (Heavy Duty)", "Steel Casing", "No Preference"], group: "Technical Requirements" },
  { name: "pumpSystem", label: "Pump & Power System", type: "select", required: true, options: ["Solar Powered System", "Electric (ZESCO) Pump", "Hand Pump", "Submersible Pump Only", "Full Installation (Pump + Tank + Stand)", "No Pump - Drilling Only"], group: "Technical Requirements" },
  { name: "tankNeeded", label: "Water Tank Needed?", type: "toggle", required: false, group: "Technical Requirements" },
  { name: "tankStandNeeded", label: "Tank Stand Needed?", type: "toggle", required: false, group: "Technical Requirements" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Geological info if known, specific pump brand, water testing requirements...", group: "Budget & Urgency" }
];

const miningExplorationSchema: FieldSchema[] = [
  { name: "images", label: "Site / Map Photos", type: "image_upload", required: false, helpText: "Upload site maps or photos of the exploration area", group: "Project Overview" },
  { name: "location_name", label: "Project Location", type: "text", required: true, placeholder: "e.g. Solwezi, Copperbelt, Mkushi", group: "Project Overview" },
  { name: "drillingType", label: "Type of Drilling Required", type: "select", required: true, options: ["Diamond Core Drilling", "Reverse Circulation (RC)", "Air Core Drilling", "Blast Hole Drilling", "Auger Drilling", "Not Sure - Need Advice"], group: "Project Overview" },
  { name: "numberOfHoles", label: "Number of Holes", type: "number", required: true, min: 1, group: "Project Overview" },
  { name: "targetDepth", label: "Average Target Depth (Meters)", type: "number", required: true, group: "Project Overview" },
  { name: "terrainType", label: "Terrain Type", type: "select", required: true, options: ["Flat / Accessible", "Hilly / Mountainous", "Swampy / Wet", "Dense Bush / Forest", "Existing Mine Site"], group: "Site Conditions" },
  { name: "siteAccess", label: "Site Access Status", type: "select", required: true, options: ["Road Access Available", "Need Road Clearing", "Remote - Helicopter Only", "Underground Access"], group: "Site Conditions" },
  { name: "waterSource", label: "Water Source for Drilling", type: "select", required: true, options: ["Available on Site", "Need Water Bowsing / Trucking", "Natural Source Nearby", "Contractor to Provide"], group: "Logistics" },
  { name: "campServices", label: "Camp Services Needed?", type: "toggle", required: false, helpText: "Does the contractor need to provide their own accommodation/camp?", group: "Logistics" },
  { name: "environmentalCompliance", label: "Environmental Permits Ready?", type: "toggle", required: true, group: "Compliance" },
  { name: "budget_limit", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "timeline", label: "Project Start Date", type: "date", required: true, group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Sample handling requirements, safety standards (ISO/NOSA), specific rig requirements...", group: "Budget & Timeline" }
];

const geotechnicalDrillingSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos / Plans", type: "image_upload", required: false, group: "Project Details" },
  { name: "projectType", label: "Project Type", type: "select", required: true, options: ["Building Foundation", "Bridge Construction", "Road / Highway", "Dam / Reservoir", "Tailings Storage Facility", "Telecommunication Tower", "Other Infrastructure"], group: "Project Details" },
  { name: "location", label: "Site Location", type: "text", required: true, placeholder: "e.g. Lusaka CBD, New Bridge Site", group: "Project Details" },
  { name: "numberOfBoreholes", label: "Number of Test Boreholes", type: "number", required: true, min: 1, group: "Technical Scope" },
  { name: "requiredDepth", label: "Target Depth per Hole (Meters)", type: "number", required: true, group: "Technical Scope" },
  { name: "testingRequired", label: "In-Situ Testing Needed", type: "select", required: true, options: ["Standard Penetration Test (SPT)", "Cone Penetration Test (CPT)", "Vane Shear Test", "Pressuremeter Test", "Dynamic Probe Super Heavy (DPSH)", "Multiple / All of the above"], group: "Technical Scope" },
  { name: "coreRecovery", label: "Core Recovery Required?", type: "toggle", required: false, group: "Technical Scope" },
  { name: "labTesting", label: "Laboratory Testing Needed?", type: "toggle", required: false, helpText: "Soil analysis, rock strength, moisture content, etc.", group: "Technical Scope" },
  { name: "siteAccessibility", label: "Site Accessibility", type: "select", required: true, options: ["Easy Access", "Restricted Space (Indoor/Basement)", "Sloped / Difficult Terrain", "Over Water / Barge Needed"], group: "Site Conditions" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Soon?", type: "select", required: true, options: ["Immediately", "Within 1 week", "Within 1 month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific standards (ASTM/BS), reporting requirements, site safety inductions...", group: "Budget & Urgency" }
];

const businessComputersSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, helpText: "Upload spec sheets or reference photos", group: "Product Details" },
  { name: "computerType", label: "Type of Computer", type: "select", required: true, options: ["Business Laptop", "Desktop PC", "Workstation", "All-in-One PC", "Mini PC", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell", "HP", "Lenovo", "Apple (Mac)", "ASUS", "Acer", "Custom Built", "No Preference"], group: "Product Details" },
  { name: "processor", label: "Processor Requirement", type: "select", required: false, options: ["Entry Level (Core i3 / Ryzen 3)", "Mid Range (Core i5 / Ryzen 5)", "High Performance (Core i7 / Ryzen 7)", "Extreme (Core i9 / Ryzen 9)", "Not Sure"], group: "Technical Specs" },
  { name: "ram", label: "RAM (Memory)", type: "select", required: false, options: ["8GB", "16GB", "32GB", "64GB+", "Not Sure"], group: "Technical Specs" },
  { name: "storage", label: "Storage Capacity", type: "select", required: false, options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB+ SSD", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity Needed", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget per Unit (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "OS preference, specific ports needed, warranty requirements...", group: "Order Details" }
];

const serversStorageSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Rack Server", "Tower Server", "Blade Server", "NAS Storage", "SAN Storage", "Backup / Tape Drive", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell EMC", "HPE", "Lenovo", "Cisco", "Synology", "QNAP", "Other", "No Preference"], group: "Product Details" },
  { name: "purpose", label: "Primary Purpose", type: "select", required: true, options: ["File Server", "Database Server", "Virtualization (VMware/Hyper-V)", "Web Hosting", "Backup & Recovery", "Active Directory / Domain Controller", "Other"], group: "Technical Specs" },
  { name: "storageCapacity", label: "Required Storage Capacity", type: "text", required: false, placeholder: "e.g. 10TB, 50TB, 1PB", group: "Technical Specs" },
  { name: "redundancy", label: "Redundancy Requirements", type: "select", required: false, options: ["Standard (Single PSU/RAID)", "High Availability (Dual PSU/Failover)", "Mission Critical", "Not Sure"], group: "Technical Specs" },
  { name: "budget_limit", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Rack space available, OS requirements, support level needed...", group: "Order Details" }
];

const networkingHardwareSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Network Switch", "Router", "Firewall / Security Appliance", "Wireless Access Point", "Network Cabinet / Rack", "Cabling & Patch Panels", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Cisco", "Ubiquiti (UniFi)", "MikroTik", "TP-Link (Omada)", "Fortinet", "Sophos", "Aruba", "Other"], group: "Product Details" },
  { name: "portCount", label: "Number of Ports", type: "select", required: false, options: ["5-8 Ports", "16 Ports", "24 Ports", "48 Ports", "N/A"], group: "Technical Specs" },
  { name: "poeRequired", label: "PoE (Power over Ethernet) Needed?", type: "toggle", required: false, group: "Technical Specs" },
  { name: "managed", label: "Managed or Unmanaged?", type: "select", required: false, options: ["Managed (L2/L3)", "Unmanaged (Plug & Play)", "Smart Managed", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "SFP+ requirements, specific security features, outdoor vs indoor...", group: "Order Details" }
];

const softwareLicensesSchema: FieldSchema[] = [
  { name: "softwareName", label: "Software Name", type: "text", required: true, placeholder: "e.g. Microsoft 365, Adobe Creative Cloud, Sage, Antivirus", group: "Software Details" },
  { name: "licenseType", label: "License Type", type: "select", required: true, options: ["New Subscription", "Renewal", "Perpetual License (One-time)", "Upgrade", "Not Sure"], group: "Software Details" },
  { name: "numberOfUsers", label: "Number of Users / Seats", type: "number", required: true, min: 1, group: "Software Details" },
  { name: "edition", label: "Edition / Version", type: "select", required: false, options: ["Basic / Home", "Standard / Business", "Professional", "Enterprise / Premium", "Not Sure"], group: "Software Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Current license key if renewal, specific modules needed...", group: "Order Details" }
];

const printersOfficeEquipmentSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Laser Printer", "Inkjet Printer", "Multifunction (Print/Scan/Copy)", "Large Format Plotter", "Document Scanner", "Label Printer", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["HP", "Canon", "Epson", "Brother", "Kyocera", "Konica Minolta", "Ricoh", "Other"], group: "Product Details" },
  { name: "colorMono", label: "Color or Monochrome?", type: "select", required: true, options: ["Color", "Monochrome (Black & White Only)", "Both"], group: "Technical Specs" },
  { name: "paperSize", label: "Max Paper Size", type: "select", required: true, options: ["A4", "A3", "A2", "A1/A0 (Plotter)", "Other"], group: "Technical Specs" },
  { name: "monthlyVolume", label: "Estimated Monthly Volume", type: "select", required: false, options: ["Low (Under 1000 pages)", "Medium (1000 - 5000 pages)", "High (5000+ pages)", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Network/WiFi printing needed, duplex (double-sided) printing, specific tray requirements...", group: "Order Details" }
];

const poultryFarmingSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your poultry setup or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Day-old chicks", "Broiler Feed", "Layer Feed", "Vaccines (Gumboro/Lasota)", "Feeders & Drinkers", "Brooders", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 500 chicks, 10 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific brands, delivery requirements, etc.", group: "Budget & Preferences" }
];

const aquacultureSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your pond or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Fingerlings (Tilapia/Catfish)", "Fish Feed (Starter/Finisher)", "Pond Liners", "Water Testing Kits", "Nets", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1000 fingerlings, 5 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific species, pond size, delivery requirements, etc.", group: "Budget & Preferences" }
];

const cropProductionSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your field or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Maize/Vegetable Seeds", "Fertilizers (D-Compound/Urea)", "Pesticides", "Herbicides", "Sprayers", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of fertilizer, 10kg seeds", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Crop type, field size, specific brands, etc.", group: "Budget & Preferences" }
];

const livestockVeterinarySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your livestock or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Cattle/Goat Feed", "Salt Licks", "Dewormers", "Veterinary Instruments", "Animal Health Supplements", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of feed, 2 bottles of dewormer", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Animal type, specific health concerns, etc.", group: "Budget & Preferences" }
];

const irrigationHardwareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Water Pumps (Solar/Petrol)", "Piping", "Shovels", "Rakes", "Fencing Wire", "Greenhouse Materials", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1 solar pump, 100m piping", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm size, water source, specific requirements, etc.", group: "Budget & Preferences" }
];

const agroTechServicesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or area for service", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Soil Testing Services", "Consulting", "Solar Lighting for Farms", "Drone Spraying", "Other"], group: "Service Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Service Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm location, specific challenges, goals, etc.", group: "Budget & Preferences" }
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
  { id: 'car-parts-new', name: 'Car Parts & Spares (Buy New)', baseName: 'Car Parts & Spares', type: 'buy', parentId: 'automotive', formSchema: carPartsNewSchema },
  { id: 'car-parts-breakers', name: 'Car Parts & Spares (Buy from Car Breakers)', baseName: 'Car Parts & Spares', type: 'buy', parentId: 'automotive', formSchema: carPartsBreakersSchema },
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
];

export type CategoryNature = 'PRODUCT' | 'SERVICE' | 'BOTH';

export const getCategoryNature = (categoryId: string): CategoryNature => {
  const productParents = ['fashion', 'groceries', 'beauty', 'home-decor', 'it-products', 'electronics', 'furniture'];
  const serviceParents = ['entertainment', 'events', 'telecommunications', 'it-services', 'drilling-services'];
  
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

export const getCategorySchema = (categoryName: string): FieldSchema[] => {
  const category = CATEGORIES_DB.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.id === categoryName);
  return category?.formSchema || GENERIC_FALLBACK_SCHEMA;
};

// ─────────────────────────────────────────────────────────────────────────────
// Business-type derivation
//
// Tonse's onboarding captures four signals about a seller:
//   1. role     — auth identity (BUYER / SELLER / SUPPLIER / SERVICE_PROVIDER…)
//   2. subRole  — variant within the role (PRODUCT_SELLER / SERVICE_SELLER /
//                 HYBRID_SELLER / SUPPLIER_SELLER…)
//   3. categories — what they trade in (Electronics / Mobile Phones / …) where
//                   each entry is a sub-category whose name carries the
//                   action variant in parentheses, e.g.
//                   "Mobile Phones & Accessories (Repair)" or
//                   "Mobile Phones & Accessories (Buy New)"
//   4. specification — derived from the action variant in (3)
//
// The combination of the four resolves to a single BusinessType which every
// dashboard surface (sidebar, stat tiles, lead filters, form schemas) keys
// off of, so an Electronics retail shop and an Electronics repair shop see
// genuinely different UIs even though they share role+subRole+category name.
// ─────────────────────────────────────────────────────────────────────────────

export type BusinessType =
  | 'BUYER'
  | 'LABOUR'
  | 'EVENTS'
  | 'ENTERTAINMENT'
  | 'WHOLESALE'
  | 'HYBRID'                // sells both products & services as a brand model
  | 'PRO_SERVICES'          // service-only seller (consulting, design, etc.)
  | 'REPAIR_SERVICE'        // sells the act of repairing things
  | 'PRODUCTS_AND_REPAIR'   // sells new + repairs (e.g. phone shop + tech bench)
  | 'RETAIL_PRODUCTS'       // sells new products only
  | 'ADMIN'
  | 'UNKNOWN';

export const REPAIR_ACTION_PATTERN =
  /\((repair|restoration|upholstery|recovery|service|maintenance|fix)\b[^)]*\)/i;
export const BUY_NEW_ACTION_PATTERN =
  /\((buy new|new|purchase|sell|sale|retail)\b[^)]*\)/i;

export function isRepairVariant(categoryName: string): boolean {
  return REPAIR_ACTION_PATTERN.test(categoryName);
}

export function isBuyNewVariant(categoryName: string): boolean {
  return BUY_NEW_ACTION_PATTERN.test(categoryName);
}

/**
 * Extract the action variant ("Buy New", "Repair", etc.) from a sub-category
 * name. Returns null if the name has no variant suffix in parentheses.
 */
export function getCategoryVariant(categoryName: string): string | null {
  const match = categoryName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : null;
}

interface MinimalUserForBusinessType {
  role?: string;
  subRole?: string;
  categories?: string[];
}

/**
 * Resolve the four onboarding signals into a single BusinessType.
 *
 * Priority order:
 *   1. Top-level roles that bypass the seller hierarchy (BUYER, LABOUR, ADMIN,
 *      EVENTS, ENTERTAINMENT) win first — they don't depend on subRole.
 *   2. Within the seller hierarchy, subRole resolves WHOLESALE / HYBRID /
 *      PRO_SERVICES directly.
 *   3. PRODUCT_SELLER (or bare SELLER) inspects the categories' action
 *      variants to pick between RETAIL_PRODUCTS, REPAIR_SERVICE, and the mixed
 *      PRODUCTS_AND_REPAIR.
 *
 * Returns 'UNKNOWN' for users with no role set yet (e.g. mid-onboarding).
 */
// Category-name predicates for events / entertainment trees. These match
// against the *names* (the only data we have on user.categories — see
// CategorySelection's onChange wiring). The patterns intentionally cover both
// the master ("Events" / "Entertainment") and any of the registered
// sub-categories ("Event Venues", "Event Equipment Rental", "Event Catering",
// "DJs", "Live Bands", "MCs & Hosts", etc.) so a SELLER who picks any of these
// resolves to the right businessType without needing role-rewriting upstream.
const EVENT_CATEGORY_PATTERN =
  /\b(events?|venues?|wedding|conference|stage)\b|^event\s|^events$/i;
const ENTERTAINMENT_CATEGORY_PATTERN =
  /\b(entertainment|dj|live\s?band|mc|host|dancer|comedian|spoken\s?word|performer|influencer|band|musician)\b/i;

function categoriesMatch(categories: string[], pattern: RegExp): boolean {
  return categories.some((c) => pattern.test(c));
}

export function getBusinessType(user: MinimalUserForBusinessType | null | undefined): BusinessType {
  if (!user || !user.role) return 'UNKNOWN';

  const role = user.role.toUpperCase();
  if (role === 'BUYER') return 'BUYER';
  if (role === 'ADMIN') return 'ADMIN';

  // Phase 2 tightened the role enum to BUYER / SELLER / SERVICE_PROVIDER /
  // ADMIN. Legacy values (EVENTS, ENTERTAINMENT, SUPPLIER, LABOUR) were
  // backfilled into the categories array, so detection happens entirely
  // through category-name predicates below.
  const categories = user.categories || [];
  const subRole = (user.subRole || '').toUpperCase();

  // Category-driven specialty detection — checked BEFORE the seller subRole
  // branches so a SELLER who picked "Event Equipment Rental" or "DJs" lands
  // on the right dashboard rather than the generic RETAIL_PRODUCTS bucket.
  // Events takes priority over entertainment when both match (rare).
  if (categoriesMatch(categories, EVENT_CATEGORY_PATTERN)) return 'EVENTS';
  if (categoriesMatch(categories, ENTERTAINMENT_CATEGORY_PATTERN)) return 'ENTERTAINMENT';

  // SERVICE_PROVIDER includes labour, repair-only services, and pro services.
  if (role === 'SERVICE_PROVIDER') {
    if (categories.some(isRepairVariant)) return 'REPAIR_SERVICE';
    // labour categories carry "Skilled Labour" prefix from Phase 2 backfill
    if (categoriesMatch(categories, /\bskilled\s?labour\b|\blabour\b|\bworker\b|\bgig\b/i))
      return 'LABOUR';
    return 'PRO_SERVICES';
  }

  // SELLER branch — products, hybrid, wholesale, sales-with-repair.
  if (subRole === 'SUPPLIER_SELLER') return 'WHOLESALE';
  if (subRole === 'HYBRID_SELLER') return 'HYBRID';
  if (subRole === 'SERVICE_SELLER') return 'PRO_SERVICES';

  if (subRole === 'PRODUCT_SELLER' || role === 'SELLER') {
    const hasRepair = categories.some(isRepairVariant);
    // "buy new" is the implicit default — any non-repair entry counts as sales
    const hasSales = categories.some((c) => !isRepairVariant(c));

    if (hasRepair && hasSales) return 'PRODUCTS_AND_REPAIR';
    if (hasRepair) return 'REPAIR_SERVICE';
    return 'RETAIL_PRODUCTS';
  }

  return 'UNKNOWN';
}

/**
 * Human-friendly label for a BusinessType — used in admin tools and headers.
 */
export function getBusinessTypeLabel(type: BusinessType): string {
  switch (type) {
    case 'BUYER':
      return 'Buyer';
    case 'LABOUR':
      return 'Skilled Labour';
    case 'EVENTS':
      return 'Events Provider';
    case 'ENTERTAINMENT':
      return 'Entertainment Provider';
    case 'WHOLESALE':
      return 'Wholesale Supplier';
    case 'HYBRID':
      return 'Hybrid Seller';
    case 'PRO_SERVICES':
      return 'Service Provider';
    case 'REPAIR_SERVICE':
      return 'Repair Service';
    case 'PRODUCTS_AND_REPAIR':
      return 'Sales & Repair';
    case 'RETAIL_PRODUCTS':
      return 'Retail Shop';
    case 'ADMIN':
      return 'Admin';
    default:
      return 'Unverified';
  }
}
