export interface LabourSubCategory {
  id: string;
  label: string;
  category: LabourCategoryGroup;
  inquirySchemaKey: string;
  profileSchemaKey: string;
  icon: string;
  description: string;
}

export type LabourCategoryGroup =
  | 'CONSTRUCTION'
  | 'DOMESTIC'
  | 'INDUSTRIAL'
  | 'AGRICULTURAL'
  | 'TRANSPORT'
  // Not a labour track — the equipment-hire provider type reuses this taxonomy
  // (LabourSubCategory shape + trade-picker rendering) but is entered from its
  // own tier-2 card, never from the "Choose a track" grid.
  | 'MACHINERY_HIRE';

export const LABOUR_CATEGORIES: LabourSubCategory[] = [
  // CONSTRUCTION & BUILDING
  { id: 'general_labourer', label: 'General Labourer', category: 'CONSTRUCTION', inquirySchemaKey: 'generalLabourerInquirySchema', profileSchemaKey: 'generalLabourerProfileSchema', icon: 'HardHat', description: 'General construction site labour' },
  { id: 'bricklayer', label: 'Bricklayer / Mason', category: 'CONSTRUCTION', inquirySchemaKey: 'bricklayerInquirySchema', profileSchemaKey: 'bricklayerProfileSchema', icon: 'Building', description: 'Bricklaying and masonry work' },
  { id: 'carpenter', label: 'Carpenter', category: 'CONSTRUCTION', inquirySchemaKey: 'carpenterInquirySchema', profileSchemaKey: 'carpenterProfileSchema', icon: 'Hammer', description: 'Carpentry and woodwork' },
  { id: 'electrician', label: 'Electrician', category: 'CONSTRUCTION', inquirySchemaKey: 'electricianInquirySchema', profileSchemaKey: 'electricianProfileSchema', icon: 'Zap', description: 'Electrical installation and repairs' },
  { id: 'plumber', label: 'Plumber', category: 'CONSTRUCTION', inquirySchemaKey: 'plumberInquirySchema', profileSchemaKey: 'plumberProfileSchema', icon: 'Droplets', description: 'Plumbing installation and repairs' },
  { id: 'welder', label: 'Welder', category: 'CONSTRUCTION', inquirySchemaKey: 'welderInquirySchema', profileSchemaKey: 'welderProfileSchema', icon: 'Flame', description: 'Welding and metal fabrication' },
  { id: 'steel_fixer', label: 'Steel Fixer / Reinforcement', category: 'CONSTRUCTION', inquirySchemaKey: 'steelFixerInquirySchema', profileSchemaKey: 'steelFixerProfileSchema', icon: 'Layers', description: 'Steel fixing and reinforcement' },
  { id: 'painter', label: 'Painter & Decorator', category: 'CONSTRUCTION', inquirySchemaKey: 'painterInquirySchema', profileSchemaKey: 'painterProfileSchema', icon: 'PaintBucket', description: 'Painting and decorating' },
  { id: 'tiler', label: 'Tiler', category: 'CONSTRUCTION', inquirySchemaKey: 'tilerInquirySchema', profileSchemaKey: 'tilerProfileSchema', icon: 'Grid', description: 'Floor and wall tiling' },
  { id: 'roofer', label: 'Roofer', category: 'CONSTRUCTION', inquirySchemaKey: 'rooferInquirySchema', profileSchemaKey: 'rooferProfileSchema', icon: 'Home', description: 'Roofing installation and repairs' },

  // DOMESTIC & HOUSEHOLD
  { id: 'house_cleaner', label: 'House Cleaner', category: 'DOMESTIC', inquirySchemaKey: 'houseCleanerInquirySchema', profileSchemaKey: 'houseCleanerProfileSchema', icon: 'Sparkles', description: 'Domestic cleaning services' },
  { id: 'nanny', label: 'Nanny / Childcare', category: 'DOMESTIC', inquirySchemaKey: 'nannyInquirySchema', profileSchemaKey: 'nannyProfileSchema', icon: 'Baby', description: 'Childcare and nanny services' },
  { id: 'cook', label: 'Cook / Domestic Chef', category: 'DOMESTIC', inquirySchemaKey: 'cookInquirySchema', profileSchemaKey: 'cookProfileSchema', icon: 'ChefHat', description: 'Domestic cooking services' },
  { id: 'gardener', label: 'Gardener / Landscaper', category: 'DOMESTIC', inquirySchemaKey: 'gardenerInquirySchema', profileSchemaKey: 'gardenerProfileSchema', icon: 'Leaf', description: 'Garden maintenance and landscaping' },
  { id: 'house_help', label: 'House Help / General Domestic', category: 'DOMESTIC', inquirySchemaKey: 'houseHelpInquirySchema', profileSchemaKey: 'houseHelpProfileSchema', icon: 'Home', description: 'General domestic assistance' },
  { id: 'laundry', label: 'Laundry & Ironing', category: 'DOMESTIC', inquirySchemaKey: 'laundryInquirySchema', profileSchemaKey: 'laundryProfileSchema', icon: 'Wind', description: 'Laundry and ironing services' },

  // INDUSTRIAL & FACTORY
  { id: 'machine_operator', label: 'Machine Operator', category: 'INDUSTRIAL', inquirySchemaKey: 'machineOperatorInquirySchema', profileSchemaKey: 'machineOperatorProfileSchema', icon: 'Settings', description: 'Industrial machine operation' },
  { id: 'warehouse_worker', label: 'Warehouse Worker', category: 'INDUSTRIAL', inquirySchemaKey: 'warehouseWorkerInquirySchema', profileSchemaKey: 'warehouseWorkerProfileSchema', icon: 'Package', description: 'Warehouse operations and logistics' },
  { id: 'factory_hand', label: 'Factory Hand / General Industrial', category: 'INDUSTRIAL', inquirySchemaKey: 'factoryHandInquirySchema', profileSchemaKey: 'factoryHandProfileSchema', icon: 'Factory', description: 'General factory and industrial labour' },
  { id: 'forklift_operator', label: 'Forklift Operator', category: 'INDUSTRIAL', inquirySchemaKey: 'forkliftOperatorInquirySchema', profileSchemaKey: 'forkliftOperatorProfileSchema', icon: 'Truck', description: 'Forklift and material handling' },
  { id: 'safety_officer', label: 'Safety Officer', category: 'INDUSTRIAL', inquirySchemaKey: 'safetyOfficerInquirySchema', profileSchemaKey: 'safetyOfficerProfileSchema', icon: 'ShieldCheck', description: 'Workplace health and safety' },

  // HEAVY MACHINERY FOR HIRE (equipment rental — its OWN provider type, entered
  // from a tier-2 card, not a labour track). Schema keys are the shared generic
  // ones (getLabourInquirySchema/getLabourProfileSchema fall back to the generic
  // labour schema) until dedicated machinery-hire schemas are authored.
  { id: 'excavator', label: 'Excavator', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Digging, trenching and bulk earthworks' },
  { id: 'bulldozer', label: 'Bulldozer', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Land clearing, dozing and site prep' },
  { id: 'wheel_loader', label: 'Wheel Loader', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Loading and moving loose material' },
  { id: 'backhoe_loader', label: 'Backhoe Loader (TLB)', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Combined digging and loading' },
  { id: 'motor_grader', label: 'Motor Grader', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Road grading and levelling' },
  { id: 'roller_compactor', label: 'Roller / Compactor', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'HardHat', description: 'Soil and asphalt compaction' },
  { id: 'mobile_crane', label: 'Mobile Crane', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Factory', description: 'Lifting and hoisting heavy loads' },
  { id: 'forklift', label: 'Forklift', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Factory', description: 'Yard and warehouse material handling' },
  { id: 'tipper_truck', label: 'Tipper Truck', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Truck', description: 'Hauling sand, gravel and rubble' },
  { id: 'concrete_mixer', label: 'Concrete Mixer Truck', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Truck', description: 'On-site concrete mixing and delivery' },
  { id: 'water_bowser', label: 'Water Bowser', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Truck', description: 'Water supply and dust suppression' },
  { id: 'generator', label: 'Diesel Generator', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Factory', description: 'Temporary standby power supply' },
  { id: 'tractor', label: 'Tractor', category: 'MACHINERY_HIRE', inquirySchemaKey: 'machineryHireInquirySchema', profileSchemaKey: 'machineryHireProfileSchema', icon: 'Tractor', description: 'Towing, ploughing and haulage' },

  // AGRICULTURAL
  { id: 'farm_worker', label: 'Farm Worker / General', category: 'AGRICULTURAL', inquirySchemaKey: 'farmWorkerInquirySchema', profileSchemaKey: 'farmWorkerProfileSchema', icon: 'Sprout', description: 'General farm labour' },
  { id: 'irrigation_technician', label: 'Irrigation Technician', category: 'AGRICULTURAL', inquirySchemaKey: 'irrigationTechnicianInquirySchema', profileSchemaKey: 'irrigationTechnicianProfileSchema', icon: 'Droplets', description: 'Irrigation system installation and maintenance' },
  { id: 'crop_harvesting', label: 'Crop Harvesting', category: 'AGRICULTURAL', inquirySchemaKey: 'cropHarvestingInquirySchema', profileSchemaKey: 'cropHarvestingProfileSchema', icon: 'Wheat', description: 'Seasonal crop harvesting' },
  { id: 'livestock_handler', label: 'Livestock Handler', category: 'AGRICULTURAL', inquirySchemaKey: 'livestockHandlerInquirySchema', profileSchemaKey: 'livestockHandlerProfileSchema', icon: 'Bird', description: 'Livestock care and handling' },
  { id: 'equipment_operator_agri', label: 'Equipment Operator', category: 'AGRICULTURAL', inquirySchemaKey: 'equipmentOperatorAgriInquirySchema', profileSchemaKey: 'equipmentOperatorAgriProfileSchema', icon: 'Tractor', description: 'Agricultural equipment operation' },

  // TRANSPORT & LOGISTICS
  { id: 'driver_light', label: 'Driver (Light Vehicle)', category: 'TRANSPORT', inquirySchemaKey: 'driverLightInquirySchema', profileSchemaKey: 'driverLightProfileSchema', icon: 'Car', description: 'Light vehicle driving services' },
  { id: 'driver_heavy', label: 'Driver (Heavy Vehicle / HGV)', category: 'TRANSPORT', inquirySchemaKey: 'driverHeavyInquirySchema', profileSchemaKey: 'driverHeavyProfileSchema', icon: 'Truck', description: 'Heavy goods vehicle driving' },
  { id: 'loader', label: 'Loader / Offloader', category: 'TRANSPORT', inquirySchemaKey: 'loaderInquirySchema', profileSchemaKey: 'loaderProfileSchema', icon: 'PackageOpen', description: 'Loading and offloading services' },
  { id: 'delivery_rider', label: 'Delivery Rider', category: 'TRANSPORT', inquirySchemaKey: 'deliveryRiderInquirySchema', profileSchemaKey: 'deliveryRiderProfileSchema', icon: 'Bike', description: 'Motorcycle delivery services' },
];

export const LABOUR_CATEGORY_GROUPS = [
  { id: 'CONSTRUCTION', label: 'Construction & Building', icon: 'HardHat' },
  { id: 'DOMESTIC', label: 'Domestic & Household', icon: 'Home' },
  { id: 'INDUSTRIAL', label: 'Industrial & Factory', icon: 'Factory' },
  { id: 'AGRICULTURAL', label: 'Agricultural', icon: 'Sprout' },
  { id: 'TRANSPORT', label: 'Transport & Logistics', icon: 'Truck' },
];

// Heavy Machinery for Hire is NOT a labour track (absent from the grid above);
// it's the sole "group" of the equipment-hire provider type. CategorySelection
// drills straight into its item list (autoMachinery) instead of the track
// picker, reusing the trade-picker rendering. Shape matches a track entry so it
// slots into the same `activeLabourGroup` state and Screen-B render.
export const MACHINERY_GROUP = {
  id: 'MACHINERY_HIRE' as const,
  label: 'Heavy Machinery for Hire',
  icon: 'Truck',
};
