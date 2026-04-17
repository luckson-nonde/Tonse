# ⚠️ Docker Required - Setup Guide

## Current Status

Your app requires Docker for the database:
- ✅ Frontend dependencies: Installed
- 🔄 Backend dependencies: Installing...
- ❌ Docker: Not running

---

## 🐳 Docker Issue

**Error**: Docker Desktop is not running

**To fix:**
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install and launch Docker Desktop
3. Wait for it to fully start (check system tray)
4. Then run: `docker-compose up -d`

---

## 📋 What You Can Do Now

### Option 1: Install & Start Docker (Recommended)
1. Start Docker Desktop
2. Run: `docker-compose up -d`
3. Then start the app

### Option 2: Start Frontend Only (Testing UI)
```bash
# In project root, run:
npm run dev

# Access at: http://localhost:5173
# Backend won't work without Docker
```

### Option 3: Skip Database (Development Mode)
The backend can use an in-memory database temporarily:
1. Modify `backend/src/config/database.config.ts`
2. Use SQLite instead of PostgreSQL
3. Run migrations with SQLite

---

## ✅ Prerequisites Checklist

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Docker Desktop downloaded & installed
- [ ] Docker Desktop running (check system tray)
- [ ] Port 5173 available (frontend)
- [ ] Port 3000 available (backend)
- [ ] Port 5432 available (PostgreSQL)
- [ ] Port 5050 available (PgAdmin)

---

## 🚀 Once Docker is Ready

```bash
# 1. Start services
docker-compose up -d

# 2. Wait for services to be ready (30 seconds)
sleep 30

# 3. Run migrations
cd backend
npm run migrations:run
cd ..

# 4. Terminal 1: Start backend
cd backend
npm run start:dev

# 5. Terminal 2: Start frontend
npm run dev

# 6. Open browser
http://localhost:5173
```

---

## 📞 Help

**Docker not installing?**
- System requirements: https://docs.docker.com/desktop/setup/install/windows-install/
- Virtualization needs to be enabled in BIOS

**Still having issues?**
- Check: https://docs.docker.com/desktop/troubleshoot/
- Or use SQLite for local development (contact support)

---

**Status**: Waiting for Docker Desktop ⏳

