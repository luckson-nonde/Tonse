# Dynamic Form Schemas

This document contains a full breakdown of all the dynamic form schemas defined in the application.

## GENERIC_FALLBACK_SCHEMA

```typescript
const GENERIC_FALLBACK_SCHEMA: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "Describe the product or service" },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Samsung, Nike, Any brand" },
  { name: "description", label: "Details", type: "textarea", required: false, placeholder: "Any specific requirements..." },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["ASAP (Same day)", "Within 3 days", "Within a week", "Flexible / No rush"] }

];
```

## mobilePhonesBuySchema

```typescript
const mobilePhonesBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of what you are looking for" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. iPhone 15 Pro Max" },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. Samsung, Apple, Huawei, Tecno" },
  { name: "model", label: "Model / Spec", type: "text", required: false, placeholder: "e.g. iPhone 15 Pro 256GB, Samsung S24" },
  { name: "storage", label: "Storage / RAM", type: "text", required: false, placeholder: "e.g. 256GB storage, 8GB RAM" },
  { name: "colorPreference", label: "Color Preference", type: "text", required: false, placeholder: "e.g. Midnight Black, Any color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Excellent", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, accessories needed, etc." }

];
```

## mobilePhonesRepairSchema

```typescript
const mobilePhonesRepairSchema: FieldSchema[] = [

  { name: "images", label: "Device Photos", type: "image_upload", required: false, helpText: "Photos help technicians diagnose the issue faster" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Smartphone", "Tablet", "Smartwatch", "Feature Phone", "Accessory"] },
  { name: "brand", label: "Device Brand", type: "text", required: true, placeholder: "e.g. Samsung, Apple, Huawei" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "e.g. iPhone 13, Galaxy A54" },
  { name: "problemCategory", label: "Problem Category", type: "select", required: true, options: ["Hardware issue", "Software issue", "Physical damage", "Battery / Charging", "Screen", "Water damage", "Sound / Speaker", "Other"] },
  { name: "symptoms", label: "Specific Symptoms", type: "textarea", required: true, placeholder: "e.g. Won't turn on, screen cracked, battery drains fast, phone gets hot, no sound" },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "dataCritical", label: "Is Data on Device Critical?", type: "toggle", required: false, helpText: "Toggle if you have important files that must be saved" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## laptopsBuySchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Any specific software, accessories, or requirements..." }

];
```

## laptopsRepairSchema

```typescript
const laptopsRepairSchema: FieldSchema[] = [

  { name: "images", label: "Device Photos", type: "image_upload", required: false, helpText: "Clear photos help technicians assess the damage" },
  { name: "deviceType", label: "Device Type", type: "select", required: true, options: ["Laptop", "Desktop PC", "All-in-One PC", "Monitor"] },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. HP, Dell, Lenovo, Apple" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "e.g. HP Pavilion 15, MacBook Pro 2021" },
  { name: "problemCategory", label: "Problem Category", type: "select", required: true, options: ["Software issue", "Hardware failure", "Physical damage", "Both", "Not sure"] },
  { name: "symptoms", label: "Specific Symptoms", type: "textarea", required: true, placeholder: "e.g. Won't turn on, very slow, screen cracked, keyboard not working, overheating" },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "dataRecoveryNeeded", label: "Data Recovery Needed?", type: "toggle", required: false, helpText: "Toggle if you need files recovered from the device" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## homeAppliancesBuySchema

```typescript
const homeAppliancesBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Double Door Refrigerator" },
  { name: "applianceType", label: "Appliance Type", type: "select", required: true, options: ["Refrigerator", "Washing Machine", "Microwave", "Electric Stove", "Air Conditioner", "Water Heater", "Dishwasher", "Vacuum Cleaner", "Iron", "Blender / Mixer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. LG, Samsung, Hisense, Any" },
  { name: "capacity", label: "Size / Capacity", type: "text", required: false, placeholder: "e.g. 300 litre fridge, 7kg washing machine" },
  { name: "powerType", label: "Power Type", type: "select", required: false, options: ["Electric", "Gas", "Solar Compatible", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features, color, or requirements..." }

];
```

## homeAppliancesRepairSchema

```typescript
const homeAppliancesRepairSchema: FieldSchema[] = [

  { name: "images", label: "Appliance Photos", type: "image_upload", required: false, helpText: "Photos help technicians diagnose the issue faster" },
  { name: "applianceType", label: "Appliance Type", type: "select", required: true, options: ["Refrigerator", "Washing Machine", "Microwave", "Electric Stove", "Air Conditioner", "Water Heater", "Dishwasher", "Vacuum Cleaner", "Iron", "Blender / Mixer", "Other"] },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. LG, Samsung, Hisense" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "e.g. GR-B247SLUV" },
  { name: "problemType", label: "Problem Type", type: "select", required: true, options: ["Won't turn on", "Not heating / cooling", "Leaking / Water issue", "Strange noise / Vibration", "Electrical fault / Sparks", "Performance degraded", "Other"] },
  { name: "symptoms", label: "Describe Symptoms", type: "textarea", required: true, placeholder: "e.g. Fridge is making a loud buzzing sound and not cooling" },
  { name: "applianceAge", label: "How Old is the Appliance?", type: "select", required: false, options: ["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years", "Not sure"] },
  { name: "warrantyStatus", label: "Still Under Warranty?", type: "toggle", required: false },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## audioVideoBuySchema

```typescript
const audioVideoBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 65 Inch 4K Smart TV" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System / Speakers", "Home Theatre", "Projector", "Camera / DSLR", "Microphone", "Amplifier", "Subwoofer", "Headphones", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Sony, LG, JBL, Any" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 65 inch 4K TV, 2000W sound system" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific features or requirements..." }

];
```

## audioVideoRepairSchema

```typescript
const audioVideoRepairSchema: FieldSchema[] = [

  { name: "images", label: "Equipment Photos", type: "image_upload", required: false },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Television", "Sound System", "Home Theatre", "Projector", "Camera", "Microphone", "Amplifier", "Other"] },
  { name: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. Sony, Samsung, LG" },
  { name: "model", label: "Model", type: "text", required: false, placeholder: "Model number if known" },
  { name: "problemType", label: "Problem Type", type: "select", required: true, options: ["No power / Won't turn on", "No sound", "No picture / Video", "Intermittent signal", "Physical damage", "Connection issue", "Other"] },
  { name: "symptoms", label: "Describe Symptoms", type: "textarea", required: true, placeholder: "e.g. TV screen is black but sound is working" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## gamingBuySchema

```typescript
const gamingBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. PlayStation 5 Console" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Gaming Console", "Controller", "Game Title / CD", "Headset", "Gaming Chair", "Gaming Monitor", "Memory Card", "Other Accessory"] },
  { name: "brand", label: "Brand", type: "text", required: false, placeholder: "e.g. Sony, Microsoft, Nintendo, Razer" },
  { name: "platform", label: "Platform", type: "select", required: true, options: ["PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch", "PC Gaming", "Any / Not Sure"] },
  { name: "specificTitle", label: "Specific Game or Model", type: "text", required: false, placeholder: "e.g. FIFA 25, Spider-Man 2, DualSense Controller" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Used - Fair", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific version, bundle, or requirements..." }

];
```

## entertainmentPerformersSchema

```typescript
const entertainmentPerformersSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos / Portfolio", type: "image_upload", required: false, group: "Performance Requirements" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Concert", "Festival", "Private Party", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "duration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 24, group: "Event Details" },
  { name: "venueLocation", label: "Venue Location", type: "text", required: true, placeholder: "e.g. Lusaka, Levy Mall", group: "Event Details" },
  { name: "guestCount", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "performanceType", label: "Performance Type", type: "select", required: true, options: ["Live Band", "DJ", "Solo Artist", "MC/Host", "Dancer", "Comedian", "Public Speaker", "Influencer", "Spoken Word", "Other"], group: "Performance Requirements" },
  { name: "musicGenre", label: "Music Genre", type: "select", required: false, options: ["Afrobeats", "Zambian Music", "Gospel", "RnB/Soul", "Hip Hop", "Jazz", "Classical", "Pop", "Any"], group: "Performance Requirements" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Terms", helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequests", label: "Special Requirements", type: "textarea", required: false, placeholder: "Any special requests or rider requirements...", group: "Budget & Terms" }

];
```

## venuesClubsSchema

```typescript
const venuesClubsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "venueType", label: "Venue Type", type: "select", required: true, options: ["Nightclub", "Conference Hall", "Garden / Outdoor Venue", "Restaurant / Private Dining", "Hotel Ballroom", "Other"] },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Conference", "Exhibition", "Private Party", "Other"] },
  { name: "eventDate", label: "Event Date", type: "date", required: true },
  { name: "guestCount", label: "Expected Guests", type: "number", required: true, min: 1 },
  { name: "amenitiesNeeded", label: "Amenities Needed", type: "textarea", required: false, placeholder: "e.g. Sound system, Projector, Catering, Bar service, Security" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false, placeholder: "Parking, accessibility, early setup..." }

];
```

## equipmentRentalCoreSchema

```typescript
const equipmentRentalCoreSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, group: "Core Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate", "Birthday", "Festival", "Exhibition", "Conference", "Funeral", "Other"], group: "Core Details" },
  { name: "guestCount", label: "Estimated Guest Count", type: "number", required: true, placeholder: "e.g. 200 guests", group: "Core Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Core Details" },
  { name: "duration", label: "Rental Duration (days)", type: "counter", required: true, min: 1, group: "Core Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Core Details", helpText: "Optional - leave blank to receive price offers" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Core Details" }

];
```

## equipmentRentalSchema

```typescript
const equipmentRentalSchema: FieldSchema[] = [

  ...equipmentRentalCoreSchema

];
```

## fashionSchema

```typescript
const fashionSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload inspiration or reference images" },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Slim fit suit, Ankara dress" },
  { name: "brand", label: "Preferred Brand", type: "text", required: false, placeholder: "Leave blank if any brand is okay" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. M, L, 32, UK10" },
  { name: "colorPreference", label: "Color", type: "text", required: false, placeholder: "e.g. Navy blue, Any dark color" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }

];
```

## shoesFootwearSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific style details..." }

];
```

## accessoriesJewelrySchema

```typescript
const accessoriesJewelrySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload inspiration or reference images" },
  { name: "accessoryType", label: "Type", type: "select", required: true, options: ["Necklace", "Ring", "Bracelet", "Earrings", "Watch", "Belt", "Handbag", "Wallet", "Sunglasses", "Hat / Cap", "Scarf", "Other"] },
  { name: "material", label: "Material", type: "select", required: false, options: ["Gold", "Silver", "Rose Gold", "Platinum", "Leather", "Fabric", "Beaded", "Any"] },
  { name: "gender", label: "For Who?", type: "select", required: true, options: ["Men", "Women", "Unisex", "Child"] },
  { name: "occasion", label: "Occasion", type: "select", required: false, options: ["Everyday Wear", "Wedding", "Corporate / Formal", "Party", "Gift", "Any"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Gucci, Local brand, Any" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Size, engraving, color details..." }

];
```

## skincareSchema

```typescript
const skincareSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload product images if you have a specific product in mind" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Moisturizer", "Serum", "Sunscreen", "Face Wash / Cleanser", "Toner", "Eye Cream", "Face Mask", "Exfoliator / Scrub", "Body Lotion", "Body Wash", "Other"] },
  { name: "skinType", label: "Skin Type", type: "select", required: true, options: ["Oily", "Dry", "Combination", "Sensitive", "Normal", "Not Sure"] },
  { name: "skinConcern", label: "Skin Concern", type: "select", required: false, options: ["Acne / Pimples", "Dark Spots", "Anti-Aging / Wrinkles", "Hyperpigmentation", "Dryness", "Brightening / Glow", "Even Skin Tone", "General Hydration", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. CeraVe, Neutrogena, Black Girl Sunscreen, Any" },
  { name: "preferNatural", label: "Prefer Natural / Organic?", type: "toggle", required: false, helpText: "Toggle if you prefer natural or organic ingredients" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any allergies, ingredients to avoid, or specific needs..." }

];
```

## makeupCosmeticsSchema

```typescript
const makeupCosmeticsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the look or product you are trying to achieve" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Foundation", "Concealer", "Lipstick / Lip Gloss", "Mascara", "Eyeshadow Palette", "Eyeliner", "Blush / Bronzer", "Setting Powder", "Setting Spray", "Primer", "Makeup Brushes / Tools", "Full Makeup Kit", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. MAC, Fenty Beauty, NYX, Maybelline, Any" },
  { name: "shade", label: "Shade / Color", type: "text", required: false, placeholder: "e.g. NC42, Warm Beige, Red, Nude, Not sure" },
  { name: "skinTone", label: "Skin Tone", type: "select", required: false, options: ["Fair", "Light", "Medium", "Tan", "Deep", "Rich / Dark"] },
  { name: "finish", label: "Finish Preference", type: "select", required: false, options: ["Matte", "Dewy / Glow", "Satin", "Natural", "No Preference"] },
  { name: "isVegan", label: "Vegan / Cruelty Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, occasion, or allergies..." }

];
```

## haircareSchema

```typescript
const haircareSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or product you have in mind" },
  { name: "serviceOrProduct", label: "What do you need?", type: "select", required: true, options: ["Hair Product", "Hair Service", "Hair Extensions / Weave", "Wigs", "Hair Tools"] },
  { name: "hairType", label: "Hair Type", type: "select", required: false, options: ["Natural / Afro", "Relaxed", "Locs / Dreadlocks", "Braided", "Wavy", "Straight", "Curly"] },
  { name: "productType", label: "Product Type", type: "select", required: false, options: ["Shampoo", "Conditioner", "Hair Oil / Serum", "Edge Control", "Hair Cream / Moisturizer", "Hair Colour / Dye", "Hair Treatment / Mask", "Relaxer", "Other"] },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. ORS, Dark & Lovely, Cantu, Any" },
  { name: "hairConcern", label: "Hair Concern", type: "select", required: false, options: ["Hair Growth", "Breakage / Damage", "Dryness", "Dandruff", "Thinning Hair", "General Care"] },
  { name: "preferNatural", label: "Prefer Natural / Chemical Free?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Hair length, color, any allergies or preferences..." }

];
```

## fragrancesSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any similar scents you like, gift wrapping needed, etc..." }

];
```

## livingRoomBuySchema

```typescript
const livingRoomBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. L-Shaped Leather Sofa" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Sofa / Couch", "Coffee Table", "TV Stand / Unit", "Armchair", "Bookshelf", "Sideboard", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Ashley, IKEA, Local Artisan" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Fabric", "Leather", "Wood", "Metal", "Glass", "Any"] },
  { name: "dimensions", label: "Dimensions", type: "text", required: false, placeholder: "e.g. 2m x 1.5m or any size" },
  { name: "colorFinish", label: "Color / Finish", type: "text", required: false, placeholder: "e.g. Walnut brown, Matte black" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }

];
```

## livingRoomRepairSchema

```typescript
const livingRoomRepairSchema: FieldSchema[] = [

  { name: "images", label: "Item Photos", type: "image_upload", required: false, helpText: "Photos help technicians assess the repair needed" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Sofa", "Armchair", "Dining Chair", "Ottoman", "Other"] },
  { name: "damageType", label: "Damage Type", type: "select", required: true, options: ["Torn / Ripped upholstery", "Broken frame or legs", "Springs visible / Poking", "Stain or discoloration", "General wear / Fading", "Saggy cushions", "Other"] },
  { name: "symptoms", label: "Describe the Problem", type: "textarea", required: true, placeholder: "e.g. Fabric is torn on the left armrest, frame is wobbly" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## bedroomBuySchema

```typescript
const bedroomBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Queen Size Bed with Headboard" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Bed Frame", "Mattress", "Wardrobe", "Chest of Drawers", "Nightstand / Bedside Table", "Dressing Table", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Slumberland, Restonic, Custom" },
  { name: "size", label: "Size", type: "select", required: false, options: ["Single", "Double", "Queen", "King", "Super King", "Any"] },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Wood", "Metal", "Upholstered", "Any"] },
  { name: "colorFinish", label: "Color / Finish", type: "text", required: false, placeholder: "e.g. White, Oak, Dark Grey" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom crafted piece" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }

];
```

## bedroomRepairSchema

```typescript
const bedroomRepairSchema: FieldSchema[] = [

  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Bed Frame", "Wardrobe", "Chest of Drawers", "Nightstand", "Other"] },
  { name: "damageType", label: "Damage Type", type: "select", required: true, options: ["Broken slats (bed)", "Wobbling / Unstable", "Drawer stuck / Broken", "Wood damage (cracks, splitting)", "Stain / Discoloration", "Hardware missing / Broken", "Other"] },
  { name: "symptoms", label: "Describe the Problem", type: "textarea", required: true, placeholder: "e.g. Wardrobe door broken, bed frame creaking, drawer stuck" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## officeBuySchema

```typescript
const officeBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Ergonomic Office Chair" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Desk", "Office Chair", "Bookshelf", "Filing Cabinet", "Meeting Table", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Herman Miller, Steelcase, Local" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Wood", "Metal", "Glass", "Mesh (for chairs)", "Any"] },
  { name: "ergonomicFeatures", label: "Ergonomic Features?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "customMade", label: "Custom Made?", type: "toggle", required: false },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }

];
```

## officeRepairSchema

```typescript
const officeRepairSchema: FieldSchema[] = [

  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Office Chair", "Desk", "Cabinet", "Other"] },
  { name: "damageType", label: "Damage Type", type: "select", required: true, options: ["Chair wheels broken", "Desk surface scratched", "Lock broken", "Wobbling / Unstable", "Hardware missing / Broken", "Other"] },
  { name: "symptoms", label: "Describe the Problem", type: "textarea", required: true, placeholder: "e.g. Chair wheels broken, desk surface scratched, lock broken" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## outdoorBuySchema

```typescript
const outdoorBuySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. 6-Seater Patio Dining Set" },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Patio Set", "Garden Bench", "Sun Lounger", "Swing Chair", "Outdoor Umbrella", "Other"] },
  { name: "brand", label: "Brand / Manufacturer", type: "text", required: false, placeholder: "e.g. Keter, Lifetime, Custom Wood" },
  { name: "material", label: "Preferred Material", type: "select", required: false, options: ["Rattan / Wicker", "Teak / Wood", "Metal / Aluminum", "Plastic", "Any"] },
  { name: "weatherResistant", label: "Weather Resistant?", type: "toggle", required: false },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false }

];
```

## outdoorRepairSchema

```typescript
const outdoorRepairSchema: FieldSchema[] = [

  { name: "images", label: "Item Photos", type: "image_upload", required: false },
  { name: "itemType", label: "Item Type", type: "select", required: true, options: ["Rattan Furniture", "Garden Bench", "Umbrella", "Other"] },
  { name: "damageType", label: "Damage Type", type: "select", required: true, options: ["Rattan unraveling", "Wood rot", "Umbrella mechanism broken", "Wobbling / Unstable", "Hardware missing / Broken", "Other"] },
  { name: "symptoms", label: "Describe the Problem", type: "textarea", required: true, placeholder: "e.g. Rattan unraveling, wood rot, umbrella mechanism broken" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "budget", label: "Maximum Repair Budget (ZMW)", type: "currency", required: false, helpText: "Optional - helps shops decide if repair is viable for you" }

];
```

## carPartsNewSchema

```typescript
const carPartsNewSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Photos of the part or your car's license disc help shops match the part" },
  { name: "title", label: "What part are you looking for?", type: "text", required: true, placeholder: "e.g. Front Brake Pads" },
  { name: "carMake", label: "Car Make", type: "text", required: true, placeholder: "e.g. Toyota, Nissan, Ford" },
  { name: "carModel", label: "Car Model", type: "text", required: true, placeholder: "e.g. Corolla, Navara, Ranger" },
  { name: "year", label: "Year of Manufacture", type: "number", required: true, min: 1950, max: 2026 },
  { name: "engineSize", label: "Engine Size / Code", type: "text", required: false, placeholder: "e.g. 1.8L, 2JZ-GTE" },
  { name: "partNumber", label: "Part Number (if known)", type: "text", required: false, placeholder: "e.g. 04465-02220" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] }

];
```

## carPartsBreakersSchema

```typescript
const carPartsBreakersSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Car breakers are individuals or companies that buy vehicles that were in an accident and sell parts from them." },
  { name: "title", label: "What are you looking for?", type: "text", required: true, placeholder: "e.g. Used Door, Engine Block, Gearbox" },
  { name: "carMake", label: "Car Make", type: "text", required: true, placeholder: "e.g. Toyota, Nissan, Ford" },
  { name: "carModel", label: "Car Model", type: "text", required: true, placeholder: "e.g. Corolla, Navara, Ranger" },
  { name: "year", label: "Year of Manufacture", type: "number", required: true, min: 1950, max: 2026 },
  { name: "engineSize", label: "Engine Size / Code", type: "text", required: false, placeholder: "e.g. 1.8L, 2JZ-GTE" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"] },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Describe the part and its condition requirements" }

];
```

## carAccessoriesSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific color, size, compatibility requirements...", group: "Budget & Urgency" }

];
```

## carBreakdownRecoverySchema

```typescript
const carBreakdownRecoverySchema: FieldSchema[] = [

  { name: "images", label: "Vehicle Photos", type: "image_upload", required: false, helpText: "Photos of the breakdown situation help providers prepare the right equipment", group: "Vehicle Details" },
  { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "e.g. Toyota, BMW, Ford", group: "Vehicle Details" },
  { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "e.g. Hilux, X5, Ranger", group: "Vehicle Details" },
  { name: "vehicleYear", label: "Year", type: "text", required: false, placeholder: "e.g. 2018", group: "Vehicle Details" },
  { name: "vehicleColor", label: "Vehicle Color", type: "text", required: false, placeholder: "e.g. White, Silver, Black", group: "Vehicle Details" },
  { name: "breakdownType", label: "Type of Breakdown", type: "select", required: true, options: ["Flat Tyre / Puncture", "Dead Battery / Jump Start Needed", "Engine Failure / Won't Start", "Accident / Collision", "Out of Fuel", "Overheating", "Transmission / Gearbox", "Locked Out of Vehicle", "Other"], group: "Breakdown Details" },
  { name: "currentLocation", label: "Current Vehicle Location", type: "text", required: true, placeholder: "e.g. Great East Road near Arcades, Kafue Road km 10", group: "Breakdown Details" },
  { name: "destinationLocation", label: "Destination (if towing needed)", type: "text", required: false, placeholder: "e.g. Nearest garage, Home address", group: "Breakdown Details" },
  { name: "serviceNeeded", label: "Service Needed", type: "select", required: true, options: ["Towing to Garage", "Roadside Repair / Fix on Spot", "Jump Start Only", "Tyre Change Only", "Fuel Delivery", "Not Sure - Need Assessment"], group: "Breakdown Details" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Within 1 hour", "Within a few hours", "Today", "Not Urgent"], group: "Breakdown Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other relevant information about the breakdown situation...", group: "Budget" }

];
```

## motorcyclesPartsSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements or additional information...", group: "Budget & Urgency" }

];
```

## automotiveToolsSchema

```typescript
const automotiveToolsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the specific tool or equipment you need", group: "Tool Details" },
  { name: "toolType", label: "Tool / Equipment Type", type: "select", required: true, options: ["Diagnostic Scanner / OBD Tool", "Jack / Jack Stands", "Air Compressor", "Impact Wrench / Driver", "Torque Wrench", "Battery Charger / Jump Starter", "Tyre Changer / Balancer", "Engine Hoist / Crane", "Welding Equipment", "Workshop Tool Set", "Other"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Snap-on, Bosch, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 3 ton hydraulic jack, OBD2 compatible scanner", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Personal / Home Use", "Professional Workshop", "Fleet Management", "One-Time Project", "Other"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget & Urgency" }

];
```

## eventManagementSchema

```typescript
const eventManagementSchema: FieldSchema[] = [

  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload mood board or theme inspiration images", group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Conference", "Birthday Party", "Graduation", "Product Launch", "Funeral / Memorial", "Fundraiser / Gala", "Festival", "Baby Shower", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "eventDuration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 72, group: "Event Overview" },
  { name: "guestCount", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "venueLocation", label: "Event Location / Venue", type: "text", required: true, placeholder: "e.g. Lusaka, Heroes Stadium, Radisson Blu Hotel", group: "Event Overview" },
  { name: "servicesNeeded", label: "Services Required", type: "select", required: true, options: ["Full Event Management", "Partial Coordination Only", "Day-Of Coordination Only", "Planning & Vendor Sourcing", "Not Sure - Need Consultation"], group: "Services Required" },
  { name: "cateringRequired", label: "Catering Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "decorRequired", label: "Decor & Styling Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "entertainmentRequired", label: "Entertainment Required?", type: "toggle", required: false, group: "Services Required" },
  { name: "photographyRequired", label: "Photography / Videography?", type: "toggle", required: false, group: "Services Required" },
  { name: "theme", label: "Event Theme", type: "text", required: false, placeholder: "e.g. Black & Gold, Garden Party, Rustic, Traditional", group: "Theme & Style" },
  { name: "budget", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, cultural considerations, or special requests...", group: "Budget & Timeline" }

];
```

## eventCateringSchema

```typescript
const eventCateringSchema: FieldSchema[] = [

  { name: "images", label: "Food Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of food styles or presentation you prefer", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday Party", "Graduation", "Funeral / Memorial", "Conference", "Baby Shower", "Private Dinner", "Festival / Outdoor", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "guestCount", label: "Number of Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "venueLocation", label: "Event Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, specific venue name", group: "Event Details" },
  { name: "serviceStyle", label: "Service Style", type: "select", required: true, options: ["Buffet", "Plated / Sit Down", "Cocktail / Finger Foods", "Food Stations", "Box Meals", "BBQ / Braai", "Not Sure"], group: "Catering Requirements" },
  { name: "cuisineType", label: "Cuisine Preference", type: "select", required: false, options: ["Zambian / African Traditional", "International / Continental", "Indian", "Chinese", "Italian", "Mixed / Variety", "No Preference"], group: "Catering Requirements" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, options: ["None", "Vegetarian Options Needed", "Vegan Options Needed", "Halal Only", "Gluten Free", "Multiple Requirements"], group: "Catering Requirements" },
  { name: "drinksIncluded", label: "Drinks / Beverages Included?", type: "toggle", required: false, group: "Catering Requirements" },
  { name: "staffRequired", label: "Serving Staff Required?", type: "toggle", required: false, helpText: "Toggle if you need waiters and serving staff provided", group: "Catering Requirements" },
  { name: "equipmentRequired", label: "Equipment / Crockery Included?", type: "toggle", required: false, helpText: "Plates, cutlery, chafing dishes etc.", group: "Catering Requirements" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "budgetType", label: "Budget Type", type: "select", required: false, options: ["Total Budget for Event", "Per Person / Per Head", "Not Sure"], group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Menu preferences, allergies, cultural food requirements...", group: "Budget" }

];
```

## eventPlanningSchema

```typescript
const eventPlanningSchema: FieldSchema[] = [

  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday", "Graduation", "Fundraiser", "Religious Event", "Product Launch", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "guestCount", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "eventLocation", label: "Event Location", type: "text", required: true, placeholder: "City or specific venue", group: "Event Overview" },
  { name: "planningStage", label: "Current Planning Stage", type: "select", required: true, options: ["Just Starting - Need Full Help", "Have Venue - Need Other Vendors", "Have Most Vendors - Need Coordinator", "Need Day-Of Management Only"], group: "Planning Needs" },
  { name: "vendorsNeeded", label: "Vendors Still Needed", type: "select", required: false, options: ["Venue", "Catering", "Decor", "Photography", "Entertainment", "Transportation", "Cake", "All of the above", "Not Sure"], group: "Planning Needs" },
  { name: "theme", label: "Event Theme / Style", type: "text", required: false, placeholder: "e.g. Elegant Gold, Traditional Zambian, Modern Minimalist", group: "Planning Needs" },
  { name: "budget", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific vision, cultural requirements, or special requests...", group: "Budget & Timeline" }

];
```

## eventDecorSchema

```typescript
const eventDecorSchema: FieldSchema[] = [

  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload photos of decor styles you love - this is very helpful", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday Party", "Corporate Event", "Graduation", "Baby Shower", "Bridal Shower", "Funeral / Memorial", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "venueLocation", label: "Venue / Location", type: "text", required: true, placeholder: "e.g. Lusaka, specific venue", group: "Event Details" },
  { name: "guestCount", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "decorStyle", label: "Decor Style", type: "select", required: true, options: ["Elegant / Luxury", "Traditional / Cultural", "Modern / Minimalist", "Rustic / Natural", "Floral / Garden", "Themed / Specific Concept", "Not Sure - Open to Ideas"], group: "Decor Requirements" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Gold & White, Navy & Blush, Not decided", group: "Decor Requirements" },
  { name: "decorElements", label: "Decor Elements Needed", type: "select", required: false, options: ["Full Venue Decor", "Table Centerpieces Only", "Backdrop / Stage Only", "Floral Arrangements", "Lighting & Ambiance", "Chair Covers & Sashes", "Balloon Installations", "Complete Package"], group: "Decor Requirements" },
  { name: "setupRequired", label: "Setup & Breakdown Required?", type: "toggle", required: false, helpText: "Toggle if you need the decorator to set up and pack down after the event", group: "Decor Requirements" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "urgency", label: "How Soon?", type: "select", required: true, options: ["Less than 2 weeks", "2 weeks - 1 month", "1 - 3 months", "More than 3 months"], group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific flowers, cultural elements, any must-haves...", group: "Budget" }

];
```

## buildingMaterialsSchema

```typescript
const buildingMaterialsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the materials or project reference", group: "Project Details" },
  { name: "projectType", label: "Type of Project", type: "select", required: true, options: ["New House Construction", "Renovation / Remodeling", "Extension / Addition", "Commercial Building", "Boundary Wall / Fence", "Roofing Project", "Flooring Project", "Other"], group: "Project Details" },
  { name: "materialType", label: "Material Needed", type: "select", required: true, options: ["Cement / Concrete", "Bricks / Blocks", "Sand & Aggregates", "Steel / Iron Bars / Rebar", "Roofing Sheets / Tiles", "Timber / Wood", "Glass", "Paint & Finishes", "Tiles / Flooring", "Insulation Materials", "Multiple Materials", "Other"], group: "Material Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Zambezi Portland, Any brand", group: "Material Details" },
  { name: "specifications", label: "Specifications / Grade", type: "text", required: false, placeholder: "e.g. 42.5N cement, 6mm rebar, 600x600 tiles", group: "Material Details" },
  { name: "quantity", label: "Quantity", type: "text", required: true, placeholder: "e.g. 50 bags, 1000 bricks, 20 sheets", group: "Material Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Delivery & Timeline" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Project size, site access, any specific requirements...", group: "Budget & Urgency" }

];
```

## plumbingFixturesSchema

```typescript
const plumbingFixturesSchema: FieldSchema[] = [

  { name: "images", label: "Photos", type: "image_upload", required: false, helpText: "Photos of the problem area or fixture you need", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Plumbing Repair Service", "Plumbing Installation", "Supply of Plumbing Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Pipe Repair / Replacement", "Tap / Faucet Installation", "Toilet Installation / Repair", "Shower / Bathtub Installation", "Water Heater / Geyser", "Water Tank Installation", "Drainage / Sewer", "Borehole Pump / Water Pump", "General Plumbing", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial", "Other"], group: "Service Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Chilanga, Kitwe", group: "Service Details" },
  { name: "issueDescription", label: "Describe the Issue or Requirement", type: "textarea", required: true, placeholder: "e.g. Burst pipe in kitchen, Need new toilet installed, Water not reaching upper floor", group: "Service Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other details that would help the provider...", group: "Budget & Urgency" }

];
```

## electricalSuppliesSchema

```typescript
const electricalSuppliesSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the electrical work area or materials needed", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Electrical Repair Service", "New Installation", "Supply of Electrical Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Wiring / Rewiring", "DB Board / Circuit Breaker", "Solar Panel Installation", "Inverter / Battery Backup", "Security Lighting", "CCTV Installation", "Generator Installation", "Electrical Fault Finding", "Light Fitting Installation", "Power Outlet / Socket", "Other"], group: "Work Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial / Factory", "Other"], group: "Work Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Work Details" },
  { name: "issueDescription", label: "Describe the Work Required", type: "textarea", required: true, placeholder: "e.g. Rewire 3 bedroom house, Install solar system 5KVA, Fix electrical fault in kitchen", group: "Work Details" },
  { name: "materialsRequired", label: "Materials Required?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply materials", group: "Work Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Property size, number of rooms, existing electrical setup...", group: "Budget & Urgency" }

];
```

## hardwareToolsSchema

```typescript
const hardwareToolsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the tool or hardware you need", group: "Tool Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Hand Tools", "Power Tools", "Safety Equipment / PPE", "Fasteners / Fixings", "Adhesives / Sealants", "Painting Tools & Equipment", "Measuring Tools", "Ladders & Access Equipment", "Storage / Toolboxes", "Other Hardware"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Makita, Bosch, Stanley, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 18V cordless drill, 5 metre tape measure", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Home / DIY Use", "Professional / Trade Use", "Construction Site", "Workshop", "One-Time Project"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget & Urgency" }

];
```

## constructionMachinerySchema

```typescript
const constructionMachinerySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the machinery or project site", group: "Machinery Details" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Hire / Rent Machinery", "Purchase Machinery", "Machinery Operator Only", "Machinery with Operator"], group: "Machinery Details" },
  { name: "machineryType", label: "Type of Machinery", type: "select", required: true, options: ["Excavator / Digger", "Bulldozer", "Grader", "Tipper Truck", "Concrete Mixer", "Crane", "Forklift", "Compactor / Roller", "Generator", "Scaffolding", "Concrete Pump", "Other"], group: "Machinery Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "projectLocation", label: "Project / Site Location", type: "text", required: true, placeholder: "e.g. Lusaka, Kafue, Ndola", group: "Project Details" },
  { name: "projectDescription", label: "Project Description", type: "textarea", required: true, placeholder: "e.g. Excavation for foundation of 4 bedroom house, Road grading 2km stretch", group: "Project Details" },
  { name: "rentalDuration", label: "Duration Needed", type: "select", required: false, options: ["Half Day", "Full Day", "2 - 3 Days", "1 Week", "2 Weeks", "1 Month", "More than 1 Month"], group: "Project Details" },
  { name: "operatorRequired", label: "Operator Required?", type: "toggle", required: false, helpText: "Toggle if you need a qualified operator provided with the machinery", group: "Project Details" },
  { name: "equipmentTransfer", label: "Equipment Handover", type: "select", required: true, options: ["I will collect from your yard (standard)", "Deliver to my site (additional transport fee)", "Operator brings to site (included with operator service)"], group: "Project Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within 3 days", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Site access details, soil type, project scope, any special requirements...", group: "Budget & Urgency" }

];
```

## freshProduceSchema

```typescript
const freshProduceSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the produce quality or type you want", group: "Produce Details" },
  { name: "produceType", label: "Type of Produce", type: "select", required: true, options: ["Vegetables", "Fruits", "Herbs & Spices", "Mushrooms", "Mixed Vegetables & Fruits", "Organic Produce", "Other"], group: "Produce Details" },
  { name: "specificItems", label: "Specific Items Needed", type: "textarea", required: true, placeholder: "e.g. 5kg tomatoes, 2kg onions, 1 bunch spinach", group: "Produce Details" },
  { name: "qualityGrade", label: "Quality / Grade", type: "select", required: false, options: ["Premium / Grade A", "Standard / Grade B", "Any Quality", "Organic Only"], group: "Produce Details" },
  { name: "isOrganic", label: "Organic Only?", type: "toggle", required: false, helpText: "Toggle if you strictly require organic produce", group: "Produce Details" },
  { name: "quantity", label: "Approximate Total Quantity", type: "text", required: true, placeholder: "e.g. 10kg mixed vegetables, Weekly supply for family of 5", group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Daily Supply", "Weekly Supply", "Bi-Weekly Supply", "Monthly Supply"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Ripeness preference, packaging requirements, any allergies...", group: "Budget & Urgency" }

];
```

## pantryStaplesSchema

```typescript
const pantryStaplesSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific products you are looking for", group: "Product Details" },
  { name: "stapleType", label: "Type of Staple", type: "select", required: true, options: ["Mealie Meal / Maize Flour", "Rice", "Cooking Oil", "Sugar", "Salt & Condiments", "Flour / Baking Ingredients", "Canned / Tinned Foods", "Dried Beans & Legumes", "Pasta & Noodles", "Cereals & Oats", "Tea & Coffee", "Mixed Pantry Items", "Other"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Maize: Roller Meal, Breakfast Meal, Any", group: "Product Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 25kg Roller Meal x2, 5L cooking oil x3, 2kg sugar x4", group: "Product Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale Order"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging size preference, bulk discount requirements...", group: "Budget & Urgency" }

];
```

## beveragesSchema

```typescript
const beveragesSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific drinks you are looking for", group: "Beverage Details" },
  { name: "beverageType", label: "Type of Beverage", type: "select", required: true, options: ["Water / Mineral Water", "Soft Drinks / Sodas", "Juices", "Energy Drinks", "Beer / Cider", "Wine", "Spirits / Whiskey", "Traditional Drinks", "Tea & Coffee", "Dairy Drinks / Milk", "Mixed / Variety Pack", "Other"], group: "Beverage Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Coca-Cola, Mosi, Vimto, Any", group: "Beverage Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 24 x 500ml Coke, 2 x 5L water bottles, 1 case Mosi", group: "Beverage Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if beverages are for a party or event", group: "Order Details" },
  { name: "guestCount", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Temperature requirements, packaging preferences, any specific needs...", group: "Budget & Urgency" }

];
```

## snacksSweetsSchema

```typescript
const snacksSweetsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of specific snacks you are looking for", group: "Snack Details" },
  { name: "snackType", label: "Type of Snack", type: "select", required: true, options: ["Crisps / Chips", "Biscuits / Cookies", "Chocolates / Sweets", "Nuts & Dried Fruits", "Popcorn", "Local / Traditional Snacks", "Cakes & Pastries", "Sweets / Candy", "Healthy Snacks", "Mixed / Variety", "Other"], group: "Snack Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Simba, Cadbury, Lay's, Any", group: "Snack Details" },
  { name: "specificItems", label: "List of Items Needed", type: "textarea", required: true, placeholder: "e.g. 10 x Simba chips, 5 x Cadbury Dairy Milk, Mixed sweets 2kg", group: "Snack Details" },
  { name: "forEvent", label: "Is This for an Event?", type: "toggle", required: false, helpText: "Toggle if snacks are for a party or event", group: "Order Details" },
  { name: "guestCount", label: "Number of Guests (if for event)", type: "number", required: false, min: 1, group: "Order Details" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, options: ["None", "Halal Only", "Vegetarian", "Vegan", "Gluten Free", "Sugar Free / Diabetic Friendly", "Nut Free"], group: "Order Details" },
  { name: "orderFrequency", label: "Order Frequency", type: "select", required: true, options: ["One Time Order", "Weekly Supply", "Monthly Supply", "Bulk / Wholesale"], group: "Order Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Packaging preferences, gift wrapping needed, any allergies...", group: "Budget & Urgency" }

];
```

## lightingLampsSchema

```typescript
const lightingLampsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the lighting style or room you want to light", group: "Product Details" },
  { name: "lightingType", label: "Type of Lighting", type: "select", required: true, options: ["Ceiling Light / Chandelier", "Pendant Light", "Wall Light / Sconce", "Floor Lamp", "Table / Desk Lamp", "LED Strip Lights", "Outdoor / Garden Lights", "Solar Lights", "Spotlights / Downlights", "Emergency / Backup Lights", "Other"], group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Office / Study", "Outdoor / Garden", "Commercial Space", "Other"], group: "Product Details" },
  { name: "style", label: "Style Preference", type: "select", required: false, options: ["Modern / Contemporary", "Classic / Traditional", "Industrial", "Minimalist", "Luxury / Crystal", "Rustic / Natural", "No Preference"], group: "Product Details" },
  { name: "lightColor", label: "Light Color", type: "select", required: false, options: ["Warm White", "Cool White / Daylight", "RGB / Color Changing", "Any"], group: "Product Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Philips, Any brand", group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need the lighting fitted and installed", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Room dimensions, ceiling height, wattage requirements...", group: "Budget & Urgency" }

];
```

## wallArtMirrorsSchema

```typescript
const wallArtMirrorsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the style or look you are going for", group: "Product Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Wall Art / Painting", "Framed Print / Poster", "Mirror", "Wall Sculpture / 3D Art", "Canvas Print", "Photo Frame / Gallery Wall", "African / Cultural Art", "Abstract Art", "Other"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "African / Cultural", "Abstract", "Landscape / Nature", "Geometric", "Minimalist", "Religious / Inspirational", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Earth tones, Black & White, Match my living room", group: "Product Details" },
  { name: "size", label: "Size", type: "text", required: false, placeholder: "e.g. Large (above 100cm), Medium (60-100cm), Small (under 60cm)", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Bathroom", "Office", "Hallway", "Other"], group: "Product Details" },
  { name: "isCustom", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you want a custom commissioned piece", group: "Order Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Wall dimensions, existing decor style, any specific themes...", group: "Budget & Urgency" }

];
```

## rugsCarpetsSchema

```typescript
const rugsCarpetsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style or pattern you want", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Area Rug", "Runner Rug", "Wall to Wall Carpet", "Outdoor Rug", "Prayer Mat", "Doormat", "Other"], group: "Product Details" },
  { name: "size", label: "Size / Dimensions", type: "text", required: true, placeholder: "e.g. 2m x 3m, Runner 0.8m x 2.5m, Not sure - whole room", group: "Product Details" },
  { name: "material", label: "Material Preference", type: "select", required: false, options: ["Wool", "Nylon / Synthetic", "Cotton", "Jute / Natural Fibre", "Polypropylene", "Silk / Luxury", "Any"], group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Contemporary", "Traditional / Oriental", "African / Cultural", "Geometric", "Plain / Solid Color", "Shaggy / Fluffy", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. Neutral tones, Blue & Grey, Match my sofa", group: "Product Details" },
  { name: "roomType", label: "Room / Area", type: "select", required: false, options: ["Living Room", "Bedroom", "Dining Room", "Hallway", "Office", "Outdoor", "Other"], group: "Product Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Traffic level in room, children or pets at home, any specific requirements...", group: "Budget & Urgency" }

];
```

## curtainsBlindsSchema

```typescript
const curtainsBlindsSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the style you want or the window space", group: "Product Details" },
  { name: "itemType", label: "Type", type: "select", required: true, options: ["Curtains / Drapes", "Roller Blinds", "Venetian Blinds", "Vertical Blinds", "Roman Blinds", "Sheer / Voile Curtains", "Blackout Curtains", "Both Curtains & Blinds", "Other"], group: "Product Details" },
  { name: "windowDimensions", label: "Window Dimensions", type: "text", required: true, placeholder: "e.g. Width 2m x Drop 2.5m, 3 windows same size", group: "Product Details" },
  { name: "fabric", label: "Fabric / Material", type: "select", required: false, options: ["Blackout / Block Out", "Sheer / Light Filter", "Velvet / Heavy", "Linen / Natural", "Polyester", "No Preference"], group: "Product Details" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, placeholder: "e.g. White, Grey, Match my walls", group: "Product Details" },
  { name: "style", label: "Style", type: "select", required: false, options: ["Modern / Minimalist", "Classic / Traditional", "Patterned / Printed", "Plain / Solid", "No Preference"], group: "Product Details" },
  { name: "numberOfWindows", label: "Number of Windows", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "installationRequired", label: "Installation Required?", type: "toggle", required: false, helpText: "Toggle if you need curtains fitted and hung", group: "Order Details" },
  { name: "isCustomMade", label: "Custom Made?", type: "toggle", required: false, helpText: "Toggle if you need made-to-measure curtains", group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Existing curtain rail type, room style, any specific requirements...", group: "Budget & Urgency" }

];
```

## softwareWebDevSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "maintenanceRequired", label: "Ongoing Maintenance Required?", type: "toggle", required: false, helpText: "Toggle if you need monthly support after launch", group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other requirements, integrations needed, competitors to reference...", group: "Budget & Timeline" }

];
```

## networkingSecuritySchema

```typescript
const networkingSecuritySchema: FieldSchema[] = [

  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the premises or existing network setup", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Network Setup / Installation", "WiFi Setup & Configuration", "Network Troubleshooting", "CCTV / Security Camera Setup", "Access Control System", "Firewall / Cybersecurity", "Server Setup & Configuration", "VPN Setup", "Network Cabling", "Biometric System", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Home / Residential", "Small Office", "Medium Business", "Large Corporate", "School / Institution", "Warehouse / Industrial", "Other"], group: "Service Details" },
  { name: "propertySize", label: "Property Size / Coverage Area", type: "text", required: false, placeholder: "e.g. 3 bedroom house, 2 floor office building, 500 sqm warehouse", group: "Service Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Service Details" },
  { name: "numberOfDevices", label: "Number of Devices / Users", type: "number", required: false, min: 1, helpText: "Approximate number of computers, phones, cameras etc.", group: "Service Details" },
  { name: "issueDescription", label: "Describe Your Requirements", type: "textarea", required: true, placeholder: "e.g. Need WiFi covering entire office, CCTV for 4 entry points, Network keeps dropping", group: "Service Details" },
  { name: "existingInfrastructure", label: "Existing Infrastructure?", type: "toggle", required: false, helpText: "Toggle if you have existing network equipment installed", group: "Technical Details" },
  { name: "equipmentSupplyNeeded", label: "Equipment Supply Needed?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply routers, cameras etc.", group: "Technical Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific brands, security certifications required, other details...", group: "Budget & Urgency" }

];
```

## itSupportMaintenanceSchema

```typescript
const itSupportMaintenanceSchema: FieldSchema[] = [

  { name: "images", label: "Screenshots / Photos", type: "image_upload", required: false, helpText: "Upload screenshots of errors or photos of hardware issues", group: "Support Details" },
  { name: "supportType", label: "Type of Support Needed", type: "select", required: true, options: ["Computer / Laptop Repair", "Software Installation", "Virus / Malware Removal", "Data Recovery", "System Upgrade", "Printer Setup / Repair", "Email Setup & Configuration", "Remote Support / Online Help", "Regular Maintenance Contract", "Staff IT Training", "Other"], group: "Support Details" },
  { name: "deviceType", label: "Device Type", type: "select", required: false, options: ["Desktop PC", "Laptop", "Server", "Printer", "POS System", "Multiple Devices", "Other"], group: "Support Details" },
  { name: "operatingSystem", label: "Operating System", type: "select", required: false, options: ["Windows 10", "Windows 11", "Windows 7 / 8", "macOS", "Linux", "Not Sure"], group: "Support Details" },
  { name: "issueDescription", label: "Describe the Issue", type: "textarea", required: true, placeholder: "e.g. Laptop very slow, Blue screen error, Cannot connect to internet, Need antivirus installed", group: "Support Details" },
  { name: "numberOfDevices", label: "Number of Devices", type: "counter", required: false, min: 1, group: "Support Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka CBD, Woodlands, Ndola", group: "Support Details" },
  { name: "remoteSupport", label: "Remote Support Acceptable?", type: "toggle", required: false, helpText: "Toggle if the technician can assist you remotely without visiting", group: "Support Details" },
  { name: "ongoingContract", label: "Ongoing Support Contract?", type: "toggle", required: false, helpText: "Toggle if you need regular monthly IT support", group: "Contract Details" },
  { name: "numberOfStaff", label: "Number of Staff / Users", type: "number", required: false, min: 1, group: "Contract Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any error messages, when issue started, previous repairs done...", group: "Budget & Urgency" }

];
```

## ispSchema

```typescript
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
  { name: "budget", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Building type, floor level, any specific requirements...", group: "Budget & Preferences" }

];
```

## mobileNetworkServicesSchema

```typescript
const mobileNetworkServicesSchema: FieldSchema[] = [

  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["SIM Card / New Line", "Business SIM / Corporate Lines", "Data Bundles / Packages", "Bulk SMS Services", "USSD / Mobile Money Integration", "Corporate Mobile Plan", "International Roaming", "Other"], group: "Service Details" },
  { name: "networkPreference", label: "Network Preference", type: "select", required: false, options: ["Airtel Zambia", "MTN Zambia", "Zamtel", "No Preference"], group: "Service Details" },
  { name: "numberOfLines", label: "Number of Lines / SIMs", type: "counter", required: true, min: 1, group: "Service Details" },
  { name: "planType", label: "Plan Type", type: "select", required: false, options: ["Prepaid / Pay As You Go", "Postpaid / Contract", "Hybrid Plan", "No Preference"], group: "Service Details" },
  { name: "dataRequirement", label: "Monthly Data Requirement", type: "select", required: false, options: ["Basic - Under 5GB", "Standard - 5 to 20GB", "Heavy - 20 to 50GB", "Unlimited Data", "Not Sure"], group: "Service Details" },
  { name: "businessUse", label: "For Business Use?", type: "toggle", required: false, helpText: "Toggle if this is for a business or organisation", group: "Service Details" },
  { name: "companyName", label: "Company / Organisation Name", type: "text", required: false, placeholder: "e.g. ABC Company Ltd", group: "Service Details" },
  { name: "budget", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Number portability needed, specific features required, coverage area concerns...", group: "Budget & Urgency" }

];
```

## satelliteVsatInstallationSchema

```typescript
const satelliteVsatInstallationSchema: FieldSchema[] = [

  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the installation site and surrounding area", group: "Installation Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["VSAT Internet Installation", "Satellite TV Installation", "DSTV Installation / Relocation", "DSTV Repair / Signal Fix", "OpenView / FreeView Installation", "Starlink Setup", "Other Satellite Service"], group: "Installation Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Home", "Farm / Rural Property", "Small Business", "Large Business / Corporate", "School / Institution", "Mining / Industrial Site", "Other"], group: "Installation Details" },
  { name: "location", label: "Installation Location", type: "text", required: true, placeholder: "e.g. Lusaka, Mumbwa District, Mpika - Remote Farm", group: "Installation Details" },
  { name: "isRemoteArea", label: "Remote / Rural Area?", type: "toggle", required: false, helpText: "Toggle if the installation site is in a remote area with limited road access", group: "Installation Details" },
  { name: "existingEquipment", label: "Existing Equipment?", type: "toggle", required: false, helpText: "Toggle if you already have a dish or decoder installed", group: "Installation Details" },
  { name: "numberOfPoints", label: "Number of Connection Points", type: "counter", required: false, min: 1, helpText: "Number of TVs or devices to connect", group: "Installation Details" },
  { name: "roofType", label: "Roof / Mounting Type", type: "select", required: false, options: ["Tiled Roof", "Iron Sheet Roof", "Concrete / Flat Roof", "Wall Mount", "Ground Mount / Pole", "Not Sure"], group: "Technical Details" },
  { name: "powerAvailable", label: "Reliable Power Available?", type: "toggle", required: false, helpText: "Toggle if site has reliable electricity. If not, solar options may be discussed", group: "Technical Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need Installation?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "GPS coordinates if remote, access road details, power situation...", group: "Budget & Urgency" }

];
```

## boreholeDrillingSchema

```typescript
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
  { name: "budget", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Geological info if known, specific pump brand, water testing requirements...", group: "Budget & Urgency" }

];
```

## miningExplorationSchema

```typescript
const miningExplorationSchema: FieldSchema[] = [

  { name: "images", label: "Site / Map Photos", type: "image_upload", required: false, helpText: "Upload site maps or photos of the exploration area", group: "Project Overview" },
  { name: "projectLocation", label: "Project Location", type: "text", required: true, placeholder: "e.g. Solwezi, Copperbelt, Mkushi", group: "Project Overview" },
  { name: "drillingType", label: "Type of Drilling Required", type: "select", required: true, options: ["Diamond Core Drilling", "Reverse Circulation (RC)", "Air Core Drilling", "Blast Hole Drilling", "Auger Drilling", "Not Sure - Need Advice"], group: "Project Overview" },
  { name: "numberOfHoles", label: "Number of Holes", type: "number", required: true, min: 1, group: "Project Overview" },
  { name: "targetDepth", label: "Average Target Depth (Meters)", type: "number", required: true, group: "Project Overview" },
  { name: "terrainType", label: "Terrain Type", type: "select", required: true, options: ["Flat / Accessible", "Hilly / Mountainous", "Swampy / Wet", "Dense Bush / Forest", "Existing Mine Site"], group: "Site Conditions" },
  { name: "siteAccess", label: "Site Access Status", type: "select", required: true, options: ["Road Access Available", "Need Road Clearing", "Remote - Helicopter Only", "Underground Access"], group: "Site Conditions" },
  { name: "waterSource", label: "Water Source for Drilling", type: "select", required: true, options: ["Available on Site", "Need Water Bowsing / Trucking", "Natural Source Nearby", "Contractor to Provide"], group: "Logistics" },
  { name: "campServices", label: "Camp Services Needed?", type: "toggle", required: false, helpText: "Does the contractor need to provide their own accommodation/camp?", group: "Logistics" },
  { name: "environmentalCompliance", label: "Environmental Permits Ready?", type: "toggle", required: true, group: "Compliance" },
  { name: "budget", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Budget & Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget & Timeline" },
  { name: "timeline", label: "Project Start Date", type: "date", required: true, group: "Budget & Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Sample handling requirements, safety standards (ISO/NOSA), specific rig requirements...", group: "Budget & Timeline" }

];
```

## geotechnicalDrillingSchema

```typescript
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
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Urgency" },
  { name: "urgency", label: "How Soon?", type: "select", required: true, options: ["Immediately", "Within 1 week", "Within 1 month", "Planning Ahead"], group: "Budget & Urgency" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific standards (ASTM/BS), reporting requirements, site safety inductions...", group: "Budget & Urgency" }

];
```

## businessComputersSchema

```typescript
const businessComputersSchema: FieldSchema[] = [

  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, helpText: "Upload spec sheets or reference photos", group: "Product Details" },
  { name: "computerType", label: "Type of Computer", type: "select", required: true, options: ["Business Laptop", "Desktop PC", "Workstation", "All-in-One PC", "Mini PC", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell", "HP", "Lenovo", "Apple (Mac)", "ASUS", "Acer", "Custom Built", "No Preference"], group: "Product Details" },
  { name: "processor", label: "Processor Requirement", type: "select", required: false, options: ["Entry Level (Core i3 / Ryzen 3)", "Mid Range (Core i5 / Ryzen 5)", "High Performance (Core i7 / Ryzen 7)", "Extreme (Core i9 / Ryzen 9)", "Not Sure"], group: "Technical Specs" },
  { name: "ram", label: "RAM (Memory)", type: "select", required: false, options: ["8GB", "16GB", "32GB", "64GB+", "Not Sure"], group: "Technical Specs" },
  { name: "storage", label: "Storage Capacity", type: "select", required: false, options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB+ SSD", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity Needed", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget", label: "Budget per Unit (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "OS preference, specific ports needed, warranty requirements...", group: "Order Details" }

];
```

## serversStorageSchema

```typescript
const serversStorageSchema: FieldSchema[] = [

  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Rack Server", "Tower Server", "Blade Server", "NAS Storage", "SAN Storage", "Backup / Tape Drive", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell EMC", "HPE", "Lenovo", "Cisco", "Synology", "QNAP", "Other", "No Preference"], group: "Product Details" },
  { name: "purpose", label: "Primary Purpose", type: "select", required: true, options: ["File Server", "Database Server", "Virtualization (VMware/Hyper-V)", "Web Hosting", "Backup & Recovery", "Active Directory / Domain Controller", "Other"], group: "Technical Specs" },
  { name: "storageCapacity", label: "Required Storage Capacity", type: "text", required: false, placeholder: "e.g. 10TB, 50TB, 1PB", group: "Technical Specs" },
  { name: "redundancy", label: "Redundancy Requirements", type: "select", required: false, options: ["Standard (Single PSU/RAID)", "High Availability (Dual PSU/Failover)", "Mission Critical", "Not Sure"], group: "Technical Specs" },
  { name: "budget", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Rack space available, OS requirements, support level needed...", group: "Order Details" }

];
```

## networkingHardwareSchema

```typescript
const networkingHardwareSchema: FieldSchema[] = [

  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Network Switch", "Router", "Firewall / Security Appliance", "Wireless Access Point", "Network Cabinet / Rack", "Cabling & Patch Panels", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Cisco", "Ubiquiti (UniFi)", "MikroTik", "TP-Link (Omada)", "Fortinet", "Sophos", "Aruba", "Other"], group: "Product Details" },
  { name: "portCount", label: "Number of Ports", type: "select", required: false, options: ["5-8 Ports", "16 Ports", "24 Ports", "48 Ports", "N/A"], group: "Technical Specs" },
  { name: "poeRequired", label: "PoE (Power over Ethernet) Needed?", type: "toggle", required: false, group: "Technical Specs" },
  { name: "managed", label: "Managed or Unmanaged?", type: "select", required: false, options: ["Managed (L2/L3)", "Unmanaged (Plug & Play)", "Smart Managed", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "SFP+ requirements, specific security features, outdoor vs indoor...", group: "Order Details" }

];
```

## softwareLicensesSchema

```typescript
const softwareLicensesSchema: FieldSchema[] = [

  { name: "softwareName", label: "Software Name", type: "text", required: true, placeholder: "e.g. Microsoft 365, Adobe Creative Cloud, Sage, Antivirus", group: "Software Details" },
  { name: "licenseType", label: "License Type", type: "select", required: true, options: ["New Subscription", "Renewal", "Perpetual License (One-time)", "Upgrade", "Not Sure"], group: "Software Details" },
  { name: "numberOfUsers", label: "Number of Users / Seats", type: "number", required: true, min: 1, group: "Software Details" },
  { name: "edition", label: "Edition / Version", type: "select", required: false, options: ["Basic / Home", "Standard / Business", "Professional", "Enterprise / Premium", "Not Sure"], group: "Software Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Current license key if renewal, specific modules needed...", group: "Order Details" }

];
```

## printersOfficeEquipmentSchema

```typescript
const printersOfficeEquipmentSchema: FieldSchema[] = [

  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Laser Printer", "Inkjet Printer", "Multifunction (Print/Scan/Copy)", "Large Format Plotter", "Document Scanner", "Label Printer", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["HP", "Canon", "Epson", "Brother", "Kyocera", "Konica Minolta", "Ricoh", "Other"], group: "Product Details" },
  { name: "colorMono", label: "Color or Monochrome?", type: "select", required: true, options: ["Color", "Monochrome (Black & White Only)", "Both"], group: "Technical Specs" },
  { name: "paperSize", label: "Max Paper Size", type: "select", required: true, options: ["A4", "A3", "A2", "A1/A0 (Plotter)", "Other"], group: "Technical Specs" },
  { name: "monthlyVolume", label: "Estimated Monthly Volume", type: "select", required: false, options: ["Low (Under 1000 pages)", "Medium (1000 - 5000 pages)", "High (5000+ pages)", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Order Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Network/WiFi printing needed, duplex (double-sided) printing, specific tray requirements...", group: "Order Details" }

];
```

## poultryFarmingSchema

```typescript
const poultryFarmingSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your poultry setup or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Day-old chicks", "Broiler Feed", "Layer Feed", "Vaccines (Gumboro/Lasota)", "Feeders & Drinkers", "Brooders", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 500 chicks, 10 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific brands, delivery requirements, etc.", group: "Budget & Preferences" }

];
```

## aquacultureSchema

```typescript
const aquacultureSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your pond or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Fingerlings (Tilapia/Catfish)", "Fish Feed (Starter/Finisher)", "Pond Liners", "Water Testing Kits", "Nets", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1000 fingerlings, 5 bags of feed", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific species, pond size, delivery requirements, etc.", group: "Budget & Preferences" }

];
```

## cropProductionSchema

```typescript
const cropProductionSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your field or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Maize/Vegetable Seeds", "Fertilizers (D-Compound/Urea)", "Pesticides", "Herbicides", "Sprayers", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of fertilizer, 10kg seeds", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Crop type, field size, specific brands, etc.", group: "Budget & Preferences" }

];
```

## livestockVeterinarySchema

```typescript
const livestockVeterinarySchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your livestock or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Cattle/Goat Feed", "Salt Licks", "Dewormers", "Veterinary Instruments", "Animal Health Supplements", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 5 bags of feed, 2 bottles of dewormer", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Animal type, specific health concerns, etc.", group: "Budget & Preferences" }

];
```

## irrigationHardwareSchema

```typescript
const irrigationHardwareSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or specific items needed", group: "Inquiry Details" },
  { name: "itemType", label: "What do you need?", type: "select", required: true, options: ["Water Pumps (Solar/Petrol)", "Piping", "Shovels", "Rakes", "Fencing Wire", "Greenhouse Materials", "Other"], group: "Inquiry Details" },
  { name: "quantity", label: "Quantity / Amount", type: "text", required: true, placeholder: "e.g. 1 solar pump, 100m piping", group: "Inquiry Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Inquiry Details" },
  { name: "pickupArrangement", label: "How will you collect?", type: "select", required: true, options: ["I will pick up from shop", "I need delivery (additional fee)", "Farm visit/collection"], group: "Inquiry Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm size, water source, specific requirements, etc.", group: "Budget & Preferences" }

];
```

## agroTechServicesSchema

```typescript
const agroTechServicesSchema: FieldSchema[] = [

  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of your farm or area for service", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Soil Testing Services", "Consulting", "Solar Lighting for Farms", "Drone Spraying", "Other"], group: "Service Details" },
  { name: "urgency", label: "When do you need it?", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Service Details" },
  { name: "budget", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget & Preferences" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Farm location, specific challenges, goals, etc.", group: "Budget & Preferences" }

];
```

