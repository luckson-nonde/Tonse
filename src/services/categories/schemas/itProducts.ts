import type { FieldSchema } from '../types';

export const businessComputersSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, helpText: "Upload spec sheets or reference photos", group: "Product Details" },
  { name: "computerType", label: "Type of Computer", type: "select", required: true, options: ["Business Laptop", "Desktop PC", "Workstation", "All-in-One PC", "Mini PC", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell", "HP", "Lenovo", "Apple (Mac)", "ASUS", "Acer", "Custom Built", "No Preference"], group: "Product Details" },
  { name: "processor", label: "Processor Requirement", type: "select", required: false, options: ["Entry Level (Core i3 / Ryzen 3)", "Mid Range (Core i5 / Ryzen 5)", "High Performance (Core i7 / Ryzen 7)", "Extreme (Core i9 / Ryzen 9)", "Not Sure"], group: "Technical Specs" },
  { name: "ram", label: "RAM (Memory)", type: "select", required: false, options: ["8GB", "16GB", "32GB", "64GB+", "Not Sure"], group: "Technical Specs" },
  { name: "storage", label: "Storage Capacity", type: "select", required: false, options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB+ SSD", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity Needed", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget per Unit (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Order Details" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Order Details", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Requirements", type: "textarea", required: false, placeholder: "OS preference, specific ports needed, warranty requirements...", group: "Order Details" }
];

export const serversStorageSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "productType", label: "Product Type", type: "select", required: true, options: ["Rack Server", "Tower Server", "Blade Server", "NAS Storage", "SAN Storage", "Backup / Tape Drive", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Dell EMC", "HPE", "Lenovo", "Cisco", "Synology", "QNAP", "Other", "No Preference"], group: "Product Details" },
  { name: "purpose", label: "Primary Purpose", type: "select", required: true, options: ["File Server", "Database Server", "Virtualization (VMware/Hyper-V)", "Web Hosting", "Backup & Recovery", "Active Directory / Domain Controller", "Other"], group: "Technical Specs" },
  { name: "storageCapacity", label: "Required Storage Capacity", type: "text", required: false, placeholder: "e.g. 10TB, 50TB, 1PB", group: "Technical Specs" },
  { name: "redundancy", label: "Redundancy Requirements", type: "select", required: false, options: ["Standard (Single PSU/RAID)", "High Availability (Dual PSU/Failover)", "Mission Critical", "Not Sure"], group: "Technical Specs" },
  { name: "budget_limit", label: "Project Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Order Details" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Order Details", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Rack space available, OS requirements, support level needed...", group: "Order Details" }
];

export const networkingHardwareSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Network Switch", "Router", "Firewall / Security Appliance", "Wireless Access Point", "Network Cabinet / Rack", "Cabling & Patch Panels", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["Cisco", "Ubiquiti (UniFi)", "MikroTik", "TP-Link (Omada)", "Fortinet", "Sophos", "Aruba", "Other"], group: "Product Details" },
  { name: "portCount", label: "Number of Ports", type: "select", required: false, options: ["5-8 Ports", "16 Ports", "24 Ports", "48 Ports", "N/A"], group: "Technical Specs" },
  { name: "poeRequired", label: "PoE (Power over Ethernet) Needed?", type: "toggle", required: false, group: "Technical Specs" },
  { name: "managed", label: "Managed or Unmanaged?", type: "select", required: false, options: ["Managed (L2/L3)", "Unmanaged (Plug & Play)", "Smart Managed", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Order Details" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Order Details", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "SFP+ requirements, specific security features, outdoor vs indoor...", group: "Order Details" }
];

export const softwareLicensesSchema: FieldSchema[] = [
  { name: "softwareName", label: "Software Name", type: "text", required: true, placeholder: "e.g. Microsoft 365, Adobe Creative Cloud, Sage, Antivirus", group: "Software Details" },
  { name: "licenseType", label: "License Type", type: "select", required: true, options: ["New Subscription", "Renewal", "Perpetual License (One-time)", "Upgrade", "Not Sure"], group: "Software Details" },
  { name: "numberOfUsers", label: "Number of Users / Seats", type: "number", required: true, min: 1, group: "Software Details" },
  { name: "edition", label: "Edition / Version", type: "select", required: false, options: ["Basic / Home", "Standard / Business", "Professional", "Enterprise / Premium", "Not Sure"], group: "Software Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Order Details" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Order Details", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Current license key if renewal, specific modules needed...", group: "Order Details" }
];

export const printersOfficeEquipmentSchema: FieldSchema[] = [
  { name: "images", label: "Reference / Specs", type: "image_upload", required: false, group: "Product Details" },
  { name: "equipmentType", label: "Equipment Type", type: "select", required: true, options: ["Laser Printer", "Inkjet Printer", "Multifunction (Print/Scan/Copy)", "Large Format Plotter", "Document Scanner", "Label Printer", "Other"], group: "Product Details" },
  { name: "brandPreference", label: "Brand Preference", type: "select", required: false, options: ["HP", "Canon", "Epson", "Brother", "Kyocera", "Konica Minolta", "Ricoh", "Other"], group: "Product Details" },
  { name: "colorMono", label: "Color or Monochrome?", type: "select", required: true, options: ["Color", "Monochrome (Black & White Only)", "Both"], group: "Technical Specs" },
  { name: "paperSize", label: "Max Paper Size", type: "select", required: true, options: ["A4", "A3", "A2", "A1/A0 (Plotter)", "Other"], group: "Technical Specs" },
  { name: "monthlyVolume", label: "Estimated Monthly Volume", type: "select", required: false, options: ["Low (Under 1000 pages)", "Medium (1000 - 5000 pages)", "High (5000+ pages)", "Not Sure"], group: "Technical Specs" },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1, group: "Order Details" },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, group: "Order Details" },
  { name: "urgency", label: "When Do You Need It?", type: "select", required: true, options: ["Immediately", "On a specific date & time"], group: "Order Details" },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", group: "Order Details", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Network/WiFi printing needed, duplex (double-sided) printing, specific tray requirements...", group: "Order Details" }
];

