# API Implementation Guide (v1 Only)

## Overview
Simple API implementation using **v1** only. No versioning complexity since we're in development.

**API Base URL**: `http://localhost:3001/api`

---

## Supported Version

### Version 1 (v1)
- **Status**: Current
- **Release Date**: 2025-01-01
- **Core Features**:
  - User authentication with JWT
  - Inquiry management
  - Quote creation and tracking
  - Order management
  - Payment processing
  - Delivery tracking
  - Audit logs

---

## Client Implementation

### Basic API Calls
```typescript
import { apiClient } from '@/services/api/client';

// GET request
const response = await apiClient.get('/inquiries');

// POST request
const response = await apiClient.post('/inquiries', { name: 'Test' });

// PATCH request
const response = await apiClient.patch('/inquiries/1', { status: 'CLOSED' });

// DELETE request
await apiClient.delete('/inquiries/1');
```

### In React Hooks
```typescript
import { useFetch, useApi } from '@/hooks/useApi';

// Fetch data on mount
const { data } = useFetch('/inquiries');

// Manual API calls
const { data, post } = useApi('/inquiries');
await post({ name: 'New Inquiry' });
```

---

## Backend Implementation (NestJS)

### Register Middleware in AppModule
**File**: `backend/src/app.module.ts`

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';

@Module({
  imports: [...],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiVersionMiddleware).forRoutes('*');
  }
}
```

### Controller Example
**File**: `backend/src/modules/inquiries/inquiries.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { VersionedRequest } from '@/common/middleware/api-version.middleware';
import { InquiriesService } from './inquiries.service';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  findAll(@Req() req: VersionedRequest) {
    return this.inquiriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inquiriesService.findOne(+id);
  }

  @Post()
  create(@Body() createInquiryDto: CreateInquiryDto) {
    return this.inquiriesService.create(createInquiryDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInquiryDto: UpdateInquiryDto) {
    return this.inquiriesService.update(+id, updateInquiryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inquiriesService.remove(+id);
  }
}
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

---

## Common Query Parameters

All list endpoints support:
```
?page=1                     - Page number
?limit=10                   - Items per page
?search=<query>             - Full text search
?sort=<field>:asc|desc      - Sort by field
?filter[field]=<value>      - Filter by field
```

---

## Response Headers

Each response includes:
```
X-API-Version: v1
```

---

## Testing

```bash
# Test GET
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/inquiries"

# Test POST
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"buyerId":1,"category":"test"}' \
  "http://localhost:3001/api/inquiries"

# Test PATCH
curl -X PATCH -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"CLOSED"}' \
  "http://localhost:3001/api/inquiries/1"
```

---

## Next Steps

1. **Implement endpoints** in each module
2. **Register middleware** in AppModule
3. **Test endpoints** manually
4. **Verify JWT** authentication works

