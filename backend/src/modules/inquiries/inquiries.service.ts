import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryCategory } from './entities/inquiry-category.entity';
import { CreateInquiryDto, UpdateInquiryDto } from './dto';
import { DisplayIdUtil } from '../../utils/display-id.util';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiriesRepository: Repository<Inquiry>,
    @InjectRepository(InquiryCategory)
    private readonly inquiryCategoriesRepository: Repository<InquiryCategory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Insert the inquiry plus its `inquiry_categories` rows in a single
   * transaction. categoryIds is the *new* shape (Phase: matching); the
   * legacy `category: string` is gone — write paths must now provide
   * an array of stable category ids (e.g. 'mobile-phones-buy').
   */
  async create(createInquiryDto: CreateInquiryDto): Promise<Inquiry> {
    const { categoryIds, ...rest } = createInquiryDto;
    return this.dataSource.transaction(async (manager) => {
      const inquiryRepo = manager.getRepository(Inquiry);
      const junctionRepo = manager.getRepository(InquiryCategory);

      const inquiry = inquiryRepo.create(rest);
      let saved = await inquiryRepo.save(inquiry);
      saved.displayId = DisplayIdUtil.generateDisplayId(saved.id);
      saved = await inquiryRepo.save(saved);

      const uniqueIds = Array.from(new Set(categoryIds));
      if (uniqueIds.length > 0) {
        await junctionRepo.save(
          uniqueIds.map((categoryId) =>
            junctionRepo.create({ inquiryId: saved.id, categoryId }),
          ),
        );
      }
      return saved;
    });
  }

  async findAll(filters: any = {}): Promise<{ data: Inquiry[]; total: number }> {
    const queryBuilder = this.inquiriesRepository.createQueryBuilder('inquiry');

    // Apply filters
    if (filters.buyerId) {
      queryBuilder.andWhere('inquiry.buyerId = :buyerId', { buyerId: filters.buyerId });
    }

    if (filters.status) {
      queryBuilder.andWhere('inquiry.status = :status', { status: filters.status });
    }

    // Phase: matching dropped the legacy `category` exact-equality filter
    // — server-side category-aware leads now flow through MatchingService
    // (`GET /inquiries/leads/me`). findAll still serves "list my inquiries"
    // for buyers via the buyerId filter.

    if (filters.search) {
      queryBuilder.andWhere('(inquiry.title ILIKE :search OR inquiry.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Sorting
    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`inquiry.${sortField}`, sortOrder as any);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Inquiry> {
    return await this.inquiriesRepository.findOne({
      where: { id },
    });
  }

  /**
   * Update an inquiry. When `categoryIds` is provided, the existing
   * junction rows are replaced atomically — old set deleted, new set
   * inserted, all in one transaction. Plain field updates (status,
   * title, etc.) write through directly.
   */
  async update(id: string, updateInquiryDto: UpdateInquiryDto): Promise<Inquiry> {
    const { categoryIds, ...rest } = updateInquiryDto as UpdateInquiryDto & {
      categoryIds?: string[];
    };
    if (categoryIds === undefined) {
      if (Object.keys(rest).length > 0) {
        await this.inquiriesRepository.update(id, rest);
      }
      return this.findOne(id);
    }
    return this.dataSource.transaction(async (manager) => {
      if (Object.keys(rest).length > 0) {
        await manager.getRepository(Inquiry).update(id, rest);
      }
      const junction = manager.getRepository(InquiryCategory);
      await junction.delete({ inquiryId: id });
      const uniqueIds = Array.from(new Set(categoryIds));
      if (uniqueIds.length > 0) {
        await junction.save(
          uniqueIds.map((categoryId) =>
            junction.create({ inquiryId: id, categoryId }),
          ),
        );
      }
      return manager.getRepository(Inquiry).findOne({ where: { id } });
    });
  }

  /** Read the category IDs attached to an inquiry. Used by the buyer
   *  list view so the UI can re-hydrate selections. */
  async findCategoryIds(inquiryId: string): Promise<string[]> {
    const rows = await this.inquiryCategoriesRepository.find({
      where: { inquiryId },
      select: ['categoryId'],
    });
    return rows.map((r) => r.categoryId);
  }

  async remove(id: string): Promise<void> {
    await this.inquiriesRepository.delete(id);
  }

  async findByBuyerId(buyerId: string): Promise<Inquiry[]> {
    const inquiries = await this.inquiriesRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    const withCats = await this.hydrateCategoryFields(inquiries);
    return this.hydrateBuyerInfo(withCats);
  }

  /**
   * Decorate a list of inquiries with `categoryIds` (the canonical
   * stable ids from the inquiry_categories junction) and `category`
   * (a comma-joined display name for legacy callers that still read
   * the legacy field). Mirrors what MatchingService does for the
   * seller-side leads endpoint — without it, buyer-side surfaces
   * (InquiryCard, BuyerDashboard) crash on `inquiry.category.X` since
   * the legacy column was dropped when matching moved to junction-
   * backed categories.
   */
  private async hydrateCategoryFields(inquiries: Inquiry[]): Promise<Inquiry[]> {
    if (inquiries.length === 0) return inquiries;
    const inquiryIds = inquiries.map((i) => i.id);
    const rows: Array<{
      inquiryId: string;
      categoryId: string;
      categoryName: string;
    }> = await this.inquiriesRepository.query(
      `SELECT ic."inquiryId", ic."categoryId", c.name AS "categoryName"
         FROM inquiry_categories ic
         JOIN categories c ON c.id = ic."categoryId"
         WHERE ic."inquiryId" = ANY($1::uuid[])`,
      [inquiryIds],
    );
    const idIndex = new Map<string, string[]>();
    const nameIndex = new Map<string, string[]>();
    for (const r of rows) {
      if (!idIndex.has(r.inquiryId)) idIndex.set(r.inquiryId, []);
      if (!nameIndex.has(r.inquiryId)) nameIndex.set(r.inquiryId, []);
      idIndex.get(r.inquiryId)!.push(r.categoryId);
      nameIndex.get(r.inquiryId)!.push(r.categoryName);
    }
    return inquiries.map((inq) => {
      (inq as any).categoryIds = idIndex.get(inq.id) || [];
      (inq as any).category = (nameIndex.get(inq.id) || []).join(', ');
      return inq;
    });
  }

  /**
   * Decorate inquiries with `buyerName` resolved from `buyer_profiles`
   * (where the human-readable name actually lives — `users` row has
   * no name column in this schema). The buyer-detail panel was
   * rendering "Unknown Buyer" for every inquiry because the inquiry
   * row alone has only `buyerId`. Batched into a single query against
   * the unique buyer-id set.
   */
  private async hydrateBuyerInfo(inquiries: Inquiry[]): Promise<Inquiry[]> {
    if (inquiries.length === 0) return inquiries;
    const buyerIds = Array.from(new Set(inquiries.map((i) => i.buyerId).filter(Boolean)));
    if (buyerIds.length === 0) return inquiries;
    const rows: Array<{ userId: string; name: string }> = await this.inquiriesRepository.query(
      `SELECT "userId", name FROM buyer_profiles WHERE "userId" = ANY($1::uuid[])`,
      [buyerIds],
    );
    const nameByUserId = new Map<string, string>();
    for (const r of rows) {
      if (r.name) nameByUserId.set(r.userId, r.name);
    }
    return inquiries.map((inq) => {
      const name = nameByUserId.get(inq.buyerId);
      if (name) (inq as any).buyerName = name;
      return inq;
    });
  }

  async updateStatus(id: string, status: string): Promise<Inquiry> {
    return await this.update(id, { status } as UpdateInquiryDto);
  }

  /**
   * Atomically bumps the view counter. The frontend fires this when a
   * provider expands an inquiry detail in their leads feed. Atomic UPDATE
   * avoids the read/write race that a `findOne` + `+1` + `update` would have
   * if multiple providers click at the same instant.
   *
   * Returns the post-increment value so the caller can echo it back to the
   * client without a follow-up SELECT.
   */
  async incrementViewCount(id: string): Promise<number> {
    const result = await this.inquiriesRepository
      .createQueryBuilder()
      .update(Inquiry)
      .set({ viewCount: () => '"viewCount" + 1' })
      .where('id = :id', { id })
      .returning('"viewCount"')
      .execute();

    const row = (result.raw && (result.raw[0] as { viewCount: number })) || null;
    return row ? Number(row.viewCount) : 0;
  }

  async findByDisplayId(displayId: string): Promise<Inquiry> {
    return await this.inquiriesRepository.findOne({
      where: { displayId },
    });
  }
}
