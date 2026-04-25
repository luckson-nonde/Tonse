# Required API Endpoints for Frontend Database Operations

## Overview
This document lists all the API endpoints needed to support frontend database operations (migrated from IndexedDB to API calls).

**API Base URL**: `http://localhost:3001/api`
**Header**: `API-Version: v1` or `API-Version: v2`

---

## Endpoints Required

### Users
```
GET    /users              - Get all users (admin)
GET    /users/:id          - Get specific user
POST   /users              - Create user
PATCH  /users/:id          - Update user
DELETE /users/:id          - Delete user
```

### Inquiries
```
GET    /inquiries              - List all inquiries (with filters)
GET    /inquiries/:id          - Get specific inquiry
POST   /inquiries              - Create inquiry
PATCH  /inquiries/:id          - Update inquiry
DELETE /inquiries/:id          - Delete inquiry
PUT    /inquiries/:id/status   - Bulk update inquiry status
```

**Query Filters**:
```
?buyerId=<id>                    - Filter by buyer
?status=OPEN|CLOSED|ARCHIVED     - Filter by status
?createdAt=asc|desc              - Sort by creation date
?archivedBy=<id>                 - Filter by who archived
?deletedBy=<id>                  - Filter by who deleted
```

### Quotes
```
GET    /quotes                      - List all quotes
GET    /quotes/:id                  - Get specific quote
POST   /quotes                      - Create quote
PATCH  /quotes/:id                  - Update quote
DELETE /quotes/:id                  - Delete quote
PUT    /quotes/:id/status           - Update quote status
```

**Query Filters**:
```
?inquiryId=<id>         - Filter by inquiry
?providerId=<id>        - Filter by provider
?status=DRAFT|OPEN|CLOSED - Filter by status
?collectionCode=<code>  - Find by collection code
?createdAt=asc|desc     - Sort by creation
```

### Transactions
```
GET    /transactions              - List transactions
GET    /transactions/:id          - Get specific transaction
POST   /transactions              - Create transaction
PATCH  /transactions/:id          - Update transaction
DELETE /transactions/:id          - Delete transaction
```

**Query Filters**:
```
?userId=<id>            - Filter by user
?type=IN|OUT            - Filter by type
?category=ESCROW_RELEASE|...  - Filter by category
?status=PENDING|SUCCESS|FAILED - Filter by status
?createdAt=asc|desc     - Sort by date
```

### Shops
```
GET    /shops              - List all shops
GET    /shops/:id          - Get specific shop
POST   /shops              - Create shop
PATCH  /shops/:id          - Update shop
DELETE /shops/:id          - Delete shop
```

**Query Filters**:
```
?providerId=<id>        - Filter by provider
?name=<name>            - Search by name
?category=<cat>         - Filter by category
?location=<loc>         - Filter by location
```

### Products
```
GET    /products              - List all products
GET    /products/:id          - Get specific product
POST   /products              - Create product
PATCH  /products/:id          - Update product
DELETE /products/:id          - Delete product
```

**Query Filters**:
```
?providerId=<id>        - Filter by provider
?category=<cat>         - Filter by category
?status=ACTIVE|INACTIVE - Filter by status
?createdAt=asc|desc     - Sort by date
```

### Schedules
```
GET    /schedules              - List all schedules
GET    /schedules/:id          - Get specific schedule
POST   /schedules              - Create schedule
PATCH  /schedules/:id          - Update schedule
DELETE /schedules/:id          - Delete schedule
```

**Query Filters**:
```
?providerId=<id>        - Filter by provider
?buyerId=<id>           - Filter by buyer
?inquiryId=<id>         - Filter by inquiry
?quoteId=<id>           - Filter by quote
?date=YYYY-MM-DD        - Filter by date
?status=<status>        - Filter by status
```

### Calendar Events
```
GET    /calendar-events           - List events
GET    /calendar-events/:id       - Get specific event
POST   /calendar-events           - Create event
PATCH  /calendar-events/:id       - Update event
DELETE /calendar-events/:id       - Delete event
```

**Query Filters**:
```
?userId=<id>            - Filter by user
?date=YYYY-MM-DD        - Filter by date
?status=<status>        - Filter by status
?category=<cat>         - Filter by category
```

### Audit Logs
```
GET    /audit-logs              - List audit logs
GET    /audit-logs/:id          - Get specific log
POST   /audit-logs              - Create log entry
DELETE /audit-logs/:id          - Delete log
```

**Query Filters**:
```
?providerId=<id>        - Filter by provider
?staffId=<id>           - Filter by staff
?actionType=<type>      - Filter by action type
?timestamp=asc|desc     - Sort by time
?since=<timestamp>      - After date
?until=<timestamp>      - Before date
```

### Purchase Orders
```
GET    /purchase-orders              - List orders
GET    /purchase-orders/:id          - Get specific order
POST   /purchase-orders              - Create order
PATCH  /purchase-orders/:id          - Update order
DELETE /purchase-orders/:id          - Delete order
```

**Query Filters**:
```
?inquiryId=<id>         - Filter by inquiry
?buyerId=<id>           - Filter by buyer
?providerId=<id>        - Filter by provider
?status=<status>        - Filter by status
?createdAt=asc|desc     - Sort by date
```

### Order Confirmations
```
GET    /order-confirmations              - List confirmations
GET    /order-confirmations/:id          - Get specific confirmation
POST   /order-confirmations              - Create confirmation
PATCH  /order-confirmations/:id          - Update confirmation
DELETE /order-confirmations/:id          - Delete confirmation
```

**Query Filters**:
```
?poId=<id>              - Filter by PO
?inquiryId=<id>         - Filter by inquiry
?quoteId=<id>           - Filter by quote
?buyerId=<id>           - Filter by buyer
?providerId=<id>        - Filter by provider
?createdAt=asc|desc     - Sort by date
```

### Delivery Orders
```
GET    /delivery-orders              - List delivery orders
GET    /delivery-orders/:id          - Get specific delivery order
POST   /delivery-orders              - Create delivery order
PATCH  /delivery-orders/:id          - Update delivery order
DELETE /delivery-orders/:id          - Delete delivery order
```

**Query Filters**:
```
?inquiryId=<id>         - Filter by inquiry
?purchaseOrderId=<id>   - Filter by PO
?buyerId=<id>           - Filter by buyer
?sellerId=<id>          - Filter by seller
?status=<status>        - Filter by status
?createdAt=asc|desc     - Sort by date
```

### Venue Spaces
```
GET    /venue-spaces              - List spaces
GET    /venue-spaces/:id          - Get specific space
POST   /venue-spaces              - Create space
PATCH  /venue-spaces/:id          - Update space
DELETE /venue-spaces/:id          - Delete space
```

**Query Filters**:
```
?providerId=<id>        - Filter by provider
?status=AVAILABLE|BOOKED - Filter by status
?createdAt=asc|desc     - Sort by date
```

---

## Response Format

### Success Response
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { /* entity or array */ }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "ErrorType"
}
```

### List Response (v2)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [ /* array of entities */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "metadata": {
    "version": "v2",
    "timestamp": "2026-04-15T12:00:00Z"
  }
}
```

### List Response (v1 - Legacy)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [ /* array of entities */ ],
  "total": 100
}
```

---

## Common Query Parameters

All list endpoints support:
```
?page=1                     - Page number (v2 only)
?limit=10                   - Items per page (v2 only)
?search=<query>             - Full text search
?sort=<field>:asc|desc      - Sort by field
?filter[]=<field>:<value>   - Complex filtering
?include=<relations>        - Include related data
```

---

## Order of Implementation Priority

**Phase 1 (Core)**: Users, Inquiries, Quotes, Transactions
**Phase 2 (Business)**: Shops, Products, Schedules, Orders
**Phase 3 (Advanced)**: Venue Spaces, Audit Logs, Calendar Events

---

## Testing

Use these commands to test endpoints:

```bash
# Test GET with filters
curl -H "API-Version: v2" \
  "http://localhost:3001/api/inquiries?buyerId=1&status=OPEN"

# Test POST
curl -X POST -H "API-Version: v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test"}' \
  "http://localhost:3001/api/inquiries"

# Test PATCH
curl -X PATCH -H "API-Version: v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status":"CLOSED"}' \
  "http://localhost:3001/api/inquiries/1"
```

---

## Next Steps

1. Implement endpoints in NestJS backend
2. Register API versioning middleware in AppModule
3. Run integration tests
4. Deploy and verify all endpoints working
5. Monitor API version usage via logs
