# QUICK START - 5 Steps to Test

**Time to working system**: ~20 minutes (with npm install)

---

## 🎯 What's Done

✅ **Backend**: 10 modules, 60+ endpoints, all implemented  
✅ **Frontend**: All 18 components updated to use API  
✅ **API Layer**: Client, database service, hooks ready  
✅ **Documentation**: Complete guides available  

---

## ⚡ 5-Step Setup

### Step 1: Install Backend (npm install)
```bash
cd backend
npm install
```
**Time**: 5-10 minutes (depends on internet speed)

### Step 2: Create Environment File
Create `backend/.env` (copy the structure below):
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tonse
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=false

JWT_SECRET=your_secret_key_here_minimum_32_characters
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRATION=7d

PORT=3001
NODE_ENV=development
```
**Time**: 2 minutes

### Step 3: Start Backend
```bash
npm run start:dev
```
**Expected output**: Should see "NestJS server running on port 3001"

**Time**: 1 minute

### Step 4: Start Frontend
```bash
cd ..  # Back to root
npm run dev
```
**Expected output**: Local dev server running on http://localhost:5173

**Time**: 1 minute

### Step 5: Test Integration
1. Open http://localhost:5173 in browser
2. Click "Register" → Create account
3. Login with new credentials
4. Create an inquiry or browse products
5. Open DevTools Network tab → See API calls to http://localhost:3001/api

**Time**: 5 minutes

---

## 🧪 Quick Tests (Copy-Paste)

### Test 1: Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+263771234567",
    "password": "TestPass123!",
    "role": "BUYER"
  }'
```

### Test 2: Login (Get Token)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Copy the `accessToken` from response for next test**

### Test 3: Get Inquiries
```bash
curl -X GET http://localhost:3001/api/inquiries \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## 📚 Documentation

Read these in order:

1. **IMPLEMENTATION_COMPLETE.md** (This folder)
   - Overall status and summary

2. **API_ENDPOINTS_COMPLETE.md** (This folder)
   - Reference for all 60+ endpoints
   - Examples for each endpoint
   - Response formats

3. **BACKEND_IMPLEMENTATION_COMPLETE.md** (This folder)
   - What was implemented
   - Module details
   - Database schema

4. **FRONTEND_BACKEND_INTEGRATION.md** (This folder)
   - How frontend connects to backend
   - Data flow diagrams
   - Troubleshooting guide

---

## ❌ If Something Breaks

### Backend won't start?
```bash
# Check if npm install worked
cd backend
npm ls @nestjs/common

# Try clearing node_modules
rm -r node_modules package-lock.json
npm install
npm run start:dev
```

### Frontend won't connect to backend?
- Make sure backend is running on port 3001
- Check if browser can reach it: http://localhost:3001/api/auth/me
- Look in browser Network tab for failed requests
- Check browser Console for error messages

### Database error?
- Verify PostgreSQL is running
- Check DATABASE_* variables in .env
- Try creating the database manually (if needed)

### Still stuck?
See **FRONTEND_BACKEND_INTEGRATION.md** Troubleshooting section

---

## 📊 Architecture

```
Frontend (http://localhost:5173)
    ↓ API Calls with JWT
Backend (http://localhost:3001/api)
    ↓ SQL Queries
PostgreSQL (localhost:5432)
```

---

## 🎯 What Each Module Does

| Module | Purpose | Key Endpoints |
|--------|---------|---|
| **Auth** | Login/Register/Tokens | POST /auth/login, POST /auth/register |
| **Users** | User profiles | GET /users/:id, PATCH /users/:id |
| **Inquiries** | What buyers need | POST /inquiries, GET /inquiries |
| **Quotes** | What sellers offer | POST /quotes, PATCH /quotes/:id/status |
| **Products** | Seller inventory | POST /products, GET /products |
| **Orders** | Confirmed purchases | POST /orders, PATCH /orders/:id/status |
| **Payments** | Money transfers | POST /payments, PATCH /payments/:id/status |
| **Shops** | Seller storefronts | POST /shops, GET /shops |
| **Schedules** | Delivery/meetings | POST /schedules, GET /schedules/user/:id |
| **Audit** | Change tracking | GET /audit (read-only) |

---

## 🚀 Next After Testing

1. **Add tests**: `npm test` in backend
2. **Deploy**: Push to production server
3. **Monitor**: Add logging/monitoring
4. **Scale**: Add caching, database optimization
5. **Features**: Add payment processing, notifications, etc.

---

## 📞 File Locations

```
Project Root
├── backend/
│   ├── src/
│   │   ├── modules/          # All 10 feature modules
│   │   ├── app.module.ts     # Main module (with middleware)
│   │   └── main.ts           # Entry point
│   ├── package.json
│   └── .env                  # ← Create this
│
├── src/
│   ├── services/api/
│   │   ├── client.ts         # API client (HTTP calls)
│   │   └── database.ts       # Database service (API wrapper)
│   ├── hooks/
│   │   └── useLiveQuery.ts   # React hook for queries
│   └── components/           # All 18 components
│
├── API_ENDPOINTS_COMPLETE.md
├── IMPLEMENTATION_COMPLETE.md
├── BACKEND_IMPLEMENTATION_COMPLETE.md
└── FRONTEND_BACKEND_INTEGRATION.md
```

---

## ✨ Key Features Ready

- ✅ JWT authentication
- ✅ Create/Read/Update/Delete for everything
- ✅ Filtering and pagination
- ✅ Status tracking workflows
- ✅ User authorization
- ✅ Audit logging
- ✅ Input validation
- ✅ Error handling
- ✅ Type safety (TypeScript)

---

## 🎓 API Quick Reference

```bash
# Get all inquiries (paginated, filtered)
GET /api/inquiries?page=1&limit=20&status=OPEN

# Create new inquiry
POST /api/inquiries
{
  "title": "Looking for...",
  "buyerId": "...",
  "category": "...",
  ...
}

# Accept a quote (change status)
PATCH /api/quotes/{id}/status
{ "status": "ACCEPTED" }

# Track order
PATCH /api/orders/{id}/tracking
{ "trackingNumber": "TRACK123" }

# Check payments
GET /api/payments/user/{userId}
```

---

## ⏱️ Estimated Time

| Step | Time | What to Do |
|------|------|-----------|
| npm install | 5-10 min | Let it run |
| Setup .env | 2 min | Copy template above |
| Start backend | 1 min | Run `npm run start:dev` |
| Start frontend | 1 min | Run `npm run dev` |
| Test | 5-10 min | Register, login, browse |
| **TOTAL** | **~20 min** | **System working!** |

---

## ✅ Success Checklist

- [ ] Backend running (check terminal, no errors)
- [ ] Frontend running (http://localhost:5173 loads)
- [ ] Can see login page
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Dashboard shows data
- [ ] Network tab shows API calls to :3001/api
- [ ] No errors in browser console

**All checked?** → Integration successful! ✅

---

## 🎉 You're Ready!

Everything is built and documented. Just install, configure, and run.

**Questions?** Check the detailed documentation files listed above.

**Ready?** Start with Step 1: `cd backend && npm install`

---

**Good luck! 🚀**

*Generated: April 15, 2026*  
*For: TONSE Marketplace*  
*Status: ✅ Ready to Test*
