import { z } from 'zod';
import { generateZodSchema } from './quoteValidation';
import { isRepairVariant } from './categories';

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

// REPAIR takes precedence over PRODUCT/SERVICE: a repair inquiry needs parts +
// labour + turnaround + warranty fields, not the generic SERVICE template
// (price + whatIsIncluded + availabilityDate). Detection reads the variant
// suffix in the category name (the same suffix isRepairVariant checks for in
// services/categories.ts), so the buyer-side specification flows directly into
// the seller-side quote shape.
const detectArchetype = (
  category: string
): 'REPAIR' | 'PRODUCT' | 'SERVICE' | 'VENUE' | 'LABOUR' | 'GENERIC' => {
  if (isRepairVariant(category || '')) return 'REPAIR';
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

  if (archetype === 'REPAIR') {
    // Total quoted price — kept as `price` so downstream payment / quote-card
    // rendering doesn't need a special case. The breakdown fields below give
    // buyers and finance the visibility into what's parts vs labour.
    schema.push({
      name: 'price',
      label: 'Total Quote (ZMW)',
      type: 'currency',
      required: true,
      helpText: 'Diagnosis + parts + labour. Editable after entering the breakdown below.',
      calculation: 'total',
    });
    schema.push({
      name: 'diagnosisFee',
      label: 'Diagnosis Fee (ZMW)',
      type: 'currency',
      required: false,
      helpText: 'Charged whether you fix it or not. Often credited toward the repair if accepted.',
    });
    schema.push({
      name: 'partsCost',
      label: 'Parts Cost (ZMW)',
      type: 'currency',
      required: false,
      helpText: 'Total cost of all replacement parts.',
    });
    schema.push({
      name: 'partsDescription',
      label: 'Parts Description',
      type: 'textarea',
      required: false,
      placeholder: 'e.g. OEM display, battery, charging port',
    });
    schema.push({
      name: 'labourHours',
      label: 'Labour Hours',
      type: 'number',
      required: false,
      placeholder: 'e.g. 2',
    });
    schema.push({
      name: 'labourRate',
      label: 'Labour Rate / Hour (ZMW)',
      type: 'currency',
      required: false,
      helpText: 'Used to compute labour cost = hours × rate.',
    });
    schema.push({
      name: 'turnaroundDays',
      label: 'Turnaround (Days)',
      type: 'number',
      required: true,
      placeholder: 'e.g. 2',
      helpText: 'Working days from drop-off to ready-for-pickup.',
    });
    schema.push({
      name: 'warrantyDays',
      label: 'Warranty (Days)',
      type: 'number',
      required: false,
      placeholder: 'e.g. 30',
      helpText: 'How long the repair is guaranteed for.',
    });
    schema.push({
      name: 'warrantyTerms',
      label: 'Warranty Terms',
      type: 'textarea',
      required: false,
      placeholder: 'What the warranty covers and excludes (e.g. parts only, water damage void).',
    });
    schema.push({
      name: 'message',
      label: 'Repair Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Additional notes for the buyer — diagnosis findings, recommendations…',
    });
    schema.push({
      name: 'expiryDuration',
      label: 'Quote Valid For',
      type: 'select',
      required: true,
      options: VALIDITY_OPTIONS,
    });

  } else if (archetype === 'PRODUCT') {
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
