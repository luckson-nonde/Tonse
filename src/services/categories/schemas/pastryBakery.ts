import type { FieldSchema } from '../types';

/**
 * Pastry and Bakery — two order-shaped inquiry forms. BOOKING archetype
 * (like Apartments): a baker quotes a concrete made-to-order commitment
 * against a needed-by date, not an off-the-shelf SKU pulled from a shelf,
 * so both forms centre on WHAT + WHEN and the provider answers with a firm
 * commitment (price, readiness date, delivery) via the per-category quote
 * schemas in quoteSchemaGenerator.ts.
 *
 * Field-name contracts (load-bearing, don't rename casually):
 * - `eventDate` / `deliveryDate` are in derivedGigEvents.ts DATE_KEYS, so
 *   paid orders land on the Booking Calendar / Schedule automatically.
 * - `images` is auto-kept in EXPRESS mode and auto-collected onto the
 *   provider's lead card by ProviderLeadsView's collectLeadImages — the
 *   cake reference photo is optional context, not the request content
 *   itself, so no either/or guard is needed (unlike Clinical Services).
 * - `budget_limit` is the sentinel budget field name.
 * - `fulfilment` option text deliberately contains "deliver" / "faster" so
 *   the quote-side conditional deliveryFee reuses the pharmacy regex.
 */

export const customCakesSchema: FieldSchema[] = [
  { name: "occasion", label: "What's the Occasion?", type: "select", required: true, keepInExpress: true, options: ["Birthday", "Wedding", "Baby Shower / Dedication", "Graduation", "Traditional Ceremony (Introduction / Chilanga Mulilo)", "Corporate / Office Event", "Anniversary", "Other Celebration"], group: "Your Cake" },
  { name: "flavour", label: "Cake Flavour", type: "select", required: true, keepInExpress: true, options: ["Vanilla", "Chocolate", "Red Velvet", "Marble (Vanilla & Chocolate)", "Lemon", "Carrot", "Banana", "Fruit Cake", "Surprise Me / Baker's Choice"], group: "Your Cake" },
  { name: "cakeSize", label: "Cake Size / Servings", type: "select", required: true, keepInExpress: true, options: ["Small (Serves 10-15)", "Medium (Serves 20-30)", "Large (Serves 40-50)", "Extra Large (Serves 60-100)", "Wedding Tiered (100+)"], group: "Your Cake" },
  { name: "tiers", label: "Number of Tiers", type: "counter", required: false, min: 1, max: 6, helpText: "Leave at 1 for a single-layer cake.", group: "Your Cake" },
  { name: "images", label: "Cake Design Reference Photos", type: "image_upload", required: false, keepInExpress: true, helpText: "Upload a photo or screenshot of a design you love — bakers will quote based on what they see.", group: "Your Cake" },
  { name: "customMessage", label: "Message on the Cake", type: "text", required: false, placeholder: "e.g. Happy 30th Birthday Mwansa!", group: "Your Cake" },
  { name: "eventDate", label: "Date You Need The Cake", type: "date", required: true, keepInExpress: true, group: "Date and Budget" },
  { name: "fulfilment", label: "Collection or Delivery?", type: "select", required: true, options: ["I'll collect from the baker", "Deliver to my venue", "Whichever is faster"], group: "Date and Budget" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, keepInExpress: true, group: "Date and Budget" },
  { name: "additionalDetails", label: "Anything Else?", type: "textarea", required: false, placeholder: "Allergies, dietary needs (eggless, sugar-free, gluten-free), venue address, cake stand needed...", group: "Date and Budget" }
];

export const breadPastriesSchema: FieldSchema[] = [
  { name: "requestItems", label: "What Would You Like?", type: "textarea", required: true, keepInExpress: true, placeholder: "e.g. 5 loaves of brown bread, 2 dozen scones, 1 dozen sausage rolls", helpText: "List each item and the quantity you need.", group: "Your Order" },
  { name: "pastryTypes", label: "Types of Bread / Pastries", type: "multiselect", required: false, keepInExpress: true, options: ["Bread Loaves", "Scones", "Doughnuts", "Sausage Rolls", "Meat Pies", "Buns / Rolls", "Muffins", "Cookies", "Croissants", "Other"], group: "Your Order" },
  { name: "recurringOrder", label: "Standing / Recurring Order?", type: "toggle", required: false, helpText: "Turn on if you need this on a regular schedule, e.g. every Friday for a shop or event.", group: "Your Order" },
  { name: "deliveryDate", label: "Needed By", type: "date", required: false, keepInExpress: true, group: "Fulfilment" },
  { name: "fulfilment", label: "Collection or Delivery?", type: "select", required: true, options: ["I'll collect", "Deliver to me", "Whichever is faster"], group: "Fulfilment" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, keepInExpress: true, group: "Fulfilment" },
  { name: "additionalDetails", label: "Anything Else?", type: "textarea", required: false, placeholder: "Packaging needs, allergy info, delivery address details...", group: "Fulfilment" }
];
