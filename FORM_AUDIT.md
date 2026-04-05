# Form Implementation Audit

## PART 1: CURRENT FORM INVENTORY

Here is the inventory of every form found in the codebase:

1. **General Inquiry Form**
   - **File:** `/src/components/InquiryForm.tsx`
   - **Purpose:** Standard product inquiry request.
   - **Role:** Buyer
   - **Fields:** 10 (Images, Brand, Condition, Title, Description, Quantity, Urgency, plus dynamic items).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None (manual `if (!formData.title) alert(...)`).

2. **Electronics Repair Form**
   - **File:** `/src/components/ElectronicsRepairForm.tsx`
   - **Purpose:** Requesting electronics repair services.
   - **Role:** Buyer
   - **Fields:** 7 (Images, Device Type, Brand, Model, Issue Description, Warranty Status, Urgency).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

3. **Entertainment Inquiry Form**
   - **File:** `/src/components/EntertainmentInquiryForm.tsx`
   - **Purpose:** Booking artists and performances.
   - **Role:** Buyer
   - **Fields:** 8 (Event Type, Date/Time, Duration, Venue Location, Guest Count, Performance Type, Music Genre, Special Requests).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

4. **Equipment Rental Inquiry Form**
   - **File:** `/src/components/EquipmentRentalInquiryForm.tsx`
   - **Purpose:** Renting event equipment.
   - **Role:** Buyer
   - **Fields:** 6 static fields + dynamic array of equipment items.
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

5. **Events & Festivals Inquiry Form**
   - **File:** `/src/components/EventsFestivalsInquiryForm.tsx`
   - **Purpose:** Event management and festival booking.
   - **Role:** Buyer
   - **Fields:** 5 (Event Name, Event Type, Date/Time, Expected Attendance, Requirements).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

6. **Venue Inquiry Form**
   - **File:** `/src/components/VenueInquiryForm.tsx`
   - **Purpose:** Booking venues and clubs.
   - **Role:** Buyer
   - **Fields:** 4 (Event Type, Date/Time, Guest Count, Special Requirements).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

7. **Inquiry Preferences Form**
   - **File:** `/src/components/InquiryPreferences.tsx`
   - **Purpose:** Setting quote limits and privacy for an inquiry.
   - **Role:** Buyer
   - **Fields:** 2 (Max Quotations, Confidentiality).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

8. **Location Details Form**
   - **File:** `/src/components/LocationDetails.tsx`
   - **Purpose:** Entering GPS or physical address details.
   - **Role:** Buyer / Shop Provider
   - **Fields:** 5 (Province, City, Area, Address, Radius).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

9. **Login Form**
   - **File:** `/src/pages/Login.tsx`
   - **Purpose:** User authentication.
   - **Role:** All Roles
   - **Fields:** 2 (Email, Password).
   - **Type:** Hardcoded.
   - **Validation:** Custom/None.

10. **Registration Form**
    - **File:** `/src/pages/Register.tsx`
    - **Purpose:** Account creation.
    - **Role:** All Roles
    - **Fields:** 5 (Username, Email, Phone, Password, Confirm Password).
    - **Type:** Hardcoded.
    - **Validation:** Custom/None.

11. **Buyer Profile Edit Form**
    - **File:** `/src/pages/BuyerProfilePage.tsx`
    - **Purpose:** Updating personal buyer details.
    - **Role:** Buyer
    - **Fields:** 8 (Name, Email, Phone, DOB, Country, Province, City, Area).
    - **Type:** Hardcoded.
    - **Validation:** Custom/None.

12. **Shop Profile Edit Form**
    - **File:** `/src/pages/ShopProfilePage.tsx`
    - **Purpose:** Updating business profile and settings.
    - **Role:** Shop/Provider
    - **Fields:** 12 (Name, Description, Email, Phone, Address, etc.).
    - **Type:** Hardcoded.
    - **Validation:** Custom/None.

13. **Quote Submission Form**
    - **File:** `/src/pages/ProviderDashboard.tsx`
    - **Purpose:** Providers submitting a quote to a buyer's inquiry.
    - **Role:** Shop/Provider
    - **Fields:** 9 static fields + dynamic item pricing fields.
    - **Type:** Hardcoded.
    - **Validation:** Custom/None.

14. **Venue Spaces Manager Form**
    - **File:** `/src/pages/VenueSpacesManager.tsx`
    - **Purpose:** Adding/editing specific rooms or spaces within a venue.
    - **Role:** Shop/Provider
    - **Fields:** 6 (Space Name, Capacity, Hourly Rate, Daily Rate, Amenities, Images).
    - **Type:** Hardcoded.
    - **Validation:** Custom/None.

---

## PART 2: INQUIRY FORM SPECIFICALLY

1. **Where is this form located?**
   The inquiry form is not a single file. It is a collection of components rendered dynamically by `/src/pages/BuyerDashboard.tsx`. The default fallback is `/src/components/InquiryForm.tsx`.

2. **What fields does it currently have?**
   The default `InquiryForm.tsx` has: `Images`, `Brand`, `Condition`, `Title`, `Description`, `Quantity`, and `Urgency`.

3. **Does the form change based on shop category?**
   **Yes.** In `/src/pages/BuyerDashboard.tsx`, there is hardcoded conditional logic that swaps the entire React component based on the category string. For example:
   ```typescript
   if (pendingInquiry.categories?.includes('Venues & Clubs')) {
     return <VenueInquiryForm ... />;
   }
   ```

4. **How is the form submitted?**
   Direct DB write. It uses Dexie.js to write directly to IndexedDB: `db.inquiries.add(newInquiry)`.

5. **What data is sent on submission?**
   The exact payload (defined in `/src/types.ts`):
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
     entertainmentData?: any, // Category-specific data
     repairData?: any         // Category-specific data
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

2. **List ALL categories currently in the system:**
   - **Parent Categories:** Electronics, Furniture, Fashion, Home Decor, Automotive, Groceries, Beauty, Construction, Entertainment, Events.
   - **Subcategories:** Mobile Phones & Accessories, Laptops & Computers, Home Appliances, Audio & Video Equipment, Gaming Consoles & Accessories, Living Room Furniture, Bedroom Furniture, Office Furniture, Outdoor & Patio, Men's Clothing, Women's Clothing, Shoes & Footwear, Accessories & Jewelry, Lighting & Lamps, Wall Art & Mirrors, Rugs & Carpets, Curtains & Blinds, Car Parts & Spares, Car Accessories, Motorcycles & Parts, Automotive Tools, Fresh Produce, Pantry Staples, Beverages, Snacks & Sweets, Skincare, Makeup & Cosmetics, Haircare, Fragrances, Building Materials, Plumbing & Fixtures, Electrical Supplies, Hardware & Tools, Events & Festivals, Venues & Clubs, Performers & Artists, Event Equipment Rental, Event Management, Event Catering, Event Planning, Event Venues.

3. **How are categories stored?**
   A hardcoded array in the frontend.

4. **Does each category have metadata attached?**
   Yes, but it is limited to: `id`, `name`, `image` (URL), and `parentId`. There are no field requirements, schemas, or descriptions attached to the category objects.

5. **Is there a category → subcategory relationship?**
   Yes, it is a flat array where subcategories have a `parentId` pointing to the main category (a 1-level deep relationship).

---

## PART 4: STATE MANAGEMENT & DATA FLOW

1. **What state management is being used?**
   - **React Context:** `AuthContext` (user state) and `DashboardContext` (active tab state).
   - **Local State:** `useState` for form inputs.
   - **IndexedDB Hooks:** `useLiveQuery` from `dexie-react-hooks` for reactive database queries.

2. **What data is available in state when opening an inquiry form?**
   The `user` object (buyer profile) and the `pendingInquiry` object, which at that moment contains the `categories` array selected in the previous step.

3. **How is form state managed during multi-step flows?**
   There is a multi-step flow managed in `/src/pages/BuyerDashboard.tsx`. A single local state object `pendingInquiry` accumulates data across steps. The `activeTab` state dictates which step is visible (`category-selection` → `create-inquiry` → `inquiry-items` → `inquiry-preferences` → `location-details`).

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
   Yes, but it uses flat, specific optional columns rather than a generic JSON column. The `Inquiry` interface defines `entertainmentData?: any;` and `repairData?: any;` for this purpose.

3. **How flexible is the current schema?**
   Highly flexible. Because Dexie.js (IndexedDB) is a NoSQL document store, it can store any JSON object. You can add dynamic field data to the DB without running a migration, though TypeScript interfaces would need to be updated to recognize new fields.

---

## PART 6: ASSESSMENT REQUEST

1. **VERDICT**
   **Needs Refactoring.** The current form system is NOT ready to support dynamic category-based forms. It relies heavily on hardcoded React components (`ElectronicsRepairForm`, `VenueInquiryForm`, etc.) and hardcoded `if/else` string-matching logic in the dashboard to render them.

2. **GAP LIST**
   - **No Schema Definitions:** Categories lack JSON schemas defining what fields they require.
   - **No Dynamic Renderer:** There is no generic `<DynamicForm />` component capable of reading a schema and generating inputs.
   - **Hardcoded Routing Logic:** `BuyerDashboard.tsx` routes to forms by checking hardcoded strings (e.g., `categories?.includes('Venues & Clubs')`).
   - **Fragmented Data Storage:** Category-specific data is saved into hardcoded keys (`repairData`, `entertainmentData`) rather than a generic `attributes` or `metadata` object.
   - **No Validation Library:** Forms rely on manual `if (!value) alert()` checks, making dynamic validation impossible in the current state.

3. **RECOMMENDATION**
   The simplest and most maintainable architecture for this specific codebase is a **JSON Schema-driven approach**:
   - **Step 1:** Add a `formSchema` property to the `Category` interface in `CATEGORIES_DB`.
   - **Step 2:** Create a single `DynamicInquiryForm.tsx` component.
   - **Step 3:** Introduce `react-hook-form` to handle the dynamic state and validation based on the schema.
   - **Step 4:** Update the `Inquiry` database interface to replace `repairData` and `entertainmentData` with a single `attributes: Record<string, any>` field.
   - **Step 5:** Update the `renderSpecifications` function in `ProviderDashboard.tsx` to iterate over the new `attributes` object generically.

4. **RISK ASSESSMENT**
   - **Data Corruption/Loss of Access:** Existing inquiries in IndexedDB that use `repairData` or `entertainmentData` will break the UI if the system suddenly expects an `attributes` object. A fallback or migration script is required.
   - **Provider Dashboard Breakage:** The `ProviderDashboard.tsx` contains hardcoded UI blocks that check `if (lead.repairData)`. Changing the data structure will break how providers view existing leads.
   - **String Matching Failures:** If category names are altered during the refactor, the hardcoded routing logic in `BuyerDashboard.tsx` will fail silently, preventing buyers from opening forms.
