# 🚀 Nyuwe Zambia Marketplace - Startup Guide

## Quick Start Commands

### Step 1: Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Setup Environment
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env and change:
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - ENCRYPTION_KEY (must be 32 chars)
# - DB_PASSWORD (change from default)
```

### Step 3: Start Docker Services
```bash
docker-compose up -d
```

### Step 4: Run Database Migrations
```bash
cd backend
npm run migrations:run
cd ..
```

### Step 5: Start Both Servers

**Terminal 1 - Backend (NestJS):**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend (React/Vite):**
```bash
npm run dev
```

---

## 🌐 Access Your App

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:3000 | - |
| **PgAdmin** | http://localhost:5050 | admin / admin |
| **PostgreSQL** | localhost:5432 | tonse_user / tonse_pass |

---

## 📋 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
lsof -i :5173
kill -9 <PID>

# Or change port in package.json: "dev": "vite --port 3001"
```

### Database Connection Error
```bash
# Check if Docker is running
docker ps

# View logs
docker logs tonse-postgres

# Restart services
docker-compose restart
```

### Missing Dependencies
```bash
# Clear and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
npm run lint
```

---

## 📊 Architecture

```
Frontend (React/Vite)          Backend (NestJS)            Database
localhost:5173        →        localhost:3000       →      PostgreSQL
   (Vite Dev)                  (Express Server)           (Docker)
   
  React App                    9 Modules
  - Components                 - Auth ✅
  - Pages                      - Users ✅
  - Context API                - Inquiries 🔄
  - Custom Hooks               - Quotes 🔄
  - Type Safe                  - Orders 🔄
                               - Payments 🔄
                               - Products 🔄
                               - Shops 🔄
                               - Schedules 🔄
```

---

## ✅ Health Check

Once running, verify everything:

1. **Frontend loads:** http://localhost:5173
2. **Backend responds:** http://localhost:3000/api/auth (should return 404 or error)
3. **Database working:** Check PgAdmin http://localhost:5050
4. **No console errors:** Check browser console (F12)

---

## 🎯 First Steps After Startup

1. **Test Auth Flow:**
   - Register a new user
   - Login with credentials
   - Verify JWT token in localStorage

2. **Test Database:**
   - Create an inquiry
   - Query it back
   - Verify in PgAdmin

3. **Test API:**
   - Use Postman or cURL
   - Test endpoints in API_TESTING.md

4. **Check Logs:**
   - Backend console (npm run start:dev output)
   - Frontend console (Browser F12)
   - Docker logs (docker logs -f tonse-postgres)

---

## 📚 Documentation Links

- [QUICK_START.md](QUICK_START.md) - Original setup
- [SETUP_AND_IMPORTS.md](SETUP_AND_IMPORTS.md) - Import guide
- [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) - How to build
- [API_TESTING.md](API_TESTING.md) - Test API endpoints
- [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) - DB schema

---

**Status**: Ready to run! Follow steps above. 🎉

