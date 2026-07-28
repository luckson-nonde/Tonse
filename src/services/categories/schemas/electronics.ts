import type { FieldSchema } from '../types';

export const mobilePhonesBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of what you are looking for" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. iPhone 15 Pro Max" },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. Samsung, Apple, Huawei, Tecno" },
  { name: "model", label: "Model / Spec", type: "text", required: false, keepInExpress: true, placeholder: "e.g. iPhone 15 Pro 256GB, Samsung S24" },
  { name: "storage", label: "Storage / RAM", type: "text", required: false, keepInExpress: true, placeholder: "e.g. 256GB storage, 8GB RAM" },
  { name: "colorPreference", label: "Color Preference", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Midnight Black, Any color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Excellent", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, accessories needed, etc." }
];

export const mobilePhonesRepairSchema: FieldSchema[] = [
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
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
];

export const laptopsBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. MacBook Pro 14-inch" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Laptop", "Desktop PC", "All-in-One PC", "Mini PC", "Workstation"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. HP, Dell, Lenovo, Apple, Any" },
  { name: "processor", label: "Processor", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Intel Core i5, AMD Ryzen 7, Apple M3" },
  { name: "ram", label: "RAM", type: "select", required: false, keepInExpress: true, options: ["4GB", "8GB", "16GB", "32GB", "64GB", "Any"] },
  { name: "storage", label: "Storage", type: "select", required: false, keepInExpress: true, options: ["256GB SSD", "512GB SSD", "1TB SSD", "1TB HDD", "2TB HDD", "Any"] },
  { name: "screenSize", label: "Screen Size", type: "select", required: false, keepInExpress: true, options: ["13 inch", "14 inch", "15.6 inch", "17 inch", "Any size"] },
  { name: "primaryUse", label: "Primary Use", type: "select", required: true, options: ["Office / Business", "Gaming", "Design / Creative", "Programming", "General Use", "School / Student"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Excellent", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Any specific software, accessories, or requirements..." }
];

export const laptopsRepairSchema: FieldSchema[] = [
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
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
];

export const homeAppliancesBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Double Door Refrigerator" },
  { name: "applianceType", label: "Appliance Type", type: "select", required: true, options: ["Refrigerator", "Washing Machine", "Microwave", "Electric Stove", "Air Conditioner", "Water Heater", "Dishwasher", "Vacuum Cleaner", "Iron", "Blender / Mixer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. LG, Samsung, Hisense, Any" },
  { name: "capacity", label: "Size / Capacity", type: "text", required: false, keepInExpress: true, placeholder: "e.g. 300 litre fridge, 7kg washing machine" },
  { name: "powerType", label: "Power Type", type: "select", required: false, options: ["Electric", "Gas", "Solar Compatible", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features, color, or requirements..." }
];

export const homeAppliancesRepairSchema: FieldSchema[] = [
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
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
];

export const audioVideoBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 65 Inch 4K Smart TV" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System / Speakers", "Home Theatre", "Projector", "Camera / DSLR", "Microphone", "Amplifier", "Subwoofer", "Headphones", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Sony, LG, JBL, Any" },
  { name: "specifications", label: "Specifications", type: "text", required: false, keepInExpress: true, placeholder: "e.g. 65 inch 4K TV, 2000W sound system" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features or requirements..." }
];

export const audioVideoRepairSchema: FieldSchema[] = [
  { name: "images", label: "Equipment Photos", type: "image_upload", required: false },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System", "Home Theatre", "Projector", "Camera", "Microphone", "Amplifier", "Other"] },
  { name: "brand", label: "Device Model & Specifications", type: "text", required: true, placeholder: "e.g. Sony, Samsung, LG, Model number" },
  { name: "primarySymptom", label: "Primary Symptom", type: "select", required: true, options: ["Power Issue", "Screen/Display", "Audio/Sound", "Physical Damage", "Software/Update", "Other"], group: "Diagnostic Suite" },
  { name: "deviceState", label: "Current Device State", type: "select", required: true, options: ["Powers on fully", "Powers on (No display)", "Stuck on Logo", "Completely Dead"], group: "Diagnostic Suite" },
  { name: "incidentReport", label: "What happened?", type: "textarea", required: true, placeholder: "e.g., dropped in water, stopped charging after a power surge, screen went black during use...", group: "Diagnostic Suite" },
  { name: "repairHistory", label: "Has this device been opened or repaired before?", type: "toggle", required: false, group: "Diagnostic Suite" },
  { name: "symptoms", label: "Technical Symptoms & Observations", type: "textarea", required: true, placeholder: "e.g. TV screen is black but sound is working" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: true, min: 1, helpText: "Please specify if all items share the same fault in the description." },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
];

export const gamingBuySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. PlayStation 5 Console" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Gaming Console", "Controller", "Game Title / CD", "Headset", "Gaming Chair", "Gaming Monitor", "Memory Card", "Other Accessory"] },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Sony, Microsoft, Nintendo, Razer" },
  { name: "platform", label: "Platform", type: "select", required: true, options: ["PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch", "PC Gaming", "Any / Not Sure"] },
  { name: "specificTitle", label: "Specific Game or Model", type: "text", required: false, keepInExpress: true, placeholder: "e.g. FIFA 25, Spider-Man 2, DualSense Controller" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific version, bundle, or requirements..." }
];

