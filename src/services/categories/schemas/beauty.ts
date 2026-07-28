import type { FieldSchema } from '../types';

export const skincareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload product images if you have a specific product in mind" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Moisturizer", "Serum", "Sunscreen", "Face Wash / Cleanser", "Toner", "Eye Cream", "Face Mask", "Exfoliator / Scrub", "Body Lotion", "Body Wash", "Other"] },
  { name: "skinType", label: "Skin Type", type: "select", required: true, options: ["Oily", "Dry", "Combination", "Sensitive", "Normal", "Not Sure"] },
  { name: "skinConcern", label: "Skin Concern", type: "select", required: false, options: ["Acne / Pimples", "Dark Spots", "Anti-Aging / Wrinkles", "Hyperpigmentation", "Dryness", "Brightening / Glow", "Even Skin Tone", "General Hydration", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. CeraVe, Neutrogena, Black Girl Sunscreen, Any" },
  { name: "preferNatural", label: "Prefer Natural / Organic?", type: "toggle", required: false, helpText: "Toggle if you prefer natural or organic ingredients" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any allergies, ingredients to avoid, or specific needs..." }
];

export const makeupCosmeticsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the look or product you are trying to achieve" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Foundation", "Concealer", "Lipstick / Lip Gloss", "Mascara", "Eyeshadow Palette", "Eyeliner", "Blush / Bronzer", "Setting Powder", "Setting Spray", "Primer", "Makeup Brushes / Tools", "Full Makeup Kit", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. MAC, Fenty Beauty, NYX, Maybelline, Any" },
  { name: "shade", label: "Shade / Color", type: "text", required: false, placeholder: "e.g. NC42, Warm Beige, Red, Nude, Not sure" },
  { name: "skinTone", label: "Skin Tone", type: "select", required: false, options: ["Fair", "Light", "Medium", "Tan", "Deep", "Rich / Dark"] },
  { name: "finish", label: "Finish Preference", type: "select", required: false, options: ["Matte", "Dewy / Glow", "Satin", "Natural", "No Preference"] },
  { name: "isVegan", label: "Vegan / Cruelty Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, occasion, or allergies..." }
];

export const haircareSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or product you have in mind" },
  { name: "serviceOrProduct", label: "What do you need?", type: "select", required: true, options: ["Hair Product", "Hair Service", "Hair Extensions / Weave", "Wigs", "Hair Tools"] },
  { name: "hairType", label: "Hair Type", type: "select", required: false, options: ["Natural / Afro", "Relaxed", "Locs / Dreadlocks", "Braided", "Wavy", "Straight", "Curly"] },
  { name: "productType", label: "Product Type", type: "select", required: false, options: ["Shampoo", "Conditioner", "Hair Oil / Serum", "Edge Control", "Hair Cream / Moisturizer", "Hair Colour / Dye", "Hair Treatment / Mask", "Relaxer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. ORS, Dark & Lovely, Cantu, Any" },
  { name: "hairConcern", label: "Hair Concern", type: "select", required: false, options: ["Hair Growth", "Breakage / Damage", "Dryness", "Dandruff", "Thinning Hair", "General Care"] },
  { name: "preferNatural", label: "Prefer Natural / Chemical Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Hair length, color, any allergies or preferences..." }
];

export const fragrancesSchema: FieldSchema[] = [
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
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any similar scents you like, gift wrapping needed, etc..." }
];

