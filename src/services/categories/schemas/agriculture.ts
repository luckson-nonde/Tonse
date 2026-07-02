import type { FieldSchema } from '../types';

export const poultryFarmingSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your poultry setup or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Day-old chicks", "Broiler Feed", "Layer Feed", "Vaccines (Gumboro/Lasota)", "Feeders & Drinkers", "Brooders", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 500 chicks, 10 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific brands, delivery requirements, etc.", group: "Budget and Preferences" }
];

export const aquacultureSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your pond or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Fingerlings (Tilapia/Catfish)", "Fish Feed (Starter/Finisher)", "Pond Liners", "Water Testing Kits", "Nets", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1000 fingerlings, 5 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific species, pond size, delivery requirements, etc.", group: "Budget and Preferences" }
];

export const cropProductionSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your field or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Maize/Vegetable Seeds", "Fertilizers (D-Compound/Urea)", "Pesticides", "Herbicides", "Sprayers", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of fertilizer, 10kg seeds", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Crop type, field size, specific brands, etc.", group: "Budget and Preferences" }
];

export const livestockVeterinarySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your livestock or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Cattle/Goat Feed", "Salt Licks", "Dewormers", "Veterinary Instruments", "Animal Health Supplements", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of feed, 2 bottles of dewormer", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Animal type, specific health concerns, etc.", group: "Budget and Preferences" }
];

export const irrigationHardwareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Water Pumps (Solar/Petrol)", "Piping", "Shovels", "Rakes", "Fencing Wire", "Greenhouse Materials", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1 solar pump, 100m piping", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm size, water source, specific requirements, etc.", group: "Budget and Preferences" }
];

export const agroTechServicesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or area for service", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Soil Testing Services", "Consulting", "Solar Lighting for Farms", "Drone Spraying", "Other"], group: "Service Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Service Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm location, specific challenges, goals, etc.", group: "Budget and Preferences" }
];

