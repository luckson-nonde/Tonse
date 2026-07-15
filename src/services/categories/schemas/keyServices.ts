import type { FieldSchema } from '../types';

/**
 * Locksmith & Key Services — Key Replacement.
 *
 * A shop-side SERVICE category (locksmiths register to fulfil buyer
 * requests): key cutting/duplication, lost-key replacement, lock
 * repair/replacement, and car-key (chip/transponder) programming. The
 * buyer's photo of the lock/key/vehicle is helpful supporting evidence
 * (the locksmith reads the keyway / key blade profile off it), so the
 * image_upload leads the form — mirrors the small-service shape in
 * schemas/drillingServices.ts and schemas/clinicalServices.ts.
 */
export const keyReplacementSchema: FieldSchema[] = [
  { name: "images", label: "Photo of the Key / Lock / Vehicle", type: "image_upload", required: false, helpText: "A clear photo of the existing key, the lock, or the vehicle helps the locksmith identify the right blank and cut.", group: "What You Need" },
  { name: "keyType", label: "Type of Key", type: "select", required: true, options: ["House / Door Key", "Padlock Key", "Car / Vehicle Key", "Office / Cabinet Key", "Safe Key", "Other"], group: "What You Need" },
  { name: "serviceNeeded", label: "What Do You Need Done?", type: "select", required: true, keepInExpress: true, options: ["Cut a Spare Key", "Replace a Lost Key", "Repair / Fix a Lock", "Replace a Lock", "Car Key Programming / Chip Key", "Not Sure - Need Advice"], group: "What You Need" },
  { name: "lockBrand", label: "Lock / Vehicle Brand", type: "text", required: false, placeholder: "e.g. Yale, Union, Toyota — if known", group: "What You Need" },
  { name: "quantity", label: "How Many Keys?", type: "counter", required: true, min: 1, group: "What You Need" },
  { name: "location", label: "Where Is the Work Needed?", type: "text", required: true, placeholder: "e.g. Kabulonga, Lusaka — or the locksmith's shop", group: "Fulfilment" },
  { name: "calloutNeeded", label: "Call-Out to Your Location?", type: "toggle", required: false, keepInExpress: true, helpText: "Should the locksmith come to you, or will you visit their shop?", group: "Fulfilment" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Fulfilment" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Locked Out Now", "Today", "Within 2 days", "This week"], group: "Fulfilment" },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Anything the locksmith should know — key code on the lock, spare available, security concerns...", group: "Fulfilment" }
];
