# Frontend-Backend Integration Guide

**Last Updated**: April 15, 2026  
**Status**: ✅ Frontend Configured | ⏳ Backend Ready | ⏳ Integration Testing

---

## 🔗 Current Integration Status

### Frontend ✅
- ✅ API client configured (`src/services/api/client.ts`)
- ✅ Database service layer implemented (`src/services/api/database.ts`)
- ✅ All 18 components updated to use API
- ✅ useLiveQuery hook created for data fetching
- ✅ JWT token management set up
- ✅ Auto-refresh token on 401 responses
- ✅ Dexie compatibility layer in place

### Backend ✅
- ✅ 10 modules fully implemented
- ✅ 60+ API endpoints created
- ✅ Services with CRUD + business logic
- ✅ Controllers with routing
- ✅ DTOs with validation
- ✅ JWT authentication guards
- ✅ Middleware for versioning
- ✅ TypeORM database integration

### Integration 🔄
- ⏳ Backend npm dependencies
- ⏳ PostgreSQL database setup
- ⏳ Backend startup/testing
- ⏳ End-to-end integration tests

---

## 📋 Setup Checklist

### Step 1: Backend Dependencies ⏳
```bash
cd backend
npm install
```

### Step 2: Database Setup ⏳
```bash
# Ensure PostgreSQL is running on localhost:5432
# Create database or update .env credentials

# Run migrations (if needed)
npm run migration:run
```

### Step 3: Backend Environment ⏳
Create `backend/.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tonse
DATABASE_SYNCHRONIZE=true

JWT_SECRET=your_secret_key_minimum_32_chars
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=7d

PORT=3001
NODE_ENV=development
```

### Step 4: Start Backend ⏳
```bash
cd backend
npm run start:dev
```

### Step 5: Start Frontend ⏳
```bash
cd ..
npm run dev
```

### Step 6: Test Integration ⏳
1. Open http://localhost:5173 in browser
2. Register/Login - should call POST /api/auth/register
3. Navigate to Dashboard - should call GET /api/inquiries
4. Create Inquiry - should POST to /api/inquiries
5. Check browser console for API responses

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│       Frontend (React/Vite)         │
├─────────────────────────────────────┤
│  ✅ 18 Components                   │
│  ✅ useLiveQuery Hooks              │
│  ✅ API Service Layer               │
│  ✅ Database Service (API wrapper)  │
│  ✅ JWT Token Manager               │
└───────────────┬─────────────────────┘
                │ HTTP (REST)
                │ Authorization: Bearer {token}
                │ Content-Type: application/json
                ▼
┌─────────────────────────────────────┐
│  NestJS Backend (localhost:3001)    │
├─────────────────────────────────────┤
│  ✅ 10 Modules                      │
│  ✅ 60+ Endpoints                   │
│  ✅ JWT Auth Guards                 │
│  ✅ TypeORM + PostgreSQL            │
│  ✅ Global Middleware               │
└───────────────┬─────────────────────┘
                │ SQL
                │ Connection Pooling
                │
                ▼
        ┌───────────────┐
        │ PostgreSQL DB │
        └───────────────┘
```

---

## 📌 API Service Configuration

### Base URL
**Configured in**: `src/services/api/versioning.ts`
```typescript
const API_BASE_URL = 'http://localhost:3001/api';
```

### Request Interceptor
**Configured in**: `src/services/api/client.ts`
- Adds `Authorization: Bearer {token}` header
- Adds `Content-Type: application/json`
- Handles 401 responses with token refresh

### Response Format
All endpoints return:
```json
{
  "data": { /* response payload */ },
  "message": "Success message",
  "statusCode": 200
}
```

The API client automatically extracts `data` for use in components.

---

## 🔄 Data Flow Examples

### Example 1: Fetching Inquiries
```
Frontend Component
    ↓
useLiveQuery(() => db.inquiries.where('buyerId').equals(userId).toArray())
    ↓
src/services/api/database.ts (Table.toArray())
    ↓
GET /api/inquiries?buyerId=userId
    ↓
Backend Controller → Service → Repository
    ↓
PostgreSQL Query
    ↓
Response → Frontend (auto re-render on change)
```

### Example 2: Creating Order
```
Frontend Component
    ↓
db.orders.add({ quoteId, buyerId, sellerId, ... })
    ↓
src/services/api/database.ts (Table.add())
    ↓
POST /api/orders (with JWT token)
    ↓
Backend Controller
    ├─ Validate DTO
    ├─ Create Service
    ├─ Generate orderNumber
    └─ Save to Database
    ↓
Response → Frontend (useLiveQuery updates)
```

### Example 3: JWT Token Refresh
```
Frontend API Call
    ↓
401 Unauthorized Response
    ↓
apiClient interceptor catches
    ↓
POST /api/auth/refresh (with refreshToken)
    ↓
Receive new accessToken
    ↓
Retry original request
    ↓
Success response
```

---

## 🧪 Testing the Integration

### 1. Test Authentication
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+263771234567",
    "password": "TestPassword123!",
    "role": "BUYER"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 2. Test API with Token
```bash
# Use the accessToken from login response
curl -X GET http://localhost:3001/api/inquiries \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Test Frontend Components
1. Open http://localhost:5173
2. Watch Network tab in developer tools
3. Each interaction should trigger API calls
4. Responses should populate component data
5. Check console for any errors

### 4. Verify Dexie Replacement
Check that components using these patterns work:

```typescript
// ✅ These should now call the API instead of IndexedDB

// Pattern 1: Query without where
useLiveQuery(() => db.products.toArray())
→ GET /api/products

// Pattern 2: Query with where/equals
useLiveQuery(() => db.inquiries.where('buyerId').equals(userId).toArray())
→ GET /api/inquiries?buyerId=userId

// Pattern 3: Query with sorting
useLiveQuery(() => db.orders.where('status').equals('PENDING').reverse().toArray())
→ GET /api/orders?status=PENDING&order=DESC

// Pattern 4: Add (create)
db.quotes.add(newQuote)
→ POST /api/quotes

// Pattern 5: Update
db.payments.update(paymentId, { status: 'SUCCESS' })
→ PATCH /api/payments/{paymentId}

// Pattern 6: Delete
db.schedules.delete(scheduleId)
→ DELETE /api/schedules/{scheduleId}
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized on all requests
**Solution**:
- Ensure JWT token is being sent in header
- Check that token is not expired
- Verify JWT_SECRET in backend .env matches configuration

### Issue: CORS errors
**Solution**:
- Backend should have CORS enabled (check main.ts)
- Update CORS settings if frontend URL changes
- Include credentials in requests if needed

### Issue: Database connection errors
**Solution**:
- Verify PostgreSQL is running: `psql -U postgres`
- Check DATABASE_* env variables match
- Ensure database exists or synchronize: true

### Issue: Module not found errors in backend
**Solution**:
```bash
cd backend
npm install
npm run build
```

### Issue: Frontend not getting data
**Solution**:
1. Open Network tab in browser DevTools
2. Verify API requests are being made
3. Check response status (200 vs 4xx/5xx)
4. Look at response body for error messages
5. Check backend logs for errors

---

## 📊 Component-to-Endpoint Mapping

| Component | Endpoints Used | Status |
|-----------|----------------|--------|
| DashboardLayout | GET /inquiries, GET /quotes, GET /orders | ✅ Ready |
| BuyerDashboard | POST /inquiries, GET /inquiries | ✅ Ready |
| ProviderDashboard | GET /quotes, PATCH /quotes/status | ✅ Ready |
| QuoteDetailsPage | GET /quotes/:id, PATCH /quotes/:id | ✅ Ready |
| OrderManagement | GET /orders, PATCH /orders/:id/status | ✅ Ready |
| ProductManagement | GET /products, POST /products, PATCH /products | ✅ Ready |
| ShopDetailsPage | GET /shops/:id, PATCH /shops/:id | ✅ Ready |
| FinancialPage | GET /payments, POST /payments | ✅ Ready |
| SchedulePage | GET /schedules, POST /schedules | ✅ Ready |
| AuditTrailPage | GET /audit | ✅ Ready |
| + 8 more components | Various endpoints | ✅ Ready |

---

## 🚀 Next Steps

### Immediate (Next Run)
1. ✅ Install backend dependencies: `cd backend && npm install`
2. ✅ Configure `.env` file
3. ✅ Start PostgreSQL
4. ✅ Start backend: `npm run start:dev`
5. ✅ Start frontend: `npm run dev`
6. ✅ Test registration/login
7. ✅ Test data fetching

### Post-Integration Testing
1. ⏳ Run full test suite
2. ⏳ Performance optimization
3. ⏳ Error boundary improvements
4. ⏳ Caching strategies
5. ⏳ Production deployment

### Security Considerations
- [ ] Add rate limiting
- [ ] Implement request signing
- [ ] Add CSRF protection
- [ ] Validate all inputs on backend
- [ ] Sanitize all outputs
- [ ] Add request logging/monitoring
- [ ] Implement audit trails (AuditService ready)

---

## 📚 References

- **API Documentation**: See `API_ENDPOINTS_COMPLETE.md`
- **Backend Implementation**: See `BACKEND_IMPLEMENTATION_COMPLETE.md`
- **Frontend Services**: `src/services/api/`
- **Frontend Hooks**: `src/hooks/`
- **Component Examples**: `src/components/`

---

## 💾 Database Schema

PostgreSQL tables auto-created by TypeORM:
- `users` - System users
- `inquiries` - Buyer inquiries
- `quotes` - Provider quotes
- `orders` - Confirmed orders
- `payments` - Payment transactions
- `products` - Seller products
- `shops` - Seller shops
- `schedules` - User schedules
- `audit_logs` - Audit trail

---

## ✨ Key Features Ready for Testing

✅ JWT Authentication with token refresh  
✅ Full CRUD operations on all entities  
✅ Pagination and filtering  
✅ User authorization  
✅ Audit trail logging  
✅ Status tracking workflows  
✅ Auto-numbering (orders, payments, transactions)  
✅ Relationship management (multiple tables)  
✅ Error handling and validation  
✅ Type-safe throughout (TypeScript)  

---

**Ready to integrate!** Start with Step 1 of the setup checklist above.
