# Inquiry Marketplace - Category & Sub-Category Schemas

This document outlines the detailed schema structures for all inquiry categories and sub-categories in the marketplace.

## Common Fields
Most schemas include these standardized fields:
- **Preferred Shop Area**: `preferredArea` (text) - e.g., "Lusaka CBD", "Woodlands"
- **Urgency**: `urgency` (select) - Options: "Immediately", "Within a week", "Within a month", "Planning Ahead"
- **Budget**: `budget` (currency) - Optional field for the user's maximum budget.

---

## 1. Electronics
### Buy New/Used
- **Brand/Model**: `brandModel` (text)
- **Condition**: `condition` (select: New, Used - Like New, Used - Good, Used - Fair)
- **Quantity**: `quantity` (counter)

### Repair Services
- **Device Type**: `deviceType` (text)
- **Symptoms**: `symptoms` (textarea) - Detailed description of the problem.
- **Damage Type**: `damageType` (select: Screen/Display, Battery/Power, Charging Port, Water Damage, Software/OS, Audio/Speaker, Camera, Other)

---

## 2. Fashion & Beauty
### Clothing & Accessories
- **Item Type**: `itemType` (text)
- **Size/Measurements**: `size` (text)
- **Material Preference**: `material` (text)

### Fragrances
- **Scent Profile**: `scentProfile` (select: Floral, Woody, Citrus, Oriental, Fresh, Spicy)
- **Size (ml)**: `sizeMl` (select: 30ml, 50ml, 100ml, 150ml, 200ml+)
- **Concentration**: `concentration` (select: Eau de Toilette, Eau de Parfum, Parfum, Cologne)

---

## 3. Furniture
### Buy New/Custom
- **Material**: `material` (select: Solid Wood, MDF/Veneer, Metal, Glass, Plastic/Acrylic)
- **Dimensions**: `dimensions` (text)

### Repair & Upholstery
- **Damage Type**: `damageType` (select: Torn upholstery, Broken frame, Springs visible, Stain, Saggy cushions, etc.)
- **Symptoms**: `symptoms` (textarea)

---

## 4. Automotive
### Car Parts
- **Vehicle Make/Model/Year**: `vehicleDetails` (text)
- **Part Name**: `partName` (text)
- **Part Number**: `partNumber` (text) - Optional

### Breakdown & Recovery
- **Current Location**: `currentLocation` (text)
- **Destination**: `destination` (text)
- **Vehicle Type**: `vehicleType` (select: Sedan/Hatchback, SUV/4x4, Light Truck, Motorcycle, Heavy Truck)

---

## 5. Agriculture & Agro-Dealers
### Poultry Farming
- **Product Type**: `productType` (select: Day-old Chicks (Broilers), Day-old Chicks (Layers), Point of Lay, Feed, Vaccines, Equipment)
- **Quantity**: `quantity` (counter)

### Aquaculture (Fish)
- **Species**: `species` (select: Tilapia, Catfish, Other)
- **Stage**: `stage` (select: Fingerlings, Juveniles, Table Size, Feed, Equipment)

### Crop Production
- **Category**: `category` (select: Seeds, Fertilizer, Pesticides, Herbicides, Tools)
- **Crop Type**: `cropType` (text)

---

## 6. IT & Telecommunications
### IT Services
- **Service Type**: `serviceType` (select: Web Development, Mobile App, Custom Software, UI/UX Design, E-commerce, etc.)
- **Project Scope**: `scope` (textarea)

### IT Products
- **Category**: `category` (select: Laptops, Desktops, Servers, Networking, Printers, Software)
- **Specs**: `specs` (textarea)

### Telecommunications (ISP)
- **Connection Type**: `connectionType` (select: Home WiFi, Business Fibre, LTE/5G, Satellite, Leased Line)
- **Installation Address**: `installationAddress` (text)

---

## 7. Drilling Services
### Borehole Drilling
- **Purpose**: `purpose` (select: Domestic, Commercial, Irrigation, Industrial)
- **Estimated Depth**: `depth` (text)
- **Casing Type**: `casingType` (select: PVC, Steel, None)

---

## 8. Events & Food
### Event Management
- **Event Type**: `eventType` (select: Wedding, Corporate, Birthday, Workshop, Funeral, Other)
- **Guest Count**: `guestCount` (number)
- **Event Date**: `eventDate` (date)

### Groceries & Fresh Produce
- **Items List**: `itemsList` (textarea)
- **Delivery Needed**: `deliveryNeeded` (toggle)
