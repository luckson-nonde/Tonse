import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Archetype, CategoryNature, ActionVariant } from './entities/category.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const catalog = require('./catalog.json') as Array<{
  id: string;
  name: string;
  parentId: string | null;
  baseName: string | null;
  type: string | null;
}>;

const REPAIR_SUFFIXES = /\((repair|restoration|upholstery|recovery|service|maintenance|fix)\b[^)]*\)$/i;
const BUY_SUFFIXES = /\((buy new|buy|new|purchase|sell|sale|retail)\b[^)]*\)$/i;

/**
 * Pin each parent-id to the archetype it implies. Subs inherit from the
 * parent unless the action variant overrides (a "(Repair)" sub flips to
 * REPAIR regardless of parent). Adding a new top-level category? Append
 * one line here.
 */
const PARENT_ARCHETYPE: Record<string, Archetype> = {
  electronics: 'RETAIL',
  furniture: 'RETAIL',
  fashion: 'RETAIL',
  'home-decor': 'RETAIL',
  automotive: 'RETAIL',
  groceries: 'RETAIL',
  beauty: 'RETAIL',
  construction: 'RETAIL',
  entertainment: 'ENTERTAINMENT',
  events: 'EVENTS',
  telecommunications: 'SERVICE',
  'it-services': 'SERVICE',
  'it-products': 'RETAIL',
  'drilling-services': 'SERVICE',
  agriculture: 'RETAIL',
  // Synthetic roots for the labour trades and machinery-hire equipment
  // (children of these in catalog.json come from labourCategories.ts via
  // extract-catalog.cjs). Seeding them satisfies the junction FKs — a
  // provider registering with trade/equipment ids, or an inquiry tagged
  // with them, writes rows that reference these categories. LABOUR routes
  // trade providers to the labour dashboard; RENTAL routes machinery-hire
  // providers to the rental dashboard (fleet / active rentals / returns).
  labour: 'LABOUR',
  'machinery-hire': 'RENTAL',
  // Hospital Labs + Pharmacies both fulfil buyer requests (test orders /
  // prescriptions) — generic SERVICE archetype, no bespoke dashboard.
  'clinical-services': 'SERVICE',
  // Locksmiths fulfil key/lock requests (cutting, replacement, car-key
  // programming) — generic SERVICE archetype, no bespoke dashboard.
  'locksmith-key-services': 'SERVICE',
  // Landlords/agents quote unit offers against booking-shaped requests —
  // the BOOKING dashboard ("Booking Requests") fits, NOT machinery RENTAL.
  apartments: 'BOOKING',
  loans: 'LENDING',
  // Bakers quote a made-to-order commitment (cake / standing order) against
  // a needed-by date — BOOKING like Apartments, not a RETAIL SKU storefront.
  'pastry-bakery': 'BOOKING',
};

/**
 * Id-pinned sub-category archetypes — checked BEFORE the name regexes in
 * deriveArchetype. Exists because name-sniffing is fragile here: the
 * apartment subs live one plural away from the `\brental\b` → RENTAL rule
 * ("Long-Term Rentals"), and a future rename must not silently reroute
 * landlords onto the machinery fleet dashboard.
 */
const SUB_ARCHETYPE: Record<string, Archetype> = {
  'long-term-rentals': 'BOOKING',
  'short-stay-serviced': 'BOOKING',
  'boarding-student-rooms': 'BOOKING',
  // Beauty's parent archetype is RETAIL (fragrances, cosmetics off a shelf),
  // but these five are appointments with a person, not stock. Without the
  // pin a nail tech would seed onto the retail/product dashboard.
  skincare: 'SERVICE',
  'makeup-cosmetics': 'SERVICE',
  haircare: 'SERVICE',
  nails: 'SERVICE',
  'lashes-brows': 'SERVICE',
  pedicure: 'SERVICE',
};

const PARENT_NATURE: Record<string, CategoryNature> = {
  electronics: 'BOTH',
  furniture: 'BOTH',
  fashion: 'PRODUCT',
  'home-decor': 'PRODUCT',
  automotive: 'BOTH',
  groceries: 'PRODUCT',
  beauty: 'BOTH',
  construction: 'BOTH',
  entertainment: 'SERVICE',
  events: 'SERVICE',
  telecommunications: 'SERVICE',
  'it-services': 'SERVICE',
  'it-products': 'PRODUCT',
  'drilling-services': 'SERVICE',
  agriculture: 'BOTH',
  labour: 'SERVICE',
  'machinery-hire': 'SERVICE',
  'clinical-services': 'SERVICE',
  'locksmith-key-services': 'SERVICE',
  apartments: 'SERVICE',
  loans: 'SERVICE',
  'pastry-bakery': 'SERVICE',
};

function deriveActionVariant(name: string): ActionVariant {
  if (REPAIR_SUFFIXES.test(name)) return 'REPAIR';
  if (BUY_SUFFIXES.test(name)) return 'BUY_NEW';
  return null;
}

/**
 * The subtle bit: an event-category sub like "Event Equipment Rental"
 * should resolve to RENTAL not EVENTS even though its parent is
 * 'events'. Likewise, a furniture sub with "(Repair)" flips to REPAIR.
 * The action variant is the strongest signal; otherwise we fall back to
 * the parent.
 */
function deriveArchetype(
  entry: typeof catalog[number],
  parentArchetype: Archetype | undefined
): Archetype {
  // Explicit id pins win over every name heuristic below.
  if (SUB_ARCHETYPE[entry.id]) return SUB_ARCHETYPE[entry.id];

  const variant = deriveActionVariant(entry.name);
  if (variant === 'REPAIR') return 'REPAIR';

  // Specific sub-category nameisms that should override the parent.
  // Keep this list tight — the cleaner path is renaming the sub.
  const lower = entry.name.toLowerCase();
  if (/\brental\b/.test(lower)) return 'RENTAL';
  // Service-shaped event sub-categories (catering / decor / planning /
  // management) resolve to SERVICE so caterers/decorators land on the
  // services dashboard ("Service Requests / My Proposals / Service
  // Catalog") instead of the venue-themed events one. EVENTS stays
  // reserved for the venue/hall side which carries its own bespoke
  // venue-spaces view.
  if (/\b(catering|decor|planning|management)\b/.test(lower)) return 'SERVICE';
  if (/\bdj\b|\bband\b|\bperformer\b|\bmc\b|\bmusician\b/.test(lower)) return 'ENTERTAINMENT';

  return parentArchetype || 'RETAIL';
}

function deriveNature(
  entry: typeof catalog[number],
  parentNature: CategoryNature | undefined
): CategoryNature {
  if (deriveActionVariant(entry.name) === 'REPAIR') return 'SERVICE';
  if (deriveActionVariant(entry.name) === 'BUY_NEW') return 'PRODUCT';
  return parentNature || 'PRODUCT';
}

@Injectable()
export class CategoriesSeederService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesSeederService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  /**
   * Idempotent upsert of every catalog entry. Safe to run on every boot.
   * Parents are seeded before children (the source list already orders
   * them that way) so the FK on `parentId` resolves at insert time.
   */
  async seed() {
    let inserted = 0;
    let updated = 0;
    for (const entry of catalog) {
      const parentArchetype = entry.parentId ? PARENT_ARCHETYPE[entry.parentId] : undefined;
      const parentNature = entry.parentId ? PARENT_NATURE[entry.parentId] : undefined;

      const archetype = entry.parentId === null
        ? PARENT_ARCHETYPE[entry.id] || 'RETAIL'
        : deriveArchetype(entry, parentArchetype);
      const nature = entry.parentId === null
        ? PARENT_NATURE[entry.id] || 'PRODUCT'
        : deriveNature(entry, parentNature);
      const actionVariant = deriveActionVariant(entry.name);

      const existing = await this.categoryRepository.findOne({ where: { id: entry.id } });
      if (existing) {
        // Only write if something actually changed — keeps updatedAt stable
        // on no-op boots and the log line honest.
        if (
          existing.name !== entry.name ||
          existing.parentId !== entry.parentId ||
          existing.archetype !== archetype ||
          existing.nature !== nature ||
          existing.actionVariant !== actionVariant
        ) {
          await this.categoryRepository.update(
            { id: entry.id },
            {
              name: entry.name,
              parentId: entry.parentId,
              archetype,
              nature,
              actionVariant,
            },
          );
          updated++;
        }
      } else {
        await this.categoryRepository.save(
          this.categoryRepository.create({
            id: entry.id,
            name: entry.name,
            parentId: entry.parentId,
            archetype,
            nature,
            actionVariant,
          }),
        );
        inserted++;
      }
    }
    if (inserted || updated) {
      this.logger.log(
        `Categories seed: ${inserted} inserted, ${updated} updated, ${catalog.length} total`,
      );
    }
  }
}

// catalog.json regenerated 2026-07-11: +clinical-services (hospital-labs, pharmacies)

// catalog.json regenerated: +apartments (long-term-rentals, short-stay-serviced, boarding-student-rooms)

// catalog.json regenerated: +pastry-bakery (custom-cakes, bread-pastries)

// catalog.json regenerated: +locksmith-key-services (key-replacement)

// catalog.json regenerated 2026-07-26: +home-care under clinical-services
