import { z } from 'zod';
import { FieldSchema } from './categories';

const isEmptyValue = (v: any): boolean =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Dynamically generates a Zod schema from an array of FieldSchema objects.
 *
 * `dependsOn` awareness: a field that is only shown when another field matches
 * (e.g. the collateral vehicle/property fields on a loan request) is kept
 * LENIENT at the base level so a HIDDEN field never blocks submit. When it is
 * `required`, that requiredness is enforced ONLY WHEN VISIBLE via the
 * `superRefine` below. This is what makes "all requirements filled before the
 * request is sent" hold for conditional forms without dead-locking on fields
 * the user can't even see.
 */
export function generateZodSchema(fields: FieldSchema[]) {
  const schemaShape: Record<string, any> = {};

  fields.forEach((field) => {
    const fieldName = field.name || (field as any).id;

    // Conditional field → lenient base (validated when-visible in superRefine).
    if (field.dependsOn) {
      schemaShape[fieldName] = z.any().optional();
      return;
    }

    let fieldSchema: any;

    switch (field.type) {
      case 'number':
      case 'currency':
      case 'counter':
        fieldSchema = z.coerce.number();
        if (field.min !== undefined)
          fieldSchema = fieldSchema.min(field.min, {
            message: `${field.label} must be at least ${field.min}`,
          });
        if (field.max !== undefined)
          fieldSchema = fieldSchema.max(field.max, {
            message: `${field.label} must be at most ${field.max}`,
          });
        break;

      case 'select':
        fieldSchema = z.string();
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        }
        break;

      case 'multiselect':
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
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

      case 'gps':
        fieldSchema = z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional();
        break;

      case 'textarea':
      case 'text':
      default:
        fieldSchema = z.string();

        // Add specific validation for NRC field (Zambian format: 000000/00/0)
        if (field.name === 'nrc' && field.required) {
          fieldSchema = z
            .string()
            .regex(/^\d{6}\/\d{2}\/\d{1}$/, 'NRC must be in Zambian format: 000000/00/0');
        }

        if (field.required && field.name !== 'nrc') {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
        break;
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(''));
    }

    schemaShape[fieldName] = fieldSchema;
  });

  const base = z.object(schemaShape);

  // Enforce required-when-visible for conditional fields.
  const conditionalRequired = fields.filter((f) => f.required && f.dependsOn);
  if (conditionalRequired.length === 0) return base;

  return base.superRefine((data: any, ctx: z.RefinementCtx) => {
    for (const f of conditionalRequired) {
      const dep = f.dependsOn!;
      const visible = data[dep.field] === dep.value;
      const fieldName = f.name || (f as any).id;
      if (visible && isEmptyValue(data[fieldName])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${f.label} is required`,
        });
      }
    }
  });
}
