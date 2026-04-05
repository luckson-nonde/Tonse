
const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, 'src/services/categories.ts');
const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');

// Find the BASE_CATEGORIES_DB array content
const baseCategoriesMatch = categoriesContent.match(/const BASE_CATEGORIES_DB: Category\[\] = \[([\s\S]*?)\];/);
if (!baseCategoriesMatch) {
    console.error('Could not find BASE_CATEGORIES_DB in categories.ts');
    process.exit(1);
}

const baseCategoriesContent = baseCategoriesMatch[1];

// Regex to match individual category objects and extract id, name, and parentId
// It handles:
// - id: '...'
// - name: '...' (including escaped quotes like \')
// - parentId: '...' or parentId: null
const categoryRegex = /\{[\s\S]*?id:\s*'([^']+)'[\s\S]*?name:\s*'((?:\\'|[^'])+)'[\s\S]*?parentId:\s*(?:'([^']*)'|null)[\s\S]*?\}/g;

let match;
const configs = {};

while ((match = categoryRegex.exec(baseCategoriesContent)) !== null) {
    const id = match[1];
    const name = match[2].replace(/\\'/g, "'"); // Unescape quotes for the config
    const parentId = match[3] || ""; // match[3] is undefined if it was null
    
    processCategory(id, name, parentId);
}

function processCategory(id, name, parentId) {
    // Determine archetype based on name/parentId
    let archetype = 'PRODUCT';
    const lowerName = name.toLowerCase();
    const lowerParentId = parentId.toLowerCase();

    const serviceKeywords = [
        'service', 'repair', 'maintenance', 'development', 'management', 
        'catering', 'planning', 'decor', 'consulting', 'testing', 
        'installation', 'recovery', 'restoration', 'upholstery', 'exploration'
    ];
    
    const rentalKeywords = ['rent', 'hire', 'venue', 'club'];

    if (rentalKeywords.some(kw => lowerName.includes(kw) || lowerParentId.includes(kw))) {
        archetype = 'RENTAL';
    } else if (serviceKeywords.some(kw => lowerName.includes(kw) || lowerParentId.includes(kw))) {
        archetype = 'SERVICE';
    }

    configs[id] = {
        categoryName: name,
        archetype: archetype,
        quoteMapping: {
            'quantity': 'unitPrice',
            'duration': 'rate'
        },
        requiredAdditions: archetype === 'PRODUCT' ? ['warranty', 'deliveryFee', 'leadTime'] : 
                           archetype === 'RENTAL' ? ['securityDeposit'] : ['availabilityDate']
    };
}

const output = `
export type Archetype = 'PRODUCT' | 'SERVICE' | 'RENTAL';

export interface ArchetypeConfig {
  categoryName: string;
  archetype: Archetype;
  quoteMapping: Record<string, string>;
  requiredAdditions: string[];
}

export const ARCHETYPE_CONFIG: Record<string, ArchetypeConfig> = ${JSON.stringify(configs, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'src/services/archetypeConfig.ts'), output);
console.log('archetypeConfig.ts generated.');
