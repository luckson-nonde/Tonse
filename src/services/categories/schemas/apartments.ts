import type { FieldSchema } from '../types';

/**
 * Apartments & Housing — three tenure-shaped inquiry forms. The subs split by
 * TENURE (how you occupy), not size: a monthly lease, a furnished short stay,
 * and a student/boarding room are three different conversations with a
 * landlord. Unit SIZE (bedsitter → 3-bed+/house) is a field inside each form.
 *
 * The provider's quotation is a full unit offer (rent/deposit/inclusions/
 * area/availability/viewing slot + unit photos via the quote form's built-in
 * photo upload) — see QUOTE_SCHEMA_BY_CATEGORY_ID in quoteSchemaGenerator.ts.
 */

export const longTermRentalsSchema: FieldSchema[] = [
  { name: "unitType", label: "What Size Do You Need?", type: "select", required: true, keepInExpress: true, options: ["Bedsitter / Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4+ / House"], group: "The Home You Want" },
  { name: "preferredAreas", label: "Preferred Area(s)", type: "text", required: true, keepInExpress: true, placeholder: "e.g. Kabulonga, Woodlands, Chalala", helpText: "List one or more areas — landlords in those areas will respond.", group: "The Home You Want" },
  { name: "furnished", label: "Furnishing", type: "select", required: false, keepInExpress: true, options: ["Unfurnished", "Semi-furnished", "Fully furnished", "No preference"], group: "The Home You Want" },
  { name: "selfContained", label: "Must Be Self-Contained?", type: "toggle", required: false, helpText: "Own bathroom and kitchen (not shared).", group: "The Home You Want" },
  { name: "mustHaves", label: "Must-Haves", type: "multiselect", required: false, keepInExpress: true, options: ["Wall fence & gate", "Security / guard", "Borehole / reliable water", "Prepaid ZESCO meter", "Parking", "Servant's quarters", "Built-in wardrobes", "Tiled floors", "Air conditioning", "Garden"], group: "The Home You Want" },
  { name: "budget_limit", label: "Max Monthly Rent (ZMW)", type: "currency", required: true, keepInExpress: true, group: "Budget and Timing" },
  { name: "moveInDate", label: "Move-In Date", type: "date", required: false, keepInExpress: true, group: "Budget and Timing" },
  { name: "tenancyLength", label: "How Long Will You Stay?", type: "select", required: false, options: ["6 months", "1 year", "2+ years", "Flexible"], group: "Budget and Timing" },
  { name: "occupants", label: "Number of Occupants", type: "counter", required: false, min: 1, max: 20, group: "Budget and Timing" },
  { name: "additionalDetails", label: "Anything Else?", type: "textarea", required: false, placeholder: "Pets, where you work (for commute), parking needs, ground floor only...", group: "Budget and Timing" }
];

export const shortStayServicedSchema: FieldSchema[] = [
  { name: "unitType", label: "Apartment Size", type: "select", required: true, keepInExpress: true, options: ["Studio", "1 Bedroom", "2 Bedroom", "3+ Bedroom"], group: "Your Stay" },
  { name: "preferredAreas", label: "Preferred Area(s)", type: "text", required: true, keepInExpress: true, placeholder: "e.g. Rhodes Park, Mass Media, Longacres", group: "Your Stay" },
  { name: "stayDates", label: "Check-In / Check-Out", type: "daterange", required: true, keepInExpress: true, group: "Your Stay" },
  { name: "guests", label: "Number of Guests", type: "counter", required: true, keepInExpress: true, min: 1, max: 20, group: "Your Stay" },
  { name: "essentials", label: "Essentials", type: "multiselect", required: false, keepInExpress: true, options: ["WiFi", "DSTV / Netflix", "Hot water", "Backup power / inverter", "Housekeeping", "Airport pickup", "Pool", "Gym", "Workspace / desk", "Full kitchen"], group: "Your Stay" },
  { name: "budget_limit", label: "Budget per Night (ZMW)", type: "currency", required: false, keepInExpress: true, group: "Budget and Purpose" },
  { name: "purpose", label: "Purpose of Stay", type: "select", required: false, options: ["Business trip", "Family visit", "Holiday", "Medical stay"], group: "Budget and Purpose" },
  { name: "additionalDetails", label: "Anything Else?", type: "textarea", required: false, placeholder: "Late check-in, extra bedding, quiet area, invoice needed for the company...", group: "Budget and Purpose" }
];

export const boardingStudentSchema: FieldSchema[] = [
  { name: "roomType", label: "Room Type", type: "select", required: true, keepInExpress: true, options: ["Single room", "Shared (2 per room)", "Shared (3+ per room)", "Bedsitter"], group: "Your Room" },
  { name: "institution", label: "Your Campus / College", type: "text", required: true, keepInExpress: true, placeholder: "e.g. UNZA, CBU, Evelyn Hone, ZCAS", helpText: "Boarding houses near your campus will respond.", group: "Your Room" },
  { name: "genderPreference", label: "House Preference", type: "select", required: false, options: ["Ladies only", "Gents only", "Mixed", "No preference"], group: "Your Room" },
  { name: "mealsIncluded", label: "Meals Included?", type: "toggle", required: false, group: "Your Room" },
  { name: "mustHaves", label: "Must-Haves", type: "multiselect", required: false, keepInExpress: true, options: ["Study desk", "WiFi", "Water included", "ZESCO included", "Security", "Walking distance to campus", "Transport nearby"], group: "Your Room" },
  { name: "budget_limit", label: "Max Monthly Rent (ZMW)", type: "currency", required: true, keepInExpress: true, group: "Budget and Timing" },
  { name: "moveInDate", label: "Move-In Date", type: "date", required: false, group: "Budget and Timing" },
  { name: "additionalDetails", label: "Anything Else?", type: "textarea", required: false, placeholder: "Course duration, visiting rules, cooking arrangements...", group: "Budget and Timing" }
];
