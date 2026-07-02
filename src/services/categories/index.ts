// Barrel for the categories module. Public API is exactly the surface the
// old monolithic src/services/categories.ts exported — consumers import
// 'services/categories' and resolve here unchanged.
export type { FieldSchema, Category } from './types';
export {
  GENERIC_FALLBACK_SCHEMA,
  CATEGORIES_DB,
  getCategoryNature,
  isRelatedCategory,
  fetchCategories,
  getCategorySchema,
} from './catalog';
export type { CategoryNature } from './catalog';
export { RENTAL_CATALOG_ITEMS, equipmentRentalCoreSchema } from './schemas/events';
export type { BusinessType, CategoryType } from './businessTypes';
export {
  getCategoryType,
  REPAIR_ACTION_PATTERN,
  BUY_NEW_ACTION_PATTERN,
  isRepairVariant,
  isBuyNewVariant,
  getCategoryVariant,
  getBusinessTypes,
  getPrimaryBusinessType,
  getEffectiveBusinessType,
  getEffectiveBusinessTypes,
  getBusinessTypeLabel,
} from './businessTypes';
