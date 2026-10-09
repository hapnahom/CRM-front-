// This file now contains only the options that are not fetched from the API
// Dynamic options are fetched using the queries in store/server/features/leads/

export const ownerOptions = [
  { value: 'robel_debebe', label: 'Robel Debebe' },
  { value: 'jane_doe', label: 'Jane Doe' },
  { value: 'john_smith', label: 'John Smith' },
  { value: 'emily_white', label: 'Emily White' },
  { value: '16c44cfd-c440-4550-9b8c-fed38e8c03ad', label: 'Jane Doe' },
];

// Example validation object for frontend
export const leadValidation = {
  required: [
    'leadName',
    'contactPersonFName',
    'contactPersonLName',
    'contactPersonPosition',
    'contactPersonEmail',
    'contactPersonPhoneNumber',
  ],

  patterns: {
    leadName: /^[a-zA-Z\s\-']{2,100}$/,
    firstName: /^[a-zA-Z\s\-']{2,50}$/,
    lastName: /^[a-zA-Z\s\-']{2,50}$/,
    position: /^[a-zA-Z\s\-']{2,100}$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },

  limits: {
    additionalInfo: 1000,
    leadRate: { min: 1, max: 5 },
    solutionIds: 10,
    estimatedBudgets: 5,
    leadDocuments: 10,
    leadParticipants: 20,
  },

  messages: {
    required: 'All required fields must be provided',
    email: 'Please provide a valid email address',
    phone: 'Phone number must be a valid international format',
    uuid: 'Invalid ID format',
    duplicate: 'Lead with this information already exists',
  },
};

// Note: The following options are now fetched dynamically from the API:
// - companyOptions (from /companies endpoint)
// - sourceOptions (from /source endpoint)
// - stageOptions (from /engagement-stage endpoint)
// - supplierOptions (from /suppliers endpoint)
// - solutionOptions (from /solution endpoint)
// - leadTypeOptions (from /lead-types endpoint)
// - leadDocumentOptions (from /lead-documents endpoint)
// - leadParticipantOptions (from /lead-participants endpoint)
// - sectorOptions (from /sectors endpoint)
// - roleOptions (from /roles endpoint)
// - currencyOptions (from /currencies endpoint)
