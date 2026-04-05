# Inquiry Form Generation Analysis

This document provides an analysis of how inquiry forms are generated and managed within the TONSE Marketplace application.

## 1. Form Generation Mechanism

The inquiry forms in this application are **(B) Schema-driven using a `FieldSchema[]` array**.

### How it works:
- **Dynamic Rendering:** The application uses a central component, `src/components/DynamicInquiryForm.tsx`, which accepts a `schema` prop of type `FieldSchema[]`.
- **Schema Definition:** Each category in the marketplace can have its own unique form schema. These schemas define the fields, their types (text, number, select, multiselect, date, image), validation rules, and grouping.
- **Fallback Mechanism:** If a specific category does not have a defined schema, the application defaults to a `GENERIC_FALLBACK_SCHEMA`.
- **Category Registry:** The `CATEGORIES_DB` in `src/services/categories.ts` maps category IDs to their respective schemas.

## 2. Schema Definition File

The primary file where category schemas are defined is:
**`/src/services/categories.ts`**

This file contains:
- The `FieldSchema` interface.
- Numerous constant arrays (e.g., `mobilePhonesBuySchema`, `equipmentRentalSchema`) that define the form structure for different categories.
- The `BASE_CATEGORIES_DB` and `CATEGORIES_DB` which link categories to these schemas.
- The `RENTAL_CATALOG_ITEMS` array, which contains specialized schemas for specific rental equipment.

## 3. Schema Count

Based on a detailed analysis of `src/services/categories.ts`:

- **Explicit Schema Definitions:** There are **73** distinct `FieldSchema[]` arrays defined as constants (e.g., `const someCategorySchema: FieldSchema[] = [...]`).
- **Inline Schemas:** There are **5** additional schemas defined inline within the `RENTAL_CATALOG_ITEMS` array.
- **Total Schemas:** Approximately **78** unique form schemas exist in the codebase.

---

## 4. Application Data Structure

The application uses **Dexie.js** (IndexedDB) for local data persistence. There are no active Firestore collections in the current implementation.

### Dexie Tables (from `src/db.ts`):
1.  **`users`**: Stores user profiles, roles, and authentication details.
2.  **`inquiries`**: Stores buyer inquiries generated from the dynamic forms.
3.  **`quotes`**: Stores seller responses to inquiries.
4.  **`transactions`**: Tracks payments, escrow holdings, and financial history.
5.  **`shops`**: Stores business details for sellers and service providers.
6.  **`products`**: Stores individual items/services offered by providers.
7.  **`schedules`**: Manages appointments and collection timings.
8.  **`calendarEvents`**: General calendar management for users.
9.  **`venueSpaces`**: Specific data for venue-related providers.

### Key TypeScript Interfaces (from `src/types.ts` and `src/AuthContext.tsx`):
- **`User`**: `id`, `role`, `name`, `email`, `phone`, `location`, `verificationStatus`, `pin`, etc.
- **`Inquiry`**: `id`, `buyerId`, `categoryId`, `formData` (dynamic object), `status`, `createdAt`.
- **`Quote`**: `id`, `inquiryId`, `providerId`, `price`, `description`, `status`, `collectionCode`.
- **`Transaction`**: `id`, `userId`, `type` (DEPOSIT/WITHDRAWAL/ESCROW), `amount`, `status`, `quoteId`.

---

## 5. Navigation Flow

The application features a role-based navigation system:

### Main Pages:
- `/`: Landing Page / Role Selection
- `/login` & `/register`: Authentication
- `/verification-pending`: Post-registration status

### Buyer Flow:
- `/buyer`: Dashboard (Overview of inquiries and quotes)
- `/buyer/categories`: Category selection for new inquiries
- `/buyer/inquiry/:categoryId`: Dynamic inquiry form
- `/buyer/quotes/:inquiryId`: View quotes for an inquiry
- `/buyer/payment`: Escrow payment initiation
- `/buyer/payment-success`: QR code and PIN generation
- `/buyer/profile`: Personal profile management

### Provider Flow (Seller/Supplier/Service):
- `/provider`: Dashboard (New inquiries and active quotes)
- `/provider/inquiries/:id`: View inquiry details and submit quote
- `/provider/collection`: QR code scanner for releasing escrow
- `/provider/financial`: Earnings and escrow balance management
- `/provider/profile`: Shop/Business profile management

---

## 6. Payment & Escrow Logic

1.  **Payment Initiation:** Handled in `src/pages/PaymentPage.tsx`. Buyers pay via Card or Mobile Money.
2.  **Escrow Holding:** Upon payment, a transaction is created in `db.transactions` with status `ESCROW`.
3.  **Collection PIN/QR:** `src/pages/PaymentSuccessPage.tsx` generates a 6-digit `collectionCode` and a corresponding QR code.
4.  **Fund Release:** The seller scans the QR code using `src/pages/CollectionPage.tsx`. This updates the quote status to `COMPLETED` and marks the escrow transaction as `RELEASED`.
5.  **Security PIN:** `src/components/PinModal.tsx` is used to gate access to the `FinancialPage.tsx`, ensuring only the account owner can view or withdraw funds.
