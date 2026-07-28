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
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Fulfilment" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Fulfilment", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Fulfilment" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Allergies the pharmacist should know about, preferred brands, dosage questions...", group: "Fulfilment" }
];

/**
 * Home Care — in-home professional care from registered nurses / doctors.
 * The buyer describes who needs care and which services, then states how
 * often visits are needed and whether they prefer paying per visit or a
 * monthly care plan (`paymentModel` drives the provider's quote form —
 * see QUOTE_SCHEMA_BY_CATEGORY_ID['home-care']). A paid engagement becomes
 * a care plan the provider manages in the "My Clients" dashboard view.
 */
export const homeCareSchema: FieldSchema[] = [
  { name: "careRecipient", label: "Who Needs Care?", type: "select", required: true, options: ["Myself", "Parent / elderly relative", "Child", "Other family member", "Someone else"], group: "Care Needed" },
  { name: "careServices", label: "Care Services Needed", type: "multiselect", required: true, keepInExpress: true, options: ["General nursing care", "Elderly / assisted care", "Post-surgery recovery", "Wound care & dressing", "Injections & drips", "Medication management", "Vitals monitoring (BP, sugar…)", "Physiotherapy", "Doctor home visit", "Palliative / end-of-life care", "Maternal & newborn care"], helpText: "Pick everything that applies — the caregiver quotes for the full set.", group: "Care Needed" },
  { name: "conditionDetails", label: "Condition & What Help Is Needed", type: "textarea", required: true, keepInExpress: true, placeholder: "e.g. My father is recovering from a stroke — needs help with medication, BP checks and physio twice a week", group: "Care Needed" },
  { name: "medicalAttachments", label: "Attach Reports & Photos", type: "image_upload", required: false, allowPdf: true, keepInExpress: true, helpText: "One place for everything: hospital or doctor's reports (PDF or photo — discharge summary, prescription, referral) plus, if it helps, ONE clear photo of the condition — e.g. the wound or affected area. Stored encrypted and shared only with caregivers.", group: "Care Needed" },
  { name: "visitFrequency", label: "How Often Are Visits Needed?", type: "select", required: true, keepInExpress: true, options: ["Once-off visit", "Daily visits", "Several times a week", "Weekly check-ins", "24/7 / live-in care"], group: "Schedule & Payment" },
  { name: "paymentModel", label: "Preferred Payment Arrangement", type: "select", required: true, keepInExpress: true, options: ["Pay per visit", "Pay per week", "Pay per month"], helpText: "Per visit suits a once-off; weekly or monthly suits ongoing care. The caregiver confirms the final arrangement in their quote.", group: "Schedule & Payment" },
  { name: "urgency", label: "When Should Care Start?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Schedule & Payment" },
  { name: "preferredDateTime", label: "Preferred First Visit", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day for the first visit — add a time only if it must start at a specific hour.", group: "Schedule & Payment", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Per visit or per month, depending on your payment arrangement.", group: "Schedule & Payment" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Mobility, allergies, language preference, anything the caregiver should know about the home...", group: "Schedule & Payment" }
];

export const hospitalLabsSchema: FieldSchema[] = [
  { name: "prescriptionPhotos", label: "Doctor's Test Order / Referral", type: "image_upload", required: false, keepInExpress: true, helpText: "Upload a photo or screenshot of the doctor's order or referral letter. Stored as an image only — the lab reads it to prepare your tests.", group: "Tests Required" },
  { name: "requestItems", label: "Test(s) Required", type: "textarea", required: false, keepInExpress: true, placeholder: "e.g. Full Blood Count; Malaria RDT; Fasting Blood Sugar", helpText: "List the tests you need — or just attach the doctor's order above.", group: "Tests Required" },
  { name: "homeSampleCollection", label: "Home Sample Collection?", type: "toggle", required: false, keepInExpress: true, helpText: "Should the lab send someone to collect the sample at your location?", group: "Scheduling" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Scheduling" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Scheduling", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Scheduling" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Fasting status, mobility constraints, previous results to compare against...", group: "Scheduling" }
];
