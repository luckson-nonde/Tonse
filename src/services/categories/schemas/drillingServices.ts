import type { FieldSchema } from '../types';

export const boreholeDrillingSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the site and access gate/road", group: "Site Details" },
  { name: "location", label: "Drilling Location", type: "text", required: true, placeholder: "e.g. Lusaka West, Chongwe, Plot Number", group: "Site Details" },
  { name: "purpose", label: "Purpose of Borehole", type: "select", required: true, options: ["Domestic / Home Use", "Agricultural / Irrigation", "Industrial / Commercial", "Community Water Point", "Construction Site", "Other"], group: "Site Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Plot", "Farm / Smallholding", "Commercial Property", "Industrial Site", "Unfinished Site", "Other"], group: "Site Details" },
  { name: "siteAccessibility", label: "Rig Accessibility", type: "select", required: true, options: ["Easy Access (Wide Gate/Road)", "Limited Access (Narrow)", "Difficult Terrain", "Not Sure - Need Site Visit"], helpText: "Drilling rigs are large trucks; they need space to maneuver.", group: "Site Details" },
  { name: "requiredDepth", label: "Estimated Depth (Meters)", type: "number", required: false, placeholder: "e.g. 60", helpText: "If unknown, the driller will estimate based on local water table.", group: "Technical Requirements" },
  { name: "casingType", label: "Casing Preference", type: "select", required: false, options: ["Class 9 PVC (Standard)", "Class 12 PVC (Heavy Duty)", "Steel Casing", "No Preference"], group: "Technical Requirements" },
  { name: "pumpSystem", label: "Pump & Power System", type: "select", required: true, options: ["Solar Powered System", "Electric (ZESCO) Pump", "Hand Pump", "Submersible Pump Only", "Full Installation (Pump + Tank + Stand)", "No Pump - Drilling Only"], group: "Technical Requirements" },
  { name: "tankNeeded", label: "Water Tank Needed?", type: "toggle", required: false, group: "Technical Requirements" },
  { name: "tankStandNeeded", label: "Tank Stand Needed?", type: "toggle", required: false, group: "Technical Requirements" },
  { name: "budget_limit", label: "Total Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "Geological info if known, specific pump brand, water testing requirements...", group: "Budget and Urgency" }
];

export const miningExplorationSchema: FieldSchema[] = [
  { name: "images", label: "Site / Map Photos", type: "image_upload", required: false, helpText: "Upload site maps or photos of the exploration area", group: "Project Overview" },
  { name: "location_name", label: "Project Location", type: "text", required: true, placeholder: "e.g. Solwezi, Copperbelt, Mkushi", group: "Project Overview" },
  { name: "drillingType", label: "Type of Drilling Required", type: "select", required: true, options: ["Diamond Core Drilling", "Reverse Circulation (RC)", "Air Core Drilling", "Blast Hole Drilling", "Auger Drilling", "Not Sure - Need Advice"], group: "Project Overview" },
  { name: "numberOfHoles", label: "Number of Holes", type: "number", required: true, min: 1, group: "Project Overview" },
  { name: "targetDepth", label: "Average Target Depth (Meters)", type: "number", required: true, group: "Project Overview" },
  { name: "terrainType", label: "Terrain Type", type: "select", required: true, options: ["Flat / Accessible", "Hilly / Mountainous", "Swampy / Wet", "Dense Bush / Forest", "Existing Mine Site"], group: "Site Conditions" },
  { name: "siteAccess", label: "Site Access Status", type: "select", required: true, options: ["Road Access Available", "Need Road Clearing", "Remote - Helicopter Only", "Underground Access"], group: "Site Conditions" },
  { name: "waterSource", label: "Water Source for Drilling", type: "select", required: true, options: ["Available on Site", "Need Water Bowsing / Trucking", "Natural Source Nearby", "Contractor to Provide"], group: "Logistics" },
  { name: "campServices", label: "Camp Services Needed?", type: "toggle", required: false, helpText: "Does the contractor need to provide their own accommodation/camp?", group: "Logistics" },
  { name: "environmentalCompliance", label: "Environmental Permits Ready?", type: "toggle", required: true, group: "Compliance" },
  { name: "budget_limit", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Budget and Timeline" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Timeline" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Timeline", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Sample handling requirements, safety standards (ISO/NOSA), specific rig requirements...", group: "Budget and Timeline" }
];

export const geotechnicalDrillingSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos / Plans", type: "image_upload", required: false, group: "Project Details" },
  { name: "projectType", label: "Project Type", type: "select", required: true, options: ["Building Foundation", "Bridge Construction", "Road / Highway", "Dam / Reservoir", "Tailings Storage Facility", "Telecommunication Tower", "Other Infrastructure"], group: "Project Details" },
  { name: "location", label: "Site Location", type: "text", required: true, placeholder: "e.g. Lusaka CBD, New Bridge Site", group: "Project Details" },
  { name: "numberOfBoreholes", label: "Number of Test Boreholes", type: "number", required: true, min: 1, group: "Technical Scope" },
  { name: "requiredDepth", label: "Target Depth per Hole (Meters)", type: "number", required: true, group: "Technical Scope" },
  { name: "testingRequired", label: "In-Situ Testing Needed", type: "select", required: true, options: ["Standard Penetration Test (SPT)", "Cone Penetration Test (CPT)", "Vane Shear Test", "Pressuremeter Test", "Dynamic Probe Super Heavy (DPSH)", "Multiple / All of the above"], group: "Technical Scope" },
  { name: "coreRecovery", label: "Core Recovery Required?", type: "toggle", required: false, group: "Technical Scope" },
  { name: "labTesting", label: "Laboratory Testing Needed?", type: "toggle", required: false, helpText: "Soil analysis, rock strength, moisture content, etc.", group: "Technical Scope" },
  { name: "siteAccessibility", label: "Site Accessibility", type: "select", required: true, options: ["Easy Access", "Restricted Space (Indoor/Basement)", "Sloped / Difficult Terrain", "Over Water / Barge Needed"], group: "Site Conditions" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "How Soon?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Specific standards (ASTM/BS), reporting requirements, site safety inductions...", group: "Budget and Urgency" }
];

