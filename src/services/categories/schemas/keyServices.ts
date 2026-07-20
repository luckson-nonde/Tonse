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
  { name: "images", label: "Photo of the Key / Lock / Vehicle", type: "image_upload", required: false, keepInExpress: true, helpText: "Photograph both sides of the existing key and the keyhole/lock if you can — the locksmith reads the blank and cut profile off them.", group: "What You Need" },
  { name: "keyType", label: "Type of Key", type: "select", required: true, options: ["House / Door Key", "Padlock Key", "Car / Vehicle Key", "Office / Cabinet Key", "Safe Key", "Other"], group: "What You Need" },
  { name: "serviceNeeded", label: "What Do You Need Done?", type: "select", required: true, keepInExpress: true, options: ["Cut a Spare Key", "Replace a Lost Key", "Repair / Fix a Lock", "Replace a Lock", "Car Key Programming / Chip Key", "Not Sure - Need Advice"], group: "What You Need" },
  { name: "lockBrand", label: "Lock / Vehicle Brand", type: "text", required: false, placeholder: "e.g. Yale, Union, Toyota — if known", group: "What You Need" },
  // Vehicle Details — only shown for car/vehicle keys. dependsOn.value must
  // match the keyType option string EXACTLY ("Car / Vehicle Key", spaces
  // around the slash) or the whole block silently never appears.
  { name: "vehicleMake", label: "Vehicle Make", type: "select", required: true, keepInExpress: true, options: ["Toyota", "Nissan", "Mazda", "Honda", "Mitsubishi", "Isuzu", "Suzuki", "Subaru", "Ford", "Mercedes-Benz", "BMW", "Volkswagen", "Hyundai", "Kia", "Other"], group: "Vehicle Details", dependsOn: { field: "keyType", value: "Car / Vehicle Key" } },
  { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, keepInExpress: true, placeholder: "e.g. Corolla, Hilux, X-Trail", group: "Vehicle Details", dependsOn: { field: "keyType", value: "Car / Vehicle Key" } },
  { name: "vehicleYear", label: "Year of Manufacture", type: "number", required: true, keepInExpress: true, min: 1980, max: 2026, group: "Vehicle Details", dependsOn: { field: "keyType", value: "Car / Vehicle Key" } },
  { name: "vin", label: "VIN / Chassis Number", type: "text", required: true, keepInExpress: true, placeholder: "e.g. NZE121-0123456 or a 17-character VIN", helpText: "Found at the base of the windscreen, on the driver-side door jamb sticker, in the engine bay, or in the vehicle's white book. Many Zambian imports carry a Japanese chassis number (e.g. NZE121-0123456) instead of a 17-character VIN — enter whatever is stamped on your vehicle.", group: "Vehicle Details", dependsOn: { field: "keyType", value: "Car / Vehicle Key" } },
  { name: "quantity", label: "How Many Keys?", type: "counter", required: true, min: 1, group: "What You Need" },
  { name: "location", label: "Where Is the Work Needed?", type: "text", required: true, placeholder: "e.g. Kabulonga, Lusaka — or the locksmith's shop", group: "Fulfilment" },
  { name: "calloutNeeded", label: "Call-Out to Your Location?", type: "toggle", required: false, keepInExpress: true, helpText: "Should the locksmith come to you, or will you visit their shop?", group: "Fulfilment" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Fulfilment" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Locked Out Now", "Today", "Within 2 days", "This week"], group: "Fulfilment" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Fulfilment", dependsOn: { field: "urgency", value: ["Within 2 days", "This week"] } },
  { name: "additionalDetails", label: "Additional Notes", type: "textarea", required: false, placeholder: "Anything the locksmith should know — key code on the lock, spare available, security concerns...", group: "Fulfilment" }
];
