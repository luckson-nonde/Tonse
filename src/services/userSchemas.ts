import { FieldSchema } from './categories';

export type SectionType = 'fields' | 'security' | 'notifications' | 'identity';

export interface ProfileSection {
  title: string;
  sectionHeader?: string;
  type: SectionType;
  fields?: FieldSchema[];
  description?: string;
}

export interface ProfileSchema {
  sections: ProfileSection[];
}

export const INDIVIDUAL_BUYER_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Identity',
      type: 'identity',
      description: 'Your public profile and membership status',
    },
    {
      title: 'Personal Information',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Profile Picture (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification and identity confirmation',
        },
        {
          name: 'nrc',
          label: 'NRC Number',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'text',
          required: true,
          placeholder: 'your@email.com',
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: false },
      ],
    },
    {
      title: 'Location Details',
      type: 'fields',
      fields: [
        { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Zambia' },
        {
          name: 'province',
          label: 'Province',
          type: 'select',
          required: true,
          options: [
            'Lusaka',
            'Copperbelt',
            'Central',
            'Southern',
            'North-Western',
            'Eastern',
            'Western',
            'Muchinga',
            'Luapula',
            'Northern',
          ],
        },
        { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Enter city' },
        {
          name: 'area',
          label: 'Area / Neighborhood',
          type: 'text',
          required: false,
          placeholder: 'e.g. Rhodes Park',
        },
      ],
    },
    {
      title: 'Security',
      type: 'security',
      description: 'Manage your password and account protection',
    },
    {
      title: 'Notifications',
      type: 'notifications',
      description: 'Control how you receive updates and alerts',
    },
  ],
};

export const COMPANY_BUYER_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Business Identity',
      type: 'identity',
      description: 'Your corporate profile and verification status',
    },
    {
      title: 'Company Information',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Profile Picture / Logo (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification',
        },
        {
          name: 'companyName',
          label: 'Company Name',
          type: 'text',
          required: true,
          placeholder: 'Enter legal company name',
        },
        {
          name: 'tpin',
          label: 'TPIN Number',
          type: 'text',
          required: true,
          placeholder: '10-digit TPIN',
        },
        {
          name: 'nrc',
          label: 'NRC Number (Contact Person)',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
        {
          name: 'name',
          label: 'Contact Person',
          type: 'text',
          required: true,
          placeholder: 'Enter contact person name',
        },
        {
          name: 'email',
          label: 'Business Email',
          type: 'text',
          required: true,
          placeholder: 'business@email.com',
        },
        {
          name: 'phone',
          label: 'Business Phone',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
      ],
    },
    {
      title: 'Documents',
      type: 'fields',
      fields: [
        {
          name: 'incorporationCertUrl',
          label: 'PACRA Certificate',
          type: 'image_upload',
          required: true,
          helpText: 'Upload your Certificate of Incorporation',
        },
      ],
    },
    {
      title: 'Location Details',
      type: 'fields',
      fields: [
        { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Zambia' },
        {
          name: 'province',
          label: 'Province',
          type: 'select',
          required: true,
          options: [
            'Lusaka',
            'Copperbelt',
            'Central',
            'Southern',
            'North-Western',
            'Eastern',
            'Western',
            'Muchinga',
            'Luapula',
            'Northern',
          ],
        },
        { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Enter city' },
        {
          name: 'area',
          label: 'Area / Neighborhood',
          type: 'text',
          required: false,
          placeholder: 'e.g. Rhodes Park',
        },
      ],
    },
    {
      title: 'Security',
      type: 'security',
      description: 'Manage your corporate account security',
    },
    {
      title: 'Notifications',
      type: 'notifications',
      description: 'Control business alerts and inquiry updates',
    },
  ],
};

export const SELLER_SUPPLIER_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Identity Verification',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Profile Picture (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification and identity confirmation',
        },
        {
          name: 'nrc',
          label: 'NRC Number',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
      ],
    },
    {
      title: 'Personal Information',
      type: 'fields',
      fields: [
        {
          name: 'ownerName',
          label: 'Owner Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
        },
        {
          name: 'dob',
          label: 'Date of Birth',
          type: 'date',
          required: false,
          helpText: 'Optional - for complete profile information',
        },
      ],
    },
    {
      title: 'Shop Information',
      type: 'fields',
      fields: [
        { name: 'coverImage', label: 'Cover Image', type: 'image_upload', required: false },
        {
          name: 'name',
          label: 'Shop Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your shop name',
        },
        {
          name: 'email',
          label: 'Business Email',
          type: 'text',
          required: true,
          placeholder: 'business@email.com',
        },
        {
          name: 'phone',
          label: 'Business Phone',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
        {
          name: 'location',
          label: 'Physical Address',
          type: 'text',
          required: true,
          placeholder: 'e.g. Plot 123, Cairo Road',
        },
        { name: 'gps', label: 'GPS Pinpointing', type: 'gps', required: false },
      ],
    },
    {
      title: 'Location Details',
      type: 'fields',
      fields: [
        { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Zambia' },
        {
          name: 'province',
          label: 'Province',
          type: 'select',
          required: true,
          options: [
            'Lusaka',
            'Copperbelt',
            'Central',
            'Southern',
            'North-Western',
            'Eastern',
            'Western',
            'Muchinga',
            'Luapula',
            'Northern',
          ],
        },
        { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Enter city' },
        {
          name: 'area',
          label: 'Area / Neighborhood',
          type: 'text',
          required: false,
          placeholder: 'e.g. Rhodes Park',
        },
      ],
    },
    {
      title: 'Store Photos',
      type: 'fields',
      fields: [
        {
          name: 'storePhotoFront',
          label: 'Store Front Photo',
          type: 'image_upload',
          required: false,
        },
        {
          name: 'storePhotoInterior',
          label: 'Store Interior Photo',
          type: 'image_upload',
          required: false,
        },
      ],
    },
    {
      title: 'Social Media & Contact',
      type: 'fields',
      fields: [
        {
          name: 'facebookLink',
          label: 'Facebook Page',
          type: 'text',
          required: false,
          placeholder: 'https://facebook.com/...',
        },
        {
          name: 'tiktokLink',
          label: 'TikTok Profile',
          type: 'text',
          required: false,
          placeholder: 'https://tiktok.com/@...',
        },
        {
          name: 'whatsappLink',
          label: 'WhatsApp Number/Link',
          type: 'text',
          required: false,
          placeholder: 'https://wa.me/...',
        },
      ],
    },
    {
      title: 'Business Documents',
      type: 'fields',
      fields: [
        {
          name: 'tpin',
          label: 'TPIN Number',
          type: 'text',
          required: true,
          placeholder: '10-digit TPIN',
        },
        {
          name: 'incorporationCertUrl',
          label: 'PACRA Certificate',
          type: 'image_upload',
          required: true,
          helpText: 'Upload your Certificate of Incorporation',
        },
      ],
    },
  ],
};

export const SERVICE_PROVIDER_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Identity Verification',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Profile Photo (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification and identity confirmation',
        },
        {
          name: 'nrc',
          label: 'NRC Number',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
      ],
    },
    {
      title: 'Personal Information',
      type: 'fields',
      fields: [
        {
          name: 'dob',
          label: 'Date of Birth',
          type: 'date',
          required: false,
          helpText: 'Optional - for complete profile information',
        },
      ],
    },
    {
      title: 'Professional Profile',
      type: 'fields',
      fields: [
        {
          name: 'name',
          label: 'Business/Professional Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your professional name',
        },
        {
          name: 'email',
          label: 'Contact Email',
          type: 'text',
          required: true,
          placeholder: 'contact@email.com',
        },
        {
          name: 'phone',
          label: 'Contact Phone',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
        {
          name: 'location',
          label: 'Service Area / Base',
          type: 'text',
          required: true,
          placeholder: 'e.g. Lusaka & Copperbelt',
        },
        { name: 'gps', label: 'GPS Location', type: 'gps', required: false },
      ],
    },
    {
      title: 'Location Details',
      type: 'fields',
      fields: [
        { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Zambia' },
        {
          name: 'province',
          label: 'Province',
          type: 'select',
          required: true,
          options: [
            'Lusaka',
            'Copperbelt',
            'Central',
            'Southern',
            'North-Western',
            'Eastern',
            'Western',
            'Muchinga',
            'Luapula',
            'Northern',
          ],
        },
        { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Enter city' },
        {
          name: 'area',
          label: 'Area / Neighborhood',
          type: 'text',
          required: false,
          placeholder: 'e.g. Rhodes Park',
        },
      ],
    },
    {
      title: 'Social & Portfolio',
      type: 'fields',
      fields: [
        {
          name: 'facebookLink',
          label: 'Facebook/Portfolio',
          type: 'text',
          required: false,
          placeholder: 'https://facebook.com/...',
        },
        {
          name: 'whatsappLink',
          label: 'WhatsApp Contact',
          type: 'text',
          required: false,
          placeholder: 'https://wa.me/...',
        },
      ],
    },
    {
      title: 'Credentials',
      type: 'fields',
      fields: [
        {
          name: 'tpin',
          label: 'TPIN Number',
          type: 'text',
          required: true,
          placeholder: '10-digit TPIN',
        },
        {
          name: 'incorporationCertUrl',
          label: 'Business Registration',
          type: 'image_upload',
          required: false,
          helpText: 'Upload your registration or license',
        },
      ],
    },
  ],
};

export const ENTERTAINMENT_EVENTS_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Identity Verification',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Brand Logo / Photo (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification',
        },
        {
          name: 'nrc',
          label: 'NRC Number',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
      ],
    },
    {
      title: 'Personal Information',
      type: 'fields',
      fields: [
        {
          name: 'ownerName',
          label: 'Owner Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
        },
        {
          name: 'dob',
          label: 'Date of Birth',
          type: 'date',
          required: false,
          helpText: 'Optional - for complete profile information',
        },
      ],
    },
    {
      title: 'Brand Information',
      type: 'fields',
      fields: [
        {
          name: 'coverImage',
          label: 'Cover Image / Banner',
          type: 'image_upload',
          required: false,
        },
        {
          name: 'name',
          label: 'Stage/Brand Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your brand name',
        },
        {
          name: 'email',
          label: 'Booking Email',
          type: 'text',
          required: true,
          placeholder: 'bookings@email.com',
        },
        {
          name: 'phone',
          label: 'Booking Phone',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
      ],
    },
    {
      title: 'Location Details',
      type: 'fields',
      fields: [
        { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Zambia' },
        {
          name: 'province',
          label: 'Province',
          type: 'select',
          required: true,
          options: [
            'Lusaka',
            'Copperbelt',
            'Central',
            'Southern',
            'North-Western',
            'Eastern',
            'Western',
            'Muchinga',
            'Luapula',
            'Northern',
          ],
        },
        { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Enter city' },
        {
          name: 'area',
          label: 'Area / Neighborhood',
          type: 'text',
          required: false,
          placeholder: 'e.g. Rhodes Park',
        },
      ],
    },
    {
      title: 'Social Presence',
      type: 'fields',
      fields: [
        {
          name: 'facebookLink',
          label: 'Facebook Page',
          type: 'text',
          required: false,
          placeholder: 'https://facebook.com/...',
        },
        {
          name: 'tiktokLink',
          label: 'TikTok Profile',
          type: 'text',
          required: false,
          placeholder: 'https://tiktok.com/@...',
        },
        {
          name: 'whatsappLink',
          label: 'WhatsApp Booking',
          type: 'text',
          required: false,
          placeholder: 'https://wa.me/...',
        },
      ],
    },
  ],
};

export const STAFF_SCHEMA: ProfileSchema = {
  sections: [
    {
      title: 'Identity Verification',
      type: 'fields',
      fields: [
        {
          name: 'logo',
          label: 'Profile Photo (Front Camera)',
          type: 'image_upload',
          required: true,
          helpText: 'Required for account verification',
        },
        {
          name: 'nrc',
          label: 'NRC Number',
          type: 'text',
          required: true,
          placeholder: '000000/00/0',
          helpText: 'Required for account linking and UUID attachment',
        },
      ],
    },
    {
      title: 'Personal Details',
      type: 'fields',
      fields: [
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
        },
        {
          name: 'email',
          label: 'Work Email',
          type: 'text',
          required: true,
          placeholder: 'work@email.com',
        },
        {
          name: 'phone',
          label: 'Contact Phone',
          type: 'text',
          required: true,
          placeholder: '+260...',
        },
        {
          name: 'dob',
          label: 'Date of Birth',
          type: 'date',
          required: false,
          helpText: 'Optional - for complete profile information',
        },
      ],
    },
  ],
};

export const COMPANY_SUB_ROLES: Record<string, any> = {
  COMPANY_PROCUREMENT_OFFICER: {
    title: 'Procurement Officer',
    description: 'Manage purchasing and supplier relationships.',
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        name: 'email',
        label: 'Work Email',
        type: 'text',
        required: true,
        placeholder: 'work@email.com',
      },
      { name: 'phone', label: 'Work Phone', type: 'text', required: true, placeholder: '+260...' },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        required: true,
        placeholder: 'e.g. Purchasing',
      },
    ],
  },
  COMPANY_SECRETARY: {
    title: 'Secretary',
    description: 'Handle administrative tasks and communications.',
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        name: 'email',
        label: 'Work Email',
        type: 'text',
        required: true,
        placeholder: 'work@email.com',
      },
      { name: 'phone', label: 'Work Phone', type: 'text', required: true, placeholder: '+260...' },
    ],
  },
  COMPANY_RECEPTIONIST: {
    title: 'Receptionist',
    description: 'Manage front desk and initial inquiries.',
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        name: 'email',
        label: 'Work Email',
        type: 'text',
        required: true,
        placeholder: 'work@email.com',
      },
      { name: 'phone', label: 'Work Phone', type: 'text', required: true, placeholder: '+260...' },
      {
        name: 'branch',
        label: 'Branch/Location',
        type: 'text',
        required: false,
        placeholder: 'e.g. Main Office',
      },
    ],
  },
  COMPANY_MANAGER: {
    title: 'Manager/Owner',
    description: 'Full access to company account and settings.',
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        name: 'email',
        label: 'Work Email',
        type: 'text',
        required: true,
        placeholder: 'work@email.com',
      },
      { name: 'phone', label: 'Work Phone', type: 'text', required: true, placeholder: '+260...' },
      {
        name: 'title',
        label: 'Job Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. CEO, General Manager',
      },
    ],
  },
};

export function getRegistrationSchema(role: string, subRole?: string): ProfileSchema {
  const sections: ProfileSection[] = [];

  // Identity Verification section - REQUIRED for ALL users
  const identityVerificationSection = {
    title: 'Identity Verification',
    type: 'fields' as SectionType,
    description: 'Required to link your account to your unique UUID and prevent duplicate accounts',
    fields: [
      {
        name: 'logo',
        label: 'Profile Picture (Front Camera)',
        type: 'image_upload' as const,
        required: true,
        helpText:
          'Take a photo of yourself using your front camera for account verification and identity confirmation',
      } as FieldSchema,
      {
        name: 'nrc',
        label: 'NRC Number',
        type: 'text' as const,
        required: true,
        placeholder: '000000/00/0',
        helpText:
          'National Registration Certificate number - required for account linking and UUID attachment to prevent multiple accounts',
      } as FieldSchema,
    ],
  } as ProfileSection;

  if (subRole && COMPANY_SUB_ROLES[subRole]) {
    sections.push({
      title: 'Business Details',
      type: 'fields' as SectionType,
      fields: COMPANY_SUB_ROLES[subRole].fields as FieldSchema[],
    });
    // Add identity verification for company sub-roles
    sections.push(identityVerificationSection as ProfileSection);
  } else if (subRole === 'COMPANY_BUYER') {
    sections.push({
      title: 'Business Details',
      type: 'fields' as SectionType,
      fields: [
        {
          name: 'name',
          label: 'Contact Person',
          type: 'text' as const,
          required: true,
          placeholder: 'Full name of representative',
        },
        {
          name: 'email',
          label: 'Business Email',
          type: 'text' as const,
          required: true,
          placeholder: 'business@email.com',
        },
        {
          name: 'phone',
          label: 'Business Phone',
          type: 'text' as const,
          required: true,
          placeholder: '+260...',
        },
      ],
    });
    // Add identity verification for company buyers
    sections.push(identityVerificationSection as ProfileSection);
  } else {
    sections.push({
      title: 'Account Details',
      type: 'fields' as SectionType,
      fields: [
        {
          name: 'name',
          label: 'Full Name',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter your full name',
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'text' as const,
          required: true,
          placeholder: 'name@example.com',
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text' as const,
          required: true,
          placeholder: '+260...',
        },
      ],
    });

    // Add identity verification for all individual users
    sections.push(identityVerificationSection as ProfileSection);
  }

  return { sections };
}

export function getProfileSchema(role?: string, subRole?: string): ProfileSchema {
  // Phase 2: role enum tightened to BUYER / SELLER / SERVICE_PROVIDER /
  // ADMIN. EVENTS / ENTERTAINMENT / SUPPLIER / LABOUR / PROVIDER_STAFF are
  // no longer roles; events/entertainment sellers fall under SELLER and
  // their categories carry the specialty.
  if (role === 'SELLER') return SELLER_SUPPLIER_SCHEMA;
  if (role === 'SERVICE_PROVIDER') return SERVICE_PROVIDER_SCHEMA;

  // Fallback to subRole for buyers
  if (subRole?.startsWith('COMPANY_')) {
    return COMPANY_BUYER_SCHEMA;
  }

  return INDIVIDUAL_BUYER_SCHEMA;
}
