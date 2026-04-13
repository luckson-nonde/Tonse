import { labourInquirySchemas } from './labourInquirySchemas';
import { labourProfileSchemas } from './labourProfileSchemas';

export function getLabourInquirySchema(schemaKey: string) {
  return labourInquirySchemas[schemaKey] ?? labourInquirySchemas['genericLabourInquirySchema'];
}

export function getLabourProfileSchema(schemaKey: string) {
  if (!schemaKey || schemaKey === 'generic') {
    return labourProfileSchemas['genericLabourProfileSchema'];
  }
  const schema = labourProfileSchemas[schemaKey] ?? labourProfileSchemas['genericLabourProfileSchema'];
  
  // Validate every field before returning
  const sanitized = {
    ...schema,
    sections: schema.sections.map(section => ({
      ...section,
      fields: section.fields.filter(field => field && field.type && field.id && field.label)
    }))
  };
  return sanitized;
}
