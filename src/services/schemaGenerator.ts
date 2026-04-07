import { z } from 'zod';
import { FieldSchema } from './categories';

/**
 * Dynamically generates a Zod schema from an array of FieldSchema objects.
 */
export function generateZodSchema(fields: FieldSchema[]) {
  const schemaShape: Record<string, any> = {};

  fields.forEach((field) => {
    let fieldSchema: any;

    switch (field.type) {
      case 'number':
      case 'currency':
      case 'counter':
        fieldSchema = z.coerce.number();
        if (field.min !== undefined) fieldSchema = fieldSchema.min(field.min, { message: `${field.label} must be at least ${field.min}` });
        if (field.max !== undefined) fieldSchema = fieldSchema.max(field.max, { message: `${field.label} must be at most ${field.max}` });
        break;

      case 'select':
        fieldSchema = z.string();
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        }
        break;

      case 'toggle':
        fieldSchema = z.boolean();
        break;

      case 'date':
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format');
        break;

      case 'image_upload':
        fieldSchema = z.any();
        break;

      case 'textarea':
      case 'text':
      default:
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
        break;
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(''));
    }

    schemaShape[field.name] = fieldSchema;
  });

  return z.object(schemaShape);
}
