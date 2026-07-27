import type { FieldSchema } from '../types';

export const freshProduceSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the produce quality or type you want", group: "Produce Details" },
  { name: "produceType", label: "Type of Produce", type: "select", required: true, options: ["Vegetables", "Fruits", "Herbs & Spices", "Mushrooms", "Mixed Vegetables & Fruits", "Organic Produce", "Other"], group: "Produce Details" },
  { name: "specificItems", label: "Specific Items Needed", type: "textarea", required: true, placeholder: "e.g. 5kg tomatoes, 2kg onions, 1 bunch spinach", group: "Produce Details" },
  { name: "qualityGrade", label: "Quality / Grade", type: "select", required: false, options: ["Premium / Grade A", "Standard / Grade B", "Any Quality", "Organic Only"], group: "Produce Details" },
  { name: "isOrganic", label: "Organic Only?", type: "toggle", required: false, helpText: "Toggle if you strictly require organic produce", group: "Produce Details" },
  { name: "quantity", label: "Approximate Total Quantity", type: "text", required: true, placeholder: "e.g. 10kg mixed vegetables, Weekly supply for family of 5", group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Daily Supply", "Weekly Supply", "Bi-Weekly Supply", "Monthly Supply"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Ripeness preference, packaging requirements, any allergies...", group: "Budget and Urgency" }
];

export const pantryStaplesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific products you are looking for", group: "Product Details" },
  { name: "stapleType", label: "Type of Staple", type: "select", required: true, options: ["Mealie Meal / Maize Flour", "Rice", "Cooking Oil", "Sugar", "Salt & Condiments", "Flour / Baking Ingredients", "Canned / Tinned Foods", "Dried Beans & Legumes", "Pasta & Noodles", "Cereals & Oats", "Tea & Coffee", "Mixed Pantry Items", "Other"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Maize: Roller Meal, Breakfast Meal, Any", group: "Product Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 25kg Roller Meal x2, 5L cooking oil x3, 2kg sugar x4", group: "Product Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale Order"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging size preference, bulk discount requirements...", group: "Budget and Urgency" }
];

export const beveragesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific drinks you are looking for", group: "Beverage Details" },
  { name: "beverageType", label: "Type of Beverage", type: "select", required: true, options: ["Water / Mineral Water", "Soft Drinks / Sodas", "Juices", "Energy Drinks", "Beer / Cider", "Wine", "Spirits / Whiskey", "Traditional Drinks", "Tea & Coffee", "Dairy Drinks / Milk", "Mixed / Variety Pack", "Other"], group: "Beverage Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Coca-Cola, Mosi, Vimto, Any", group: "Beverage Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 24 x 500ml Coke, 2 x 5L water bottles, 1 case Mosi", group: "Beverage Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if beverages are for a party or event", group: "Order Details" },
  { name: "quantity", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Temperature requirements, packaging preferences, any specific needs...", group: "Budget and Urgency" }
];

export const snacksSweetsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific snacks you are looking for", group: "Snack Details" },
  { name: "snackType", label: "Type of Snack", type: "select", required: true, options: ["Crisps / Chips", "Biscuits / Cookies", "Chocolates / Sweets", "Nuts & Dried Fruits", "Popcorn", "Local / Traditional Snacks", "Cakes & Pastries", "Sweets / Candy", "Healthy Snacks", "Mixed / Variety", "Other"], group: "Snack Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Simba, Cadbury, Lay's, Any", group: "Snack Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 10 x Simba chips, 5 x Cadbury Dairy Milk, Mixed sweets 2kg", group: "Snack Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if snacks are for a party or event", group: "Order Details" },
  { name: "quantity", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, options: ["None", "Halal Only", "Vegetarian", "Vegan", "Gluten Free", "Sugar Free / Diabetic Friendly", "Nut Free"], group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging preferences, gift wrapping needed, any allergies...", group: "Budget and Urgency" }
];

