export interface LabourInquiryField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea' | 'toggle';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface LabourInquirySchema {
  id: string;
  fields: LabourInquiryField[];
}

const baseFields: LabourInquiryField[] = [
  { id: 'number_of_workers', label: 'Number of Workers', type: 'number', required: true },
  { id: 'start_date', label: 'Start Date', type: 'date', required: true },
  { id: 'duration', label: 'Duration', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Project-Based'], required: true },
  { id: 'location', label: 'Location', type: 'text', required: true },
  { id: 'rate_preference', label: 'Rate Preference', type: 'select', options: ['Hourly', 'Daily', 'Weekly', 'Monthly'], required: true },
  { id: 'additional_notes', label: 'Additional Notes', type: 'textarea', required: false },
];

export const labourInquirySchemas: Record<string, LabourInquirySchema> = {
  genericLabourInquirySchema: { id: 'genericLabourInquirySchema', fields: [...baseFields] },

  // CONSTRUCTION
  generalLabourerInquirySchema: { id: 'generalLabourerInquirySchema', fields: [...baseFields, { id: 'site_type', label: 'Site Type', type: 'select', options: ['Residential', 'Commercial', 'Industrial', 'Road'], required: true }, { id: 'tools_provided', label: 'Tools Provided', type: 'toggle', required: true }, { id: 'physical_requirements', label: 'Physical Requirements', type: 'select', options: ['Light', 'Medium', 'Heavy'], required: true }] },
  bricklayerInquirySchema: { id: 'bricklayerInquirySchema', fields: [...baseFields, { id: 'work_type', label: 'Work Type', type: 'select', options: ['New Build', 'Repair', 'Renovation'], required: true }] },
  carpenterInquirySchema: { id: 'carpenterInquirySchema', fields: [...baseFields, { id: 'carpentry_type', label: 'Carpentry Type', type: 'select', options: ['Structural', 'Finish', 'General'], required: true }] },
  electricianInquirySchema: { id: 'electricianInquirySchema', fields: [...baseFields, { id: 'work_type', label: 'Work Type', type: 'select', options: ['New Installation', 'Repair', 'Inspection', 'Rewiring'], required: true }, { id: 'property_type', label: 'Property Type', type: 'select', options: ['Residential', 'Commercial', 'Industrial'], required: true }, { id: 'certifications_required', label: 'Certifications Required', type: 'toggle', required: true }, { id: 'materials_provided', label: 'Materials Provided', type: 'toggle', required: true }] },
  plumberInquirySchema: { id: 'plumberInquirySchema', fields: [...baseFields, { id: 'work_type', label: 'Work Type', type: 'select', options: ['Installation', 'Repair', 'Maintenance'], required: true }] },
  welderInquirySchema: { id: 'welderInquirySchema', fields: [...baseFields, { id: 'welding_type', label: 'Welding Type', type: 'select', options: ['MIG', 'TIG', 'Arc', 'Gas'], required: true }] },
  steelFixerInquirySchema: { id: 'steelFixerInquirySchema', fields: [...baseFields, { id: 'project_type', label: 'Project Type', type: 'select', options: ['Commercial', 'Residential', 'Infrastructure'], required: true }] },
  painterInquirySchema: { id: 'painterInquirySchema', fields: [...baseFields, { id: 'surface_type', label: 'Surface Type', type: 'select', options: ['Interior', 'Exterior', 'Both'], required: true }] },
  tilerInquirySchema: { id: 'tilerInquirySchema', fields: [...baseFields, { id: 'tile_type', label: 'Tile Type', type: 'select', options: ['Ceramic', 'Porcelain', 'Natural Stone'], required: true }] },
  rooferInquirySchema: { id: 'rooferInquirySchema', fields: [...baseFields, { id: 'roof_type', label: 'Roof Type', type: 'select', options: ['Flat', 'Pitched', 'Metal', 'Tile'], required: true }] },

  // DOMESTIC
  houseCleanerInquirySchema: { id: 'houseCleanerInquirySchema', fields: [...baseFields, { id: 'cleaning_type', label: 'Cleaning Type', type: 'select', options: ['Standard', 'Deep', 'Move-in/out'], required: true }] },
  nannyInquirySchema: { id: 'nannyInquirySchema', fields: [...baseFields, { id: 'number_of_children', label: 'Number of Children', type: 'number', required: true }] },
  cookInquirySchema: { id: 'cookInquirySchema', fields: [...baseFields, { id: 'cuisine_type', label: 'Cuisine Type', type: 'text', required: true }] },
  gardenerInquirySchema: { id: 'gardenerInquirySchema', fields: [...baseFields, { id: 'garden_size', label: 'Garden Size', type: 'select', options: ['Small', 'Medium', 'Large'], required: true }] },
  houseHelpInquirySchema: { id: 'houseHelpInquirySchema', fields: [...baseFields, { id: 'duties', label: 'Duties', type: 'multiselect', options: ['Cleaning', 'Cooking', 'Laundry', 'Childcare'], required: true }] },
  laundryInquirySchema: { id: 'laundryInquirySchema', fields: [...baseFields, { id: 'service_type', label: 'Service Type', type: 'select', options: ['Wash & Fold', 'Ironing', 'Dry Cleaning'], required: true }] },

  // INDUSTRIAL
  machineOperatorInquirySchema: { id: 'machineOperatorInquirySchema', fields: [...baseFields, { id: 'machine_type', label: 'Machine Type', type: 'text', required: true }] },
  warehouseWorkerInquirySchema: { id: 'warehouseWorkerInquirySchema', fields: [...baseFields, { id: 'shift_type', label: 'Shift Type', type: 'select', options: ['Day', 'Night', 'Rotating'], required: true }] },
  factoryHandInquirySchema: { id: 'factoryHandInquirySchema', fields: [...baseFields, { id: 'factory_type', label: 'Factory Type', type: 'text', required: true }] },
  forkliftOperatorInquirySchema: { id: 'forkliftOperatorInquirySchema', fields: [...baseFields, { id: 'license_type', label: 'License Type', type: 'text', required: true }] },
  safetyOfficerInquirySchema: { id: 'safetyOfficerInquirySchema', fields: [...baseFields, { id: 'industry', label: 'Industry', type: 'text', required: true }] },

  // SKILLED TRADES
  hvacTechnicianInquirySchema: { id: 'hvacTechnicianInquirySchema', fields: [...baseFields, { id: 'hvac_type', label: 'HVAC Type', type: 'select', options: ['Installation', 'Repair', 'Maintenance'], required: true }] },
  autoMechanicInquirySchema: { id: 'autoMechanicInquirySchema', fields: [...baseFields, { id: 'vehicle_type', label: 'Vehicle Type', type: 'text', required: true }] },
  sprayPainterInquirySchema: { id: 'sprayPainterInquirySchema', fields: [...baseFields, { id: 'surface_type', label: 'Surface Type', type: 'text', required: true }] },
  glazierInquirySchema: { id: 'glazierInquirySchema', fields: [...baseFields, { id: 'glass_type', label: 'Glass Type', type: 'text', required: true }] },
  securityGuardInquirySchema: { id: 'securityGuardInquirySchema', fields: [...baseFields, { id: 'shift_type', label: 'Shift Type', type: 'select', options: ['Day', 'Night', '24/7'], required: true }] },

  // AGRICULTURAL
  farmWorkerInquirySchema: { id: 'farmWorkerInquirySchema', fields: [...baseFields, { id: 'task_type', label: 'Task Type', type: 'text', required: true }] },
  irrigationTechnicianInquirySchema: { id: 'irrigationTechnicianInquirySchema', fields: [...baseFields, { id: 'system_type', label: 'System Type', type: 'text', required: true }] },
  cropHarvestingInquirySchema: { id: 'cropHarvestingInquirySchema', fields: [...baseFields, { id: 'crop_type', label: 'Crop Type', type: 'text', required: true }] },
  livestockHandlerInquirySchema: { id: 'livestockHandlerInquirySchema', fields: [...baseFields, { id: 'livestock_type', label: 'Livestock Type', type: 'text', required: true }] },
  equipmentOperatorAgriInquirySchema: { id: 'equipmentOperatorAgriInquirySchema', fields: [...baseFields, { id: 'equipment_type', label: 'Equipment Type', type: 'text', required: true }] },

  // TRANSPORT
  driverLightInquirySchema: { id: 'driverLightInquirySchema', fields: [...baseFields, { id: 'vehicle_provided', label: 'Vehicle Provided', type: 'toggle', required: true }, { id: 'license_class_required', label: 'License Class Required', type: 'select', options: ['B', 'C', 'C1'], required: true }, { id: 'trip_type', label: 'Trip Type', type: 'select', options: ['One-Way', 'Return', 'Full Day', 'Part Day'], required: true }, { id: 'load_type', label: 'Load Type', type: 'select', options: ['Passengers', 'Goods', 'Mixed'], required: true }] },
  driverHeavyInquirySchema: { id: 'driverHeavyInquirySchema', fields: [...baseFields, { id: 'vehicle_type', label: 'Vehicle Type', type: 'text', required: true }] },
  loaderInquirySchema: { id: 'loaderInquirySchema', fields: [...baseFields, { id: 'load_type', label: 'Load Type', type: 'text', required: true }] },
  deliveryRiderInquirySchema: { id: 'deliveryRiderInquirySchema', fields: [...baseFields, { id: 'delivery_type', label: 'Delivery Type', type: 'text', required: true }] },
};
