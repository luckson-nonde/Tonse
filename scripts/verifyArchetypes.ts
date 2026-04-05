import { CATEGORIES_DB } from '../src/services/categories';
import { ARCHETYPE_CONFIG } from '../src/services/archetypeConfig';

const unmappedCategories: string[] = [];

CATEGORIES_DB.forEach(category => {
  // Only check subcategories that have a formSchema (usually those with parentId != null)
  if (category.parentId !== null && !ARCHETYPE_CONFIG[category.id]) {
    unmappedCategories.push(category.name);
  }
});

if (unmappedCategories.length > 0) {
  console.error('Error: The following categories are missing an archetype assignment in archetypeConfig.ts:');
  unmappedCategories.forEach(cat => console.error(` - ${cat}`));
  process.exit(1);
} else {
  console.log('All categories are mapped to an archetype.');
  process.exit(0);
}
