import { LabourInquiryField } from './labourInquirySchemas';

export interface LabourProfileSchema {
  id: string;
  sections: {
    id: string;
    title: string;
    fields: LabourInquiryField[];
  }[];
}

const baseSections = (specificSections: any[] = []) => [
  {
    id: 'personal_details',
    title: 'Personal Details',
    fields: [
      { id: 'full_name', label: 'Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'text', required: true },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'profile_photo', label: 'Profile Photo', type: 'image_upload', required: false }, // Simplified for example
    ],
  },
  {
    id: 'availability',
    title: 'Availability',
    fields: [
      { id: 'availability_status', label: 'Availability Status', type: 'select', options: ['Available Now', 'Available from Date', 'Not Available'], required: true },
      { id: 'available_from', label: 'Available From', type: 'date', required: false },
      { id: 'days_available', label: 'Days Available', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
      { id: 'hours_per_day', label: 'Hours per Day', type: 'select', options: ['4hrs', '8hrs', '12hrs', 'Full Day'], required: true },
      { id: 'willing_to_relocate', label: 'Willing to Relocate', type: 'toggle', required: true },
    ],
  },
  ...specificSections,
];

export const labourProfileSchemas: Record<string, LabourProfileSchema> = {
  genericLabourProfileSchema: { id: 'genericLabourProfileSchema', sections: baseSections() },

  // CONSTRUCTION
  generalLabourerProfileSchema: { id: 'generalLabourerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  bricklayerProfileSchema: { id: 'bricklayerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  carpenterProfileSchema: { id: 'carpenterProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  electricianProfileSchema: { id: 'electricianProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills & Certifications', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }, { id: 'specializations', label: 'Specializations', type: 'multiselect', options: ['Residential Wiring', 'Commercial', 'Industrial', 'Solar', 'CCTV'], required: true }, { id: 'has_erb_license', label: 'Has ERB License', type: 'toggle', required: true }, { id: 'license_number', label: 'License Number', type: 'text', required: false }] }]) },
  plumberProfileSchema: { id: 'plumberProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  welderProfileSchema: { id: 'welderProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  steelFixerProfileSchema: { id: 'steelFixerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  painterProfileSchema: { id: 'painterProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  tilerProfileSchema: { id: 'tilerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  rooferProfileSchema: { id: 'rooferProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },

  // DOMESTIC
  houseCleanerProfileSchema: { id: 'houseCleanerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  nannyProfileSchema: { id: 'nannyProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  cookProfileSchema: { id: 'cookProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  gardenerProfileSchema: { id: 'gardenerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  houseHelpProfileSchema: { id: 'houseHelpProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  laundryProfileSchema: { id: 'laundryProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },

  // INDUSTRIAL
  machineOperatorProfileSchema: { id: 'machineOperatorProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  warehouseWorkerProfileSchema: { id: 'warehouseWorkerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  factoryHandProfileSchema: { id: 'factoryHandProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  forkliftOperatorProfileSchema: { id: 'forkliftOperatorProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  safetyOfficerProfileSchema: { id: 'safetyOfficerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },

  // SKILLED TRADES
  hvacTechnicianProfileSchema: { id: 'hvacTechnicianProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  autoMechanicProfileSchema: { id: 'autoMechanicProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  sprayPainterProfileSchema: { id: 'sprayPainterProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  glazierProfileSchema: { id: 'glazierProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  securityGuardProfileSchema: { id: 'securityGuardProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },

  // AGRICULTURAL
  farmWorkerProfileSchema: { id: 'farmWorkerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  irrigationTechnicianProfileSchema: { id: 'irrigationTechnicianProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  cropHarvestingProfileSchema: { id: 'cropHarvestingProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  livestockHandlerProfileSchema: { id: 'livestockHandlerProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  equipmentOperatorAgriProfileSchema: { id: 'equipmentOperatorAgriProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },

  // TRANSPORT
  driverLightProfileSchema: { id: 'driverLightProfileSchema', sections: baseSections([{ id: 'driving_details', title: 'Driving Details', fields: [{ id: 'license_class', label: 'License Class', type: 'multiselect', options: ['B', 'C', 'C1'], required: true }, { id: 'years_driving', label: 'Years Driving', type: 'number', required: true }, { id: 'own_vehicle', label: 'Own Vehicle', type: 'toggle', required: true }, { id: 'vehicle_type', label: 'Vehicle Type', type: 'text', required: false }, { id: 'defensive_driving_cert', label: 'Defensive Driving Cert', type: 'toggle', required: true }] }]) },
  driverHeavyProfileSchema: { id: 'driverHeavyProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  loaderProfileSchema: { id: 'loaderProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
  deliveryRiderProfileSchema: { id: 'deliveryRiderProfileSchema', sections: baseSections([{ id: 'skills', title: 'Skills', fields: [{ id: 'experience_years', label: 'Experience Years', type: 'number', required: true }] }]) },
};

function validateAllSchemas() {
  Object.entries(labourProfileSchemas).forEach(([schemaKey, schema]) => {
    schema.sections?.forEach((section, sIdx) => {
      section.fields?.forEach((field, fIdx) => {
        if (!field || !field.type || !field.id || !field.label) {
          console.error(`BROKEN FIELD in ${schemaKey} > section[${sIdx}] > field[${fIdx}]:`, JSON.stringify(field));
        }
      });
    });
  });
}
validateAllSchemas();
