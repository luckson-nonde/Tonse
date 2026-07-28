import type { FieldSchema } from '../types';

export const lightingLampsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the lighting style or room you want to light", group: "Product Details" },
  { name: "lightingType", label: "Type of Lighting", type: "select", required: true, options: ["Ceiling Light / Chandelier", "Pendant Light", "Wall Light / Sconce", "Floor Lamp", "Table / Desk Lamp", "LED Strip Lights", "Outdoor / Garden Lights", "Solar Lights", "Spotlights / Downlights", "Emergency / Backup Lights", "Other"], group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Office / Study", "Outdoor / Garden", "Commercial Space", "Other"], group: "Product Details" },
  { name: "style", label: "Style Preference", type: "select", required: false, options: ["Modern / Contemporary", "Classic / Traditional", "Industrial", "Minimalist", "Luxury / Crystal", "Rustic / Natural", "No Preference"], group: "Product Details" },
  { name: "lightColor", label: "Light Color", type: "select", required: false, options: ["Warm White", "Cool White / Daylight", "RGB / Color Changing", "Any"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Philips, Any brand", group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need the lighting fitted and installed", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Room dimensions, ceiling height, wattage requirements...", group: "Budget and Urgency" }
];

export const wallArtMirrorsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or look you are going for", group: "Product Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Wall Art / Painting", "Framed Print / Poster", "Mirror", "Wall Sculpture / 3D Art", "Canvas Print", "Photo Frame / Gallery Wall", "African / Cultural Art", "Abstract Art", "Other"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "African / Cultural", "Abstract", "Landscape / Nature", "Geometric", "Minimalist", "Religious / Inspirational", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Earth tones, Black & White, Match my living room", group: "Product Details" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. Large (above 100cm), Medium (60-100cm), Small (under 60cm)", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Bathroom", "Office", "Hallway", "Other"], group: "Product Details" },
  { name: "isCustom", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom commissioned piece", group: "Order Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Wall dimensions, existing decor style, any specific themes...", group: "Budget and Urgency" }
];

export const rugsCarpetsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style or pattern you want", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Area Rug", "Runner Rug", "Wall to Wall Carpet", "Outdoor Rug", "Prayer Mat", "Doormat", "Other"], group: "Product Details" },
  { name: "size", label: "Size / Dimensions", type: "text", required: true, placeholder: "e.g. 2m x 3m, Runner 0.8m x 2.5m, Not sure - whole room", group: "Product Details" },
  { name: "material", label: "Material Preference", type: "select", required: false, options: ["Wool", "Nylon / Synthetic", "Cotton", "Jute / Natural Fibre", "Polypropylene", "Silk / Luxury", "Any"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "Traditional / Oriental", "African / Cultural", "Geometric", "Plain / Solid Color", "Shaggy / Fluffy", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Neutral tones, Blue & Grey, Match my sofa", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Hallway", "Office", "Outdoor", "Other"], group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Traffic level in room, children or pets at home, any specific requirements...", group: "Budget and Urgency" }
];

export const curtainsBlindsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style you want or the window space", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Curtains / Drapes", "Roller Blinds", "Venetian Blinds", "Vertical Blinds", "Roman Blinds", "Sheer / Voile Curtains", "Blackout Curtains", "Both Curtains & Blinds", "Other"], group: "Product Details" },
  { name: "windowDimensions", label: "Window Dimensions", type: "text", required: true, placeholder: "e.g. Width 2m x Drop 2.5m, 3 windows same size", group: "Product Details" },
  { name: "fabric", label: "Fabric / Material", type: "select", required: false, options: ["Blackout / Block Out", "Sheer / Light Filter", "Velvet / Heavy", "Linen / Natural", "Polyester", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. White, Grey, Match my walls", group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Minimalist", "Classic / Traditional", "Patterned / Printed", "Plain / Solid", "No Preference"], group: "Product Details" },
  { name: "quantity", label: "Number of Windows", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need curtains fitted and hung", group: "Order Details" },
  { name: "isCustomMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you need made-to-measure curtains", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Existing curtain rail type, room style, any specific requirements...", group: "Budget and Urgency" }
];

