import type { FieldSchema } from '../types';

export const entertainmentPerformersSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos / Portfolio", type: "image_upload", required: false, group: "Performance Requirements" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Concert", "Festival", "Private Party", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "duration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 24, group: "Event Details" },
  { name: "location_name", label: "Venue Location", type: "text", required: true, placeholder: "e.g. Lusaka, Levy Mall", group: "Event Details" },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "musicGenre", label: "Music Genre", type: "select", required: false, keepInExpress: true, options: ["Afrobeats", "Zambian Music", "Gospel", "RnB/Soul", "Hip Hop", "Jazz", "Classical", "Pop", "Any"], group: "Performance Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Terms", helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequests", label: "Special Requirements", type: "textarea", required: false, placeholder: "Any special requests or rider requirements...", group: "Budget and Terms" }
];

