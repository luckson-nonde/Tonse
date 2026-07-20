import type { FieldSchema } from '../types';

export const fashionSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload inspiration or reference images" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Slim fit suit, Ankara dress" },
  { name: "brand", label: "Preferred Brand", type: "text", required: false, placeholder: "Leave blank if any brand is okay" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. M, L, 32, UK10" },
  { name: "colorPreference", label: "Color", type: "text", required: false, placeholder: "e.g. Navy blue, Any dark color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
];

export const shoesFootwearSchema: FieldSchema[] = [
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
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific style details..." }
];

export const accessoriesJewelrySchema: FieldSchema[] = [
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
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Size, engraving, color details..." }
];

