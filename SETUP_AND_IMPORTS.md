# TONSE Marketplace - Complete Setup & Import Guide

## 📁 Project Structure Overview

```
tonse-hub/
├── backend/                    # NestJS REST API
│   ├── src/
│   │   ├── main.ts            # App entry point
│   │   ├── app.module.ts       # Root module
│   │   ├── config/            # Configuration files
│   │   ├── modules/           # Feature modules (9 total)
│   │   ├── common/            # Shared infrastructure
│   │   ├── utils/             # Helper functions & constants
│   │   ├── database/          # Migrations & seeds
│   │   └── types/             # Shared TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── src/                        # React Frontend (Vite)
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Root component
│   ├── types/                 # TypeScript definitions
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Role-based page views
│   ├── services/              # API & business logic
│   ├── context/               # React Context state
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities & constants
│   └── assets/                # Images, icons, fonts
│
├── public/                     # Static assets
├── docker-compose.yml         # PostgreSQL + PgAdmin setup
├── package.json               # Root dependencies
└── README.md
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
# Frontend
cd /path/to/project
npm install

# Backend
cd backend
npm install
```

### 2. Setup Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# ⚠️ CHANGE: JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD

# Frontend
cp .env.example .env.local
# Set: VITE_API_URL=http://localhost:3000/api
```

### 3. Start Docker Services

```bash
# Start PostgreSQL + PgAdmin
docker-compose up -d

# Verify services
docker ps
```

### 4. Run Migrations

```bash
cd backend
npm run migrations:run
```

### 5. Start Development

```bash
# Terminal 1: Backend (NestJS)
cd backend
npm run start:dev

# Terminal 2: Frontend (Vite - new terminal)
npm run dev
```

### 6. Access Services

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **PgAdmin**: http://localhost:5050 (admin/admin)
  - In pgAdmin server registration, use:
    - Host name/address: `postgres`
    - Port: `5432`
    - Maintenance DB / Database: `tonse_db`
    - Username: `tonse_user`
    - Password: `tonse_password_secure_change_me`

---

## 📚 Import Guide

### Backend Imports

#### Utilities

```typescript
// Import helpers, validators, constants
import { PaginationHelper, DateHelper, StringHelper } from '@/utils/helpers';
import { validateEmail, validatePrice, validatePhoneNumber } from '@/utils/validators';
import { ROLES, STATUSES, INQUIRY_STATUS, QUOTE_STATUS, ORDER_STATUS } from '@/utils/constants';
```

#### Services

```typescript
// Import services
import { AuthService } from '@/modules/auth/auth.service';
import { UsersService } from '@/modules/users/users.service';
import { EncryptionService } from '@/common/services/encryption.service';
```

#### Entities

```typescript
// Import entities
import { User } from '@/modules/users/user.entity';
import { Inquiry } from '@/modules/inquiries/inquiry.entity';
import { Quote } from '@/modules/quotes/quote.entity';
```

#### DTOs

```typescript
// Import DTOs
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
```

---

### Frontend Imports

#### Components

```typescript
// Common components
import { Button, Card, Modal, Input } from '@/components/common';

// Feature components
import { InquiryList, InquiryCard } from '@/components/inquiry';
import { QuoteList, QuoteCard } from '@/components/quote';
import { OrderList, OrderCard } from '@/components/order';

// Auth components
import { LoginForm, RegisterForm } from '@/components/auth';
```

#### Types

```typescript
// Import types
import type { User, UserRole } from '@/types/user.types';
import type { Inquiry, InquiryStatus } from '@/types/inquiry.types';
import type { Quote, QuoteStatus } from '@/types/quote.types';
import type { Order, OrderStatus } from '@/types/order.types';
import type { Payment, PaymentStatus } from '@/types/payment.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
```

#### Utilities

```typescript
// Import validators
import { validateEmail, validatePassword, validatePhoneNumber } from '@/lib/validators';

// Import formatters
import { formatDate, formatCurrency, formatPhoneNumber, truncateText } from '@/lib/formatters';

// Import constants
import { API_BASE_URL, ROLES, QUOTE_STATUSES, ORDER_STATUSES } from '@/lib/constants';
```

#### Hooks

```typescript
// Import custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { useForm } from '@/hooks/useForm';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePagination } from '@/hooks/usePagination';
```

#### Services

```typescript
// Import API services
import { userService } from '@/services/api/userService';
import { inquiryService } from '@/services/api/inquiryService';
import { quoteService } from '@/services/api/quoteService';

// Import auth
import { authService } from '@/services/auth/authService';
```

---

## 🔐 Environment Setup

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://tonse_user:tonse_pass@localhost:5432/tonse_db
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tonse_user
DB_PASSWORD=tonse_pass
DB_DATABASE=tonse_db

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=1h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRE=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# App
NODE_ENV=development
APP_PORT=3000
```

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=TONSE Marketplace
```

### Generate Secure Keys (Backend)

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (must be exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 📁 Module Structure

Each feature module follows this pattern:

```
modules/
├── moduleName/
│   ├── dto/
│   │   ├── create-modulename.dto.ts
│   │   ├── update-modulename.dto.ts
│   │   └── index.ts
│   ├── repositories/
│   │   └── modulename.repository.ts
│   ├── services/
│   │   └── modulename.service.ts
│   ├── controllers/
│   │   └── modulename.controller.ts
│   ├── modulename.entity.ts
│   └── modulename.module.ts
```

### Example: Creating an Inquiry Service

**Step 1**: Define DTO (`modules/inquiries/dto/create-inquiry.dto.ts`)

```typescript
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  items: InquiryItem[];

  @IsOptional()
  @IsString()
  category: string;
}
```

**Step 2**: Create Entity (`modules/inquiries/inquiry.entity.ts`)

```typescript
import { Entity, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '@/modules/users/user.entity';

@Entity('inquiries')
export class Inquiry {
  @Column()
  title: string;

  @ManyToOne(() => User)
  buyer: User;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Step 3**: Build Service (`modules/inquiries/services/inquiries.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../inquiry.entity';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private inquiryRepository: Repository<Inquiry>
  ) {}

  async create(dto: CreateInquiryDto, buyerId: string) {
    return this.inquiryRepository.save({
      ...dto,
      buyerId,
    });
  }

  async findAll() {
    return this.inquiryRepository.find();
  }
}
```

**Step 4**: Add Controller (`modules/inquiries/controllers/inquiries.controller.ts`)

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { InquiriesService } from '../services/inquiries.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('inquiries')
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  async create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto, 'userId');
  }

  @Get()
  async findAll() {
    return this.inquiriesService.findAll();
  }
}
```

**Step 5**: Register in Module (`modules/inquiries/inquiries.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './inquiry.entity';
import { InquiriesService } from './services/inquiries.service';
import { InquiriesController } from './controllers/inquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  providers: [InquiriesService],
  controllers: [InquiriesController],
  exports: [InquiriesService],
})
export class InquiriesModule {}
```

---

## 🧪 Testing Structure

### Backend Tests

```
backend/src/
├── __tests__/
│   ├── unit/
│   │   ├── auth.service.spec.ts
│   │   ├── users.service.spec.ts
│   │   └── ...
│   └── integration/
│       ├── auth.e2e.spec.ts
│       ├── inquiries.e2e.spec.ts
│       └── ...
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## 🎯 Common Development Tasks

### Add New API Endpoint

1. Create DTO
2. Add method to service
3. Add controller method
4. Test with Postman or cURL

### Add New React Component

1. Create `.tsx` file in `src/components/[feature]/`
2. Export from `index.ts`
3. Import in parent component
4. Use with TypeScript types

### Query Database

```bash
# Using Docker
docker exec -it tonse-mysql mariadb -u tonse_user -ptonse_pass tonse_db

# Or use PgAdmin at http://localhost:5050
```

### Check TypeScript Errors

```bash
# Backend
cd backend && npm run type-check

# Frontend
npm run type-check
```

### Format Code

```bash
# Backend
cd backend && npm run lint:fix

# Frontend
npm run lint:fix
```

---

## 🔍 Debugging

### Backend Debugging

```bash
# Start with debugger
node --inspect-brk -r ts-node/register src/main.ts

# Connect in VS Code: Chrome DevTools port 9229
```

### Frontend Debugging

- Open Chrome DevTools (F12)
- React DevTools Extension
- Check Network tab for API calls

### Database Debugging

```bash
# Connect directly to PostgreSQL
docker exec -it tonse-postgres psql -U tonse_user tonse_db

# List tables
\dt

# Query
SELECT * FROM users LIMIT 5;
```

---

## 📖 Documentation Files

- `QUICK_START.md` - 5-minute setup guide
- `FULLSTACK_SETUP.md` - Complete architecture guide
- `DATABASE_ARCHITECTURE.md` - Schema & performance
- `API_TESTING.md` - Endpoint examples & testing
- `FOLDER_STRUCTURE.md` - This document's companion

---

## ✅ Production Checklist

- [ ] Change all `.env` secrets
- [ ] Enable CORS properly
- [ ] Setup HTTPS/SSL
- [ ] Configure database backups
- [ ] Setup monitoring & logging
- [ ] Enable rate limiting
- [ ] Setup CI/CD pipeline
- [ ] Enable 2FA
- [ ] Configure CDN for static files
- [ ] Setup error tracking (Sentry)

---

## 🆘 Troubleshooting

**Issue**: Port 3000 already in use

```bash
# Find process using port
lsof -i :3000
# Kill it
kill -9 <PID>
```

**Issue**: PostgreSQL connection failed

```bash
# Check if container is running
docker ps

# View logs
docker logs tonse-postgres
```

**Issue**: Module not found errors

```bash
# Clear node_modules
rm -rf node_modules
npm install

# Rebuild TypeScript
npm run build
```

**Issue**: JWT token expired

- Refresh token using `/auth/refresh` endpoint
- Check `JWT_EXPIRE` in `.env`

---

## 📞 Support Resources

- GitHub Discussions
- Stack Overflow (`#tonse-marketplace`)
- Team Slack Channel
- Documentation Wiki
- Issue Tracker

---

**Last Updated**: 2024 | **Version**: 1.0.0
