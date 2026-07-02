import { z } from 'zod';
import { generateZodSchema } from './quoteValidation';
import { isRepairVariant, CATEGORIES_DB, getCategoryType, type Category } from './categories';

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
  /** Visual section the field belongs to in the quote form. Used by
   *  QuoteSubmissionForm to group fields under section dividers
   *  (Pricing / Logistics & Timing / Notes & Photos). When omitted, the
   *  form falls back to a name-based heuristic. */
  group?: 'Pricing' | 'Logistics & Timing' | 'Notes & Photos';
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

// Catalog-first archetype resolution. When the category row is known, derive
// the archetype from the catalog's own type mapping (getCategoryType) instead
// of guessing from display-name substrings — the keyword fallback misses names
// like "Laptops & Computers (Buy New)" and collapses them to GENERIC. Repair
// variants win first, matching detectArchetype's precedence.
const archetypeFromRow = (
  row: Category | undefined
): 'REPAIR' | 'PRODUCT' | 'SERVICE' | 'VENUE' | 'LABOUR' | null => {
  if (!row) return null;
  if (isRepairVariant(row.name)) return 'REPAIR';
  switch (getCategoryType(row.id)) {
    case 'PRODUCTS': return 'PRODUCT';
    case 'SERVICES': return 'SERVICE';
    case 'VENUES': return 'VENUE';
    case 'LABOR': return 'LABOUR';
    default: return null;
  }
};

// Resolve a category row whether the caller passed a stable id
// ('vehicles-buy') or a display name ('Vehicles (New & Used)'). The backend
// hydrates lead.category as a comma-joined display-name string, so an exact
// id lookup alone can never match. Mirrors getCategorySchema's id-or-name
// resolution in categories/catalog.ts.
const resolveCategoryRow = (input: string): Category | undefined => {
  const raw = (input || '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const firstSegment = raw.split(',')[0].trim().toLowerCase();
  return (
    CATEGORIES_DB.find((c) => c.id === raw || c.name.toLowerCase() === lower) ||
    CATEGORIES_DB.find((c) => c.id === firstSegment || c.name.toLowerCase() === firstSegment)
  );
};

// Per-category quote-shape overrides keyed by stable category id. When a
// match exists, this wins over archetype detection. Use this when the
// fields the provider must fill differ meaningfully from the archetype
// default — e.g. an equipment-rental needs deposit + delivery + setup
// fees that the generic SERVICE template doesn't ask for. Adding a new
// category is a single-entry data change here; mirrors the
// PREFERENCES_OVERRIDES pattern in InquiryPreferences.tsx.
const QUOTE_SCHEMA_BY_CATEGORY_ID: Record<
  string,
  (attrs: Record<string, any>) => QuoteField[]
> = {
  'event-equipment-rental': (attrs) => {
    const fields: QuoteField[] = [
      {
        name: 'price',
        label: 'Total Quote Amount (ZMW)',
        type: 'currency',
        required: true,
        calculation: 'total',
        helpText: attrs?.rentalDuration
          ? `Total for ${attrs.rentalDuration} day rental. Pre-fills from per-item prices when entered below.`
          : 'Total for the rental. Pre-fills from per-item prices when entered.',
        group: 'Pricing',
      },
      {
        name: 'securityDeposit',
        label: 'Security Deposit (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'Refundable. Returned after items come back undamaged.',
        group: 'Pricing',
      },
      {
        name: 'setupFee',
        label: 'Setup & Breakdown Fee (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'Crew labour to deliver, set up, and pack down on-site.',
        group: 'Pricing',
      },
    ];
    // Only ask for delivery fee if the buyer actually requested delivery.
    // Otherwise it's a phantom field that confuses the provider.
    if (attrs?.deliveryRequested) {
      fields.push({
        name: 'deliveryFee',
        label: 'Delivery Fee (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'One-way or round-trip transport to the venue.',
        group: 'Pricing',
      });
    }
    fields.push(
      {
        name: 'availabilityDate',
        label: 'Availability Confirmation',
        type: 'date',
        required: true,
        helpText: 'Date the items will be ready for delivery / pickup.',
        group: 'Logistics & Timing',
      },
      {
        name: 'leadTime',
        label: 'Lead Time / Delivery Window',
        type: 'textarea',
        required: false,
        placeholder: 'e.g. Deliver day before, pick up morning after',
        group: 'Logistics & Timing',
      },
      {
        name: 'expiryDuration',
        label: 'Quote Valid For',
        type: 'select',
        required: true,
        options: VALIDITY_OPTIONS,
        group: 'Logistics & Timing',
      },
      {
        name: 'whatIsIncluded',
        label: "What's Included",
        type: 'textarea',
        required: false,
        placeholder: 'Setup crew, linens, replacements, cleaning…',
        group: 'Notes & Photos',
      },
      {
        name: 'message',
        label: 'Additional Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Damage policy, payment terms, anything the buyer should know…',
        group: 'Notes & Photos',
      },
    );
    return fields;
  },

  // Decor: total + materials + setup/teardown labour, mirroring the
  // event-equipment-rental shape. Setup/teardown line items only render
  // when the buyer asked for them (attributes.setupRequired) — otherwise
  // they're phantom inputs that pad the form with no purpose.
  'event-decor': (attrs) => {
    const fields: QuoteField[] = [
      {
        name: 'price',
        label: 'Total Quote Amount (ZMW)',
        type: 'currency',
        required: true,
        calculation: 'total',
        helpText: 'All-in price for the decor commission. Itemise materials and labour below if useful.',
        group: 'Pricing',
      },
      {
        name: 'materialsCost',
        label: 'Materials Cost (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'Flowers, fabrics, balloons, props, lighting hire — the physical decor inputs.',
        group: 'Pricing',
      },
    ];
    if (attrs?.setupRequired) {
      fields.push(
        {
          name: 'setupFee',
          label: 'Setup Fee (ZMW)',
          type: 'currency',
          required: false,
          helpText: 'Crew labour to install on the day (or evening before).',
          group: 'Pricing',
        },
        {
          name: 'teardownFee',
          label: 'Teardown Fee (ZMW)',
          type: 'currency',
          required: false,
          helpText: 'Crew labour to dismantle and clear the venue afterwards.',
          group: 'Pricing',
        },
      );
    }
    fields.push(
      {
        name: 'availabilityDate',
        label: 'Availability Confirmation',
        type: 'date',
        required: true,
        helpText: 'Date the decor crew will arrive on-site.',
        group: 'Logistics & Timing',
      },
      {
        name: 'leadTime',
        label: 'Setup Window',
        type: 'textarea',
        required: false,
        placeholder: 'e.g. Setup from 8am, teardown 30 min after event ends',
        group: 'Logistics & Timing',
      },
      {
        name: 'expiryDuration',
        label: 'Quote Valid For',
        type: 'select',
        required: true,
        options: VALIDITY_OPTIONS,
        group: 'Logistics & Timing',
      },
      {
        name: 'whatIsIncluded',
        label: "What's Included",
        type: 'textarea',
        required: false,
        placeholder: 'Backdrop, centrepieces, chair covers, lighting, mood-board consultation…',
        group: 'Notes & Photos',
      },
      {
        name: 'message',
        label: 'Additional Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Substitutions, weather contingencies, payment terms…',
        group: 'Notes & Photos',
      },
    );
    return fields;
  },

  // Event management: a planner running the full event. Pricing splits
  // into pre-event coordination labour, on-day staffing, and (when the
  // buyer flagged any sub-vendors needed) a vendor coordination fee
  // for sourcing + managing them. Same Pricing / Logistics / Notes
  // section grouping as the rental and decor shapes.
  'event-management': (attrs) => {
    const fields: QuoteField[] = [
      {
        name: 'price',
        label: 'Total Coordination Fee (ZMW)',
        type: 'currency',
        required: true,
        calculation: 'total',
        helpText: 'All-in fee for managing the event. Itemise the components below if useful.',
        group: 'Pricing',
      },
      {
        name: 'coordinationFee',
        label: 'Pre-Event Coordination (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'Planning, vendor briefings, run-of-show, walkthroughs.',
        group: 'Pricing',
      },
      {
        name: 'onDaySupportFee',
        label: 'On-Day Staffing (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'You + your crew on the day, hour-by-hour management.',
        group: 'Pricing',
      },
    ];
    // Only ask for a vendor-coordination fee if the buyer flagged any
    // vendor type that the manager would need to source / liaise with.
    // Without a vendor flag the fee is a phantom field.
    const needsVendors =
      !!(attrs?.cateringRequired ||
        attrs?.decorRequired ||
        attrs?.entertainmentRequired ||
        attrs?.photographyRequired);
    if (needsVendors) {
      fields.push({
        name: 'vendorCoordinationFee',
        label: 'Vendor Coordination Fee (ZMW)',
        type: 'currency',
        required: false,
        helpText: 'Sourcing and managing the sub-vendors the buyer ticked (catering / decor / entertainment / photography).',
        group: 'Pricing',
      });
    }
    fields.push(
      {
        name: 'availabilityDate',
        label: 'Availability Confirmation',
        type: 'date',
        required: true,
        helpText: 'Date you can take ownership of the event timeline.',
        group: 'Logistics & Timing',
      },
      {
        name: 'leadTime',
        label: 'Engagement Window',
        type: 'textarea',
        required: false,
        placeholder: 'e.g. Lock-in 6 weeks ahead, weekly checkpoints, on-site from 7am day-of',
        group: 'Logistics & Timing',
      },
      {
        name: 'expiryDuration',
        label: 'Quote Valid For',
        type: 'select',
        required: true,
        options: VALIDITY_OPTIONS,
        group: 'Logistics & Timing',
      },
      {
        name: 'whatIsIncluded',
        label: "What's Included",
        type: 'textarea',
        required: false,
        placeholder: 'Run-of-show, vendor calls, on-day team size, contingency planning…',
        group: 'Notes & Photos',
      },
      {
        name: 'message',
        label: 'Additional Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Cancellation terms, scope boundaries, anything the buyer should know…',
        group: 'Notes & Photos',
      },
    );
    return fields;
  },

  // ─── AUTOMOTIVE ─────────────────────────────────────────────────────
  // Each subcategory under `automotive` gets its own quote shape so the
  // dealer / parts supplier / breaker / recovery operator / tool seller
  // sees the exact fields buyers in that lane care about — not the
  // generic "price + delivery + message" GENERIC fallback.

  // Whole-vehicle dealer quote: condition + financing + trade-in +
  // mileage + inventory location are the levers that close a vehicle
  // sale; price alone leaves the buyer guessing.
  'vehicles-buy': () => [
    { name: 'price', label: 'Vehicle Price (ZMW)', type: 'currency', required: true, group: 'Pricing' },
    { name: 'condition', label: 'Condition Offered', type: 'select', required: true,
      options: ['Brand New (showroom)', 'Pre-owned (used)', 'Demo / Ex-fleet', 'Refurbished'], group: 'Pricing' },
    { name: 'mileageKm', label: 'Mileage (km)', type: 'number', required: false,
      helpText: 'For pre-owned vehicles only', group: 'Pricing' },
    { name: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false, group: 'Pricing' },
    { name: 'financingAvailable', label: 'Financing available?', type: 'toggle', required: false,
      helpText: 'Toggle on if you can offer payment plans', group: 'Pricing' },
    { name: 'tradeInAccepted', label: 'Trade-in accepted?', type: 'toggle', required: false,
      helpText: 'Toggle on if you accept the buyer\'s old vehicle as part-payment', group: 'Pricing' },
    { name: 'inStock', label: 'In stock now?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'inventoryLocation', label: 'Inventory Location', type: 'textarea', required: false,
      placeholder: 'Lusaka showroom, Kitwe lot, etc.', group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery to buyer?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false,
      helpText: 'Only fill if you offer delivery', group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: VALIDITY_OPTIONS, group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Vehicle highlights, service history, viewing arrangements…', group: 'Notes & Photos' },
  ],

  // Roadside emergency: dispatch ETA + service zone + 24/7 availability
  // are the deciding factors for a stranded driver. Validity windows are
  // intentionally short — a tow quote 3 months from now is meaningless.
  'car-breakdown-recovery': () => [
    { name: 'price', label: 'Total Service Fee (ZMW)', type: 'currency', required: true, group: 'Pricing' },
    { name: 'serviceIncluded', label: 'What this fee covers', type: 'select', required: true,
      options: ['Full recovery + tow', 'Roadside repair only', 'Jump start', 'Tyre change',
                'Fuel delivery', 'Inspection + assess'], group: 'Pricing' },
    { name: 'towingDistanceKm', label: 'Free towing distance (km)', type: 'number', required: false,
      helpText: 'Beyond this, per-km charges apply', group: 'Pricing' },
    { name: 'extraKmFee', label: 'Extra km fee (ZMW per km)', type: 'currency', required: false, group: 'Pricing' },
    { name: 'dispatchEtaMinutes', label: 'Dispatch ETA (minutes)', type: 'number', required: true,
      helpText: 'How long until your team reaches the buyer', group: 'Logistics & Timing' },
    { name: 'available247', label: 'Available 24/7?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: ['1 Week', '2 Weeks', '1 Month'], group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Equipment carried, crew size, payment terms…', group: 'Notes & Photos' },
  ],

  // New car parts: condition slot becomes OEM/aftermarket distinction;
  // origin matters for buyers who need to clear customs estimates.
  'car-parts-new': () => [
    { name: 'price', label: 'Unit Price (ZMW)', type: 'currency', required: true, calculation: 'unit', group: 'Pricing' },
    { name: 'condition', label: 'Condition', type: 'select', required: true,
      options: ['Genuine OEM', 'Aftermarket — premium', 'Aftermarket — standard', 'Refurbished'], group: 'Pricing' },
    { name: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false, group: 'Pricing' },
    { name: 'partOrigin', label: 'Origin', type: 'select', required: false,
      options: ['Local stock', 'Imported — South Africa', 'Imported — Asia', 'Imported — Europe', 'Imported — USA'], group: 'Pricing' },
    { name: 'inStock', label: 'In stock?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'leadTime', label: 'Lead time if not in stock', type: 'textarea', required: false,
      placeholder: 'e.g. 3 days, 2 weeks ex-Joburg', group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: VALIDITY_OPTIONS, group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Brand, fitment notes, return policy…', group: 'Notes & Photos' },
  ],

  // Breaker yards: donor vehicle + part mileage + short guarantee are
  // the buyer's risk-mitigation signals when buying salvage parts.
  'car-parts-breakers': () => [
    { name: 'price', label: 'Unit Price (ZMW)', type: 'currency', required: true, calculation: 'unit', group: 'Pricing' },
    { name: 'condition', label: 'Condition', type: 'select', required: true,
      options: ['Excellent — low mileage donor', 'Good — average wear', 'Fair — visible wear', 'Functional only'], group: 'Pricing' },
    { name: 'donorVehicle', label: 'Donor vehicle', type: 'textarea', required: false,
      placeholder: 'e.g. 2014 Hilux, accident damage rear', group: 'Pricing' },
    { name: 'mileageOnPart', label: 'Mileage on the part (km)', type: 'number', required: false,
      helpText: 'Approximate km the part has done', group: 'Pricing' },
    { name: 'shortGuarantee', label: 'Short guarantee?', type: 'toggle', required: false,
      helpText: '7-30 day functional guarantee on the part', group: 'Pricing' },
    { name: 'pickupOnly', label: 'Collection only?', type: 'toggle', required: false,
      helpText: 'Toggle on if buyer must collect from the yard', group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: ['1 Week', '2 Weeks', '1 Month'], group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Part location, viewing options, removal cost if any…', group: 'Notes & Photos' },
  ],

  // Accessories: installation toggle + fee gives the buyer a one-stop
  // quote (part + fitment) so they don't have to hunt for a fitter.
  'car-accessories': () => [
    { name: 'price', label: 'Price (ZMW)', type: 'currency', required: true, group: 'Pricing' },
    { name: 'condition', label: 'Condition', type: 'select', required: true,
      options: ['Brand New', 'Used — Good', 'Aftermarket'], group: 'Pricing' },
    { name: 'brand', label: 'Brand offered', type: 'textarea', required: false,
      placeholder: 'e.g. Pioneer, Thule, generic', group: 'Pricing' },
    { name: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false, group: 'Pricing' },
    { name: 'installationOffered', label: 'Offer installation?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'installationFee', label: 'Installation Fee (ZMW)', type: 'currency', required: false,
      helpText: 'Only fill if you offer installation', group: 'Logistics & Timing' },
    { name: 'inStock', label: 'In stock?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: VALIDITY_OPTIONS, group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Fitment compatibility, install time, anything else…', group: 'Notes & Photos' },
  ],

  // Bike parts: same shape as car-parts-new but with bike-aware copy
  // and a `compatibleModels` text field (bikes have looser fitment).
  'motorcycles-parts': () => [
    { name: 'price', label: 'Price (ZMW)', type: 'currency', required: true, calculation: 'unit', group: 'Pricing' },
    { name: 'condition', label: 'Condition', type: 'select', required: true,
      options: ['Brand New / OEM', 'Aftermarket', 'Used — Good', 'Used — Fair'], group: 'Pricing' },
    { name: 'compatibleModels', label: 'Compatible bike models', type: 'textarea', required: false,
      placeholder: 'e.g. Boxer 150, Splendor, Bajaj Pulsar', group: 'Pricing' },
    { name: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false, group: 'Pricing' },
    { name: 'inStock', label: 'In stock?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: VALIDITY_OPTIONS, group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Brand, fitment notes, where you got it from…', group: 'Notes & Photos' },
  ],

  // Tools: brand + spec are the discriminators (a "3-tonne hydraulic
  // jack" needs a different quote than a "trolley jack"). Buyers care
  // about brand pedigree and bundled accessories.
  'automotive-tools': () => [
    { name: 'price', label: 'Price (ZMW)', type: 'currency', required: true, group: 'Pricing' },
    { name: 'condition', label: 'Condition', type: 'select', required: true,
      options: ['Brand New', 'Refurbished', 'Used — Good'], group: 'Pricing' },
    { name: 'brand', label: 'Brand offered', type: 'textarea', required: false,
      placeholder: 'e.g. Bosch, Snap-on, Stanley', group: 'Pricing' },
    { name: 'specifications', label: 'Tool spec offered', type: 'textarea', required: false,
      placeholder: 'e.g. 3-tonne hydraulic jack, OBD2 + ABS scanner, 100A welder', group: 'Pricing' },
    { name: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false, group: 'Pricing' },
    { name: 'inStock', label: 'In stock?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryOffer', label: 'Offer delivery?', type: 'toggle', required: false, group: 'Logistics & Timing' },
    { name: 'deliveryFee', label: 'Delivery Fee (ZMW)', type: 'currency', required: false, group: 'Logistics & Timing' },
    { name: 'expiryDuration', label: 'Quote Valid For', type: 'select', required: true,
      options: VALIDITY_OPTIONS, group: 'Logistics & Timing' },
    { name: 'message', label: 'Message to Buyer', type: 'textarea', required: false,
      placeholder: 'Bundled accessories, training/manual included, return policy…', group: 'Notes & Photos' },
  ],
};

export const generateQuoteSchema = (
  inquiryCategory: string,
  inquiryAttributes: Record<string, any>,
  processType: 'EXPRESS' | 'STANDARD' = 'STANDARD'
): { fields: QuoteField[]; zodSchema: z.ZodObject<any> } => {
  // Resolve id-or-name so the id-keyed override map is reachable no matter
  // which form the caller passed (see resolveCategoryRow).
  const categoryRow = resolveCategoryRow(inquiryCategory);
  const overrideBuilder =
    QUOTE_SCHEMA_BY_CATEGORY_ID[categoryRow?.id ?? (inquiryCategory || '').toLowerCase()];
  if (overrideBuilder) {
    const fields = overrideBuilder(inquiryAttributes || {});
    return { fields, zodSchema: generateZodSchema(fields) };
  }

  // Catalog truth first; keyword sniffing only for unresolvable strings.
  const archetype = archetypeFromRow(categoryRow) ?? detectArchetype(inquiryCategory);
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
