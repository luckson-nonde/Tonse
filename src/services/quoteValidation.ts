import { z } from 'zod';
import { QuoteField } from './quoteSchemaGenerator';

export const generateZodSchema = (fields: QuoteField[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let zodType: z.ZodTypeAny;

    switch (field.type) {
      case 'currency':
      case 'number':
        zodType = z.coerce.number();
        break;
      case 'textarea':
      case 'select':
      case 'date':
        zodType = z.string();
        break;
      case 'toggle':
        zodType = z.boolean();
        break;
      case 'multiselect':
        zodType = z.array(z.string());
        break;
      default:
        zodType = z.string();
    }

    if (!field.required) {
      zodType = zodType.optional();
    }

    schemaShape[field.name] = zodType;
  });

  return z.object(schemaShape);
};
