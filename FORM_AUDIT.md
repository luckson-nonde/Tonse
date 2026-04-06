# Form Implementation Audit

## PART 1: CURRENT FORM INVENTORY

Here is the inventory of every form found in the codebase:

1. **Dynamic Inquiry Form**
   - **File:** `/src/components/DynamicInquiryForm.tsx`
   - **Purpose:** Standard product/service inquiry request (Buy, Repair, Restore, Booking).
   - **Role:** Buyer
   - **Fields:** Dynamic (based on JSON schema in `categories.ts`).
   - **Type:** Schema-driven dynamic form.
   - **Validation:** Supported via schema properties (required, min, max, options).

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
   - **Fields:** 9 static fields + dynamic item pricing fields.
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

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
   **Yes.** The `DynamicInquiryForm` receives the selected category and its associated `formSchema`. It dynamically renders inputs (text, select, toggle, counter, image_upload, currency) based on the schema.

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

## PART 3: CATEGORY SYSTEM

1. **Where are categories defined?**
   `/src/services/categories.ts`

2. **List ALL categories currently in the system (Hierarchical Order):**

   * **Electronics**
     * Mobile Phones & Accessories (Buy New)
     * Mobile Phones & Accessories (Repair)
     * Laptops & Computers (Buy New)
     * Laptops & Computers (Repair)
     * Home Appliances (Buy New)
     * Home Appliances (Repair)
     * Audio & Video Equipment (Buy New)
     * Audio & Video Equipment (Repair)
     * Gaming Consoles & Accessories (Buy)
   * **Furniture**
     * Living Room Furniture (Buy / Custom)
     * Living Room Furniture (Repair / Upholstery)
     * Bedroom Furniture (Buy / Custom)
     * Bedroom Furniture (Repair / Restoration)
     * Office Furniture (Buy / Custom)
     * Office Furniture (Repair)
     * Outdoor & Patio (Buy / Custom)
     * Outdoor & Patio (Repair)
   * **Fashion**
     * Men's Clothing
     * Women's Clothing
     * Shoes & Footwear
     * Accessories & Jewelry
   * **Home Decor**
     * Lighting & Lamps
     * Wall Art & Mirrors
     * Rugs & Carpets
     * Curtains & Blinds
   * **Automotive**
     * Car Parts & Spares (Buy New)
     * Car Parts & Spares (Buy from Car Breakers)
     * Car Accessories
     * Car Breakdown & Recovery
     * Motorcycles & Parts
     * Automotive Tools
   * **Groceries**
     * Fresh Produce
     * Pantry Staples
     * Beverages
     * Snacks & Sweets
   * **Beauty**
     * Skincare
     * Makeup & Cosmetics
     * Haircare
     * Fragrances
   * **Construction**
     * Building Materials
     * Plumbing & Fixtures
     * Electrical Supplies
     * Hardware & Tools
     * Construction Machinery
   * **Entertainment**
     * DJs
     * Live Bands
     * MCs & Hosts
     * Dancers
     * Public Speaker
     * Comedians
     * Influencers
     * Spoken Word Artists
   * **Events**
     * Event Equipment Rental
     * Event Management
     * Event Catering
     * Event Planning
     * Event Venues
     * Event Decor
   * **Telecommunications**
     * Internet Service Providers (ISP)
     * Mobile Network Services
     * Satellite & VSAT Installation
   * **IT Services**
     * Software & Web Development
     * Networking & Security
     * IT Support & Maintenance
   * **IT Products**
     * Computers & Laptops (Business)
     * Servers & Storage
     * Networking Hardware
     * Software Licenses
     * Printers & Office Equipment
   * **Drilling Services**
     * Borehole Drilling
     * Mining Exploration
     * Geotechnical Drilling
   * **Agriculture & Agro-Dealers**
     * Poultry Farming
     * Aquaculture (Fish)
     * Crop Production
     * Livestock & Veterinary
     * Irrigation & Hardware
     * Agro-Tech & Services

3. **How are categories stored?**
   A hardcoded array in the frontend, now enriched with `formSchema` properties.

4. **Does each category have metadata attached?**
   Yes. Categories now include `id`, `name`, `baseName`, `type` ('buy', 'repair', 'restore'), `image`, `parentId`, and critically, `formSchema` (an array of `FieldSchema` objects defining the required form fields).

5. **Is there a category → subcategory relationship?**
   Yes, it is a flat array where subcategories have a `parentId` pointing to the main category (a 1-level deep relationship).

---

## PART 4: STATE MANAGEMENT & DATA FLOW

1. **What state management is being used?**
   - **React Context:** `AuthContext` (user state) and `DashboardContext` (active tab state).
   - **Local State:** `useState` for form inputs. The `DynamicInquiryForm` manages its own internal state mapping schema field names to values.
   - **IndexedDB Hooks:** `useLiveQuery` from `dexie-react-hooks` for reactive database queries.

2. **What data is available in state when opening an inquiry form?**
   The `user` object (buyer profile) and the `pendingInquiry` object, which at that moment contains the `categories` array selected in the previous step.

3. **How is form state managed during multi-step flows?**
   There is a multi-step flow managed in `/src/pages/BuyerDashboard.tsx`. A single local state object `pendingInquiry` accumulates data across steps. The `activeTab` state dictates which step is visible (`category-selection` → `create-inquiry` → `inquiry-preferences` → `location-details`).

4. **When a form is submitted, what happens to the data?**
   The accumulated `pendingInquiry` state is formatted into an `Inquiry` object and written to IndexedDB via `db.inquiries.add()`. The UI tab is then set to `inquiry-success`. The `useLiveQuery` hook automatically detects the DB change and updates the buyer's dashboard list.

---

## PART 5: DATABASE STRUCTURE

1. **Database Schema (from `/src/db.ts`):**
   - **Inquiries:** `++id, buyerId, status, createdAt`
   - **Quotes:** `++id, inquiryId, providerId, status, collectionCode, createdAt`
   - **Categories:** (Does not exist in DB)
   - **Shop/Provider profiles:** `++id, providerId, name, category, location`

2. **Is there a field in the Inquiries table that stores category-specific data?**
   Yes. The `Inquiry` interface uses `attributes?: Record<string, any>;` to store all dynamic data captured by the schema-driven forms.

3. **How flexible is the current schema?**
   Highly flexible. Because Dexie.js (IndexedDB) is a NoSQL document store, it can store any JSON object. The `attributes` field perfectly accommodates the dynamic schema-driven approach without requiring database migrations for new categories or fields.

---

## PART 6: ASSESSMENT REQUEST

1. **VERDICT**
   **Refactored & Schema-Driven.** The form system has been successfully upgraded to support dynamic category-based forms. It no longer relies on hardcoded React components for each category. Instead, it uses a centralized `DynamicInquiryForm` powered by JSON schemas defined in `categories.ts`.

2. **CURRENT CAPABILITIES**
   - **Schema Definitions:** Every category now has a `formSchema` defining its fields, types, and validation rules.
   - **Dynamic Renderer:** `DynamicInquiryForm.tsx` reads the schema and generates inputs dynamically.
   - **Unified Data Storage:** Category-specific data is saved into a generic `attributes` object, eliminating fragmented keys like `repairData` or `entertainmentData`.
   - **Archetype Mapping:** Categories are mapped to archetypes (e.g., `buy_product`, `repair_service`) to ensure consistent data structures and UI rendering.

3. **NEXT STEPS / RECOMMENDATIONS**
   - **Validation:** While the schema defines `required`, `min`, and `max`, consider integrating a robust validation library like `zod` or `yup` with `react-hook-form` for more complex cross-field validation if needed in the future.
   - **Provider Dashboard:** Ensure the Provider Dashboard's `renderSpecifications` function correctly and comprehensively displays all data from the new `attributes` object for all archetypes.
   - **Quote Submission:** Consider making the Quote Submission form dynamic as well, allowing providers to submit structured data based on the category archetype (e.g., itemized parts for repairs vs. flat rate for services).

