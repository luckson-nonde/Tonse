# ⚡ Quick Start Checklist

## 🚀 Get Running in 5 Minutes

### Phase 1: Prerequisites (1 min)
- [ ] Node.js 18+ installed (`node -v`)
- [ ] Docker installed (`docker -v`)
- [ ] npm installed (`npm -v`)
- [ ] Git configured

### Phase 2: Start Services (2 min)
```bash
# Terminal 1: Start Docker PostgreSQL
docker-compose up -d

# Verify containers running
docker ps

# Expected: tonse_postgres, tonse_pgadmin running
```

### Phase 3: Setup Backend (1 min)
```bash
# Terminal 2: Backend setup
cd backend
npm install

# Copy environment
cp .env.example .env

# Run migrations (creates database tables)
npm run migration:run

# Start backend server
npm run start:dev

# Expected: ✅ App running on http://localhost:3001
```

### Phase 4: Start Frontend (1 min)
```bash
# Terminal 3: Frontend
npm install
npm run dev

# Expected: ✅ App running on http://localhost:5173
```

## ✅ Verify Everything Works

### Test Backend API
```bash
# Register a test user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@tonse.local",
    "password": "TestPass123!",
    "name": "Test User",
    "phone": "+1234567890",
    "role": "BUYER"
  }'

# Expected: User created with 201 status

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@tonse.local",
    "password": "TestPass123!"
  }'

# Expected: Get accessToken and refreshToken
```

### Access Dashboards
- [ ] **Frontend**: http://localhost:5173 (React app)
- [ ] **Backend**: http://localhost:3001 (API)
- [ ] **PgAdmin**: http://localhost:5050 (Database UI)
  - Email: `admin@tonse.local`
  - Password: `admin`

## 🔐 Setup Security Keys (Production)

**IMPORTANT**: Change these before deploying to production!

Generate new keys:
```bash
# JWT Secret 1
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Secret 2
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 char)
node -e "console.log(require('crypto').randomBytes(16).toString('hex').substring(0, 32))"

# Encryption IV (16 char)
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
```

Update `backend/.env`:
```env
JWT_SECRET=<first_random_key>
JWT_REFRESH_SECRET=<second_random_key>
ENCRYPTION_KEY=<encryption_key>
ENCRYPTION_IV=<encryption_iv>
```

## 🗂️ Key Files to Understand

### Backend Architecture
| File | Purpose |
|------|---------|
| `backend/src/app.module.ts` | Root module - imports all features |
| `backend/src/main.ts` | Server entry point |
| `backend/src/config/` | Configuration files |
| `backend/src/modules/auth/` | JWT authentication |
| `backend/src/database/migrations/` | Database schema |
| `backend/.env` | Environment variables |

### Important Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get tokens |
| POST | `/auth/refresh` | Renew token |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Sign out |

## 📚 Documentation to Read

In order of importance:

1. **IMPLEMENTATION_SUMMARY.md** - Overview of what was built (5 min read)
2. **FULLSTACK_SETUP.md** - Complete setup guide (15 min read)
3. **DATABASE_ARCHITECTURE.md** - Database design details (20 min read)
4. **backend/README.md** - API documentation (10 min read)

## 🐛 Common Issues & Fixes

### "Port 3001 already in use"
```bash
lsof -i :3001
kill -9 <PID>
npm run start:dev  # Try again
```

### "PostgreSQL connection refused"
```bash
docker-compose up -d              # Start containers
sleep 10                          # Wait for startup
docker ps                         # Verify running
npm run migration:run             # Try again
```

### "Token expired during testing"
```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3001/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

### "Cannot find module '@/config/database.config'"
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run start:dev
```

## 🎯 Next Steps (Choose One)

### Option A: Implement Services (Recommended)
```
1. Create Inquiry service/controller
2. Create Quote service/controller  
3. Create Order service/controller
4. Add integration tests
5. Deploy!
```

### Option B: Connect Frontend
```
1. Create API service wrapper
2. Add authentication context
3. Build login page
4. Build dashboard
5. Deploy!
```

### Option C: Production Setup
```
1. Deploy to AWS/Heroku
2. Setup CI/CD pipeline
3. Configure monitoring
4. Setup backups
5. Launch!
```

## 🧹 Cleanup & Maintenance

### Stop Services
```bash
# Stop backend (Ctrl+C in terminal)
# Stop frontend (Ctrl+C in terminal)
# Stop Docker
docker-compose down
```

### Check Database
```bash
# Connect to PostgreSQL
docker exec -it tonse_postgres psql -U tonse_user -d tonse_db

# List tables
\dt

# Show migrations
SELECT * FROM typeorm_metadata:

# Exit
\q
```

### Reset Database (Development)
```bash
# Drop all tables
npm run migration:revert    # Run multiple times until at 0

# Recreate fresh
npm run migration:run

# Reseed data (if available)
npm run seed
```

## ✨ Development Tips

1. **Hot Reload**: Backend auto-restarts on file changes (already enabled)
2. **TypeScript**: Get immediate type errors in VS Code
3. **Database**: Use PgAdmin for visual database management
4. **Logging**: Check browser console & backend terminal for issues
5. **Testing**: Run `npm run test` in backend folder
6. **Debugging**: Use `npm run start:debug` then open chrome://inspect

## 🚦 Status Indicators

### Everything Working ✅
- Backend: `✅ Application is running on http://localhost:3001`
- Frontend: `VITE v6.x.x ready in xxx ms`
- Docker: `docker ps` shows containers `Up`
- Database: Can connect in PgAdmin

### Something's Wrong ❌
- Backend crashed? Check logs for error messages
- Frontend blank page? Check browser console (F12)
- Database won't connect? `docker logs tonse_postgres`
- Port in use? `lsof -i :<port>`

## 📞 Getting Help

1. **Check Logs**
   - Backend terminal: Error stack traces
   - Browser F12: Frontend errors
   - Docker: `docker logs <container_name>`

2. **Read Documentation**
   - FULLSTACK_SETUP.md - Troubleshooting section
   - DATABASE_ARCHITECTURE.md - Database queries

3. **Online Resources**
   - NestJS: https://docs.nestjs.com
   - TypeORM: https://typeorm.io
   - PostgreSQL: https://www.postgresql.org/docs

---

## ✅ You're Ready!

- [x] Backend running
- [x] Frontend running
- [x] Database connected
- [x] Authentication working
- [x] Ready to build features

**Happy coding! 🎉**
