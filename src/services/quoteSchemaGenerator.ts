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
  inquiryAttributes: Record<string, any>,
  processType: 'EXPRESS' | 'STANDARD' = 'STANDARD'
): { fields: QuoteField[], zodSchema: z.ZodObject<any> } => {
  const category = CATEGORIES_DB.find(c => c.name === inquiryCategory || c.id === inquiryCategory);
  
  const schema: QuoteField[] = [];

  // 1. Add Archetype-specific fields
  if (category) {
    const config = ARCHETYPE_CONFIG[category.id];
    if (config) {
      if (config.archetype === 'PRODUCT') {
        schema.push({ 
          name: 'price', 
          label: inquiryAttributes.quantity ? 'Unit Price (ZMW)' : 'Total Price (ZMW)', 
          type: 'currency', 
          required: true,
          calculation: inquiryAttributes.quantity ? 'unit' : 'total'
        });
        schema.push({ name: 'condition', label: 'Item Condition', type: 'select', required: true, options: ['Brand New', 'Refurbished', 'Used - Excellent', 'Used - Good'] });
      } else if (config.archetype === 'SERVICE') {
        schema.push({ 
          name: 'price', 
          label: inquiryAttributes.rentalDuration ? 'Daily Rate (ZMW)' : 'Service Fee (ZMW)', 
          type: 'currency', 
          required: true,
          calculation: inquiryAttributes.rentalDuration ? 'rate' : 'total'
        });
        schema.push({ name: 'availabilityDate', label: 'Earliest Availability', type: 'date', required: true });
      } else if (config.archetype === 'RENTAL') {
        schema.push({ 
          name: 'price', 
          label: 'Daily Rental Rate (ZMW)', 
          type: 'currency', 
          required: true,
          calculation: 'rate'
        });
        schema.push({ name: 'securityDeposit', label: 'Security Deposit (Refundable)', type: 'currency', required: false });
      }

      // Add required additions from config
      config.requiredAdditions.forEach(addition => {
        if (!schema.find(f => f.name === addition)) {
          schema.push({ 
            name: addition, 
            label: addition.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 
            type: addition.toLowerCase().includes('fee') || addition.toLowerCase().includes('price') ? 'currency' : 'textarea', 
            required: false 
          });
        }
      });
    } else {
      schema.push(...getGenericQuoteSchema());
    }
  } else {
    schema.push(...getGenericQuoteSchema());
  }

  // 2. Add delivery options if applicable
  schema.push({ name: 'optionalDeliveryOffer', label: 'Offer Delivery?', type: 'toggle', required: false });
  schema.push({ name: 'optionalDeliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false });

  // 3. Always add universal fields
  schema.push(
    { name: 'message', label: 'Detailed Quote Description', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' }
  );

  if (processType === 'STANDARD') {
    schema.push({ name: 'proformaInvoice', label: 'Upload Proforma Invoice', type: 'textarea', required: true, placeholder: 'Link or description of proforma invoice' });
    schema.push({ name: 'validityPeriod', label: 'Validity Period (Days)', type: 'number', required: true, placeholder: 'e.g. 30' });
  } else {
    schema.push({ name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] });
  }

  return { fields: schema, zodSchema: generateZodSchema(schema) };
};

// Fallback for categories without specific schemas
export const getGenericQuoteSchema = (): QuoteField[] => [
  { name: 'price', label: 'Total Price (ZMW)', type: 'currency', required: true },
  { name: 'message', label: 'Quote Details', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' },
  { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] }
];
