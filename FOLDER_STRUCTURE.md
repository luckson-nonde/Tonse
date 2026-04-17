# 📁 Complete Project Folder Structure

## 🏗️ Overview

This document outlines the complete folder structure for the TONSE Marketplace full-stack application.

```
tonse-hub/
├── backend/                          # NestJS Backend Application
│   ├── src/
│   │   ├── main.ts                   # Application entry point
│   │   ├── app.module.ts             # Root module
│   │   │
│   │   ├── config/                   # Configuration files
│   │   │   ├── database.config.ts
│   │   │   ├── jwt.config.ts
│   │   │   └── encryption.config.ts
│   │   │
│   │   ├── common/                   # Shared utilities & middleware
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── services/
│   │   │   │   └── encryption.service.ts
│   │   │   ├── decorators/           # Custom decorators (@IsOwner, @Roles, etc)
│   │   │   ├── exceptions/           # Custom exception classes
│   │   │   ├── guards/               # Custom guards (RolesGuard, etc)
│   │   │   ├── middleware/           # Custom middleware
│   │   │   └── pipes/                # Custom pipes (validation, etc)
│   │   │
│   │   ├── modules/                  # Feature modules
│   │   │   │
│   │   │   ├── auth/                 # Authentication Module
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   └── jwt.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   └── jwt-auth.guard.ts
│   │   │   │   └── dto/
│   │   │   │       ├── register.dto.ts
│   │   │   │       └── login.dto.ts
│   │   │   │
│   │   │   ├── users/                # Users Module
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.entity.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-user.dto.ts
│   │   │   │   │   ├── update-user.dto.ts
│   │   │   │   │   └── user-profile.dto.ts
│   │   │   │   └── repositories/
│   │   │   │       └── users.repository.ts
│   │   │   │
│   │   │   ├── inquiries/            # Inquiries Module
│   │   │   │   ├── inquiries.module.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── inquiry.entity.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-inquiry.dto.ts
│   │   │   │   │   ├── update-inquiry.dto.ts
│   │   │   │   │   └── filter-inquiry.dto.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── inquiries.repository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── inquiries.service.ts
│   │   │   │   └── controllers/
│   │   │   │       └── inquiries.controller.ts
│   │   │   │
│   │   │   ├── quotes/               # Quotes Module (similar structure)
│   │   │   │   ├── quotes.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   ├── orders/               # Orders Module (similar structure)
│   │   │   │   ├── orders.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   ├── payments/             # Payments Module (similar structure)
│   │   │   │   ├── payments.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   ├── products/             # Products Module (similar structure)
│   │   │   │   ├── products.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   ├── shops/                # Shops Module (similar structure)
│   │   │   │   ├── shops.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   ├── schedules/            # Schedules Module (similar structure)
│   │   │   │   ├── schedules.module.ts
│   │   │   │   ├── entities/
│   │   │   │   ├── dto/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   │
│   │   │   └── audit/                # Audit Module (similar structure)
│   │   │       ├── audit.module.ts
│   │   │       ├── entities/
│   │   │       ├── dto/
│   │   │       ├── repositories/
│   │   │       ├── services/
│   │   │       └── controllers/
│   │   │
│   │   ├── database/                 # Database configuration & migrations
│   │   │   ├── migrations/
│   │   │   │   └── 1700000000000-CreateInitialSchema.ts
│   │   │   └── seeds/
│   │   │       ├── seed.ts           # Main seed file
│   │   │       ├── user.seeder.ts
│   │   │       ├── inquiry.seeder.ts
│   │   │       └── product.seeder.ts
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── helpers/
│   │   │   │   ├── pagination.helper.ts
│   │   │   │   ├── date.helper.ts
│   │   │   │   └── string.helper.ts
│   │   │   ├── validators/
│   │   │   │   ├── custom-validators.ts
│   │   │   │   └── file-validators.ts
│   │   │   └── constants/
│   │   │       ├── app.constants.ts
│   │   │       ├── error.constants.ts
│   │   │       └── regex.constants.ts
│   │   │
│   │   ├── types/                    # TypeScript type definitions
│   │   │   ├── common.types.ts
│   │   │   ├── query.types.ts
│   │   │   └── request.types.ts
│   │   │
│   │   └── shared/                   # Shared types & interfaces
│   │       ├── interfaces/
│   │       ├── types/
│   │       └── constants/
│   │
│   ├── test/                         # Test files
│   │   ├── unit/                     # Unit tests
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── users.service.spec.ts
│   │   │   └── ...
│   │   ├── integration/              # Integration tests
│   │   │   ├── auth.e2e.spec.ts
│   │   │   ├── users.e2e.spec.ts
│   │   │   └── ...
│   │   └── fixtures/                 # Test data fixtures
│   │       └── mock-data.ts
│   │
│   ├── .env                          # Environment variables (gitignored)
│   ├── .env.example                  # Environment template
│   ├── .gitignore
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
│
├── src/                              # React Frontend Application
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component
│   ├── index.css                     # Global styles
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── PasswordReset.tsx
│   │   ├── common/                   # Shared components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── NavigationBar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Avatar.tsx
│   │   ├── inquiry/
│   │   │   ├── InquiryList.tsx
│   │   │   ├── InquiryCard.tsx
│   │   │   ├── InquiryForm.tsx
│   │   │   ├── InquiryDetails.tsx
│   │   │   └── InquiryFilter.tsx
│   │   ├── quote/
│   │   │   ├── QuoteList.tsx
│   │   │   ├── QuoteCard.tsx
│   │   │   ├── QuoteForm.tsx
│   │   │   ├── QuoteDetails.tsx
│   │   │   └── QuoteComparison.tsx
│   │   ├── order/
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   └── OrderTracking.tsx
│   │   ├── payment/
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   ├── TransactionCard.tsx
│   │   │   └── PaymentStatus.tsx
│   │   ├── product/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductDetails.tsx
│   │   │   ├── ProductFilter.tsx
│   │   │   └── ProductGallery.tsx
│   │   ├── shop/
│   │   │   ├── ShopCard.tsx
│   │   │   ├── ShopDetails.tsx
│   │   │   ├── ShopProfile.tsx
│   │   │   └── ShopReviews.tsx
│   │   └── schedule/
│   │       ├── ScheduleList.tsx
│   │       ├── ScheduleForm.tsx
│   │       ├── Calendar.tsx
│   │       └── ScheduleCard.tsx
│   │
│   ├── pages/                        # Page components (full-page views)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── PasswordResetPage.tsx
│   │   │   ├── VerificationPage.tsx
│   │   │   └── OnboardingPage.tsx
│   │   ├── buyer/
│   │   │   ├── BuyerDashboard.tsx
│   │   │   ├── CreateInquiryPage.tsx
│   │   │   ├── MyInquiriesPage.tsx
│   │   │   ├── QuotesPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── BuyerProfilePage.tsx
│   │   │   └── WalletPage.tsx
│   │   ├── seller/
│   │   │   ├── SellerDashboard.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── CreateProductPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── SellerProfilePage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── provider/
│   │   │   ├── ProviderDashboard.tsx
│   │   │   ├── InquiriesPage.tsx
│   │   │   ├── MyQuotesPage.tsx
│   │   │   ├── ProviderProfilePage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── UsersManage.tsx
│   │       ├── TransactionsManage.tsx
│   │       ├── VerificationsPage.tsx
│   │       ├── AuditLogsPage.tsx
│   │       └── SettingsPage.tsx
│   │
│   ├── services/                     # API & data services
│   │   ├── api/
│   │   │   ├── client.ts             # Axios/Fetch client setup
│   │   │   ├── userService.ts
│   │   │   ├── inquiryService.ts
│   │   │   ├── quoteService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── productService.ts
│   │   │   ├── shopService.ts
│   │   │   ├── scheduleService.ts
│   │   │   ├── auditService.ts
│   │   │   └── endpoints.ts          # API endpoint constants
│   │   ├── auth/
│   │   │   ├── authService.ts        # Auth logic
│   │   │   ├── tokenService.ts       # Token management
│   │   │   └── loginManager.ts       # Login state management
│   │   └── storage/
│   │       ├── localStorage.ts
│   │       ├── sessionStorage.ts
│   │       └── cookies.ts
│   │
│   ├── context/                      # React Context for state management
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── AuthProvider.tsx
│   │   │   └── useAuth.hook.ts
│   │   ├── data/
│   │   │   ├── DataContext.tsx
│   │   │   ├── DataProvider.tsx
│   │   │   ├── useInquiries.hook.ts
│   │   │   ├── useQuotes.hook.ts
│   │   │   ├── useOrders.hook.ts
│   │   │   └── useProducts.hook.ts
│   │   └── notifications/
│   │       ├── NotificationContext.tsx
│   │       ├── NotificationProvider.tsx
│   │       └── useNotification.hook.ts
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useFetch.ts
│   │   ├── useForm.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useSessionStorage.ts
│   │   ├── usePagination.ts
│   │   ├── useDebounce.ts
│   │   ├── useThrottle.ts
│   │   └── useWindowSize.ts
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── api/
│   │   │   ├── httpClient.ts
│   │   │   └── requestInterceptor.ts
│   │   ├── constants/
│   │   │   ├── api.constants.ts
│   │   │   ├── roles.constants.ts
│   │   │   ├── statuses.constants.ts
│   │   │   └── errors.constants.ts
│   │   ├── validators/
│   │   │   ├── email.validator.ts
│   │   │   ├── phone.validator.ts
│   │   │   ├── password.validator.ts
│   │   │   └── form.validator.ts
│   │   ├── formatters/
│   │   │   ├── date.formatter.ts
│   │   │   ├── currency.formatter.ts
│   │   │   ├── string.formatter.ts
│   │   │   └── file.formatter.ts
│   │   └── utils.ts                  # Common utilities
│   │
│   ├── styles/                       # Global styles
│   │   ├── tailwind.css
│   │   ├── variables.css
│   │   ├── animations.css
│   │   └── responsive.css
│   │
│   ├── assets/                       # Static assets
│   │   ├── images/
│   │   │   ├── hero.jpg
│   │   │   ├── logo.svg
│   │   │   └── ...
│   │   ├── icons/
│   │   │   ├── search.svg
│   │   │   ├── user.svg
│   │   │   └── ...
│   │   └── fonts/
│   │       ├── Roboto.ttf
│   │       └── ...
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── user.types.ts
│   │   ├── inquiry.types.ts
│   │   ├── quote.types.ts
│   │   ├── order.types.ts
│   │   ├── payment.types.ts
│   │   ├── product.types.ts
│   │   ├── shop.types.ts
│   │   ├── api.types.ts
│   │   └── common.types.ts
│   │
│   └── shared/
│       ├── interfaces/
│       ├── types/
│       └── constants/
│
├── public/                           # Static public assets
│   ├── index.html
│   ├── favicon.ico
│   ├── robots.txt
│   └── ...
│
├── .env                              # Environment variables (frontend)
├── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── package.json
├── package-lock.json
├── index.html
├── vite.config.ts
├── README.md
│
├── docker-compose.yml                # Docker configuration
├── .dockerignore
├── Dockerfile
│
├── .github/                          # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── lint.yml
│
├── docs/                             # Documentation
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── QUICK_START.md
├── FULLSTACK_SETUP.md
├── DATABASE_ARCHITECTURE.md
├── API_TESTING.md
├── IMPLEMENTATION_SUMMARY.md
├── FOLDER_STRUCTURE.md               # This file
├── .gitignore
├── package.json                      # Root package (monorepo)
└── README.md

```

## 📊 Directory Organization Details

### Backend Structure

#### `/backend/src/modules/{module}/`
Each module follows a consistent structure:
```
{module}/
├── {module}.module.ts          # Module definition
├── {module}.service.ts         # Business logic
├── {module}.controller.ts      # HTTP endpoints
├── entities/
│   └── {entity}.entity.ts      # TypeORM entities
├── dto/
│   ├── create-{module}.dto.ts
│   ├── update-{module}.dto.ts
│   └── filter-{module}.dto.ts
├── repositories/
│   └── {module}.repository.ts  # Database queries
└── services/
    └── {module}.service.ts     # Extended services (optional)
```

#### `/backend/src/common/`
Shared infrastructure:
- **filters/** - Exception filters
- **interceptors/** - Request/response interceptors
- **guards/** - Authorization guards
- **middleware/** - Custom middleware
- **decorators/** - Custom decorators
- **pipes/** - Validation pipes
- **services/** - Shared services (encryption, caching, etc)

### Frontend Structure

#### `/src/components/`
Feature-based component organization:
```
components/
├── {feature}/
│   ├── {Feature}.tsx           # Main component
│   ├── {Feature}Props.ts       # Props interface
│   ├── {Feature}.module.css    # Styles
│   └── index.ts                # Exports
├── common/                     # Shared components
└── index.ts                    # Main export
```

#### `/src/services/`
API and data services:
```
services/
├── api/                        # HTTP clients
├── auth/                       # Authentication
└── storage/                    # Local storage, cookies
```

#### `/src/context/`
State management with React Context:
```
context/
├── {feature}/
│   ├── {Feature}Context.tsx    # Context definition
│   ├── {Feature}Provider.tsx   # Provider component
│   ├── use{Feature}.hook.ts    # Custom hook
│   └── types.ts                # Types
```

## 🎯 Naming Conventions

### Backend
- **Services**: `*.service.ts` (e.g., `inquiries.service.ts`)
- **Controllers**: `*.controller.ts` (e.g., `inquiries.controller.ts`)
- **Entities**: `*.entity.ts` (e.g., `inquiry.entity.ts`)
- **DTOs**: `*.dto.ts` (e.g., `create-inquiry.dto.ts`)
- **Repositories**: `*.repository.ts` (e.g., `inquiries.repository.ts`)
- **Tests**: `*.spec.ts` (e.g., `inquiries.service.spec.ts`)

### Frontend
- **Components**: PascalCase `.tsx` (e.g., `InquiryList.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services**: camelCase `.ts` (e.g., `inquiryService.ts`)
- **Types**: PascalCase `.ts` (e.g., `UserTypes.ts`)
- **Contexts**: PascalCase `.tsx` (e.g., `AuthContext.tsx`)

## 🔄 Module Relationships

```
User Module (Auth)
    ↓
    ├── Users Module
    ├── Inquiries Module
    │   ├── Quotes Module
    │   ├── Orders Module
    │   └── Payments Module
    ├── Products Module
    │   └── Shops Module
    ├── Schedules Module
    └── Audit Module (logs all changes)
```

## 📦 Key Import Paths

Configured in `backend/tsconfig.json`:
```json
{
  "paths": {
    "@/*": ["src/*"],
    "@config/*": ["src/config/*"],
    "@database/*": ["src/database/*"],
    "@modules/*": ["src/modules/*"],
    "@common/*": ["src/common/*"],
    "@utils/*": ["src/utils/*"]
  }
}
```

## 🚀 Quick Navigation

| Need | Location |
|------|----------|
| Add new endpoint | `backend/src/modules/{module}/` |
| Shared component | `src/components/common/` |
| New page | `src/pages/{role}/` |
| API call | `src/services/api/` |
| Auth logic | `src/context/auth/` |
| Type definition | `src/types/{entity}.types.ts` |
| Database query | `backend/src/modules/{module}/repositories/` |
| Business logic | `backend/src/modules/{module}/services/` |
| Custom decorator | `backend/src/common/decorators/` |
| Global error | `backend/src/common/filters/` |
| Validation rule | `src/lib/validators/` |

## ✅ Folder Structure Checklist

- ✅ Backend modules (8 modules fully scaffolded)
- ✅ Frontend components (organized by feature)
- ✅ Services layer (API + auth + storage)
- ✅ Context for state management
- ✅ Hooks for common functionality
- ✅ Utilities and helpers
- ✅ Types and interfaces
- ✅ Assets and styles
- ✅ Test directories
- ✅ Database migrations and seeds

---

**Complete folder structure ready for development! 🚀**
