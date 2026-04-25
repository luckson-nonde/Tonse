import { z } from 'zod';
import { generateZodSchema } from './quoteValidation';

export interface QuoteField {
  name: string;
  label: string;
  type: 'currency' | 'number' | 'textarea' | 'toggle' | 'select' | 'date' | 'rate_with_unit' | 'multiselect';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  calculation?: 'unit' | 'total' | 'rate';
  options?: string[];
  unitOptions?: string[]; // For rate_with_unit
}

const VALIDITY_OPTIONS = ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'];

const VENUE_AMENITIES = [
  'Tables & Chairs', 'Sound System', 'Stage', 'Kitchen Access', 
  'Air Conditioning', 'WiFi', 'Parking', 'Security', 'Projector'
];

const detectArchetype = (category: string): 'PRODUCT' | 'SERVICE' | 'VENUE' | 'LABOUR' | 'GENERIC' => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('venue') || cat.includes('hall') || cat.includes('garden') || cat.includes('space')) return 'VENUE';
  if (cat.includes('labour') || cat.includes('labor') || cat.includes('worker') || cat.includes('manpower')) return 'LABOUR';
  if (cat.includes('service') || cat.includes('catering') || cat.includes('photography') || cat.includes('decor') || cat.includes('entertainment') || cat.includes('event')) return 'SERVICE';
  if (cat.includes('equipment') || cat.includes('rental') || cat.includes('hire') || cat.includes('product') || cat.includes('supply') || cat.includes('mobile') || cat.includes('electronic')) return 'PRODUCT';
  return 'GENERIC';
};

export const generateQuoteSchema = (
  inquiryCategory: string,
  inquiryAttributes: Record<string, any>,
  processType: 'EXPRESS' | 'STANDARD' = 'STANDARD'
): { fields: QuoteField[]; zodSchema: z.ZodObject<any> } => {
  const archetype = detectArchetype(inquiryCategory);
  const schema: QuoteField[] = [];

  if (archetype === 'PRODUCT') {
    schema.push({
      name: 'price',
      label: inquiryAttributes?.quantity ? 'Unit Price (ZMW)' : 'Total Price (ZMW)',
      type: 'currency',
      required: true,
      calculation: inquiryAttributes?.quantity ? 'unit' : 'total',
    });
    schema.push({
      name: 'condition',
      label: 'Item Condition',
      type: 'select',
      required: true,
      options: ['Brand New', 'Refurbished', 'Used — Excellent', 'Used — Good'],
    });
    schema.push({ name: 'warranty', label: 'Warranty', type: 'textarea', required: false, placeholder: 'Describe warranty terms if any...' });
    schema.push({ name: 'optionalDeliveryOffer', label: 'Offer Delivery?', type: 'toggle', required: false });
    schema.push({ name: 'optionalDeliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false });
    schema.push({ name: 'leadTime', label: 'Lead Time', type: 'textarea', required: false, placeholder: 'e.g. 2-3 business days' });
    schema.push({ name: 'message', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Any additional details...' });
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: VALIDITY_OPTIONS });

  } else if (archetype === 'SERVICE') {
    schema.push({
      name: 'price',
      label: inquiryAttributes?.rentalDuration ? 'Daily Rate (ZMW)' : 'Service Fee (ZMW)',
      type: 'currency',
      required: true,
      calculation: inquiryAttributes?.rentalDuration ? 'rate' : 'total',
    });
    schema.push({ name: 'whatIsIncluded', label: 'What Is Included', type: 'textarea', required: false, placeholder: 'Describe what is covered in this service...' });
    schema.push({ name: 'availabilityDate', label: 'Availability Confirmation', type: 'date', required: true });
    schema.push({ name: 'leadTime', label: 'Lead Time', type: 'textarea', required: false, placeholder: 'e.g. Book 2 weeks in advance' });
    schema.push({ name: 'message', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Any additional details...' });
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: VALIDITY_OPTIONS });

  } else if (archetype === 'VENUE') {
    schema.push({ name: 'price', label: 'Venue Hire Fee (ZMW)', type: 'currency', required: true });
    schema.push({ name: 'securityDeposit', label: 'Security Deposit (ZMW)', type: 'currency', required: false, helpText: 'Refundable deposit to secure the booking' });
    schema.push({ name: 'maxCapacity', label: 'Maximum Capacity', type: 'number', required: true, placeholder: 'Max number of guests' });
    schema.push({ name: 'venueAmenities', label: 'What is Included', type: 'multiselect', required: false, options: VENUE_AMENITIES });
    schema.push({ name: 'message', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Parking, setup time, restrictions...' });
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: VALIDITY_OPTIONS });

  } else if (archetype === 'LABOUR') {
    schema.push({ name: 'price', label: 'Rate (ZMW)', type: 'currency', required: true, helpText: 'Rate per unit selected' });
    schema.push({
      name: 'rateUnit',
      label: 'Rate Per',
      type: 'select',
      required: true,
      options: ['Per Hour', 'Per Day', 'Per Week', 'Per Month'],
    });
    schema.push({ name: 'availabilityDate', label: 'Availability', type: 'date', required: true });
    schema.push({ name: 'numberOfWorkers', label: 'Number of Workers', type: 'number', required: true, placeholder: 'e.g. 5' });
    schema.push({ name: 'message', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Skills, certifications, experience...' });
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: VALIDITY_OPTIONS });

  } else {
    // Generic fallback
    schema.push({ name: 'price', label: 'Total Price (ZMW)', type: 'currency', required: true });
    schema.push({ name: 'optionalDeliveryOffer', label: 'Offer Delivery?', type: 'toggle', required: false });
    schema.push({ name: 'optionalDeliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false });
    schema.push({ name: 'message', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Describe your offer...' });
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: VALIDITY_OPTIONS });
  }

  return { fields: schema, zodSchema: generateZodSchema(schema) };
};

// Fallback for categories without specific schemas
export const getGenericQuoteSchema = (): QuoteField[] => [
  { name: 'price', label: 'Total Price (ZMW)', type: 'currency', required: true },
  { name: 'message', label: 'Quote Details', type: 'textarea', required: false, placeholder: 'Describe your offer...' },
  { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] },
];
