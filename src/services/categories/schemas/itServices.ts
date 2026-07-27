import type { FieldSchema } from '../types';

export const softwareWebDevSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Inspiration", type: "image_upload", required: false, helpText: "Upload screenshots or examples of what you want built", group: "Project Overview" },
  { name: "projectType", label: "Type of Project", type: "select", required: true, options: ["Website / Landing Page", "E-Commerce / Online Store", "Mobile App (Android)", "Mobile App (iOS)", "Mobile App (Both)", "Web Application / System", "Custom Software", "API / Backend Development", "Database Design", "UI/UX Design Only", "WordPress / CMS Website", "Other"], group: "Project Overview" },
  { name: "projectDescription", label: "Project Description", type: "textarea", required: true, placeholder: "Describe what you want built. What does it do? Who will use it?", group: "Project Overview" },
  { name: "targetUsers", label: "Who Will Use This?", type: "select", required: false, options: ["General Public / Customers", "Internal Staff Only", "Business to Business", "Students / Education", "Government / Public Sector", "Other"], group: "Project Overview" },
  { name: "featuresNeeded", label: "Key Features Needed", type: "textarea", required: false, placeholder: "e.g. User login, Payment gateway, Admin dashboard, Mobile responsive", group: "Technical Requirements" },
  { name: "existingSystem", label: "Existing System / Website?", type: "toggle", required: false, helpText: "Toggle if you have an existing system that needs updating", group: "Technical Requirements" },
  { name: "techPreference", label: "Technology Preference", type: "text", required: false, placeholder: "e.g. React, Laravel, WordPress, No preference", group: "Technical Requirements" },
  { name: "hostingRequired", label: "Hosting & Domain Required?", type: "toggle", required: false, helpText: "Toggle if you need the developer to set up hosting and domain", group: "Technical Requirements" },
  { name: "timeline", label: "Project Timeline", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Timeline" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Timeline", dependsOn: { field: "timeline", value: ["On a specific date & time"] } },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Timeline" },
  { name: "maintenanceRequired", label: "Ongoing Maintenance Required?", type: "toggle", required: false, helpText: "Toggle if you need monthly support after launch", group: "Budget and Timeline" },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any other requirements, integrations needed, competitors to reference...", group: "Budget and Timeline" }
];

export const networkingSecuritySchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the premises or existing network setup", group: "Service Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["Network Setup / Installation", "WiFi Setup & Configuration", "Network Troubleshooting", "CCTV / Security Camera Setup", "Access Control System", "Firewall / Cybersecurity", "Server Setup & Configuration", "VPN Setup", "Network Cabling", "Biometric System", "Other"], group: "Service Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Home / Residential", "Small Office", "Medium Business", "Large Corporate", "School / Institution", "Warehouse / Industrial", "Other"], group: "Service Details" },
  { name: "propertySize", label: "Property Size / Coverage Area", type: "text", required: false, placeholder: "e.g. 3 bedroom house, 2 floor office building, 500 sqm warehouse", group: "Service Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka, Ndola, Kitwe", group: "Service Details" },
  { name: "quantity", label: "Number of Devices / Users", type: "number", required: false, min: 1, helpText: "Approximate number of computers, phones, cameras etc.", group: "Service Details" },
  { name: "issueDescription", label: "Describe Your Requirements", type: "textarea", required: true, placeholder: "e.g. Need WiFi covering entire office, CCTV for 4 entry points, Network keeps dropping", group: "Service Details" },
  { name: "existingInfrastructure", label: "Existing Infrastructure?", type: "toggle", required: false, helpText: "Toggle if you have existing network equipment installed", group: "Technical Details" },
  { name: "equipmentSupplyNeeded", label: "Equipment Supply Needed?", type: "toggle", required: false, helpText: "Toggle if you need the provider to supply routers, cameras etc.", group: "Technical Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any specific brands, security certifications required, other details...", group: "Budget and Urgency" }
];

export const itSupportMaintenanceSchema: FieldSchema[] = [
  { name: "images", label: "Screenshots / Photos", type: "image_upload", required: false, helpText: "Upload screenshots of errors or photos of hardware issues", group: "Support Details" },
  { name: "supportType", label: "Type of Support Needed", type: "select", required: true, options: ["Computer / Laptop Repair", "Software Installation", "Virus / Malware Removal", "Data Recovery", "System Upgrade", "Printer Setup / Repair", "Email Setup & Configuration", "Remote Support / Online Help", "Regular Maintenance Contract", "Staff IT Training", "Other"], group: "Support Details" },
  { name: "deviceType", label: "Device Type", type: "select", required: false, options: ["Desktop PC", "Laptop", "Server", "Printer", "POS System", "Multiple Devices", "Other"], group: "Support Details" },
  { name: "operatingSystem", label: "Operating System", type: "select", required: false, options: ["Windows 10", "Windows 11", "Windows 7 / 8", "macOS", "Linux", "Not Sure"], group: "Support Details" },
  { name: "issueDescription", label: "Describe the Issue", type: "textarea", required: true, placeholder: "e.g. Laptop very slow, Blue screen error, Cannot connect to internet, Need antivirus installed", group: "Support Details" },
  { name: "quantity", label: "Number of Devices", type: "counter", required: false, min: 1, group: "Support Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka CBD, Woodlands, Ndola", group: "Support Details" },
  { name: "remoteSupport", label: "Remote Support Acceptable?", type: "toggle", required: false, helpText: "Toggle if the technician can assist you remotely without visiting", group: "Support Details" },
  { name: "ongoingContract", label: "Ongoing Support Contract?", type: "toggle", required: false, helpText: "Toggle if you need regular monthly IT support", group: "Contract Details" },
  { name: "numberOfStaff", label: "Number of Staff / Users", type: "number", required: false, min: 1, group: "Contract Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "How Urgent?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the exact day and time that suits you — the provider plans around it.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any error messages, when issue started, previous repairs done...", group: "Budget and Urgency" }
];

