/** PQQ (Pre-Qualification Questionnaire) types and helpers — UI-only until backend support exists. */

export type PqqBantBudgetTier = 'none' | 'unclear' | 'expected' | 'confirmed';
export type PqqBantAuthorityTier =
  | 'none'
  | 'indirect'
  | 'influencer'
  | 'decisionMaker';
export type PqqBantNeedTier = 'weak' | 'general' | 'defined' | 'strong';
export type PqqBantTimelineTier = 'none' | 'long' | 'medium' | 'immediate';

export type DealPqqBant = {
  budgetTier: PqqBantBudgetTier;
  budgetScore: number;
  budgetNotes: string;
  authorityTier: PqqBantAuthorityTier;
  authorityScore: number;
  authorityNotes: string;
  needTier: PqqBantNeedTier;
  needScore: number;
  needNotes: string;
  timelineTier: PqqBantTimelineTier;
  timelineScore: number;
  timelineNotes: string;
};

export type DealPqq = {
  owner: string;
  reviewedBy: string;
  opportunityName: string;
  clientName: string;
  industry: string;
  contactPerson: string;
  opportunityDescription: string;
  sourceDirectClient: boolean;
  sourceTender: boolean;
  sourcePartner: boolean;
  sourceReferral: boolean;
  sourceRenewal: boolean;
  rfpPreviouslyWorked: boolean;
  rfpNew: boolean;
  problem: string;
  whyNow: string;
  impactIfNotSolved: string;
  existingSystems: string;
  currentVendors: string;
  limitations: string;
  expectedSolution: string;
  preferredVendors: string;
  keyFeatures: string;
  scope: string;
  locations: string;
  projectSize: string;
  projectStart: string;
  deadline: string;
  budgetStatus: string;
  budgetEstimate: string;
  approvalStatus: string;
  decisionMaker: string;
  influencers: string;
  approver: string;
  competition: string;
  opportunityStage: string;
  risks: string;
  unclearAreas: string;
  bant: DealPqqBant;
  stlName: string;
  stlOutcome: 'pending' | 'approved' | 'rejected';
  stlComments: string;
  exceptionJustification: string;
  exceptionApprovedBy: string;
  exceptionRemarks: string;
};

export const PQQ_BANT_SCORE_CAP = 12;
export const PQQ_DECISION_THRESHOLD = 36;
export const PQQ_MAX_TOTAL = 48;

export const PQQ_BANT_DEFAULT_SCORES: Record<
  keyof Pick<
    DealPqqBant,
    'budgetTier' | 'authorityTier' | 'needTier' | 'timelineTier'
  >,
  Record<string, number>
> = {
  budgetTier: { none: 2, unclear: 5, expected: 8, confirmed: 11 },
  authorityTier: { none: 2, indirect: 5, influencer: 8, decisionMaker: 11 },
  needTier: { weak: 2, general: 5, defined: 8, strong: 11 },
  timelineTier: { none: 2, long: 5, medium: 8, immediate: 11 },
};

export function createEmptyDealPqq(): DealPqq {
  return {
    owner: 'AE',
    reviewedBy: 'STL',
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
      budgetTier: 'unclear',
      budgetScore: PQQ_BANT_DEFAULT_SCORES.budgetTier.unclear,
      budgetNotes: '',
      authorityTier: 'indirect',
      authorityScore: PQQ_BANT_DEFAULT_SCORES.authorityTier.indirect,
      authorityNotes: '',
      needTier: 'strong',
      needScore: PQQ_BANT_DEFAULT_SCORES.needTier.strong,
      needNotes: '',
      timelineTier: 'medium',
      timelineScore: PQQ_BANT_DEFAULT_SCORES.timelineTier.medium,
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

export function clampPqqScore(n: number): number {
  return Math.min(PQQ_BANT_SCORE_CAP, Math.max(0, Math.round(n)));
}

export function computeDealPqqTotal(bant: DealPqqBant): number {
  return (
    clampPqqScore(bant.budgetScore) +
    clampPqqScore(bant.authorityScore) +
    clampPqqScore(bant.needScore) +
    clampPqqScore(bant.timelineScore)
  );
}
