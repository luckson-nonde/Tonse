# Form Implementation Audit

## PART 1: CURRENT FORM INVENTORY

Here is the inventory of every form found in the codebase:

1. **Dynamic Inquiry Form**
   - **File:** `/src/components/DynamicInquiryForm.tsx`
   - **Purpose:** Standard product/service inquiry request (Buy, Repair, Restore, Booking).
   - **Role:** Buyer
   - **Fields:** Dynamic (based on JSON schema in `categories.ts`).
   - **Type:** Schema-driven dynamic form using `react-hook-form` and `zod`.
   - **Validation:** Robust runtime validation via dynamically generated Zod schemas.
   - **Features:** Supports `dependsOn` for conditional field visibility and `group` for section-based rendering.

2. **Inquiry Preferences Form**
   - **File:** `/src/components/InquiryPreferences.tsx`
   - **Purpose:** Setting quote limits and privacy for an inquiry.
   - **Role:** Buyer
   - **Fields:** 2 (Max Quotations, Confidentiality).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

3. **Location Details Form**
   - **File:** `/src/components/LocationDetails.tsx`
   - **Purpose:** Entering GPS or physical address details.
   - **Role:** Buyer / Shop Provider
   - **Fields:** 5 (Province, City, Area, Address, Radius).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

4. **Login Form**
   - **File:** `/src/pages/Login.tsx`
   - **Purpose:** User authentication.
   - **Role:** All Roles
   - **Fields:** 2 (Email, Password).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

5. **Registration Form**
   - **File:** `/src/pages/Register.tsx`
   - **Purpose:** Account creation.
   - **Role:** All Roles
   - **Fields:** 5 (Username, Email, Phone, Password, Confirm Password).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

6. **Buyer Profile Edit Form**
   - **File:** `/src/pages/BuyerProfilePage.tsx`
   - **Purpose:** Updating personal buyer details.
   - **Role:** Buyer
   - **Fields:** 8 (Name, Email, Phone, DOB, Country, Province, City, Area).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

7. **Shop Profile Edit Form**
   - **File:** `/src/pages/ShopProfilePage.tsx`
   - **Purpose:** Updating business profile and settings.
   - **Role:** Shop/Provider
   - **Fields:** 12 (Name, Description, Email, Phone, Address, etc.).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

8. **Quote Submission Form**
   - **File:** `/src/pages/ProviderDashboard.tsx`
   - **Purpose:** Providers submitting a quote to a buyer's inquiry.
   - **Role:** Shop/Provider
   - **Fields:** Dynamic based on `archetype` (Product, Service, Rental).
   - **Type:** Schema-driven dynamic form using `react-hook-form` and `zod`.
   - **Validation:** Robust runtime validation via dynamically generated Zod schemas from `quoteSchemaGenerator.ts`.

9. **Venue Spaces Manager Form**
   - **File:** `/src/pages/VenueSpacesManager.tsx`
   - **Purpose:** Adding/editing specific rooms or spaces within a venue.
   - **Role:** Shop/Provider
   - **Fields:** 6 (Space Name, Capacity, Hourly Rate, Daily Rate, Amenities, Images).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

---

## PART 2: INQUIRY FORM SPECIFICALLY

1. **Where is this form located?**
   The inquiry form is a single dynamic component located at `/src/components/DynamicInquiryForm.tsx`. It is rendered by `/src/pages/BuyerDashboard.tsx`.

2. **What fields does it currently have?**
   Fields are entirely dynamic, generated from `FieldSchema[]` definitions in `/src/services/categories.ts`. Common fields include `images`, `title`, `description`, `quantity`, `budget_limit`, and `urgency`.

3. **Does the form change based on shop category?**
   **Yes.** The `DynamicInquiryForm` receives the selected category and its associated `formSchema`. It dynamically renders inputs (text, select, toggle, counter, image_upload, currency, date) based on the schema.

4. **How is the form submitted?**
   Direct DB write. It uses Dexie.js to write directly to IndexedDB: `db.inquiries.add(newInquiry)`.

5. **What data is sent on submission?**
   The payload uses the `attributes` record for dynamic data (defined in `/src/types.ts`):
   ```typescript
   {
     title: string,
     description: string,
     items: InquiryItem[],
     category: string,
     location: string,
     latitude?: number,
     longitude?: number,
     radius?: number,
     buyerName: string,
     buyerId: number,
     createdAt: number,
     status: 'OPEN',
     viewCount: 0,
     preferences: any,
     attributes: Record<string, any> // Stores all dynamic schema fields
   }
   ```

6. **Is there any category selection BEFORE the form opens?**
   Yes. The flow starts in the `category-selection` tab using the `/src/components/CategorySelection.tsx` component.

7. **Where does the category data come from?**
   A hardcoded array named `CATEGORIES_DB` exported from `/src/services/categories.ts`.

---

## PART 3: CATEGORY HIERARCHY & MASTER CATEGORIES

The system follows a strict Master Category → Subcategory relationship.

### 1. Electronics (Master)
- Mobile Phones & Accessories (Buy New)
- Mobile Phones & Accessories (Repair)
- Laptops & Computers (Buy New)
- Laptops & Computers (Repair)
- Home Appliances (Buy New)
- Home Appliances (Repair)
- Audio & Video Equipment (Buy New)
- Audio & Video Equipment (Repair)
- Gaming Consoles & Accessories (Buy)

### 2. Furniture (Master)
- Living Room Furniture (Buy / Custom)
- Living Room Furniture (Repair / Upholstery)
- Bedroom Furniture (Buy / Custom)
- Bedroom Furniture (Repair / Restoration)
- Office Furniture (Buy / Custom)
- Office Furniture (Repair)
- Outdoor & Patio (Buy / Custom)
- Outdoor & Patio (Repair)

### 3. Fashion (Master)
- Men's Clothing
- Women's Clothing
- Shoes & Footwear
- Accessories & Jewelry

### 4. Home Decor (Master)
- Lighting & Lamps
- Wall Art & Mirrors
- Rugs & Carpets
- Curtains & Blinds

### 5. Automotive (Master)
- Car Parts & Spares (Buy New)
- Car Parts & Spares (Buy from Car Breakers)
- Car Accessories
- Car Breakdown & Recovery
- Motorcycles & Parts
- Automotive Tools

### 6. Groceries (Master)
- Fresh Produce
- Pantry Staples
- Beverages
- Snacks & Sweets

### 7. Beauty (Master)
- Skincare
- Makeup & Cosmetics
- Haircare
- Fragrances

### 8. Construction (Master)
- Building Materials
- Plumbing & Fixtures
- Electrical Supplies
- Hardware & Tools
- Construction Machinery

### 9. Entertainment (Master)
- DJs
- Live Bands
- MCs & Hosts
- Dancers
- Public Speaker
- Comedians
- Influencers
- Spoken Word Artists

### 10. Events (Master)
- Event Equipment Rental
- Event Management
- Event Catering
- Event Planning
- Event Venues
- Event Decor

### 11. Telecommunications (Master)
- Internet Service Providers (ISP)
- Mobile Network Services
- Satellite & VSAT Installation

### 12. IT Services (Master)
- Software & Web Development
- Networking & Security
- IT Support & Maintenance

### 13. IT Products (Master)
- Computers & Laptops (Business)
- Servers & Storage
- Networking Hardware
- Software Licenses
- Printers & Office Equipment

### 14. Drilling Services (Master)
- Borehole Drilling
- Mining Exploration
- Geotechnical Drilling

### 15. Agriculture & Agro-Dealers (Master)
- Poultry Farming
- Aquaculture (Fish)
- Crop Production
- Livestock & Veterinary
- Irrigation & Hardware
- Agro-Tech & Services

---

## PART 4: SYSTEM ENHANCEMENTS (IMPLEMENTED)

### 1. Robust Validation (Zod Integration)
- **Status:** COMPLETED.
- **Implementation:** `generateZodSchema` utility creates Zod schemas from `FieldSchema[]`. Integrated into `DynamicInquiryForm.tsx` and `QuoteSubmissionForm`.

### 2. UI Organization (Field Grouping)
- **Status:** COMPLETED.
- **Implementation:** `DynamicInquiryForm.tsx` renders fields in groups if the `group` property is present in the schema.

### 3. Conditional Logic (`dependsOn`)
- **Status:** COMPLETED.
- **Implementation:** Added `dependsOn` to `FieldSchema`. `DynamicInquiryForm.tsx` and `QuoteSubmissionForm` handle conditional field visibility based on other field values.

### 4. Provider-Side Data Rendering
- **Status:** COMPLETED.
- **Implementation:** `DynamicDataDisplay` component renders `attributes` based on `FieldSchema`, ensuring providers see structured data.

### 5. Dynamic Quote System
- **Status:** COMPLETED.
- **Implementation:** `generateQuoteSchema` dynamically generates quote fields based on category `archetype` (Product, Service, Rental) and inquiry attributes.

---

## PART 5: NEXT STEPS

### Phase 1: Advanced Quoting Features
- [ ] Implement multi-item quoting for complex inquiries.
- [ ] Add support for recurring service quotes (e.g., monthly maintenance).

### Phase 2: Buyer Dashboard Enhancements
- [ ] Improve quote comparison view.
- [ ] Add "Accept Quote" flow with payment integration.

### Phase 3: Collection Handshake Flow
- [ ] Finalize QR code scanning and verification.
- [ ] Implement pickup checklist with photo capture.
- [ ] Trigger fund release upon successful collection.

