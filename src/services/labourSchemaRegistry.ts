import { labourInquirySchemas } from './labourInquirySchemas';
import { labourProfileSchemas } from './labourProfileSchemas';

export function getLabourInquirySchema(schemaKey: string) {
  return labourInquirySchemas[schemaKey] ?? labourInquirySchemas['genericLabourInquirySchema'];
}

export function getLabourProfileSchema(schemaKey: string) {
  if (!schemaKey || schemaKey === 'generic') {
    return labourProfileSchemas['genericLabourProfileSchema'];
  }
  return labourProfileSchemas[schemaKey] ?? labourProfileSchemas['genericLabourProfileSchema'];
}
