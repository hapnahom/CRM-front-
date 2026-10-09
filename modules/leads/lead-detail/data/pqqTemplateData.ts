import { type DealPqq, PQQ_MAX_TOTAL, computeDealPqqTotal } from './pqqData';

export type LeadPqqSettings = {
  bantDecisionThreshold: number;
};

export const DEFAULT_LEAD_PQQ_SETTINGS: LeadPqqSettings = {
  bantDecisionThreshold: 36,
};

export function clampPqqDecisionThreshold(value: number): number {
  return Math.min(PQQ_MAX_TOTAL, Math.max(0, Math.round(value)));
}

export type PqqTemplateFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'slider';

export type PqqTemplateField = {
  id: string;
  sectionId: string;
  label: string;
  type: PqqTemplateFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  order: number;
};

export type PqqTemplateSection = {
  id: string;
  stepId: string;
  title: string;
  description?: string;
  order: number;
};

export type PqqTemplateStep = {
  id: string;
  title: string;
  order: number;
};

export type PqqTemplateFormDefinition = {
  steps: PqqTemplateStep[];
  sections: PqqTemplateSection[];
  fields: PqqTemplateField[];
};

export type PqqFormValue = string | number | boolean;
export type PqqFormValues = Record<string, PqqFormValue>;

export type DealPqqTemplate = {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  order: number;
  formDefinition: PqqTemplateFormDefinition;
  worksheet: DealPqq;
};

export function createEmptyPqqFormDefinition(): PqqTemplateFormDefinition {
  return {
    steps: [
      { id: 'discovery', title: 'Discovery', order: 0 },
      { id: 'bant', title: 'BANT & validation', order: 1 },
    ],
    sections: [],
    fields: [],
  };
}

const DISCOVERY_STEP_ID = 'discovery';
const BANT_STEP_ID = 'bant';

function createTemplateField(
  sectionId: string,
  id: string,
  order: number,
  label: string,
  type: PqqTemplateFieldType,
  extra?: Partial<PqqTemplateField>,
): PqqTemplateField {
  return {
    id,
    sectionId,
    label,
    type,
    order,
    ...extra,
  };
}

function createTemplateSection(
  stepId: string,
  id: string,
  order: number,
  title: string,
  description?: string,
): PqqTemplateSection {
  return { id, stepId, title, description, order };
}

export function createDefaultLeadDiscoveryPqqFormDefinition(): PqqTemplateFormDefinition {
  const sections: PqqTemplateSection[] = [
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-ownership',
      0,
      'Ownership',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-opportunity-information',
      1,
      '1. Opportunity information',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-opportunity-source',
      2,
      'Opportunity source & type',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-business-need',
      3,
      '2. Business need & pain',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-current-environment',
      4,
      '3. Current environment',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-requirements',
      5,
      '4. Requirements',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-scope-timeline-budget',
      6,
      '5–7. Scope, timeline, budget',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-stakeholders-risks',
      7,
      '8–10. Stakeholders, competition, risks',
    ),
    createTemplateSection(
      DISCOVERY_STEP_ID,
      'section-unclear-areas',
      8,
      'Unclear areas',
    ),
    createTemplateSection(
      BANT_STEP_ID,
      'section-bant-scoring',
      0,
      'BANT scoring',
    ),
    createTemplateSection(
      BANT_STEP_ID,
      'section-stl-validation',
      1,
      'Validation (STL)',
    ),
    createTemplateSection(
      BANT_STEP_ID,
      'section-exception-handling',
      2,
      'Exception justification',
    ),
  ];

  const fields: PqqTemplateField[] = [
    createTemplateField(
      'section-ownership',
      'field-owner',
      0,
      'Owner (AE)',
      'text',
    ),
    createTemplateField(
      'section-ownership',
      'field-reviewed-by',
      1,
      'Reviewed by (STL)',
      'text',
    ),
    createTemplateField(
      'section-opportunity-information',
      'field-opportunity-name',
      0,
      'Opportunity name',
      'text',
    ),
    createTemplateField(
      'section-opportunity-information',
      'field-client-name',
      1,
      'Client name',
      'text',
    ),
    createTemplateField(
      'section-opportunity-information',
      'field-industry',
      2,
      'Industry / sector',
      'text',
    ),
    createTemplateField(
      'section-opportunity-information',
      'field-contact-person',
      3,
      'Contact person',
      'text',
      { placeholder: 'e.g. Not specified (via RFP)' },
    ),
    createTemplateField(
      'section-opportunity-information',
      'field-opportunity-description',
      4,
      'Opportunity description',
      'textarea',
      { placeholder: 'Scope, products, services…' },
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-source-direct-client',
      0,
      'Direct client request',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-source-tender',
      1,
      'Tender / RFP',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-source-partner',
      2,
      'Partner',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-source-referral',
      3,
      'Referral',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-source-renewal',
      4,
      'Renewal / existing client',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-rfp-previously-worked',
      5,
      'RFP we have previously worked on',
      'checkbox',
    ),
    createTemplateField(
      'section-opportunity-source',
      'field-rfp-new',
      6,
      'New RFP (no prior engagement)',
      'checkbox',
    ),
    createTemplateField(
      'section-business-need',
      'field-problem',
      0,
      'Problem',
      'textarea',
    ),
    createTemplateField(
      'section-business-need',
      'field-why-now',
      1,
      'Why now',
      'textarea',
    ),
    createTemplateField(
      'section-business-need',
      'field-impact-if-not-solved',
      2,
      'Impact if not solved',
      'textarea',
    ),
    createTemplateField(
      'section-current-environment',
      'field-existing-systems',
      0,
      'Existing systems',
      'textarea',
    ),
    createTemplateField(
      'section-current-environment',
      'field-current-vendors',
      1,
      'Current vendors',
      'textarea',
    ),
    createTemplateField(
      'section-current-environment',
      'field-limitations',
      2,
      'Limitations',
      'textarea',
    ),
    createTemplateField(
      'section-requirements',
      'field-expected-solution',
      0,
      'Expected solution',
      'textarea',
    ),
    createTemplateField(
      'section-requirements',
      'field-preferred-vendors',
      1,
      'Preferred vendors',
      'textarea',
    ),
    createTemplateField(
      'section-requirements',
      'field-key-features',
      2,
      'Key features',
      'textarea',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-scope',
      0,
      'Scope',
      'textarea',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-locations',
      1,
      'Locations',
      'textarea',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-project-size',
      2,
      'Project size',
      'text',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-project-start',
      3,
      'Project start',
      'text',
      { placeholder: 'e.g. Within 3–6 months' },
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-deadline',
      4,
      'Deadline / required completion',
      'text',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-budget-status',
      5,
      'Budget status',
      'text',
      { placeholder: 'e.g. Not disclosed' },
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-budget-estimate',
      6,
      'Budget estimate',
      'text',
    ),
    createTemplateField(
      'section-scope-timeline-budget',
      'field-approval-status',
      7,
      'Approval',
      'text',
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-decision-maker',
      0,
      'Decision maker',
      'text',
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-influencers',
      1,
      'Influencers',
      'text',
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-approver',
      2,
      'Approver',
      'text',
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-competition',
      3,
      'Competition',
      'textarea',
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-opportunity-stage',
      4,
      'Opportunity stage',
      'text',
      { placeholder: 'e.g. Formal tender' },
    ),
    createTemplateField(
      'section-stakeholders-risks',
      'field-risks',
      5,
      'Risks',
      'textarea',
    ),
    createTemplateField(
      'section-unclear-areas',
      'field-unclear-areas',
      0,
      'Unclear areas',
      'textarea',
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-budget-score',
      0,
      'Budget score',
      'slider',
      {
        min: 0,
        max: 12,
      },
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-budget-notes',
      1,
      'Budget notes',
      'text',
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-authority-score',
      2,
      'Authority score',
      'slider',
      { min: 0, max: 12 },
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-authority-notes',
      3,
      'Authority notes',
      'text',
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-need-score',
      4,
      'Need score',
      'slider',
      {
        min: 0,
        max: 12,
      },
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-need-notes',
      5,
      'Need notes',
      'text',
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-timeline-score',
      6,
      'Timeline score',
      'slider',
      { min: 0, max: 12 },
    ),
    createTemplateField(
      'section-bant-scoring',
      'field-timeline-notes',
      7,
      'Timeline notes',
      'text',
    ),
    createTemplateField(
      'section-stl-validation',
      'field-stl-name',
      0,
      'STL name',
      'text',
      {
        placeholder: 'Sales TL name',
      },
    ),
    createTemplateField(
      'section-stl-validation',
      'field-stl-outcome',
      1,
      'Outcome',
      'select',
      {
        options: ['Pending', 'Approved', 'Rejected'],
      },
    ),
    createTemplateField(
      'section-stl-validation',
      'field-stl-comments',
      2,
      'STL comments',
      'textarea',
      {
        placeholder:
          'e.g. Below threshold; proceed only under approved strategic exception',
      },
    ),
    createTemplateField(
      'section-exception-handling',
      'field-exception-justification',
      0,
      'Justification',
      'textarea',
    ),
    createTemplateField(
      'section-exception-handling',
      'field-exception-approved-by',
      1,
      'Approved by',
      'text',
    ),
    createTemplateField(
      'section-exception-handling',
      'field-exception-remarks',
      2,
      'Remarks',
      'text',
      { placeholder: 'e.g. Controlled effort; limit presales' },
    ),
  ];

  return {
    steps: [
      { id: DISCOVERY_STEP_ID, title: 'Discovery', order: 0 },
      { id: BANT_STEP_ID, title: 'BANT & validation', order: 1 },
    ],
    sections,
    fields,
  };
}

export function clonePqqFormDefinition(
  definition: PqqTemplateFormDefinition | undefined,
): PqqTemplateFormDefinition {
  if (!definition) {
    return createEmptyPqqFormDefinition();
  }
  return {
    steps: definition.steps.map((step) => ({ ...step })),
    sections: definition.sections.map((section) => ({ ...section })),
    fields: definition.fields.map((field) => ({
      ...field,
      options: field.options ? [...field.options] : undefined,
    })),
  };
}

export function getTemplateFormDefinition(
  template: Pick<DealPqqTemplate, 'id' | 'formDefinition'>,
): PqqTemplateFormDefinition {
  const stored = clonePqqFormDefinition(template.formDefinition);
  if (hasCustomPqqFormFields(stored)) {
    return stored;
  }
  if (template.id === 'pqq-template-default') {
    return createDefaultLeadDiscoveryPqqFormDefinition();
  }
  return stored;
}

export function cloneDealPqq(worksheet: DealPqq): DealPqq {
  return {
    ...worksheet,
    bant: { ...worksheet.bant },
  };
}

export function createPqqTemplateWorksheet(): DealPqq {
  return {
    owner: '',
    reviewedBy: '',
    opportunityName: '',
    clientName: '',
    industry: '',
    contactPerson: '',
    opportunityDescription: '',
    sourceDirectClient: false,
    sourceTender: false,
    sourcePartner: false,
    sourceReferral: false,
    sourceRenewal: false,
    rfpPreviouslyWorked: false,
    rfpNew: false,
    problem: '',
    whyNow: '',
    impactIfNotSolved: '',
    existingSystems: '',
    currentVendors: '',
    limitations: '',
    expectedSolution: '',
    preferredVendors: '',
    keyFeatures: '',
    scope: '',
    locations: '',
    projectSize: '',
    projectStart: '',
    deadline: '',
    budgetStatus: '',
    budgetEstimate: '',
    approvalStatus: '',
    decisionMaker: '',
    influencers: '',
    approver: '',
    competition: '',
    opportunityStage: '',
    risks: '',
    unclearAreas: '',
    bant: {
      budgetTier: 'none',
      budgetScore: 0,
      budgetNotes: '',
      authorityTier: 'none',
      authorityScore: 0,
      authorityNotes: '',
      needTier: 'weak',
      needScore: 0,
      needNotes: '',
      timelineTier: 'none',
      timelineScore: 0,
      timelineNotes: '',
    },
    stlName: '',
    stlOutcome: 'pending',
    stlComments: '',
    exceptionJustification: '',
    exceptionApprovedBy: '',
    exceptionRemarks: '',
  };
}

export function createEmptyPqqFormValues(
  definition: PqqTemplateFormDefinition,
): PqqFormValues {
  const values: PqqFormValues = {};
  for (const field of definition.fields) {
    if (field.type === 'checkbox') {
      values[field.id] = false;
    } else if (field.type === 'number' || field.type === 'slider') {
      values[field.id] = field.min ?? 0;
    } else {
      values[field.id] = '';
    }
  }
  return values;
}

export function clonePqqFormValues(values: PqqFormValues): PqqFormValues {
  return { ...values };
}

export function getTemplateFieldCount(
  definition: PqqTemplateFormDefinition,
): number {
  return definition.fields.length;
}

export function getTemplateSectionCount(
  definition: PqqTemplateFormDefinition,
): number {
  return definition.sections.length;
}

export function hasCustomPqqFormFields(
  definition: PqqTemplateFormDefinition,
): boolean {
  return definition.fields.length > 0;
}

export function getBantScoreFromFormValues(
  definition: PqqTemplateFormDefinition,
  values: PqqFormValues | undefined,
): number | null {
  if (!values) return null;
  const bantFieldIds = new Set(
    definition.sections
      .filter((section) => section.stepId === 'bant')
      .map((s) => s.id),
  );
  const scoreFields = definition.fields.filter(
    (field) =>
      bantFieldIds.has(field.sectionId) &&
      (field.type === 'number' || field.type === 'slider'),
  );
  if (scoreFields.length === 0) return null;
  return scoreFields.reduce((sum, field) => {
    const raw = values[field.id];
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
}

export function isLeadPqqQualified(
  pqq: DealPqq | undefined,
  threshold: number,
  options?: {
    formDefinition?: PqqTemplateFormDefinition;
    formValues?: PqqFormValues;
  },
): boolean | null {
  const customTotal = options?.formDefinition
    ? getBantScoreFromFormValues(options.formDefinition, options.formValues)
    : null;

  if (customTotal !== null) {
    return customTotal >= clampPqqDecisionThreshold(threshold);
  }

  if (!pqq) return null;
  return computeDealPqqTotal(pqq.bant) >= clampPqqDecisionThreshold(threshold);
}

export const DEFAULT_PQQ_TEMPLATES: DealPqqTemplate[] = [
  {
    id: 'pqq-template-default',
    name: 'Lead Discovery & PQQ Template',
    description:
      'Default discovery and qualification worksheet covering opportunity context, BANT scoring, STL validation, and exception handling.',
    isDefault: true,
    order: 0,
    formDefinition: createDefaultLeadDiscoveryPqqFormDefinition(),
    worksheet: createPqqTemplateWorksheet(),
  },
];

export function getDefaultPqqTemplate(
  templates: DealPqqTemplate[],
): DealPqqTemplate | undefined {
  return templates.find((template) => template.isDefault) ?? templates[0];
}

export function getDefaultPqqWorksheet(templates: DealPqqTemplate[]): DealPqq {
  const template = getDefaultPqqTemplate(templates);
  return template
    ? cloneDealPqq(template.worksheet)
    : createPqqTemplateWorksheet();
}

export function getDefaultPqqFormDefinition(
  templates: DealPqqTemplate[],
): PqqTemplateFormDefinition {
  const template = getDefaultPqqTemplate(templates);
  return template
    ? getTemplateFormDefinition(template)
    : createEmptyPqqFormDefinition();
}
