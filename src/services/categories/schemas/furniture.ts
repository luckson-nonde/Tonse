import type { FieldSchema } from '../types';

export const livingRoomBuySchema: FieldSchema[] = [
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
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

export const livingRoomRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false, helpText: "Photos help technicians assess the repair needed" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Sofa", "Armchair", "Dining Chair", "Ottoman", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Fabric is torn on the left armrest, frame is wobbly" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
];

export const bedroomBuySchema: FieldSchema[] = [
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
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

export const bedroomRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Bed Frame", "Wardrobe", "Chest of Drawers", "Nightstand", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Wardrobe door broken, bed frame creaking, drawer stuck" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
];

export const officeBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Ergonomic Office Chair" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Desk", "Office Chair", "Bookshelf", "Filing Cabinet", "Meeting Table", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Herman Miller, Steelcase, Local" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Wood", "Metal", "Glass", "Mesh (for chairs)", "Any"] },
  { name: "ergonomicFeatures", label: "Ergonomic Features?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

export const officeRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Chair", "Desk", "Cabinet", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Chair wheels broken, desk surface scratched, lock broken" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
];

export const outdoorBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 6-Seater Patio Dining Set" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Patio Set", "Garden Bench", "Sun Lounger", "Swing Chair", "Outdoor Umbrella", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Keter, Lifetime, Custom Wood" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Rattan / Wicker", "Teak / Wood", "Metal / Aluminum", "Plastic", "Any"] },
  { name: "weatherResistant", label: "Weather Resistant?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }
];

export const outdoorRepairSchema: FieldSchema[] = [
  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Rattan Furniture", "Garden Bench", "Umbrella", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Brand, Model, Material" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. Rattan unraveling, wood rot, umbrella mechanism broken" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
];

