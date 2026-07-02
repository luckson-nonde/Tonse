import type { FieldSchema } from '../types';

export const venuesClubsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false },
  { name: "venueType", label: "Venue Type", type: "select", required: true, options: ["Nightclub", "Conference Hall", "Garden / Outdoor Venue", "Restaurant / Private Dining", "Hotel Ballroom", "Other"], placeholder: "Select Venue Type" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday", "Corporate", "Conference", "Exhibition", "Private Party", "Other"], placeholder: "Select Event Type" },
  { name: "eventDate", label: "Event Date", type: "date", required: true },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, placeholder: "e.g. 300" },
  { name: "amenitiesNeeded", label: "Amenities Needed", type: "textarea", required: false, placeholder: "e.g. Sound system, Projector, Catering, Bar service, Security" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional - leave blank to receive price offers from shops" },
  { name: "specialRequirements", label: "Special Requirements", type: "textarea", required: false, placeholder: "Parking, accessibility, early setup..." }
];

export const RENTAL_CATALOG_ITEMS: { id: string; name: string; image: string; schema: FieldSchema[] }[] = [
  { 
    id: "chairs", 
    name: "Chairs", 
    image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "chairType", label: "Chair Type", type: "select", required: true, options: ["Plastic (Standard)", "Plastic (Heavy Duty)", "Wooden (Folding)", "Wooden (Crossback)", "Metal / Banquet", "Ghost / Acrylic", "Tiffany / Chiavari", "Wimbledon", "Bar Stools", "Lounge Seating", "Other"] },
      { name: "chairQuantity", label: "Quantity", type: "number", required: true, placeholder: "e.g. 100" },
      { name: "chairDetails", label: "Details / Color", type: "textarea", required: false, placeholder: "Mention colors or specific styles..." }
    ]
  },
  { 
    id: "tables", 
    name: "Tables", 
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "tableType", label: "Table Type", type: "select", required: true, options: ["Round (10-seater)", "Round (8-seater)", "Rectangular (Trestle)", "Cocktail / High Table", "Square", "Coffee Table", "Cake Table", "Other"] },
      { name: "tableQuantity", label: "Quantity", type: "number", required: true, placeholder: "e.g. 10" },
      { name: "tableDetails", label: "Details / Linens", type: "textarea", required: false, placeholder: "Mention linens, sizes, etc..." }
    ]
  },
  { 
    id: "tents", 
    name: "Tents", 
    image: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&q=80&w=400&h=400",
    schema: [
      { name: "tentType", label: "Tent / Marquee Type", type: "select", required: true, options: ["Peg and Pole", "Stretch / Bedouin", "Frame Tent", "Gazebo", "Alpine", "Clear Span / Glass", "Other"] },
      { name: "tentSize", label: "Tent Size / Capacity", type: "text", required: true, placeholder: "e.g. 20x30m or for 200 people" },
      { name: "tentDetails", label: "Details", type: "textarea", required: false, placeholder: "Mention flooring, lighting, etc..." }
    ]
  },
];

export const equipmentRentalCoreSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, group: "Core Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate", "Birthday", "Festival", "Exhibition", "Conference", "Funeral", "Other"], group: "Core Details" },
  { name: "quantity", label: "Estimated Guest Count", type: "number", required: true, placeholder: "e.g. 200 guests", group: "Core Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Core Details" },
  { name: "duration", label: "Rental Duration (days)", type: "counter", required: true, min: 1, group: "Core Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Core Details", helpText: "Optional - leave blank to receive price offers" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Core Details" }
];

export const equipmentRentalSchema: FieldSchema[] = [
  ...equipmentRentalCoreSchema
];

export const eventManagementSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload mood board or theme inspiration images", group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Conference", "Birthday Party", "Graduation", "Product Launch", "Funeral / Memorial", "Fundraiser / Gala", "Festival", "Baby Shower", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "duration", label: "Duration (hours)", type: "counter", required: true, min: 1, max: 72, group: "Event Overview" },
  { name: "quantity", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "location_name", label: "Event Location / Venue", type: "text", required: true, placeholder: "e.g. Lusaka, Heroes Stadium, Radisson Blu Hotel", group: "Event Overview" },
  { name: "servicesNeeded", label: "Services Required", type: "select", required: true, options: ["Full Event Management", "Partial Coordination Only", "Day-Of Coordination Only", "Planning & Vendor Sourcing", "Not Sure - Need Consultation"], group: "Services Required" },
  { name: "cateringRequired", label: "Catering Required?", type: "toggle", required: false, keepInExpress: true, group: "Services Required" },
  { name: "decorRequired", label: "Decor & Styling Required?", type: "toggle", required: false, keepInExpress: true, group: "Services Required" },
  { name: "entertainmentRequired", label: "Entertainment Required?", type: "toggle", required: false, keepInExpress: true, group: "Services Required" },
  { name: "photographyRequired", label: "Photography / Videography?", type: "toggle", required: false, keepInExpress: true, group: "Services Required" },
  { name: "theme", label: "Event Theme", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Black & Gold, Garden Party, Rustic, Traditional", group: "Theme and Style" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget and Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, cultural considerations, or special requests...", group: "Budget and Timeline" }
];

export const eventCateringSchema: FieldSchema[] = [
  { name: "images", label: "Food Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of food styles or presentation you prefer", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday Party", "Graduation", "Funeral / Memorial", "Conference", "Baby Shower", "Private Dinner", "Festival / Outdoor", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "quantity", label: "Number of Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "location_name", label: "Event Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, specific venue name", group: "Event Details" },
  { name: "serviceStyle", label: "Service Style", type: "select", required: true, options: ["Buffet", "Plated / Sit Down", "Cocktail / Finger Foods", "Food Stations", "Box Meals", "BBQ / Braai", "Not Sure"], group: "Catering Requirements" },
  { name: "mealSessions", label: "Meal Sessions Needed", type: "select", required: false, keepInExpress: true, options: ["Lunch Only", "Dinner Only", "Lunch and Dinner", "Breakfast and Lunch", "Tea Break and Lunch", "Full Day (Breakfast, Lunch, Dinner)", "Cocktail Reception Only", "Snacks and Drinks"], helpText: "Which sittings should the menu cover?", group: "Catering Requirements" },
  { name: "serviceWindow", label: "Service Window", type: "text", required: false, keepInExpress: true, placeholder: "e.g. 12:00 PM – 4:00 PM", helpText: "When food should be served on the day", group: "Catering Requirements" },
  { name: "cuisineType", label: "Cuisine Preference", type: "select", required: false, keepInExpress: true, options: ["Zambian / African Traditional", "International / Continental", "Indian", "Chinese", "Italian", "Mixed / Variety", "No Preference"], group: "Catering Requirements" },
  { name: "dietaryRequirements", label: "Dietary Requirements", type: "select", required: false, keepInExpress: true, options: ["None", "Vegetarian Options Needed", "Vegan Options Needed", "Halal Only", "Gluten Free", "Multiple Requirements"], group: "Catering Requirements" },
  { name: "guestPreferences", label: "Guest Preferences", type: "textarea", required: false, keepInExpress: true, placeholder: "VIP guests, allergies, religious requirements, kids menu, elderly guests…", helpText: "Anything specific about the guests that should shape the menu", group: "Catering Requirements" },
  { name: "presentation", label: "Presentation Style", type: "select", required: false, keepInExpress: true, options: ["Casual", "Formal / Elegant", "Themed", "Cultural / Traditional", "Outdoor / Garden", "Not Sure"], group: "Catering Requirements" },
  { name: "venueAccess", label: "Venue Kitchen Access", type: "select", required: false, options: ["Full Kitchen Available", "Limited Prep Area", "No Kitchen – Bring Own Setup", "Outdoor Cooking Allowed", "Not Sure"], helpText: "Tells caterers if they need to bring full mobile setup", group: "Catering Requirements" },
  { name: "drinksIncluded", label: "Drinks / Beverages Included?", type: "toggle", required: false, keepInExpress: true, group: "Catering Requirements" },
  { name: "staffRequired", label: "Serving Staff Required?", type: "toggle", required: false, keepInExpress: true, helpText: "Toggle if you need waiters and serving staff provided", group: "Catering Requirements" },
  { name: "equipmentRequired", label: "Equipment / Crockery Included?", type: "toggle", required: false, keepInExpress: true, helpText: "Plates, cutlery, chafing dishes etc.", group: "Catering Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" },
  { name: "budgetType", label: "Budget Type", type: "select", required: false, keepInExpress: true, options: ["Total Budget for Event", "Per Person / Per Head", "Not Sure"], group: "Budget" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Menu preferences, allergies, cultural food requirements...", group: "Budget" }
];

export const eventPlanningSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, group: "Event Overview" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Corporate Event", "Birthday", "Graduation", "Fundraiser", "Religious Event", "Product Launch", "Other"], group: "Event Overview" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Overview" },
  { name: "quantity", label: "Expected Guest Count", type: "number", required: true, min: 1, group: "Event Overview" },
  { name: "eventLocation", label: "Event Location", type: "text", required: true, placeholder: "City or specific venue", group: "Event Overview" },
  { name: "planningStage", label: "Current Planning Stage", type: "select", required: true, options: ["Just Starting - Need Full Help", "Have Venue - Need Other Vendors", "Have Most Vendors - Need Coordinator", "Need Day-Of Management Only"], group: "Planning Needs" },
  { name: "vendorsNeeded", label: "Vendors Still Needed", type: "select", required: false, keepInExpress: true, options: ["Venue", "Catering", "Decor", "Photography", "Entertainment", "Transportation", "Cake", "All of the above", "Not Sure"], group: "Planning Needs" },
  { name: "theme", label: "Event Theme / Style", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Elegant Gold, Traditional Zambian, Modern Minimalist", group: "Planning Needs" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget and Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific vision, cultural requirements, or special requests...", group: "Budget and Timeline" }
];

export const eventDecorSchema: FieldSchema[] = [
  { name: "images", label: "Inspiration Photos", type: "image_upload", required: false, helpText: "Upload photos of decor styles you love - this is very helpful", group: "Event Details" },
  { name: "eventType", label: "Event Type", type: "select", required: true, options: ["Wedding", "Birthday Party", "Corporate Event", "Graduation", "Baby Shower", "Bridal Shower", "Funeral / Memorial", "Other"], group: "Event Details" },
  { name: "eventDate", label: "Event Date", type: "date", required: true, group: "Event Details" },
  { name: "location_name", label: "Venue / Location", type: "text", required: true, placeholder: "e.g. Lusaka, specific venue", group: "Event Details" },
  { name: "quantity", label: "Expected Guests", type: "number", required: true, min: 1, group: "Event Details" },
  { name: "decorStyle", label: "Decor Style", type: "select", required: true, options: ["Elegant / Luxury", "Traditional / Cultural", "Modern / Minimalist", "Rustic / Natural", "Floral / Garden", "Themed / Specific Concept", "Not Sure - Open to Ideas"], group: "Decor Requirements" },
  { name: "themeName", label: "Theme Name or Concept", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Enchanted Garden, Black-Tie Gala, Lobola Ceremony", helpText: "Helps decorators visualise mood-board direction", group: "Decor Requirements" },
  { name: "colorScheme", label: "Color Scheme", type: "text", required: false, keepInExpress: true, placeholder: "e.g. Gold and White, Navy and Blush, Not decided", group: "Decor Requirements" },
  { name: "decorElements", label: "Decor Elements Needed", type: "select", required: false, keepInExpress: true, options: ["Full Venue Decor", "Table Centerpieces Only", "Backdrop / Stage Only", "Floral Arrangements", "Lighting and Ambiance", "Chair Covers and Sashes", "Balloon Installations", "Complete Package"], group: "Decor Requirements" },
  { name: "centerpieces", label: "Centerpiece Style", type: "select", required: false, keepInExpress: true, options: ["Floral", "Candle / Lantern", "Mixed (Floral and Candle)", "Greenery / Foliage", "Minimalist", "None Needed", "Other"], group: "Decor Requirements" },
  { name: "floralRequired", label: "Fresh Flowers Required?", type: "toggle", required: false, keepInExpress: true, helpText: "Toggle on if fresh florals are essential", group: "Decor Requirements" },
  { name: "lightingRequired", label: "Lighting / Ambience Required?", type: "toggle", required: false, keepInExpress: true, helpText: "Fairy lights, uplighting, spotlights, candles", group: "Decor Requirements" },
  { name: "backdropRequired", label: "Backdrop / Photo Wall?", type: "toggle", required: false, keepInExpress: true, helpText: "Focal point for photographs and the entrance", group: "Decor Requirements" },
  { name: "setupRequired", label: "Setup and Breakdown Required?", type: "toggle", required: false, keepInExpress: true, helpText: "Toggle if you need the decorator to set up and pack down after the event", group: "Decor Requirements" },
  { name: "venueAccess", label: "Venue Setup Access", type: "select", required: false, keepInExpress: true, options: ["Day Before (Full Access)", "Same Day Morning (4+ Hours)", "Same Day Limited (1-3 Hours)", "Outdoor / No Restrictions", "Not Sure"], helpText: "How early the decorator can start setting up", group: "Decor Requirements" },
  { name: "inspirationLink", label: "Inspiration Link", type: "text", required: false, keepInExpress: true, placeholder: "Pinterest board, Instagram post, or web URL", helpText: "Easiest way to communicate the look you want", group: "Decor Requirements" },
  { name: "specificItems", label: "Specific Items / Must-Haves", type: "textarea", required: false, keepInExpress: true, placeholder: "Balloon arch, gold table runners, floral centerpieces with white roses, fairy lights…", helpText: "Concrete items the decorator must include", group: "Decor Requirements" },
  { name: "specialRequests", label: "Special Requests / Other Details", type: "textarea", required: false, keepInExpress: true, placeholder: "Cultural elements, weather contingencies, accessibility, kids zones, religious requirements, anything else…", helpText: "Free-form — anything the structured fields above don't capture", group: "Decor Requirements" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget" }
];

