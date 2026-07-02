import type { FieldSchema } from '../types';

export const carPartsNewSchema: FieldSchema[] = [
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

export const carPartsBreakersSchema: FieldSchema[] = [
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

// Whole-vehicle inquiry — buyer is shopping for a car/SUV/truck/etc
// (not parts). Routed to dealers / showrooms / second-hand dealerships
// who quote on the vehicle itself.
export const vehiclesBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos / Inspiration", type: "image_upload", required: false, helpText: "Optional: photos of a similar vehicle you have in mind", group: "Vehicle Basics" },
  { name: "bodyType", label: "Body Type", type: "select", required: true, options: ["Sedan", "Hatchback", "SUV", "Crossover", "Pickup / Bakkie", "Truck", "Van / Minibus", "Bus / Coaster", "Motorcycle", "Tractor / Farm Vehicle", "Other"], group: "Vehicle Basics" },
  { name: "carMake", label: "Make / Brand", type: "text", required: true, placeholder: "e.g. Toyota, Nissan, Mazda, Mercedes", group: "Vehicle Basics" },
  { name: "carModel", label: "Model", type: "text", required: true, placeholder: "e.g. Hilux, Navara, CX-5, C-Class", group: "Vehicle Basics" },
  { name: "yearFrom", label: "Year — From", type: "number", required: true, min: 1990, max: 2027, helpText: "Earliest acceptable year of manufacture", group: "Vehicle Basics" },
  { name: "yearTo", label: "Year — To", type: "number", required: false, min: 1990, max: 2027, helpText: "Latest acceptable year. Leave blank if you want one specific year only", group: "Vehicle Basics" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New (showroom)", "Pre-owned (used)", "Salvage / Repairable", "Either new or used"], group: "Vehicle Basics" },
  { name: "transmission", label: "Transmission", type: "select", required: false, keepInExpress: true, options: ["Manual", "Automatic", "CVT", "Either"], group: "Mechanical Preferences" },
  { name: "fuelType", label: "Fuel Type", type: "select", required: false, options: ["Petrol", "Diesel", "Hybrid", "Electric", "Either"], group: "Mechanical Preferences" },
  { name: "driveType", label: "Drive Type", type: "select", required: false, options: ["2WD", "4WD / AWD", "Either"], group: "Mechanical Preferences" },
  { name: "engineSize", label: "Engine Size", type: "text", required: false, placeholder: "e.g. 1.5L, 2.4L, 3.0L V6", group: "Mechanical Preferences" },
  { name: "maxMileage", label: "Max Mileage (km)", type: "number", required: false, min: 0, helpText: "Cap on the odometer reading for used vehicles", group: "Mechanical Preferences" },
  { name: "bodyColor", label: "Preferred Colour", type: "text", required: false, placeholder: "e.g. White, Silver, any", group: "Appearance" },
  { name: "interior", label: "Interior Material", type: "select", required: false, options: ["Cloth", "Leather", "Either"], group: "Appearance" },
  { name: "preferredFeatures", label: "Must-Have Features", type: "textarea", required: false, placeholder: "e.g. Reverse camera, sunroof, cruise control, leather seats…", group: "Appearance" },
  { name: "intendedUse", label: "Intended Use", type: "select", required: false, options: ["Personal / Family", "Business / Commercial", "Fleet / Multiple Vehicles", "Resale", "Off-road / Farming"], group: "Buyer Context" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional — leave blank to receive offers in your range", group: "Buyer Context" },
  { name: "financing", label: "Financing Needed?", type: "toggle", required: false, helpText: "Toggle on if you'd like the dealer to suggest financing/payment-plan options", group: "Buyer Context" },
  { name: "tradeIn", label: "Have a Trade-in?", type: "toggle", required: false, helpText: "Toggle on if you have a vehicle to part-exchange", group: "Buyer Context" },
  { name: "tradeInDetails", label: "Trade-in Details", type: "textarea", required: false, placeholder: "Make, model, year, mileage, condition", group: "Buyer Context", dependsOn: { field: "tradeIn", value: true } },
  { name: "urgency", label: "Timeline", type: "select", required: true, options: ["Immediately", "Within 1 month", "Within 3 months", "Just exploring"], group: "Buyer Context" },
  { name: "additionalDetails", label: "Anything else?", type: "textarea", required: false, placeholder: "Any other requirements or questions for the dealer", group: "Buyer Context" }
];

export const carAccessoriesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the accessory you are looking for", group: "Vehicle Details" },
  { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "e.g. Toyota, BMW, Ford, Mazda", group: "Vehicle Details" },
  { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "e.g. Hilux, X5, Ranger, CX-5", group: "Vehicle Details" },
  { name: "vehicleYear", label: "Year of Vehicle", type: "text", required: false, placeholder: "e.g. 2019, 2022", group: "Vehicle Details" },
  { name: "accessoryType", label: "Accessory Type", type: "select", required: true, options: ["Seat Covers", "Car Mats", "Steering Wheel Cover", "Dashboard Camera / Dash Cam", "Car Audio / Speakers", "Roof Rack / Carrier", "Tow Bar / Hitch", "Bull Bar / Nudge Bar", "Window Tinting", "Reverse Camera", "Car Alarm / Security", "LED Lights / Lighting", "Spoiler / Body Kit", "Alloy Wheels / Rims", "Other"], group: "Accessory Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Thule, Pioneer, Any", group: "Accessory Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Accessory Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need the accessory fitted / installed", group: "Accessory Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Accessory Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific color, size, compatibility requirements...", group: "Budget and Urgency" }
];

export const carBreakdownRecoverySchema: FieldSchema[] = [
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

export const motorcyclesPartsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the motorcycle or part you need", group: "What Are You Looking For?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Complete Motorcycle", "Motorcycle Parts / Spares", "Motorcycle Accessories", "Motorcycle Repair Service"], group: "What Are You Looking For?" },
  { name: "motorcycleType", label: "Motorcycle Type", type: "select", required: false, options: ["Sports Bike", "Cruiser", "Off-Road / Dirt Bike", "Scooter / Moped", "Delivery Bike", "Electric Motorcycle", "Other"], group: "Motorcycle Details" },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Honda, Yamaha, Suzuki, TVS, Any", group: "Motorcycle Details" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "e.g. Honda CG125, Yamaha YBR, Any", group: "Motorcycle Details" },
  { name: "year", label: "Year", type: "text", required: false, placeholder: "e.g. 2020", group: "Motorcycle Details" },
  { name: "partDescription", label: "Part / Item Description", type: "textarea", required: false, placeholder: "e.g. Front brake pads, Chain and sprocket kit, Side mirrors", group: "Motorcycle Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Used - Fair", "Any"], group: "Motorcycle Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Motorcycle Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements or additional information...", group: "Budget and Urgency" }
];

export const automotiveToolsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the specific tool or equipment you need", group: "Tool Details" },
  { name: "toolType", label: "Tool / Equipment Type", type: "select", required: true, options: ["Diagnostic Scanner / OBD Tool", "Jack / Jack Stands", "Air Compressor", "Impact Wrench / Driver", "Torque Wrench", "Battery Charger / Jump Starter", "Tyre Changer / Balancer", "Engine Hoist / Crane", "Welding Equipment", "Workshop Tool Set", "Other"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Snap-on, Bosch, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 3 ton hydraulic jack, OBD2 compatible scanner", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Personal / Home Use", "Professional Workshop", "Fleet Management", "One-Time Project", "Other"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget and Urgency" }
];

