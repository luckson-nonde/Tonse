import { FieldSchema, CATEGORIES_DB } from './categories';
import { ARCHETYPE_CONFIG } from './archetypeConfig';
import { z } from 'zod';
import { generateZodSchema } from './quoteValidation';

export interface QuoteField {
  name: string;
  label: string;
  type: 'currency' | 'number' | 'textarea' | 'toggle' | 'select' | 'date';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  calculation?: 'unit' | 'total' | 'rate'; // How to calculate from inquiry data
  options?: string[]; // For select fields
}

export const generateQuoteSchema = (
  inquiryCategory: string, 
  inquiryAttributes: Record<string, any>
): { fields: QuoteField[], zodSchema: z.ZodObject<any> } => {
  const category = CATEGORIES_DB.find(c => c.name === inquiryCategory || c.id === inquiryCategory);
  if (!category) {
    const fields = getGenericQuoteSchema();
    return { fields, zodSchema: generateZodSchema(fields) };
  }

  const config = ARCHETYPE_CONFIG[category.id];
  if (!config) {
    const fields = getGenericQuoteSchema();
    return { fields, zodSchema: generateZodSchema(fields) };
  }

  const schema: QuoteField[] = [];
  const inquirySchema = category.formSchema || [];

  // 1. Transform inquiry fields based on archetype mapping
  inquirySchema.forEach((field: FieldSchema) => {
    const mappedName = config.quoteMapping[field.name];
    if (mappedName) {
      schema.push({
        name: `quote_${mappedName}`,
        label: `Quote for ${field.label}`,
        type: 'currency', // Default to currency for mapped fields
        required: field.required,
      });
    }
  });

  // 2. Add archetype-specific modifiers
  config.requiredAdditions.forEach(addition => {
    schema.push({ name: addition, label: addition, type: 'textarea', required: false });
  });

  // 3. Always add universal fields
  schema.push(
    { name: 'message', label: 'Detailed Quote Description', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] }
  );

  return { fields: schema, zodSchema: generateZodSchema(schema) };
};

// Fallback for categories without specific schemas
export const getGenericQuoteSchema = (): QuoteField[] => [
  { name: 'price', label: 'Total Price (ZMW)', type: 'currency', required: true },
  { name: 'message', label: 'Quote Details', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' },
  { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] }
];
