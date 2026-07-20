import type { FieldSchema } from '../types';

/**
 * Clinical Services — Hospital Labs (medical tests) + Pharmacies (medication).
 *
 * The defining behaviour of these forms: the buyer's request can be a TYPED
 * list of medications/tests OR a PHOTO of their prescription / doctor's order —
 * and the image IS the request content, not just supporting evidence. The
 * provider (pharmacist / lab tech) reads the prescription image on the lead
 * and quotes from it. Uploaded images are compressed client-side and stored
 * as files only — deliberately NO text extraction / OCR. The prescription
 * doubles as the proof-of-need "key" for prescription-only medicines.
 *
 * Both `requestItems` and `prescriptionPhotos` are schema-optional; the
 * either/or rule (at least one must be present) is enforced by the
 * isClinical guard in DynamicInquiryForm.onFormSubmit — same pattern as the
 * Equipment Rental items guard (docs/CATEGORY_IMPLEMENTATION_PATTERN.md §A.3).
 */

export const pharmaciesSchema: FieldSchema[] = [
  { name: "prescriptionPhotos", label: "Prescription Photo / Screenshot", type: "image_upload", required: false, keepInExpress: true, helpText: "Upload a clear photo or screenshot of your prescription. It is stored as an image only and is your proof of need for prescription-only medicines.", group: "What You Need" },
  { name: "requestItems", label: "Medication Name(s)", type: "textarea", required: false, keepInExpress: true, placeholder: "e.g. Amoxicillin 500mg × 21 capsules; Paracetamol 500mg × 1 pack", helpText: "Type the medicine name, strength and quantity — or just attach your prescription above.", group: "What You Need" },
  { name: "genericsAccepted", label: "Generic Substitutes OK?", type: "toggle", required: false, keepInExpress: true, helpText: "Allow the pharmacy to offer an equivalent generic brand if the exact one is out of stock.", group: "What You Need" },
  { name: "fulfilment", label: "Collection or Delivery?", type: "select", required: true, options: ["I'll collect from the pharmacy", "Deliver to me", "Whichever is faster"], group: "Fulfilment" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - needed now", "Today", "Within 2 days", "This week"], group: "Fulfilment" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Fulfilment", dependsOn: { field: "urgency", value: ["Within 2 days", "This week"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Fulfilment" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Allergies the pharmacist should know about, preferred brands, dosage questions...", group: "Fulfilment" }
];

export const hospitalLabsSchema: FieldSchema[] = [
  { name: "prescriptionPhotos", label: "Doctor's Test Order / Referral", type: "image_upload", required: false, keepInExpress: true, helpText: "Upload a photo or screenshot of the doctor's order or referral letter. Stored as an image only — the lab reads it to prepare your tests.", group: "Tests Required" },
  { name: "requestItems", label: "Test(s) Required", type: "textarea", required: false, keepInExpress: true, placeholder: "e.g. Full Blood Count; Malaria RDT; Fasting Blood Sugar", helpText: "List the tests you need — or just attach the doctor's order above.", group: "Tests Required" },
  { name: "homeSampleCollection", label: "Home Sample Collection?", type: "toggle", required: false, keepInExpress: true, helpText: "Should the lab send someone to collect the sample at your location?", group: "Scheduling" },
  { name: "preferredDate", label: "Preferred Date", type: "date", required: false, group: "Scheduling" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - needed now", "Today", "Within 2 days", "This week"], group: "Scheduling" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Scheduling" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Fasting status, mobility constraints, previous results to compare against...", group: "Scheduling" }
];
