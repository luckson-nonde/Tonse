# TONSE Marketplace Documentation

This document provides a comprehensive overview of the user roles, dashboards, and common functionalities within the TONSE Marketplace application.

## 1. User Roles & Account Types

The application supports several distinct user roles, each with specific capabilities and access levels.

### **Buyer (`BUYER`)**
- **Primary Goal:** Discover products/services and create inquiries to receive quotes from local providers.
- **Key Features:** Inquiry creation, quote management, order tracking, and profile management.

### **Seller (`SELLER`)**
- **Primary Goal:** Sell retail products (Electronics, Furniture, Fashion, etc.).
- **Key Features:** Shop management, product catalog, inquiry response, and financial tracking.

### **Supplier (`SUPPLIER`)**
- **Primary Goal:** Supply goods in bulk to local retailers.
- **Key Features:** Bulk product management, B2B inquiries, and supply chain tracking.

### **Service Provider (`SERVICE_PROVIDER`)**
- **Primary Goal:** Offer professional skills (Repairs, Construction, etc.).
- **Key Features:** Service inquiry management, scheduling, and portfolio display.

### **Entertainment (`ENTERTAINMENT`)**
- **Primary Goal:** Promote events, venues, and live performances.
- **Key Features:** Event promotion, venue management, and booking inquiries.

### **Events (`EVENTS`)**
- **Primary Goal:** Rent out and manage equipment or spaces for events.
- **Key Features:** Venue space management, equipment rental tracking, and event scheduling.

---

## 2. Dashboards

### **Buyer Dashboard**
Accessed via `/buyer`. It serves as the central hub for customers.
- **Home:** Overview of active inquiries, recent quotes, and featured shops.
- **My Inquiries:** Manage and track all created inquiries.
- **Quotes:** View and respond to quotations received from providers.
- **Financial:** Track payments, transactions, and escrow status.
- **Profile:** Manage personal details and account settings.

### **Provider Dashboard**
Accessed via `/provider`. Shared by all non-buyer roles (Sellers, Suppliers, Service Providers, etc.).
- **Home:** Overview of new inquiries, active quotes, and revenue stats.
- **Inquiries:** Browse and respond to relevant inquiries in the provider's category.
- **Quotes:** Manage sent quotations and track their status.
- **Products/Services:** Manage the catalog of items or services offered.
- **Financial:** Track earnings, withdrawals, and transaction history.
- **Profile:** Manage shop details, business verification, and social links.
- **Venue Spaces:** (Exclusive to `EVENTS` role) Manage rentable spaces and equipment.

---

## 3. Core Functionalities

### **Inquiry System**
The bridge between Buyers and Providers.
1. **Creation:** Buyers select a category and fill out a dynamic form (schema-based) to specify their needs.
2. **Matching:** Inquiries are routed to Providers based on their registered categories.
3. **Response:** Providers view inquiry details and can send a structured Quotation.

### **Quotation Management**
- **Status Workflow:** `PENDING` → `ACCEPTED` → `PAID` → `COMPLETED`.
- **Details:** Includes price, condition, message, expiry, and itemized breakdown.
- **Collection Codes:** Generated upon payment for secure item/service handover.

### **Financial System**
- **Escrow:** Payments are held in escrow until the service/product is delivered and confirmed.
- **Transactions:** Detailed logs of all `IN` (earnings/deposits) and `OUT` (payments/withdrawals) movements.
- **Verification:** Business verification status (`PENDING`, `VERIFIED`, `REJECTED`) affects financial capabilities.

### **Scheduling & Calendar**
- **Schedules:** Formal agreements for service delivery or product collection.
- **Calendar Events:** Personal or work-related reminders for users to manage their daily operations.

### **Shop & Product Management**
- **Shop Profile:** Includes logo, cover image, description, location (GPS), and social media links (Facebook, TikTok, WhatsApp).
- **Product Management:** Providers can add products with images, prices, and stock levels.

---

## 4. Account Data Structure

Every account (`User` object) contains the following core information:

| Field | Description |
| :--- | :--- |
| `id` | Unique identifier (auto-incremented). |
| `role` | One of the six roles defined above. |
| `name` | Full name or Business name. |
| `email` | Primary contact and login credential. |
| `phone` | Contact number for notifications and verification. |
| `nrc` | National Registration Card number (for verification). |
| `location` | Human-readable address. |
| `categories` | List of operational categories (e.g., "Electronics", "Fashion"). |
| `verificationStatus` | Current status of business verification. |
| `socialLinks` | Links to Facebook, TikTok, and WhatsApp. |
| `storePhotos` | Images of the business front and interior. |

---

## 5. Database Schema (Dexie.js)

The application uses a local IndexedDB (via Dexie) with the following tables:
- `users`: Account information and roles.
- `inquiries`: Customer requests.
- `quotes`: Provider responses to inquiries.
- `transactions`: Financial records.
- `shops`: Public-facing business profiles.
- `products`: Individual items for sale.
- `schedules`: Appointment and delivery tracking.
- `calendarEvents`: User-specific task management.
- `venueSpaces`: Event-specific rental spaces.
