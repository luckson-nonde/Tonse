# TONSE Backend API Documentation

**Status**: ✅ Fully Implemented (10 Modules, 60+ Endpoints)  
**Framework**: NestJS 10.3+  
**Database**: PostgreSQL with TypeORM  
**Authentication**: JWT Bearer Tokens  

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Environment File
Create `.env` in the `backend/` directory:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tonse
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=false

# JWT
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRATION=7d

# Server
PORT=3001
NODE_ENV=development
```

### 3. Start Backend Server
```bash
# Development (with hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server will run on **http://localhost:3001/api**

---

## 📋 API Endpoint Reference

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+263771234567",
  "password": "SecurePassword123!",
  "role": "BUYER",
  "categories": ["electronics", "clothing"]
}

Response: 201 Created
{
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "BUYER"
  },
  "message": "User registered successfully"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response: 200 OK
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "BUYER"
    }
  },
  "message": "Login successful"
}
```

#### Get Current User Profile
```http
GET /api/auth/me
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "BUYER"
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer {refreshToken}

Response: 200 OK
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

---

### Users Endpoints

#### Get All Users (Admin/Filtered)
```http
GET /api/users?role=SELLER&verificationStatus=VERIFIED&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- role: BUYER | SELLER | SUPPLIER | SERVICE_PROVIDER | ENTERTAINMENT | EVENTS
- verificationStatus: PENDING | VERIFIED | REJECTED
- isActive: true | false
- page: integer (default: 1)
- limit: integer (default: 10)

Response: 200 OK
{
  "data": {
    "data": [{ user objects }],
    "total": 150
  }
}
```

#### Get User Profile by ID
```http
GET /api/users/{userId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { user object }
}
```

#### Get My Profile
```http
GET /api/users/profile
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { user object }
}
```

#### Update User Profile
```http
PATCH /api/users/{userId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Name",
  "location": "New Location",
  "categories": ["electronics", "fashion"],
  "socialLinks": "{\"twitter\": \"@handle\", \"instagram\": \"@handle\"}"
}

Response: 200 OK
{
  "data": { updated user object }
}
```

#### Delete User Account
```http
DELETE /api/users/{userId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Inquiries Endpoints

#### Create Inquiry
```http
POST /api/inquiries
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Looking for electronics",
  "description": "Need reliable laptop for work",
  "buyerId": "uuid",
  "category": "Electronics",
  "location": "Harare",
  "latitude": -17.8252,
  "longitude": 31.0335,
  "items": [
    {
      "name": "Laptop",
      "specs": "16GB RAM, 512GB SSD"
    }
  ],
  "preferred": {
    "budget": 5000,
    "brand": "Lenovo"
  },
  "processType": "EXPRESS",
  "status": "OPEN"
}

Response: 201 Created
{
  "data": { inquiry object }
}
```

#### Get All Inquiries (Filtered)
```http
GET /api/inquiries?buyerId={uuid}&status=OPEN&category=Electronics&search=laptop&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- buyerId: Filter by buyer UUID
- status: OPEN | CLOSED
- category: Filter by category
- search: Search in title/description
- page: integer (default: 1)
- limit: integer (default: 10)
- sort: Field name (default: createdAt)
- order: ASC | DESC (default: DESC)

Response: 200 OK
{
  "data": {
    "data": [{ inquiry objects }],
    "total": 45
  }
}
```

#### Get Inquiries by Buyer
```http
GET /api/inquiries/buyer/{buyerId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ inquiry objects }]
}
```

#### Get Single Inquiry
```http
GET /api/inquiries/{inquiryId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { inquiry object }
}
```

#### Update Inquiry
```http
PATCH /api/inquiries/{inquiryId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "CLOSED"
}

Response: 200 OK
{
  "data": { updated inquiry object }
}
```

#### Update Inquiry Status
```http
PATCH /api/inquiries/{inquiryId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "CLOSED"
}

Response: 200 OK
{
  "data": { updated inquiry object }
}
```

#### Delete Inquiry
```http
DELETE /api/inquiries/{inquiryId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Quotes Endpoints

#### Create Quote
```http
POST /api/quotes
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "inquiryId": "uuid",
  "inquiryTitle": "Looking for electronics",
  "providerId": "uuid",
  "providerName": "Tech Store",
  "price": 4500,
  "condition": "New",
  "message": "We have this item in stock",
  "status": "PENDING",
  "expiryDuration": "7 days",
  "itemPrices": [
    {
      "item": "Laptop",
      "price": 4500
    }
  ],
  "collectionCode": "COL123456"
}

Response: 201 Created
{
  "data": { quote object }
}
```

#### Get All Quotes
```http
GET /api/quotes?inquiryId={uuid}&status=ACCEPTED&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- inquiryId: Filter by inquiry
- providerId: Filter by provider
- status: PENDING | ACCEPTED | REJECTED | PAID | COMPLETED | etc.
- search: Search by provider name or inquiry title
- page, limit, sort, order: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ quote objects }],
    "total": 15
  }
}
```

#### Get Quotes for Inquiry
```http
GET /api/quotes/inquiry/{inquiryId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ quote objects }]
}
```

#### Get Quotes by Provider
```http
GET /api/quotes/provider/{providerId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ quote objects }]
}
```

#### Get Single Quote
```http
GET /api/quotes/{quoteId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { quote object }
}
```

#### Update Quote
```http
PATCH /api/quotes/{quoteId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "price": 4200,
  "message": "Updated price"
}

Response: 200 OK
{
  "data": { updated quote object }
}
```

#### Update Quote Status
```http
PATCH /api/quotes/{quoteId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "ACCEPTED"
}

Response: 200 OK
{
  "data": { updated quote object }
}
```

#### Mark Quote as Read
```http
PATCH /api/quotes/{quoteId}/read
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { updated quote object with isRead: true }
}
```

#### Archive Quote
```http
PATCH /api/quotes/{quoteId}/archive
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { updated quote object with isArchived: true }
}
```

#### Delete Quote
```http
DELETE /api/quotes/{quoteId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Products Endpoints

> **Relationship to Shops:** products key off `sellerId` only — there is **no `shopId`** on a product. A shop is the seller's storefront (`shops.sellerId` is unique, one shop per seller), so "a shop's products" = `GET /products/seller/{sellerId}` using the shop's `sellerId`. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

#### Create Product
```http
POST /api/products
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "sellerId": "uuid",
  "name": "Premium Laptop",
  "description": "High-performance laptop for professionals",
  "category": "Electronics",
  "subCategory": "Computers",
  "price": 4500,
  "originalPrice": 5000,
  "stock": 10,
  "images": ["url1", "url2"],
  "brand": "Lenovo",
  "condition": "New",
  "attributes": {
    "processor": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}

Response: 201 Created
{
  "data": { product object }
}
```

#### Get All Products (Public)
```http
GET /api/products?category=Electronics&search=laptop&page=1&limit=20

Query Parameters:
- sellerId: Filter by seller
- category: Filter by category
- search: Search in name/description
- isActive: true | false
- page, limit, sort, order: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ product objects }],
    "total": 250
  }
}
```

#### Get Products by Seller
```http
GET /api/products/seller/{sellerId}

Response: 200 OK
{
  "data": [{ product objects }]
}
```

#### Get Products by Category
```http
GET /api/products/category/{category}

Response: 200 OK
{
  "data": [{ product objects }]
}
```

#### Get Single Product (Increments View Count)
```http
GET /api/products/{productId}

Response: 200 OK
{
  "data": { product object with viewCount incremented }
}
```

#### Update Product
```http
PATCH /api/products/{productId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "price": 4200,
  "stock": 8,
  "isActive": true
}

Response: 200 OK
{
  "data": { updated product object }
}
```

#### Update Product Stock
```http
PATCH /api/products/{productId}/stock
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "quantity": 5
}

Response: 200 OK
{
  "data": { updated product object with reduced stock }
}
```

#### Delete Product
```http
DELETE /api/products/{productId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Shops Endpoints

> **Relationship to Products:** a shop is a seller's storefront — `shops.sellerId` is unique (OneToOne, one shop per seller). Products are **not** linked to shops directly (no `shopId` FK); both key off the seller, so a shop's catalog is `GET /products/seller/{sellerId}`. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

#### Create Shop
```http
POST /api/shops
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "sellerId": "uuid",
  "name": "Tech Store",
  "description": "Your trusted electronics store",
  "logo": "logo_url",
  "coverImage": "cover_url",
  "location": "Harare CBD",
  "latitude": -17.8252,
  "longitude": 31.0335,
  "socialLinks": {
    "facebook": "https://facebook.com/techstore",
    "instagram": "@techstore"
  },
  "contactInfo": {
    "phone": "+263771234567",
    "email": "info@techstore.com",
    "website": "https://techstore.com"
  }
}

Response: 201 Created
{
  "data": { shop object }
}
```

#### Get All Shops (Public)
```http
GET /api/shops?search=tech&isActive=true&page=1&limit=20

Query Parameters:
- search: Search in name/description
- isActive: true | false
- page, limit, sort, order: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ shop objects }],
    "total": 500
  }
}
```

#### Get Shop by Seller ID
```http
GET /api/shops/seller/{sellerId}

Response: 200 OK
{
  "data": { shop object }
}
```

#### Get Single Shop
```http
GET /api/shops/{shopId}

Response: 200 OK
{
  "data": { shop object }
}
```

#### Update Shop
```http
PATCH /api/shops/{shopId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "description": "Updated description",
  "contactInfo": {
    "phone": "+263771234567"
  }
}

Response: 200 OK
{
  "data": { updated shop object }
}
```

#### Follow Shop
```http
PATCH /api/shops/{shopId}/follow
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { shop object with followerCount incremented }
}
```

#### Unfollow Shop
```http
PATCH /api/shops/{shopId}/unfollow
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { shop object with followerCount decremented }
}
```

#### Delete Shop
```http
DELETE /api/shops/{shopId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Orders Endpoints

#### Create Order
```http
POST /api/orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "quoteId": "uuid",
  "buyerId": "uuid",
  "sellerId": "uuid",
  "totalAmount": 4500,
  "deliveryFee": 100,
  "status": "PENDING",
  "shippingAddress": "123 Main St, Harare",
  "notes": "Please handle with care",
  "items": [
    {
      "productId": "uuid",
      "name": "Laptop",
      "quantity": 1,
      "price": 4500
    }
  ]
}

Response: 201 Created
{
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-1712345600-ABC123",
    "status": "PENDING",
    ...
  }
}
```

#### Get All Orders
```http
GET /api/orders?buyerId={uuid}&status=CONFIRMED&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- buyerId: Filter by buyer
- sellerId: Filter by seller
- status: PENDING | CONFIRMED | SHIPPED | DELIVERED | COMPLETED | CANCELLED
- search: Search by order number
- page, limit, sort, order: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ order objects }],
    "total": 45
  }
}
```

#### Get My Orders (Buyer)
```http
GET /api/orders/buyer/{buyerId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ order objects }]
}
```

#### Get My Orders (Seller)
```http
GET /api/orders/seller/{sellerId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ order objects }]
}
```

#### Get Single Order
```http
GET /api/orders/{orderId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { order object }
}
```

#### Update Order
```http
PATCH /api/orders/{orderId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "shippingAddress": "New Address",
  "notes": "Updated notes"
}

Response: 200 OK
{
  "data": { updated order object }
}
```

#### Update Order Status
```http
PATCH /api/orders/{orderId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "SHIPPED"
}

Response: 200 OK
{
  "data": { updated order object }
}
```

#### Update Tracking Number
```http
PATCH /api/orders/{orderId}/tracking
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "trackingNumber": "TRACK12345"
}

Response: 200 OK
{
  "data": { updated order object }
}
```

#### Update Delivery Date
```http
PATCH /api/orders/{orderId}/delivery-date
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "deliveryDate": "2026-04-20T00:00:00Z"
}

Response: 200 OK
{
  "data": { updated order object }
}
```

#### Delete Order
```http
DELETE /api/orders/{orderId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Payments Endpoints

#### Create Payment
```http
POST /api/payments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "uuid",
  "type": "DEPOSIT",
  "amount": 5000,
  "fee": 150,
  "status": "PENDING",
  "externalReference": "LENCO-txn-12345",
  "paymentMethod": "mobile_money",
  "description": "Deposit for orders",
  "metadata": {
    "orderId": "uuid",
    "provider": "Lenco"
  }
}

Response: 201 Created
{
  "data": {
    "id": "uuid",
    "transactionId": "TXN-1712345600-ABC123",
    "status": "PENDING",
    ...
  }
}
```

#### Get All Payments
```http
GET /api/payments?userId={uuid}&type=PAYMENT&status=SUCCESS&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- userId: Filter by user
- type: DEPOSIT | PAYMENT | WITHDRAWAL | REFUND | TRANSFER
- status: PENDING | SUCCESS | FAILED | CANCELLED
- search: Search by transaction ID
- page, limit, sort, order: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ payment objects }],
    "total": 120
  }
}
```

#### Get User Payments
```http
GET /api/payments/user/{userId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ payment objects }]
}
```

#### Get Payments by Type
```http
GET /api/payments/type/{type}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ payment objects }]
}
```

#### Get Single Payment
```http
GET /api/payments/{paymentId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { payment object }
}
```

#### Update Payment
```http
PATCH /api/payments/{paymentId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "metadata": {
    "orderId": "uuid"
  }
}

Response: 200 OK
{
  "data": { updated payment object }
}
```

#### Update Payment Status
```http
PATCH /api/payments/{paymentId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "SUCCESS"
}

Response: 200 OK
{
  "data": { updated payment object }
}
```

#### Delete Payment
```http
DELETE /api/payments/{paymentId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Schedules Endpoints

#### Create Schedule
```http
POST /api/schedules
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "uuid",
  "title": "Product Delivery",
  "description": "Deliver order #ORD-123",
  "date": "2026-04-20",
  "startTime": "09:00",
  "endTime": "17:00",
  "type": "DELIVERY",
  "location": "123 Main St, Harare",
  "status": "PENDING",
  "metadata": {
    "orderId": "uuid"
  }
}

Response: 201 Created
{
  "data": { schedule object }
}
```

#### Get All Schedules
```http
GET /api/schedules?userId={uuid}&type=DELIVERY&status=CONFIRMED&page=1&limit=20
Authorization: Bearer {accessToken}

Query Parameters:
- userId: Filter by user
- type: DELIVERY | MEETING | SERVICE | REMINDER | OTHER
- status: PENDING | CONFIRMED | CANCELLED | COMPLETED
- dateFrom: Start date (YYYY-MM-DD)
- dateTo: End date (YYYY-MM-DD)
- page, limit: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ schedule objects }],
    "total": 30
  }
}
```

#### Get User Schedules
```http
GET /api/schedules/user/{userId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ schedule objects }]
}
```

#### Get Schedules by Date Range
```http
GET /api/schedules/user/{userId}/range?dateFrom=2026-04-15&dateTo=2026-04-30
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ schedule objects }]
}
```

#### Get Single Schedule
```http
GET /api/schedules/{scheduleId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { schedule object }
}
```

#### Update Schedule
```http
PATCH /api/schedules/{scheduleId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Updated Title",
  "date": "2026-04-21",
  "status": "CONFIRMED"
}

Response: 200 OK
{
  "data": { updated schedule object }
}
```

#### Update Schedule Status
```http
PATCH /api/schedules/{scheduleId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "COMPLETED"
}

Response: 200 OK
{
  "data": { updated schedule object }
}
```

#### Delete Schedule
```http
DELETE /api/schedules/{scheduleId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Audit Endpoints

#### Get All Audit Logs
```http
GET /api/audit?userId={uuid}&action=CREATE&entityType=Order&page=1&limit=50
Authorization: Bearer {accessToken}

Query Parameters:
- userId: Filter by user who performed action
- action: CREATE | UPDATE | DELETE | etc.
- entityType: Order | Product | Quote | etc.
- entityId: Filter by entity ID
- dateFrom, dateTo: Date range filtering
- page, limit: Standard pagination

Response: 200 OK
{
  "data": {
    "data": [{ audit log objects }],
    "total": 1200
  }
}
```

#### Create Audit Log (System)
```http
POST /api/audit
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "uuid",
  "action": "UPDATE",
  "entityType": "Order",
  "entityId": "uuid",
  "changes": "{\"status\": [\"PENDING\", \"CONFIRMED\"]}",
  "status": "SUCCESS",
  "reason": "Status updated by seller",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}

Response: 201 Created
{
  "data": { audit log object }
}
```

#### Get Audit Logs by User
```http
GET /api/audit/user/{userId}?limit=50
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ audit log objects }]
}
```

#### Get Audit Logs by Entity
```http
GET /api/audit/entity/{entityType}/{entityId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ audit log objects }]
}
```

#### Get Audit Logs by Action
```http
GET /api/audit/action/{action}?limit=50
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": [{ audit log objects }]
}
```

#### Get Single Audit Log
```http
GET /api/audit/{logId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "data": { audit log object }
}
```

---

## 🔐 Authentication

### Getting Started
1. First, register a new user with `/api/auth/register`
2. Login with `/api/auth/login` to get JWT tokens
3. Include the `accessToken` in all subsequent requests

### Header Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh
When access token expires, use the refresh token:
```http
POST /api/auth/refresh
Authorization: Bearer {refreshToken}
```

---

## 📊 Response Format

### Success Response
```json
{
  "data": { /* Response data */ },
  "message": "Operation successful",
  "statusCode": 200
}
```

### Error Response
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2026-04-15T10:30:00Z"
}
```

### Pagination Response
```json
{
  "data": {
    "data": [ /* Items array */ ],
    "total": 150
  },
  "message": "Success",
  "statusCode": 200
}
```

---

## 🛠️ Common Query Parameters

All list endpoints support these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Integer | 1 | Page number for pagination |
| `limit` | Integer | 10 | Items per page |
| `sort` | String | createdAt | Field to sort by |
| `order` | String | DESC | Sort order (ASC or DESC) |
| `search` | String | - | Full-text search |

---

## 💡 Usage Examples

### Example 1: Complete Order Workflow

```bash
# 1. Register & Login
POST /api/auth/register         # Create account
POST /api/auth/login             # Get tokens

# 2. Browse Products  
GET /api/products?category=Electronics

# 3. Create Inquiry
POST /api/inquiries              # Post what you need

# 4. Review Quotes
GET /api/inquiries/{id}          # Check responses
GET /api/quotes/inquiry/{id}     # See all quotes

# 5. Accept Quote & Order
PATCH /api/quotes/{id}/status    # Accept quote
POST /api/orders                 # Create order

# 6. Make Payment
POST /api/payments               # Initiate payment
PATCH /api/payments/{id}/status  # Confirm payment

# 7. Track Order
PATCH /api/orders/{id}/status    # Update progress
GET /api/schedules/user/me       # View scheduled delivery
```

### Example 2: Seller Shop Setup

```bash
# 1. Create Shop
POST /api/shops                  # Create shop profile

# 2. Add Products
POST /api/products               # List products
POST /api/products               # Add another product

# 3. Manage Quotes
GET /api/quotes/provider/{id}    # See all quotes sent
PATCH /api/quotes/{id}/status    # Accept/Reject

# 4. Fulfill Orders
GET /api/orders/seller/{id}      # See orders
PATCH /api/orders/{id}/tracking  # Add tracking info
PATCH /api/orders/{id}/status    # Update progress
```

---

## 📝 Environment Setup

See `.env.example` in the backend folder for all available environment variables.

Key variables to set:
- `JWT_SECRET` - 32+ character secret key for signing JWTs
- `JWT_EXPIRATION` - How long access tokens last (e.g., "1h")
- `DATABASE_*` - PostgreSQL connection details
- `PORT` - Server port (default 3001)

---

## ⚠️ Important Notes

1. **All protected endpoints require JWT authentication** - Always include `Authorization: Bearer {accessToken}` header
2. **User authorization** - Users can only update/delete their own data (enforced on backend)
3. **Status codes matter** - 201 for POST, 204 for DELETE, 200 for GET/PATCH
4. **Pagination required** - Always use `page` and `limit` for list endpoints
5. **Validation errors** - Invalid data returns 400 with field-specific error messages
6. **Rate limiting** - Will be implemented in production (not in dev)

---

## 🚀 Testing Tools

Recommended tools for testing the API:

- **Postman** - GUI for API testing
- **Insomnia** - Alternative to Postman
- **curl** - Command-line tool
- **VS Code REST Client** - Plugin-based testing

Example curl command:
```bash
curl -X GET "http://localhost:3001/api/inquiries?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

---

**Last Updated**: April 15, 2026  
**Status**: ✅ Ready for Testing
