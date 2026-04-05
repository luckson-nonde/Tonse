import { FieldSchema, CATEGORIES_DB } from './categories';

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

// Map inquiry fields → appropriate quote response fields
export const INQUIRY_TO_QUOTE_MAPPING: Record<string, Partial<QuoteField>> = {
  'quantity': { 
    type: 'currency', 
    label: 'Price per Unit (ZMW)',
    calculation: 'unit',
    helpText: 'Price per item. Total will be calculated automatically.'
  },
  'duration': { 
    type: 'currency', 
    label: 'Rate (ZMW)',
    calculation: 'rate',
    helpText: 'Price per unit of time. Total for entire period shown below.'
  },
  'guestCount': {
    type: 'currency',
    label: 'Price per Guest (ZMW)',
    calculation: 'unit'
  },
  'projectDescription': {
    type: 'textarea',
    label: 'Scope of Work & Deliverables',
    placeholder: 'Describe exactly what your service includes...'
  }
};

// Category-specific quote modifiers (adds fields based on category type)
export const CATEGORY_MODIFIERS: Record<string, QuoteField[]> = {
  'rental': [
    { name: 'damageDeposit', label: 'Security Deposit (ZMW)', type: 'currency', required: false }
  ],
  'product': [
    { name: 'condition', label: 'Item Condition', type: 'select', required: true, options: ['Brand New', 'Used - Like New', 'Used - Good', 'Refurbished'] },
    { name: 'warranty', label: 'Warranty Period', type: 'select', required: false, options: ['None', '1 Month', '3 Months', '6 Months', '1 Year', '2+ Years'] }
  ],
  'service': [
    { name: 'timeline', label: 'Completion Timeline (Days)', type: 'number', required: true },
    { name: 'materialsIncluded', label: 'Materials Included?', type: 'toggle', required: false }
  ],
  'agriculture': [
    { name: 'vaccinationIncluded', label: 'Vaccination/Treatment Included?', type: 'toggle', required: false },
    { name: 'breedCertificate', label: 'Health Certificate Available?', type: 'toggle', required: false }
  ]
};

const generateDeliveryFields = (inquiryAttributes: Record<string, any>): QuoteField[] => {
  const fields: QuoteField[] = [];
  
  // CASE 1: Buyer explicitly requested delivery
  if (inquiryAttributes.deliveryRequested === true || inquiryAttributes.pickupArrangement === 'I need delivery (additional fee)') {
    fields.push({
      name: 'deliveryFee',
      label: 'Delivery Fee (ZMW) - Optional',
      type: 'currency',
      required: false,
      helpText: 'Leave blank if you do not offer delivery. Buyer will arrange pickup.'
    });
    fields.push({
      name: 'deliveryTimeline',
      label: 'Delivery Timeline (if providing)',
      type: 'select',
      required: false,
      options: ['Same day', 'Next day', 'Within 3 days', 'Buyer must arrange pickup']
    });
  }
  // CASE 2: Buyer did not request delivery (default)
  else {
    fields.push({
      name: 'pickupInstructions',
      label: 'Pickup Location/Instructions',
      type: 'textarea',
      required: false,
      helpText: 'Default: Buyer picks up from your shop. Add specific instructions if needed.',
      placeholder: 'Available for pickup at shop location during business hours.'
    });
    
    // Provider can optionally offer delivery as value-add
    fields.push({
      name: 'optionalDeliveryOffer',
      label: 'Would you like to offer delivery for this quote?',
      type: 'toggle',
      required: false
    });
    
    // Only show fee if they toggle yes (conditional visibility handled in form)
    fields.push({
      name: 'optionalDeliveryFee',
      label: 'Delivery Fee (if offering)',
      type: 'currency',
      required: false
    });
  }
  
  return fields;
};

export const generateQuoteSchema = (
  inquiryCategory: string, 
  inquiryAttributes: Record<string, any>
): QuoteField[] => {
  const category = CATEGORIES_DB.find(c => c.name === inquiryCategory || c.id === inquiryCategory);
  if (!category) return getGenericQuoteSchema();

  const schema: QuoteField[] = [];
  const inquirySchema = category.formSchema || [];

  // 1. Transform inquiry fields into quote response fields
  inquirySchema.forEach((field: FieldSchema) => {
    const mapping = INQUIRY_TO_QUOTE_MAPPING[field.name];
    if (mapping) {
      schema.push({
        name: `quote_${field.name}`,
        label: mapping.label || `Quote for ${field.label}`,
        type: mapping.type || 'currency',
        required: field.required,
        placeholder: mapping.placeholder,
        helpText: mapping.helpText,
        calculation: mapping.calculation,
        options: mapping.options
      });
    }
  });

  // 2. Add category-type modifiers (detected by keywords in category name or parent)
  const categoryType = detectCategoryType(inquiryCategory, category);
  const modifiers = CATEGORY_MODIFIERS[categoryType] || [];
  schema.push(...modifiers);

  // 3. Add delivery fields based on inquiry attributes
  schema.push(...generateDeliveryFields(inquiryAttributes));

  // 4. Always add universal fields
  schema.push(
    { name: 'message', label: 'Detailed Quote Description', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] }
  );

  return schema;
};

// Helper: Detect if category is rental/product/service/agriculture
export const detectCategoryType = (categoryName: string, category: any): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('rent') || name.includes('venue') || name.includes('hire')) return 'rental';
  if (name.includes('service') || name.includes('repair')) return 'service';
  if (name.includes('agriculture') || name.includes('poultry') || name.includes('farm')) return 'agriculture';
  if (category.parentId === 'electronics' || category.parentId === 'furniture') return 'product';
  return 'product'; // Default
};

// Fallback for categories without specific schemas
export const getGenericQuoteSchema = (): QuoteField[] => [
  { name: 'price', label: 'Total Price (ZMW)', type: 'currency', required: true },
  { name: 'message', label: 'Quote Details', type: 'textarea', required: false, placeholder: 'Describe your offer, delivery time, and any other important details...' },
  { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true, options: ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', '6 Months'] }
];
