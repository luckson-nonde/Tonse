# TONSE Marketplace - Full Stack Web Application

A complete marketplace platform with JWT authentication, PostgreSQL database, TypeORM, and field-level encryption.

## 🏗️ Architecture

```
┌─────────────────┐
│   React + Vite  │  Frontend (Port 3000/5173)
│   (src/)        │
└────────┬────────┘
         │
         │ API Calls
         │
┌────────▼────────────────────┐
│     NestJS Backend          │  Backend (Port 3001)
│     (backend/src/)          │
│  ├─ Auth Module (JWT)       │
│  ├─ Users Module            │
│  ├─ Inquiries Module        │
│  ├─ Quotes Module           │
│  ├─ Orders Module           │
│  ├─ Payments Module         │
│  ├─ Products Module         │
│  ├─ Shops Module            │
│  ├─ Schedules Module        │
│  └─ Audit Module            │
└────────┬────────────────────┘
         │
         │ TypeORM
         │
┌────────▼────────────────────┐
│   PostgreSQL Database       │  Persists all data
│   (With Indexes & Relations)│
└─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone & Install Dependencies**
```bash
cd backend
npm install

cd ../
npm install
```

2. **Configure Environment**
```bash
# Backend
cd backend
cp .env.example .env

# Edit .env with your values:
# - PostgreSQL credentials
# - JWT secrets
# - Encryption keys
```

3. **Setup PostgreSQL Database**
```bash
# Create database
createdb tonse_db

# Apply migrations
npm run migration:run

# (Optional) Seed initial data
npm run seed
```

4. **Start Development Servers**
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
npm run dev
```

Access the app at `http://localhost:5173` (or `3000`)

## 🗄️ Database Schema

### Core Tables with Indexes

#### `users`
- ✅ Email unique index for fast lookups
- ✅ Phone index for search
- ✅ Role index for filtering
- ✅ Verification status index
- ✅ Created at index for sorting

```typescript
User {
  id: UUID (PK)
  email: string (unique)
  password: string (hashed with bcryptjs)
  name: string
  phone: string
  role: BUYER | SELLER | SUPPLIER | SERVICE_PROVIDER | ENTERTAINMENT | EVENTS
  categories: string[]
  verificationStatus: PENDING | VERIFIED | REJECTED
  refreshToken: string (encrypted)
  // ... more fields
}
```

#### `inquiries`
- ✅ Buyer ID index for user's inquiries
- ✅ Category index for browsing
- ✅ Status index for filtering
- ✅ Location + Created at indexes
- ✅ Composite index: (buyerId, status)

#### `quotes`
- ✅ Inquiry + Provider composite unique index
- ✅ Status index for tracking
- ✅ Created at index for sorting

#### `orders`, `payments`, `products`, `shops`, `schedules`, `audit_logs`
- ✅ All have optimized indexes for common queries

## 🔐 Security Features

### JWT Authentication
- **Access Token**: 1 hour expiration
- **Refresh Token**: 7 days expiration
- **Refresh Flow**: Automatic token rotation

```
POST /auth/register   → Create account
POST /auth/login      → Get access + refresh tokens
POST /auth/refresh    → Get new access token
POST /auth/logout     → Invalidate tokens
GET /auth/me          → Get current user (requires JWT)
```

### Field-Level Encryption
- Sensitive fields encrypted with AES-256-CBC
- Automatic encryption/decryption via `EncryptionService`
- NRC, SSN, and financial info protected

### Password Security
- Hashed with bcryptjs (10 salt rounds)
- Never stored in plaintext

## 📦 API Endpoints

### Authentication
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
```

### Users (Protected routes)
```
GET /users/:id
PUT /users/:id
GET /users/profile
```

### Inquiries (Protected routes)
```
GET /inquiries
POST /inquiries
GET /inquiries/:id
PUT /inquiries/:id
DELETE /inquiries/:id
```

### Quotes (Protected routes)
```
GET /quotes
POST /quotes
GET /quotes/:id
PUT /quotes/:id
```

### Orders (Protected routes)
```
GET /orders
POST /orders
GET /orders/:id
PUT /orders/:id
```

### Payments (Protected routes)
```
GET /payments
POST /payments
GET /payments/balance
```

### Products (Protected routes)
```
GET /products
POST /products
GET /products/:id
PUT /products/:id
DELETE /products/:id
```

### Shops (Protected routes)
```
GET /shops
POST /shops
GET /shops/:id
PUT /shops/:id
```

### Schedules (Protected routes)
```
GET /schedules
POST /schedules
GET /schedules/:id
PUT /schedules/:id
DELETE /schedules/:id
```

### Audit Logs (Protected routes - Admin only)
```
GET /audit
GET /audit/:entityType/:entityId
```

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── encryption.config.ts
│   ├── common/              # Shared utilities
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # Request/Response interceptors
│   │   └── services/        # Shared services (encryption)
│   ├── database/
│   │   ├── migrations/      # TypeORM migrations
│   │   └── seeds/           # Database seeders
│   ├── modules/             # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── inquiries/
│   │   ├── quotes/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── products/
│   │   ├── shops/
│   │   ├── schedules/
│   │   └── audit/
│   └── main.ts              # Entry point
├── .env.example             # Environment template
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## 🗄️ TypeORM & Migrations

### Creating a Migration
```bash
npm run migration:create -- -n AddUserVerification
npm run migration:generate -- -n AddUserVerification
```

### Running Migrations
```bash
npm run migration:run        # Run all pending migrations
npm run migration:revert     # Revert last migration
npm run migration:show       # Show migration status
```

### Database Indexes Strategy

All tables use composite and single column indexes for:
- **Lookups**: email, phone, user_id
- **Filtering**: status, role, category
- **Sorting**: created_at, updated_at
- **Relationships**: foreign keys

Example compound index:
```sql
-- Allows efficient queries like:
SELECT * FROM inquiries 
WHERE buyerId = ? AND status = ? 
ORDER BY createdAt DESC;
```

## 🔄 Authentication Flow

### Login & Token Generation
```
User credentials
    ↓
Validate against hashed password
    ↓
Generate JWT access token (1hr)
Generate JWT refresh token (7d)
    ↓
Save refresh token in DB (encrypted)
    ↓
Return both tokens to client
```

### Protected Requests
```
1. Client sends: Authorization: Bearer <access_token>
2. JwtAuthGuard validates token
3. If valid: Attach user to request
4. If expired: Client uses refresh token → Get new access token
5. If refresh expired: Redirect to login
```

## 🛠️ Development

### Run Tests
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
```

### Linting & Formatting
```bash
npm run lint             # Fix ESLint issues
npm run format           # Format with Prettier
```

### Debug Mode
```bash
npm run start:debug      # Starts with debugging enabled
# Then open chrome://inspect
```

## 📊 Sample Data Setup

Seed the database with sample data:
```bash
npm run seed
```

Creates:
- 5 sample users (different roles)
- 10 inquiries
- 15 quotes
- 5 orders
- Payment records

## 🔍 Monitoring & Logs

### Enable Detailed Logging
```env
LOG_LEVEL=debug
DB_LOGGING=true
```

### View Logs
- Request/Response: Logged by `LoggingInterceptor`
- Database Queries: Logged by TypeORM
- Errors: Logged by `GlobalExceptionFilter`

All logs include:
- Timestamp
- User ID (if authenticated)
- Duration
- Status code
- Error details (if applicable)

## 🚀 Production Deployment

### Pre-deployment Checklist
```bash
# 1. Build
npm run build

# 2. Test
npm run test

# 3. Lint check
npm run lint

# 4. Environment setup
export NODE_ENV=production
export JWT_SECRET=<strong_random_key>
export ENCRYPTION_KEY=<32_char_random>
export DB_HOST=production.db.server
export DB_PASSWORD=<strong_db_password>
```

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/ .
RUN npm install && npm run build
CMD npm run start:prod
```

## ⚠️ Important Notes

1. **JWT Secrets**: Change `JWT_SECRET` and `JWT_REFRESH_SECRET` in production
2. **Encryption Key**: Generate a secure 32-character key
3. **Database**: Use strong passwords and enable SSL
4. **CORS**: Configure allowed origins in `main.ts`
5. **Rate Limiting**: Add rate limiting middleware for production
6. **Backups**: Schedule regular database backups

## 📚 API Request Examples

### Register
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "BUYER"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Create Inquiry (Protected)
```bash
curl -X POST http://localhost:3001/inquiries \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Need laptops",
    "description": "Looking for 10 laptops",
    "category": "Electronics",
    "location": "New York"
  }'
```

## 🤝 Support

For issues or questions:
1. Check the logs: `npm run start:dev`
2. Verify database connection
3. Check JWT tokens are valid
4. Review `.env` configuration

## 📝 License

MIT
