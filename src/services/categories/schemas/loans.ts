import type { FieldSchema } from '../types';

/**
 * Loan-request forms. One FieldSchema[] per loan TYPE (subcategory):
 *   loan-collateral · loan-salary · loan-government
 *
 * The borrower fills the form when requesting a loan; a Loan Officer reads
 * these answers (stored on inquiry.attributes) to accept/decline and price an
 * offer. Conditional field sets WITHIN a type use `dependsOn` (e.g. collateral
 * type → vehicle vs property fields). Those dependent fields are `required`
 * and are enforced ONLY WHEN VISIBLE (see the dependsOn-aware validation in
 * schemaGenerator.ts / DynamicInquiryForm.tsx) — so "all requirements filled
 * before the request is sent" holds without blocking on hidden fields.
 */

const TENURE_OPTIONS = [
  '3 months',
  '6 months',
  '12 months',
  '24 months',
  '36 months',
  '48 months',
  '60 months',
];

// Shared across every loan type — the core ask.
const baseLoanFields: FieldSchema[] = [
  {
    name: 'loanAmount',
    label: 'Loan Amount (ZMW)',
    type: 'currency',
    required: true,
    helpText: 'How much you want to borrow',
    group: 'Loan Details',
  },
  {
    name: 'tenureMonths',
    label: 'Repayment Period',
    type: 'select',
    required: true,
    options: TENURE_OPTIONS,
    group: 'Loan Details',
  },
  {
    name: 'purpose',
    label: 'Purpose of Loan',
    type: 'textarea',
    required: true,
    placeholder: 'What will you use this loan for?',
    group: 'Loan Details',
  },
];

// Follow-up contact — once a lender APPROVES a loan they reach the borrower
// directly (call / WhatsApp / email) to arrange disbursement. Captured on the
// request and stored on inquiry.attributes so the lender sees it on the offer.
const contactFields: FieldSchema[] = [
  {
    name: 'contactName',
    label: 'Contact Name',
    type: 'text',
    required: true,
    placeholder: 'Full name of the person to contact',
    group: 'Contact for Follow-up',
  },
  {
    name: 'contactPhone',
    label: 'Phone Number',
    type: 'text',
    required: true,
    placeholder: 'e.g. 0977 123 456',
    helpText: 'The lender calls or messages you here once your loan is approved',
    group: 'Contact for Follow-up',
  },
  {
    name: 'contactEmail',
    label: 'Email Address',
    type: 'text',
    required: false,
    placeholder: 'you@example.com',
    group: 'Contact for Follow-up',
  },
  {
    name: 'preferredContact',
    label: 'Preferred Contact Method',
    type: 'select',
    required: true,
    options: ['Phone Call', 'WhatsApp', 'SMS', 'Email'],
    group: 'Contact for Follow-up',
  },
];

// ── Collateral-based ────────────────────────────────────────────────────────
export const loanCollateralSchema: FieldSchema[] = [
  ...baseLoanFields,
  {
    name: 'collateralType',
    label: 'Collateral Type',
    type: 'select',
    required: true,
    options: ['Vehicle', 'Property / Land', 'Equipment / Machinery', 'Other'],
    group: 'Collateral',
  },
  {
    name: 'collateralValue',
    label: 'Estimated Collateral Value (ZMW)',
    type: 'currency',
    required: true,
    helpText: 'Market value of the asset you are pledging',
    group: 'Collateral',
  },
  // Vehicle
  { name: 'vehicleMake', label: 'Vehicle Make', type: 'text', required: true, group: 'Vehicle Details', dependsOn: { field: 'collateralType', value: 'Vehicle' } },
  { name: 'vehicleModel', label: 'Vehicle Model', type: 'text', required: true, group: 'Vehicle Details', dependsOn: { field: 'collateralType', value: 'Vehicle' } },
  { name: 'vehicleYear', label: 'Year of Manufacture', type: 'number', required: true, min: 1980, max: 2026, group: 'Vehicle Details', dependsOn: { field: 'collateralType', value: 'Vehicle' } },
  { name: 'vehicleRegNo', label: 'Registration Number', type: 'text', required: true, group: 'Vehicle Details', dependsOn: { field: 'collateralType', value: 'Vehicle' } },
  { name: 'vehicleWhiteBook', label: 'White Book / Registration Doc', type: 'image_upload', required: true, group: 'Vehicle Details', dependsOn: { field: 'collateralType', value: 'Vehicle' } },
  // Property / Land
  { name: 'propertyType', label: 'Property Type', type: 'select', required: true, options: ['Residential', 'Commercial', 'Land / Plot'], group: 'Property Details', dependsOn: { field: 'collateralType', value: 'Property / Land' } },
  { name: 'titleDeedNumber', label: 'Title Deed / Certificate Number', type: 'text', required: true, group: 'Property Details', dependsOn: { field: 'collateralType', value: 'Property / Land' } },
  { name: 'propertyLocation', label: 'Property Location', type: 'text', required: true, placeholder: 'Plot no., area, town', group: 'Property Details', dependsOn: { field: 'collateralType', value: 'Property / Land' } },
  { name: 'titleDeedDoc', label: 'Title Deed Document', type: 'image_upload', required: true, group: 'Property Details', dependsOn: { field: 'collateralType', value: 'Property / Land' } },
  // Equipment / Machinery
  { name: 'equipmentDescription', label: 'Equipment Description', type: 'textarea', required: true, placeholder: 'Type, make, serial number, condition', group: 'Equipment Details', dependsOn: { field: 'collateralType', value: 'Equipment / Machinery' } },
  { name: 'equipmentProof', label: 'Proof of Ownership', type: 'image_upload', required: true, group: 'Equipment Details', dependsOn: { field: 'collateralType', value: 'Equipment / Machinery' } },
  // Other
  { name: 'otherCollateralDetails', label: 'Collateral Details', type: 'textarea', required: true, placeholder: 'Describe the asset and proof of ownership', group: 'Collateral', dependsOn: { field: 'collateralType', value: 'Other' } },
  { name: 'existingLoans', label: 'Do you have other active loans?', type: 'toggle', required: false, group: 'Financials' },
  ...contactFields,
];

// ── Salary-based ────────────────────────────────────────────────────────────
export const loanSalarySchema: FieldSchema[] = [
  ...baseLoanFields,
  { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: ['Private Company', 'Parastatal', 'NGO', 'Self-employed'], group: 'Employment' },
  { name: 'employerName', label: 'Employer Name', type: 'text', required: true, group: 'Employment' },
  { name: 'jobTitle', label: 'Job Title', type: 'text', required: true, group: 'Employment' },
  { name: 'netMonthlySalary', label: 'Net Monthly Salary (ZMW)', type: 'currency', required: true, helpText: 'Take-home pay after deductions', group: 'Employment' },
  { name: 'monthsEmployed', label: 'Months in Current Job', type: 'number', required: true, min: 0, max: 600, group: 'Employment' },
  { name: 'payslip', label: 'Latest Payslip', type: 'image_upload', required: true, group: 'Documents' },
  { name: 'bankStatement', label: 'Bank Statement (3 months)', type: 'image_upload', required: false, group: 'Documents' },
  { name: 'existingLoans', label: 'Do you have other active loans?', type: 'toggle', required: false, group: 'Financials' },
  ...contactFields,
];

// ── Government / public-employee ─────────────────────────────────────────────
export const loanGovernmentSchema: FieldSchema[] = [
  ...baseLoanFields,
  { name: 'ministryOrInstitution', label: 'Ministry / Government Institution', type: 'text', required: true, group: 'Public Employment' },
  { name: 'employeeNumber', label: 'Government Employee / Payroll Number', type: 'text', required: true, group: 'Public Employment' },
  { name: 'jobTitle', label: 'Position / Grade', type: 'text', required: true, group: 'Public Employment' },
  { name: 'netMonthlySalary', label: 'Net Monthly Salary (ZMW)', type: 'currency', required: true, group: 'Public Employment' },
  { name: 'monthsEmployed', label: 'Months in Service', type: 'number', required: true, min: 0, max: 600, group: 'Public Employment' },
  { name: 'payslip', label: 'Latest Payslip', type: 'image_upload', required: true, group: 'Documents' },
  { name: 'introductionLetter', label: 'Employer Introduction Letter', type: 'image_upload', required: false, group: 'Documents' },
  {
    name: 'payrollDeductionConsent',
    label: 'I consent to repayment via salary/payroll deduction',
    type: 'toggle',
    required: true,
    helpText: 'Required for government payroll-linked loans',
    group: 'Consent',
  },
  ...contactFields,
];
