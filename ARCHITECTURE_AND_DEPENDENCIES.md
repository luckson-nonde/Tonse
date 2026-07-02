# TONSE Marketplace - Architecture & Dependencies

## 🏗️ Backend Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Express HTTP Server                          │
│                      (NestJS Framework)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐  ┌─────▼──────┐  ┌───▼────────┐
    │ Routes │  │ Middleware │  │ Guardians  │
    └────────┘  └────────────┘  └────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Controller Layer           │
        │ ┌────────────────────────┐  │
        │ │ AuthController         │  │
        │ │ UsersController        │  │
        │ │ InquiriesController    │  │
        │ │ QuotesController       │  │
        │ │ OrdersController       │  │
        │ │ PaymentsController     │  │
        │ │ ProductsController     │  │
        │ │ ShopsController        │  │
        │ │ SchedulesController    │  │
        │ └────────────────────────┘  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Service Layer             │
        │ ┌────────────────────────┐  │
        │ │ AuthService            │  │
        │ │ UsersService           │  │
        │ │ InquiriesService       │  │
        │ │ QuotesService          │  │
        │ │ OrdersService          │  │
        │ │ PaymentsService        │  │
        │ │ ProductsService        │  │
        │ │ ShopsService           │  │
        │ │ SchedulesService       │  │
        │ │ EncryptionService      │  │
        │ └────────────────────────┘  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │ Repository Layer (TypeORM)  │
        │ ┌────────────────────────┐  │
        │ │ UserRepository         │  │
        │ │ InquiryRepository      │  │
        │ │ QuoteRepository        │  │
        │ │ OrderRepository        │  │
        │ │ PaymentRepository      │  │
        │ │ ProductRepository      │  │
        │ │ ShopRepository         │  │
        │ │ ScheduleRepository     │  │
        │ │ AuditLogRepository     │  │
        │ └────────────────────────┘  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    Database Layer            │
        │   PostgreSQL 15 Database     │
        │ (with 35+ Performance        │
        │  Optimization Indexes)       │
        └──────────────────────────────┘
```

---

## 📊 Module Dependencies

```
app.module.ts (Root)
│
├── AuthModule
│   ├── Depends: UsersModule, ConfigModule, JwtModule
│   ├── Provides: JWT strategy, Auth guard, Auth service
│   └── Exports: AuthService
│
├── UsersModule
│   ├── Depends: ConfigModule
│   ├── Provides: User entity, User service
│   └── Exports: UsersService
│
├── InquiriesModule
│   ├── Depends: TypeOrmModule (Inquiry entity)
│   ├── Provides: Inquiry service, Inquiry controller
│   └── Relations: User (Buyer)
│
├── QuotesModule
│   ├── Depends: InquiriesModule, UsersModule
│   ├── Provides: Quote service, Quote controller
│   └── Relations: Inquiry, User (Provider)
│
├── OrdersModule
│   ├── Depends: QuotesModule, PaymentsModule
│   ├── Provides: Order service, Order controller
│   └── Relations: Quote, User, Payment
│
├── PaymentsModule
│   ├── Depends: UsersModule, ConfigModule
│   ├── Provides: Payment service, Payment controller
│   └── Relations: User, Order
│
├── ProductsModule
│   ├── Depends: UsersModule, ShopsModule
│   ├── Provides: Product service, Product controller
│   └── Relations: User (Seller), Shop
│
├── ShopsModule
│   ├── Depends: UsersModule
│   ├── Provides: Shop service, Shop controller
│   └── Relations: User (Seller), Products
│
├── SchedulesModule
│   ├── Depends: UsersModule, InquiriesModule
│   ├── Provides: Schedule service, Schedule controller
│   └── Relations: User, Inquiry
│
└── AuditModule
    ├── Depends: TypeOrmModule (AuditLog entity)
    ├── Provides: Audit service
    └── Audits: All entity changes
```

---

## 🎯 Frontend Component Tree

```
App.tsx (Root)
│
├── AuthContext Provider
│   └── Provides: user, token, login, logout, register
│
├── <Routes>
│   │
│   ├── /auth
│   │   ├── Login
│   │   │   └── LoginForm → useAuth → authService
│   │   ├── Register
│   │   │   └── RegisterForm → useForm → useAuth
│   │   └── ForgotPassword
│   │       └── ForgotPasswordForm → authService
│   │
│   ├── /buyer
│   │   ├── Dashboard
│   │   │   ├── InquiryList → Inquiry Cards
│   │   │   ├── QuoteList → Quote Cards
│   │   │   └── OrderList → Order Cards
│   │   ├── Inquiries
│   │   │   ├── CreateInquiry → InquiryForm
│   │   │   ├── InquiryList → InquiryCards
│   │   │   └── InquiryDetail
│   │   ├── Quotes
│   │   │   ├── QuoteList → QuoteCards
│   │   │   ├── QuoteDetail → QuoteComparison
│   │   │   └── QuoteAcceptance
│   │   ├── Orders
│   │   │   ├── OrderList → OrderCards
│   │   │   ├── OrderDetail
│   │   │   └── OrderTracking
│   │   ├── Profile
│   │   │   └── ProfileForm → useForm
│   │   └── Wallet
│   │       ├── WalletCard
│   │       ├── PaymentHistory → useFetch
│   │       └── WithdrawalForm
│   │
│   ├── /seller
│   │   ├── Dashboard
│   │   │   ├── ProductsList → ProductCards
│   │   │   ├── OrderList
│   │   │   └── Stats
│   │   ├── Products
│   │   │   ├── ProductList → ProductCards
│   │   │   ├── CreateProduct → ProductForm
│   │   │   ├── EditProduct
│   │   │   └── ProductDetail
│   │   ├── Orders
│   │   │   ├── OrderList
│   │   │   └── OrderDetail
│   │   ├── Shop
│   │   │   ├── ShopProfile
│   │   │   └── ShopForm
│   │   ├── Profile
│   │   │   └── ProfileForm
│   │   ├── Analytics
│   │   │   ├── Sales Chart
│   │   │   ├── Views Chart
│   │   │   └── Revenue Stats
│   │   └── Settings
│   │       └── SettingsForm
│   │
│   ├── /provider
│   │   ├── Dashboard
│   │   ├── Inquiries
│   │   │   ├── InquiryList
│   │   │   └── CreateQuote
│   │   ├── Quotes
│   │   │   ├── QuoteList
│   │   │   └── QuoteDetail
│   │   ├── Profile
│   │   ├── Schedule
│   │   │   ├── ScheduleCalendar
│   │   │   └── CreateSchedule
│   │   └── Analytics
│   │
│   └── /admin
│       ├── Dashboard
│       ├── Users
│       │   ├── UserList
│       │   └── UserDetail
│       ├── Transactions
│       ├── Audit
│       ├── Settings
│       └── Reports
│
└── Notification System
    └── NotificationContext
        └── Provides: notifications, addNotification, removeNotification
```

---

## 🔄 Data Flow Examples

### Authentication Flow
```
User Input (LoginForm)
    ↓
useAuth Hook
    ↓
authService.login(email, password)
    ↓
POST /api/auth/login
    ↓
AuthController.login()
    ↓
AuthService.login()
    ├── UsersService.findByEmail()
    ├── bcryptjs.compare(password, hash)
    ├── JwtService.sign(payload)
    └── Return: accessToken, refreshToken
    ↓
Frontend stores tokens (localStorage/cookies)
    ↓
useAuth updates global state
    ↓
App redirects to dashboard
```

### Create Inquiry Flow
```
User Input (CreateInquiry Form)
    ↓
useForm Hook validation
    ↓
inquiryService.create(dto)
    ↓
POST /api/inquiries
    ↓
InquiriesController.create()
    ↓
InquiriesService.create()
    ├── Validate DTO
    ├── EncrytionService.encrypt() [if needed]
    ├── InquiryRepository.save()
    └── Return created inquiry
    ↓
Frontend shows success notification
    ↓
Redirect to Inquiry Detail page
```

### Order Processing Flow
```
Quote Acceptance (QuoteDetail)
    ↓
OrderService.create(quoteId)
    ↓
POST /api/orders
    ↓
OrdersController.create()
    ↓
OrdersService.create()
├── Find Quote (from QuotesService)
├── Create Order (with Quote details)
├── Update Quote status to ACCEPTED
├── Create Payment record
└── Return order with payment info
    ↓
PaymentService.initiate()
    ↓
Connect to Lenco/Payment Provider
    ↓
Frontend redirects to payment page
    ↓
Webhook: PAYMENT_SUCCESS
    ↓
Update Order status: CONFIRMED
    ↓
Send notification to seller
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  Request Arrives at NestJS             │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────────┐
        │ CORS Middleware │ ← Allow origin checks
        └──────┬──────────┘
               │
        ┌──────▼──────────────┐
        │ Helmet Middleware  │ ← Security headers
        └──────┬──────────────┘
               │
        ┌──────▼──────────────┐
        │ Rate Limiting      │ ← Prevent abuse
        └──────┬──────────────┘
               │
        ┌──────▼──────────────┐
        │ JWT Guard          │ ← Verify token
        └──────┬──────────────┘
               │
        ┌──────▼──────────────┐
        │ Role Guard         │ ← Verify permission
        └──────┬──────────────┘
               │
        ┌──────▼──────────────────┐
        │ DTO Validation         │ ← Validate input
        │ (class-validator)      │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │ Business Logic         │
        │ (Encryption/Hashing)   │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │ Database Layer         │
        │ (TypeORM with indexes) │
        └────────────────────────┘
```

---

## 📦 Dependencies & Versions

### Backend (NestJS)
```
@nestjs/core: 10.3.x
@nestjs/common: 10.3.x
@nestjs/jwt: 12.0.x
@nestjs/passport: 10.0.x
@nestjs/typeorm: 10.0.x
typeorm: 0.3.x
passport: 0.7.x
passport-jwt: 9.0.x
postgresql: 15.x (in Docker)
```

### Frontend (React)
```
react: 19.x
react-router-dom: 6.x
typescript: 5.3.x
vite: 6.x
tailwindcss: 3.4.x
axios: 1.x
react-query: 3.x (optional)
```

### Development Tools
```
prettier: 3.x
eslint: 8.x
jest: 29.x
supertest: 6.x
ts-node: 10.x
ts-loader: 9.x
```

---

## 🗄️ Database Schema Overview

> **Moved.** The full, authoritative database schema now lives in a single canonical document, generated from the TypeORM entities: **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**.
>
> The old inline tree here was stale (it listed 9 tables; the real schema has **22**, and it wrongly marked `email`/`nrc` as encrypted). It has been removed to avoid drift. See DATABASE_SCHEMA.md for the current tables, columns, indexes, relations, enums, and the frontend `AppDatabaseAPI` store map.

---

## ⚡ Performance Optimizations

### Database Indexes
- Composite indexes on frequently filtered columns
- JSONB indexes for flexible schema fields
- Partial indexes for status queries
- Full-text search indexes ready

### Caching Strategies
```typescript
// Redis key patterns (when added)
user:${userId}
inquiry:${inquiryId}
quote:${quoteId}
product:${productId}
user:${email}:auth
```

### Query Optimization
```typescript
// Use select to limit fields
queryBuilder.select(['inquiry.id', 'inquiry.title'])

// Use leftJoinAndSelect for relations
.leftJoinAndSelect('inquiry.items', 'items')

// Paginate results
.skip(skip).take(take)
```

---

## 🚀 Scaling Considerations

### Horizontal Scaling
- Implement queue system (BullMQ) for async tasks
- Use Redis for session management
- Database replication with read replicas
- Load balancing with Nginx

### Vertical Scaling
- Increase database connection pool
- Optimize queries with better indexes
- Implement caching layers
- Use CDN for static files

### Monitoring
- Application Performance Monitoring (APM)
- Database query monitoring
- Error tracking (Sentry)
- Logging aggregation (ELK/Loki)

---

**Last Updated**: 2024 | **Version**: 1.0.0

