import type { FieldSchema } from '../types';

export const ispSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of your premises or location", group: "Connection Details" },
  { name: "connectionType", label: "Type of Connection Needed", type: "select", required: true, options: ["Home WiFi / Broadband", "Business Fibre", "LTE / 4G / 5G Router", "Satellite Internet", "Dedicated Leased Line", "VSAT", "Not Sure - Need Advice"], group: "Connection Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Home", "Small Office", "Medium Business", "Large Corporate", "School / Institution", "Farm / Rural Area", "Other"], group: "Connection Details" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Lusaka - Rhodespark, Ndola - Kansenshi, Choma Town", group: "Connection Details" },
  { name: "numberOfUsers", label: "Number of Users / Devices", type: "number", required: false, min: 1, helpText: "How many people or devices will use the connection?", group: "Connection Details" },
  { name: "speedRequired", label: "Speed Required", type: "select", required: false, options: ["Basic - Browsing & Email", "Standard - Streaming & Video Calls", "Fast - Multiple Users & Downloads", "Ultra Fast - Business Critical", "Not Sure"], group: "Connection Details" },
  { name: "primaryUse", label: "Primary Use", type: "select", required: true, options: ["Home Use / Entertainment", "Remote Work / Work From Home", "Business Operations", "Gaming", "CCTV / IoT Devices", "Mixed Use"], group: "Connection Details" },
  { name: "existingProvider", label: "Current Internet Provider", type: "text", required: false, placeholder: "e.g. Airtel, MTN, Liquid, None", group: "Current Situation" },
  { name: "currentIssue", label: "Current Issue / Reason for Inquiry", type: "select", required: false, options: ["No Internet Currently", "Too Slow", "Too Expensive", "Unreliable Connection", "New Property / Installation", "Upgrading Plan", "Other"], group: "Current Situation" },
  { name: "contractPreference", label: "Contract Preference", type: "select", required: false, options: ["Month to Month", "6 Month Contract", "12 Month Contract", "24 Month Contract", "No Preference"], group: "Budget and Preferences" },
  { name: "budget_limit", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget and Preferences" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Preferences" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Preferences", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Building type, floor level, any specific requirements...", group: "Budget and Preferences" }
];

export const mobileNetworkServicesSchema: FieldSchema[] = [
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["SIM Card / New Line", "Business SIM / Corporate Lines", "Data Bundles / Packages", "Bulk SMS Services", "USSD / Mobile Money Integration", "Corporate Mobile Plan", "International Roaming", "Other"], group: "Service Details" },
  { name: "networkPreference", label: "Network Preference", type: "select", required: false, options: ["Airtel Zambia", "MTN Zambia", "Zamtel", "No Preference"], group: "Service Details" },
  { name: "quantity", label: "Number of Lines / SIMs", type: "counter", required: true, min: 1, group: "Service Details" },
  { name: "planType", label: "Plan Type", type: "select", required: false, options: ["Prepaid / Pay As You Go", "Postpaid / Contract", "Hybrid Plan", "No Preference"], group: "Service Details" },
  { name: "dataRequirement", label: "Monthly Data Requirement", type: "select", required: false, options: ["Basic - Under 5GB", "Standard - 5 to 20GB", "Heavy - 20 to 50GB", "Unlimited Data", "Not Sure"], group: "Service Details" },
  { name: "businessUse", label: "For Business Use?", type: "toggle", required: false, helpText: "Toggle if this is for a business or organisation", group: "Service Details" },
  { name: "companyName", label: "Company / Organisation Name", type: "text", required: false, placeholder: "e.g. ABC Company Ltd", group: "Service Details" },
  { name: "budget_limit", label: "Monthly Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Number portability needed, specific features required, coverage area concerns...", group: "Budget and Urgency" }
];

export const satelliteVsatInstallationSchema: FieldSchema[] = [
  { name: "images", label: "Site Photos", type: "image_upload", required: false, helpText: "Upload photos of the installation site and surrounding area", group: "Installation Details" },
  { name: "serviceType", label: "Type of Service", type: "select", required: true, options: ["VSAT Internet Installation", "Satellite TV Installation", "DSTV Installation / Relocation", "DSTV Repair / Signal Fix", "OpenView / FreeView Installation", "Starlink Setup", "Other Satellite Service"], group: "Installation Details" },
  { name: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential Home", "Farm / Rural Property", "Small Business", "Large Business / Corporate", "School / Institution", "Mining / Industrial Site", "Other"], group: "Installation Details" },
  { name: "location", label: "Installation Location", type: "text", required: true, placeholder: "e.g. Lusaka, Mumbwa District, Mpika - Remote Farm", group: "Installation Details" },
  { name: "isRemoteArea", label: "Remote / Rural Area?", type: "toggle", required: false, helpText: "Toggle if the installation site is in a remote area with limited road access", group: "Installation Details" },
  { name: "existingEquipment", label: "Existing Equipment?", type: "toggle", required: false, helpText: "Toggle if you already have a dish or decoder installed", group: "Installation Details" },
  { name: "quantity", label: "Number of Connection Points", type: "counter", required: false, min: 1, helpText: "Number of TVs or devices to connect", group: "Installation Details" },
  { name: "roofType", label: "Roof / Mounting Type", type: "select", required: false, options: ["Tiled Roof", "Iron Sheet Roof", "Concrete / Flat Roof", "Wall Mount", "Ground Mount / Pole", "Not Sure"], group: "Technical Details" },
  { name: "powerAvailable", label: "Reliable Power Available?", type: "toggle", required: false, helpText: "Toggle if site has reliable electricity. If not, solar options may be discussed", group: "Technical Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Budget and Urgency" },
  { name: "urgency", label: "When Do You Need Installation?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Budget and Urgency" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Budget and Urgency", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "GPS coordinates if remote, access road details, power situation...", group: "Budget and Urgency" }
];

