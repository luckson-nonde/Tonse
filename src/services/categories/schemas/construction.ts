import type { FieldSchema } from '../types';

export const buildingMaterialsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the materials or project reference", group: "Project Details" },
  { name: "projectType", label: "Type of Project", type: "select", required: true, options: ["New House Construction", "Renovation / Remodeling", "Extension / Addition", "Commercial Building", "Boundary Wall / Fence", "Roofing Project", "Flooring Project", "Other"], group: "Project Details" },
  { name: "materialType", label: "Material Needed", type: "select", required: true, options: ["Cement / Concrete", "Bricks / Blocks", "Sand & Aggregates", "Steel / Iron Bars / Rebar", "Roofing Sheets / Tiles", "Timber / Wood", "Glass", "Paint & Finishes", "Tiles / Flooring", "Insulation Materials", "Multiple Materials", "Other"], group: "Material Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Zambezi Portland, Any brand", group: "Material Details" },
  { name: "specifications", label: "Specifications / Grade", type: "text", required: false, placeholder: "e.g. 42.5N cement, 6mm rebar, 600x600 tiles", group: "Material Details" },
  { name: "quantity", label: "Quantity", type: "text", required: true, placeholder: "e.g. 50 bags, 1000 bricks, 20 sheets", group: "Material Details" },
  { name: "deliveryRequested", label: "Do you need delivery? (Additional fees may apply)", type: "toggle", required: false, helpText: "Default: You will pick up from the shop. Toggle if you need items delivered.", group: "Delivery and Timeline" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Project size, site access, any specific requirements...", group: "Budget and Urgency" }
];

export const plumbingFixturesSchema: FieldSchema[] = [
  { name: "images", label: "Photos", type: "image_upload", required: false, helpText: "Photos of the problem area or fixture you need", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Plumbing Repair Service", "Plumbing Installation", "Supply of Plumbing Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Pipe Repair / Replacement", "Tap / Faucet Installation", "Toilet Installation / Repair", "Shower / Bathtub Installation", "Water Heater / Geyser", "Water Tank Installation", "Drainage / Sewer", "Borehole Pump / Water Pump", "General Plumbing", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial", "Other"], group: "Service Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Chilanga, Kitwe", group: "Service Details" },
  { name: "issueDescription", label: "Describe the Issue or Requirement", type: "textarea", required: true, placeholder: "e.g. Burst pipe in kitchen, Need new toilet installed, Water not reaching upper floor", group: "Service Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["Within a week", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other details that would help the provider...", group: "Budget and Urgency" }
];

export const electricalSuppliesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the electrical work area or materials needed", group: "Service or Supply?" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Electrical Repair Service", "New Installation", "Supply of Electrical Materials", "Both Supply & Installation"], group: "Service or Supply?" },
  { name: "serviceType", label: "Type of Work", type: "select", required: true, options: ["Wiring / Rewiring", "DB Board / Circuit Breaker", "Solar Panel Installation", "Inverter / Battery Backup", "Security Lighting", "CCTV Installation", "Generator Installation", "Electrical Fault Finding", "Light Fitting Installation", "Power Outlet / Socket", "Other"], group: "Work Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: false, options: ["Residential House", "Apartment / Flat", "Commercial / Office", "Industrial / Factory", "Other"], group: "Work Details" },
  { name: "location", label: "Property Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Work Details" },
  { name: "issueDescription", label: "Describe the Work Required", type: "textarea", required: true, placeholder: "e.g. Rewire 3 bedroom house, Install solar system 5KVA, Fix electrical fault in kitchen", group: "Work Details" },
  { name: "materialsRequired", label: "Materials Required?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply materials", group: "Work Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Emergency - Right Now", "Immediately", "Within a week", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["Within a week", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Property size, number of rooms, existing electrical setup...", group: "Budget and Urgency" }
];

export const hardwareToolsSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the tool or hardware you need", group: "Tool Details" },
  { name: "itemType", label: "What Are You Looking For?", type: "select", required: true, options: ["Hand Tools", "Power Tools", "Safety Equipment / PPE", "Fasteners / Fixings", "Adhesives / Sealants", "Painting Tools & Equipment", "Measuring Tools", "Ladders & Access Equipment", "Storage / Toolboxes", "Other Hardware"], group: "Tool Details" },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. Makita, Bosch, Stanley, Any", group: "Tool Details" },
  { name: "specifications", label: "Specifications", type: "text", required: false, placeholder: "e.g. 18V cordless drill, 5 metre tape measure", group: "Tool Details" },
  { name: "purposeOfUse", label: "Purpose of Use", type: "select", required: false, options: ["Home / DIY Use", "Professional / Trade Use", "Construction Site", "Workshop", "One-Time Project"], group: "Tool Details" },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New", "Used - Good", "Any"], group: "Tool Details" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Tool Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific requirements, power source, compatibility needs...", group: "Budget and Urgency" }
];

export const constructionMachinerySchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload photos of the machinery or project site", group: "Machinery Details" },
  { name: "inquiryType", label: "What Do You Need?", type: "select", required: true, options: ["Hire / Rent Machinery", "Purchase Machinery", "Machinery Operator Only", "Machinery with Operator"], group: "Machinery Details" },
  { name: "machineryType", label: "Type of Machinery", type: "select", required: true, options: ["Excavator / Digger", "Bulldozer", "Grader", "Tipper Truck", "Concrete Mixer", "Crane", "Forklift", "Compactor / Roller", "Generator", "Scaffolding", "Concrete Pump", "Other"], group: "Machinery Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "Within a week", "Within a month", "Planning Ahead"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["Within a week", "Within a month", "Planning Ahead"] } },
  { name: "location_name", label: "Project / Site Location", type: "text", required: true, placeholder: "e.g. Lusaka, Kafue, Ndola", group: "Project Details" },
  { name: "projectDescription", label: "Project Description", type: "textarea", required: true, placeholder: "e.g. Excavation for foundation of 4 bedroom house, Road grading 2km stretch", group: "Project Details" },
  { name: "duration", label: "Duration Needed (Days)", type: "counter", required: true, min: 1, group: "Project Details" },
  { name: "operatorRequired", label: "Operator Required?", type: "toggle", required: false, helpText: "Toggle if you need a qualified operator provided with the machinery", group: "Project Details" },
  { name: "equipmentTransfer", label: "Equipment Handover", type: "select", required: true, options: ["I will collect from your yard (standard)", "Deliver to my site (additional transport fee)", "Operator brings to site (included with operator service)"], group: "Project Details" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Site access details, soil type, project scope, any special requirements...", group: "Budget and Urgency" }
];

