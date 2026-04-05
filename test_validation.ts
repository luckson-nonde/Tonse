import { generateQuoteSchema } from './src/services/quoteSchemaGenerator';
import { z } from 'zod';

// Mocking the categories to test
// I'll just use the ones I know exist in src/services/categories.ts
// I'll need to import them, but they are not exported individually.
// Wait, I can't easily import them without modifying categories.ts.
// I'll just use the generateQuoteSchema function directly as it's already implemented.

const testCategories = [
    'Mobile Phones Repair',
    'Construction Machinery'
];

testCategories.forEach(category => {
    console.log(`Testing category: ${category}`);
    try {
        const { fields, zodSchema } = generateQuoteSchema(category, {});
        console.log(`Fields generated: ${fields.length}`);
        
        // Test validation
        const result = zodSchema.safeParse({});
        console.log(`Validation result for empty object: ${result.success}`);
        if (!result.success) {
            console.log(`Validation errors: ${JSON.stringify(result.error.issues, null, 2)}`);
        }
    } catch (e) {
        console.error(`Error generating schema for ${category}:`, e);
    }
});
