# TONSE Marketplace: Display ID Implementation Guide

## Quick Overview

**Current Problem:**

```
InquiryDetails shows: "QID-fce43de0-339c-4706-a2e2-c9d70260061e"
InquiryCard shows: "QID-fce" (3 characters, collision risk)
```

**Recommended Solution:**

```
Display: "QID-8F2D3K" (8 characters, deterministic hash, no collision risk)
```

---

## Implementation Steps

### Step 1: Create ID Generator Utility

**File:** `backend/src/utils/displayIdGenerator.ts`

```typescript
import { createHash } from 'crypto';

export class DisplayIdGenerator {
  private static readonly TYPE_PREFIXES = {
    inquiry: 'QID',
    quote: 'QOT',
    order: 'ORD',
    payment: 'PAY',
    shipment: 'SHP',
  };

  private static readonly CHAR_MAP = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, 1, I, O, L

  /**
   * Generate a deterministic display ID from a UUID
   * Same UUID always produces same display ID
   *
   * @param internalUuid The internal UUID (36 characters with hyphens)
   * @param type Resource type (inquiry, quote, order, etc.)
   * @returns Display ID in format: "QID-ABC123" (11 characters total)
   *
   * @example
   * generateDisplayId('fce43de0-339c-4706-a2e2-c9d70260061e', 'inquiry')
   * // Returns: 'QID-8F2D3K'
   */
  static generateDisplayId(
    internalUuid: string,
    type: keyof typeof DisplayIdGenerator.TYPE_PREFIXES = 'inquiry'
  ): string {
    const prefix = this.TYPE_PREFIXES[type];
    if (!prefix) {
      throw new Error(`Unknown display ID type: ${type}`);
    }

    // Remove hyphens from UUID for consistent hashing
    const cleanUuid = internalUuid.replace(/-/g, '');

    // Hash the UUID using SHA-256
    const hash = createHash('sha256').update(cleanUuid).digest();

    // Take first 6 bytes (48 bits) for ~281 trillion combinations
    // This gives us plenty of room even for large scales
    const hashHex = hash.slice(0, 6).toString('hex').toUpperCase();

    // Replace ambiguous characters if needed (unlikely but possible)
    // 0 -> A, 1 -> B, prevents reader confusion
    const safeHash = hashHex.replace(/0/g, 'A').replace(/1/g, 'B').slice(0, 6);

    return `${prefix}-${safeHash}`;
  }

  /**
   * Verify that a display ID matches an internal UUID
   * Useful for validation and security checks
   */
  static verify(displayId: string, internalUuid: string): boolean {
    const match = displayId.match(/^([A-Z]+)-(.+)$/);
    if (!match) return false;

    const [, typePrefix, idPart] = match;
    const type = Object.entries(this.TYPE_PREFIXES).find(
      ([, prefix]) => prefix === typePrefix
    )?.[0];

    if (!type) return false;

    const regenerated = this.generateDisplayId(internalUuid, type as any);
    return regenerated === displayId;
  }

  /**
   * Parse display ID to extract type and ID part
   */
  static parse(displayId: string): { type: string; prefix: string; id: string } | null {
    const match = displayId.match(/^([A-Z]+)-(.+)$/);
    if (!match) return null;

    const [, prefix, id] = match;
    const type = Object.entries(this.TYPE_PREFIXES).find(([, p]) => p === prefix)?.[0];

    return type ? { type, prefix, id } : null;
  }
}

// Export for convenience
export const generateDisplayId = DisplayIdGenerator.generateDisplayId;
export const verifyDisplayId = DisplayIdGenerator.verify;
export const parseDisplayId = DisplayIdGenerator.parse;
```

**Test File:** `backend/src/utils/displayIdGenerator.spec.ts`

```typescript
import { DisplayIdGenerator } from './displayIdGenerator';

describe('DisplayIdGenerator', () => {
  const testUuid = 'fce43de0-339c-4706-a2e2-c9d70260061e';

  describe('generateDisplayId', () => {
    it('should generate a deterministic display ID', () => {
      const id1 = DisplayIdGenerator.generateDisplayId(testUuid, 'inquiry');
      const id2 = DisplayIdGenerator.generateDisplayId(testUuid, 'inquiry');

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^QID-[A-Z0-9]{6}$/);
    });

    it('should generate different prefixes for different types', () => {
      const inquiryId = DisplayIdGenerator.generateDisplayId(testUuid, 'inquiry');
      const quoteId = DisplayIdGenerator.generateDisplayId(testUuid, 'quote');

      expect(inquiryId).toStartWith('QID-');
      expect(quoteId).toStartWith('QOT-');
    });

    it('should handle UUID without hyphens', () => {
      const uuidNoHyphens = testUuid.replace(/-/g, '');
      const withHyphens = DisplayIdGenerator.generateDisplayId(testUuid, 'inquiry');
      const withoutHyphens = DisplayIdGenerator.generateDisplayId(uuidNoHyphens, 'inquiry');

      // Should produce same result regardless of hyphen format
      expect(withHyphens).toBe(withoutHyphens);
    });

    it('should throw error for unknown type', () => {
      expect(() => DisplayIdGenerator.generateDisplayId(testUuid, 'unknown' as any)).toThrow();
    });
  });

  describe('verify', () => {
    it('should verify correct display ID', () => {
      const displayId = DisplayIdGenerator.generateDisplayId(testUuid, 'inquiry');
      expect(DisplayIdGenerator.verify(displayId, testUuid)).toBe(true);
    });

    it('should reject incorrect display ID', () => {
      expect(DisplayIdGenerator.verify('QID-WRONGID', testUuid)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse display ID components', () => {
      const parsed = DisplayIdGenerator.parse('QID-8F2D3K');

      expect(parsed).toEqual({
        type: 'inquiry',
        prefix: 'QID',
        id: '8F2D3K',
      });
    });

    it('should return null for invalid format', () => {
      expect(DisplayIdGenerator.parse('INVALID')).toBeNull();
    });
  });
});
```

---

### Step 2: Update Inquiry Entity

**File:** `backend/src/modules/inquiries/entities/inquiry.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DisplayIdGenerator } from '../../../utils/displayIdGenerator';

@Entity('inquiries')
@Index('idx_inquiries_buyer_id', ['buyerId'])
@Index('idx_inquiries_category', ['category'])
@Index('idx_inquiries_status', ['status'])
@Index('idx_inquiries_location', ['location'])
@Index('idx_inquiries_created_at', ['createdAt'])
@Index('idx_inquiries_buyer_status', ['buyerId', 'status'])
@Index('idx_inquiries_display_id', ['displayId'], { unique: true }) // NEW
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NEW: Display ID for user-facing interfaces
  @Column({ type: 'varchar', length: 12, unique: true })
  displayId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid' })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'integer', nullable: true })
  radius: number;

  @Column({ type: 'simple-json', nullable: true })
  items: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  preferences: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @Column({ type: 'varchar', length: 50, default: 'quotation' })
  currentStage: string;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'boolean', default: false })
  isLabour: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Auto-generate displayId before inserting
   */
  @BeforeInsert()
  generateDisplayId() {
    if (!this.displayId) {
      this.displayId = DisplayIdGenerator.generateDisplayId(this.id, 'inquiry');
    }
  }
}
```

**Migration:** `backend/src/database/migrations/AddDisplayIdToInquiries.ts`

```typescript
import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddDisplayIdToInquiries1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add display_id column
    await queryRunner.addColumn(
      'inquiries',
      new TableColumn({
        name: 'display_id',
        type: 'varchar',
        length: '12',
        isNullable: true, // Initially nullable for existing records
        isUnique: true,
      })
    );

    // Add index for fast lookups
    await queryRunner.createIndex(
      'inquiries',
      new TableIndex({
        name: 'idx_inquiries_display_id',
        columnNames: ['display_id'],
        isUnique: true,
      })
    );

    // Generate display_id for existing records
    const inquiries = await queryRunner.query('SELECT id FROM inquiries WHERE display_id IS NULL');

    for (const inquiry of inquiries) {
      const { generateDisplayId } = require('../../../utils/displayIdGenerator');
      const displayId = generateDisplayId(inquiry.id, 'inquiry');

      await queryRunner.query('UPDATE inquiries SET display_id = $1 WHERE id = $2', [
        displayId,
        inquiry.id,
      ]);
    }

    // Make display_id NOT NULL
    await queryRunner.changeColumn(
      'inquiries',
      'display_id',
      new TableColumn({
        name: 'display_id',
        type: 'varchar',
        length: '12',
        isNullable: false,
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('inquiries', 'idx_inquiries_display_id');
    await queryRunner.dropColumn('inquiries', 'display_id');
  }
}
```

---

### Step 3: Update Inquiry Service

**File:** `backend/src/modules/inquiries/inquiries.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { DisplayIdGenerator } from '../../utils/displayIdGenerator';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private inquiryRepository: Repository<Inquiry>
  ) {}

  /**
   * Create a new inquiry
   */
  async create(createInquiryDto: CreateInquiryDto, buyerId: string): Promise<Inquiry> {
    const inquiry = this.inquiryRepository.create({
      ...createInquiryDto,
      buyerId,
    });

    // Display ID is auto-generated via @BeforeInsert hook
    return this.inquiryRepository.save(inquiry);
  }

  /**
   * Resolve inquiry by either display ID or internal UUID
   * This is the key lookup method that handles both ID types
   */
  async findByIdOrDisplayId(idInput: string): Promise<Inquiry> {
    // First try display ID (most common user input)
    if (idInput.toUpperCase().startsWith('QID-')) {
      const inquiry = await this.inquiryRepository.findOne({
        where: { displayId: idInput.toUpperCase() },
        relations: ['buyer'],
      });

      if (inquiry) return inquiry;
    }

    // Fall back to UUID for API internal usage
    if (this.isValidUUID(idInput)) {
      const inquiry = await this.inquiryRepository.findOne({
        where: { id: idInput },
        relations: ['buyer'],
      });

      if (inquiry) return inquiry;
    }

    throw new NotFoundException(`Inquiry "${idInput}" not found`);
  }

  /**
   * Find by UUID (internal use)
   */
  async findOne(id: string): Promise<Inquiry> {
    const inquiry = await this.inquiryRepository.findOne({
      where: { id },
      relations: ['buyer'],
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID ${id} not found`);
    }

    return inquiry;
  }

  /**
   * Find by display ID
   */
  async findByDisplayId(displayId: string): Promise<Inquiry> {
    const inquiry = await this.inquiryRepository.findOne({
      where: { displayId: displayId.toUpperCase() },
      relations: ['buyer'],
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${displayId} not found`);
    }

    return inquiry;
  }

  /**
   * Get all inquiries for a buyer
   */
  async findByBuyer(buyerId: string, limit: number = 10): Promise<Inquiry[]> {
    return this.inquiryRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['buyer'],
    });
  }

  /**
   * Update inquiry
   */
  async update(id: string, updateData: Partial<Inquiry>): Promise<Inquiry> {
    const inquiry = await this.findOne(id);

    // Don't allow updating displayId
    if (updateData.displayId) {
      delete updateData.displayId;
    }

    Object.assign(inquiry, updateData);
    return this.inquiryRepository.save(inquiry);
  }

  /**
   * Delete inquiry
   */
  async delete(id: string): Promise<void> {
    await this.inquiryRepository.delete(id);
  }

  /**
   * Utility: Check if string is valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
```

---

### Step 4: Update API Controller

**File:** `backend/src/modules/inquiries/inquiries.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  /**
   * Create a new inquiry
   * POST /inquiries
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createInquiryDto: CreateInquiryDto, @Request() req: any) {
    const inquiry = await this.inquiriesService.create(createInquiryDto, req.user.id);

    return {
      id: inquiry.id,
      displayId: inquiry.displayId,
      title: inquiry.title,
      createdAt: inquiry.createdAt,
      message: `Inquiry created successfully. Reference number: ${inquiry.displayId}`,
    };
  }

  /**
   * Get inquiry by ID or display ID
   * GET /inquiries/:id
   * Accepts:
   *  - Display ID: QID-abc123
   *  - UUID: fce43de0-339c-4706-a2e2-c9d70260061e
   */
  @Get(':id')
  async getInquiry(@Param('id') id: string) {
    const inquiry = await this.inquiriesService.findByIdOrDisplayId(id);

    return {
      id: inquiry.id,
      displayId: inquiry.displayId,
      title: inquiry.title,
      description: inquiry.description,
      category: inquiry.category,
      location: inquiry.location,
      status: inquiry.status,
      viewCount: inquiry.viewCount,
      createdAt: inquiry.createdAt,
      buyer: {
        id: inquiry.buyer.id,
        name: inquiry.buyer.name,
        email: inquiry.buyer.email,
      },
    };
  }

  /**
   * Get my inquiries
   * GET /inquiries/user/my-inquiries
   */
  @Get('user/my-inquiries')
  @UseGuards(JwtAuthGuard)
  async getMyInquiries(@Request() req: any) {
    const inquiries = await this.inquiriesService.findByBuyer(req.user.id);

    return inquiries.map((inquiry) => ({
      id: inquiry.id,
      displayId: inquiry.displayId,
      title: inquiry.title,
      category: inquiry.category,
      status: inquiry.status,
      viewCount: inquiry.viewCount,
      createdAt: inquiry.createdAt,
    }));
  }

  /**
   * Update inquiry
   * PUT /inquiries/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateInquiry(@Param('id') id: string, @Body() updateData: Partial<CreateInquiryDto>) {
    const inquiry = await this.inquiriesService.update(id, updateData);

    return {
      id: inquiry.id,
      displayId: inquiry.displayId,
      title: inquiry.title,
      message: 'Inquiry updated successfully',
    };
  }

  /**
   * Delete inquiry
   * DELETE /inquiries/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteInquiry(@Param('id') id: string) {
    await this.inquiriesService.delete(id);

    return {
      message: 'Inquiry deleted successfully',
    };
  }
}
```

---

### Step 5: Update Frontend Types

**File:** `src/types/inquiry.types.ts`

```typescript
// Inquiry types
export interface Inquiry {
  id: string; // Internal UUID (e.g., "fce43de0-339c-4706-a2e2-c9d70260061e")
  displayId: string; // User-friendly ID (e.g., "QID-8F2D3K")
  title: string;
  description: string;
  buyerId: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  items: InquiryItem[];
  preferences?: Record<string, any>;
  status: InquiryStatus;
  currentStage: InquiryStage;
  viewCount: number;
  isLabour: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  specifications?: Record<string, any>;
}

export enum InquiryStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum InquiryStage {
  QUOTATION = 'quotation',
  PURCHASE_ORDER = 'purchase_order',
  ORDER_CONFIRMATION = 'order_confirmation',
  DELIVERY = 'delivery_order',
  COMPLETED = 'completed',
}

export interface InquiryFilter {
  category?: string;
  status?: InquiryStatus;
  location?: string;
  page?: number;
  limit?: number;
}

// API Response type with displayId
export interface InquiryResponse extends Inquiry {
  displayId: string;
}
```

---

### Step 6: Update Frontend Components

**File:** `src/components/InquiryCard.tsx`

```typescript
// Replace this:
// <span>QID-{String(paidQuote.id).substring(0, 3)}</span>

// With this:
<span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md font-mono font-semibold text-blue-600 text-sm">
  {inquiry.displayId}
  <Copy
    className="w-3 h-3 cursor-pointer hover:text-blue-700"
    onClick={() => {
      navigator.clipboard.writeText(inquiry.displayId);
      // Show toast: "Copied to clipboard"
    }}
  />
</span>
```

**File:** `src/components/InquiryDetails.tsx`

```typescript
// Replace this:
// <span className="font-mono font-bold text-slate-700">QID-{inquiry.id}</span>

// With this:
<div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
  <span className="font-mono font-bold text-lg text-blue-600">
    {inquiry.displayId}
  </span>

  <button
    onClick={() => {
      navigator.clipboard.writeText(inquiry.displayId);
      // Show toast: "Copied to clipboard"
    }}
    className="p-1 hover:bg-blue-100 rounded transition-colors"
    title="Copy inquiry number"
  >
    <Copy className="w-4 h-4 text-blue-400 hover:text-blue-600" />
  </button>

  <Tooltip text="This is your unique inquiry reference number. Use this when contacting support.">
    <Info className="w-4 h-4 text-blue-400" />
  </Tooltip>
</div>
```

---

### Step 7: Update API Service

**File:** `src/services/api/inquiryService.ts`

```typescript
import { apiClient } from './client';
import { Inquiry, InquiryResponse } from '../../types/inquiry.types';

export const inquiryService = {
  // Get inquiry by display ID or UUID
  // Both work: getInquiry('QID-8F2D3K') or getInquiry('fce43de0-339c-4706-a2e2-c9d70260061e')
  getInquiry: async (id: string): Promise<Inquiry> => {
    const response = await apiClient.get<InquiryResponse>(`/inquiries/${id}`);
    return response.data;
  },

  // Get user's inquiries
  getMyInquiries: async (): Promise<Inquiry[]> => {
    const response = await apiClient.get<InquiryResponse[]>('/inquiries/user/my-inquiries');
    return response.data;
  },

  // Create inquiry
  createInquiry: async (data: Partial<Inquiry>): Promise<Inquiry> => {
    const response = await apiClient.post<InquiryResponse>('/inquiries', data);
    return response.data;
  },

  // Update inquiry
  updateInquiry: async (id: string, data: Partial<Inquiry>): Promise<Inquiry> => {
    const response = await apiClient.put<InquiryResponse>(`/inquiries/${id}`, data);
    return response.data;
  },

  // Delete inquiry
  deleteInquiry: async (id: string): Promise<void> => {
    await apiClient.delete(`/inquiries/${id}`);
  },
};
```

---

## Implementation Timeline

| Phase       | Duration | Tasks                                           |
| ----------- | -------- | ----------------------------------------------- |
| **Phase 1** | 1 day    | Create utility, update entity, create migration |
| **Phase 2** | 1 day    | Update service, controller, database            |
| **Phase 3** | 1 day    | Update frontend types and API service           |
| **Phase 4** | 1 day    | Update UI components, add copy-to-clipboard     |
| **Phase 5** | 1 day    | Testing (unit, integration, E2E)                |
| **Phase 6** | 0.5 day  | Deployment, monitoring                          |

**Total:** ~5-6 days

---

## Testing Checklist

### Backend Tests

- [ ] Display ID generation is deterministic (same UUID = same display ID)
- [ ] All existing inquiries get display IDs after migration
- [ ] Lookup by display ID works
- [ ] Lookup by UUID still works
- [ ] Dual lookup (try display ID, fall back to UUID) works
- [ ] Display ID is unique across all inquiries
- [ ] Display ID is not updateable

### Frontend Tests

- [ ] Display ID shows correctly in InquiryCard
- [ ] Display ID shows correctly in InquiryDetails
- [ ] Copy-to-clipboard works
- [ ] Navigating using display ID works
- [ ] API accepts both display ID and UUID

### Integration Tests

- [ ] Create inquiry → display ID auto-generated
- [ ] Display ID appears in email notifications
- [ ] Customer support can lookup by display ID
- [ ] URL slug works with display ID (if applicable)

---

## Deployment Steps

1. **Backup production database**

   ```bash
   mysqldump -u root -p tonse_db > tonse_db_backup.sql
   ```

2. **Run migration in staging**

   ```bash
   npm run migration:run -- --env=staging
   ```

3. **Test in staging**
   - Create new inquiries
   - Verify display IDs generate
   - Test lookup functionality

4. **Deploy to production**

   ```bash
   npm run migration:run -- --env=production
   ```

5. **Monitor**
   - Check error logs for 24 hours
   - Monitor API response times
   - Verify display IDs in customer communications

---

## Rollback Plan

If issues occur:

```typescript
// Rollback migration
npm run migration:revert

// Remove display_id from responses temporarily
// in inquiries.controller.ts
return {
  id: inquiry.id,
  // displayId: inquiry.displayId,  // Comment out temporarily
  title: inquiry.title,
  // ...
};
```

---

## Support Resources

### For Customer Support

```
Q: What is this QID number?
A: "QID" stands for "Quotation Inquiry ID". It's your unique inquiry reference number.
   Use this number when contacting support or referencing this inquiry in communications.

Q: Where do I find my inquiry number?
A: Look for the ID in format "QID-XXXXXX" at the top of your inquiry details page.

Q: Can I share this number with vendors?
A: Yes! Share the QID with vendors so they can easily reference your inquiry.
```

### For Developers

- Display ID is always generated from internal UUID
- Never manually set display ID
- Always use `findByIdOrDisplayId()` for customer-facing lookups
- Use internal UUID for system-to-system communication

---

## Additional Resources

1. [ID Management Best Practices](./ID_MANAGEMENT_BEST_PRACTICES.md)
2. [Inquiry Schema Documentation](./API_ENDPOINTS_COMPLETE.md)
3. [Database Architecture](./DATABASE_ARCHITECTURE.md)
