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

      case 'datetime':
        // Day with OPTIONAL time — "2026-08-02" or "2026-08-02T14:00".
        // derivedGigEvents.splitDateTime parses both shapes; the time part is
        // only for services that must happen at a specific hour.
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, 'Pick a date');
        break;

      case 'image_upload':
      // Same shape as image_upload (array of uploaded URLs), so zod stays
      // out of the way. Requiredness is enforced by the guard in
      // DynamicInquiryForm.onFormSubmit — z.any() can't express it.
      case 'guided_capture':
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
          // `min` on a text/textarea field is a CHARACTER minimum. Used where
          // the answer is forwarded to a backend-validated column (the
          // inquiry `description` probe requires 10+ chars) so the buyer is
          // corrected in-form instead of eating a 400 on submit.
          fieldSchema =
            field.min !== undefined
              ? fieldSchema.min(field.min, `${field.label} needs at least ${field.min} characters`)
              : fieldSchema.min(1, `${field.label} is required`);
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
      const visible = Array.isArray(dep.value)
        ? dep.value.includes(data[dep.field])
        : data[dep.field] === dep.value;
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
