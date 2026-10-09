export type PRMRole =
  | 'admin'
  | 'partner_manager'
  | 'sales'
  | 'presales'
  | 'management';

export type PartnerTier = string;

export type PartnerStatus =
  | 'Active'
  | 'Onboarding'
  | 'Suspended'
  | 'Inactive'
  | 'Under Review';

export type HealthStatus = 'Healthy' | 'Watch' | 'At Risk' | 'Critical';

export type PerformanceClassification =
  | 'Excellent'
  | 'Good'
  | 'Average'
  | 'Below Target'
  | 'Poor';

export interface PartnerContact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  role: 'Primary' | 'Technical' | 'Commercial' | 'Executive' | 'Operations';
  avatarUrl?: string;
  isPrimary?: boolean;
}

export interface ProductMapping {
  id: string;
  partner: string;
  productFamily: string;
  productCategory: string;
  productOrSolution: string;
  /** Display name from the tenant's partner-role catalog. */
  partnerRole: string;
  partnerRoleId?: string;
  authorizationStatus:
    | 'Authorized'
    | 'Specialist'
    | 'Master'
    | 'Pending'
    | 'Expired';
  certificationRequirement: string;
  certificationStatus: 'Compliant' | 'Pending Renewal' | 'Non-Compliant';
}

export interface CertificationRecord {
  id: string;
  certificationName: string;
  productOrSolution: string;
  partnerId: string;
  partnerName: string;
  certifiedIndividual: string;
  certificationLevel:
    | 'Associate'
    | 'Professional'
    | 'Expert'
    | 'Architect'
    | 'Specialist';
  issueDate: string | null;
  expiryDate: string | null;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Pending';
  certificateUrl?: string;
  daysUntilExpiry?: number;
}

export interface PartnerDeal {
  id: string;
  opportunityName: string;
  customerName: string;
  customerContact: string;
  productOrSolution: string;
  partner: string;
  dealValue: number;
  expectedCloseDate: string;
  stage:
    | 'Discovery'
    | 'Proposal'
    | 'Negotiation'
    | 'Closed Won'
    | 'Closed Lost';
  status: 'Registered' | 'Approved' | 'In Pipeline' | 'Won';
  registrationId?: string;
  /** Role display name → partner name for multi-partner deals. */
  rolesInvolved: Record<string, string>;
}

export interface HealthBreakdown {
  score: number;
  status: HealthStatus;
  commercialScore: number;
  engagementScore: number;
  capabilityScore: number;
  relationshipScore: number;
  commercialFactors: {
    name: string;
    value: string;
    impact: 'positive' | 'neutral' | 'negative';
  }[];
  engagementFactors: {
    name: string;
    value: string;
    impact: 'positive' | 'neutral' | 'negative';
  }[];
  capabilityFactors: {
    name: string;
    value: string;
    impact: 'positive' | 'neutral' | 'negative';
  }[];
  relationshipFactors: {
    name: string;
    value: string;
    impact: 'positive' | 'neutral' | 'negative';
  }[];
  recommendedActions: string[];
}

export interface PerformanceScorecard {
  overallScore: number;
  classification: PerformanceClassification;
  revenue: number;
  revenueTarget: number;
  pipeline: number;
  pipelineTarget: number;
  closedDealsCount: number;
  winRate: number;
  dealRegistrationsCount: number;
  conversionRate: number;
  targetAchievement: number;
  activeCertificationsCount: number;
  trainingCompletionRate: number;
  customerEngagementScore: number;
  activityLevelScore: number;
  mdfAllocation?: number;
  weights: {
    revenue: number;
    pipeline: number;
    winRate: number;
    dealRegistration: number;
    certification: number;
    targetAchievement: number;
    engagement: number;
  };
}

export type QBRActionCategory =
  | 'Pipeline / Sales'
  | 'Marketing / GTM'
  | 'Technical / Enablement'
  | 'Operations';

export type QBROwnerSide = 'Internal' | 'Partner';

export type QBRActionItemStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Done'
  | 'Blocked'
  | 'Open'
  | 'Completed'
  | 'Overdue'
  | 'Cancelled';

export interface QBRActionItem {
  id: string;
  qbrId: string;
  action: string;
  category?: QBRActionCategory;
  ownerSide?: QBROwnerSide;
  assignee?: string;
  owner: string;
  ownerAvatar?: string;
  priority?: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: QBRActionItemStatus;
  completionDate?: string;
}

export type PartnerHealthSentiment = 'Green' | 'Amber' | 'Red';
export type TargetAchievementStatus = 'Exceeded' | 'On Track' | 'Behind Target';

export interface QBRPostMeetingData {
  executiveSummary: string;
  healthSentiment: PartnerHealthSentiment;
  healthScore?: number;
  targetAchievementStatus: TargetAchievementStatus;
  actionItems: QBRActionItem[];
  completedAt?: string;
  completedBy?: string;
}

export interface QBRMeeting {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerRoleIds: string[];
  reviewPeriod: string;
  meetingDate: string;
  meetingTime?: string;
  duration?: string;
  location?: string;
  preReadUrl?: string;
  partnerLead?: string;
  participants: string[];
  performanceScore: number;
  status: 'Scheduled' | 'Completed' | 'Overdue' | 'In Preparation';
  openActionsCount: number;
  nextQBRDate: string;
  owner: string;
  agenda: string[];
  discussionPoints?: string[];
  decisions?: string[];
  risks?: string[];
  scorecardSnapshot?: {
    revenueTargetVsActual: string;
    pipelineHealth: string;
    certCompliance: string;
    customerSatisfaction: string;
  };
  actions?: QBRActionItem[];
  postMeeting?: QBRPostMeetingData;
}

export interface PartnerDocument {
  id: string;
  title: string;
  category:
    | 'Agreement'
    | 'Registration'
    | 'Compliance'
    | 'Certification'
    | 'Other';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'Verified' | 'Pending Review' | 'Expired';
}

export interface PartnerActivity {
  id: string;
  type: 'Meeting' | 'Call' | 'Email' | 'QBR' | 'Deal Reg' | 'Cert' | 'Note';
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface PartnerCurrencyTarget {
  id?: string;
  currencyId: string;
  /** Currency code, e.g. USD */
  currency: string;
  annualAmount: number;
  sessionTargets?: Array<{ sessionId: string; amount: number }>;
}

export interface Partner {
  id: string;
  name: string;
  legalName: string;
  /** Assigned Partner Role ids (unordered set). */
  roleIds: string[];
  /** Partner tier id from /partner-tiers. */
  tierId: string;
  /** Partner tier display name. */
  tier: PartnerTier | string;
  tierColor?: string | null;
  tierBorderColor?: string | null;
  /** Partnership type id from /partner-partnership-types. */
  partnershipTypeId?: string;
  /** Partnership type display name. */
  partnershipType?: string;
  partnershipTypeColor?: string | null;
  partnershipTypeBorderColor?: string | null;
  status: PartnerStatus;
  logoUrl?: string;
  primaryContact: PartnerContact;
  contacts: PartnerContact[];
  accountManager: string;
  partnershipStartDate: string;
  productsAndSolutions: string[];
  productMappings?: ProductMapping[];
  pipelineValue: number;
  revenue: number;
  performanceScore: number;
  health: HealthBreakdown;
  scorecard: PerformanceScorecard;
  lastEngagementDate: string;
  nextQBRDate: string;
  geographicCoverage: string[];
  industryExpertise: string[];
  website: string;
  address: string;
  registrationNumber: string;
  agreementStatus: 'Active' | 'Renewal Pending' | 'Expired' | 'Draft';
  agreementExpiry: string;
  documents: PartnerDocument[];
  activities: PartnerActivity[];
  deals: PartnerDeal[];
  certifications: CertificationRecord[];
  qbrs: QBRMeeting[];

  annualTarget?: number;
  currencyTargets?: PartnerCurrencyTarget[];
  targetAccountsFocus?: string;
  solutionFocus?: string;
  fieldGroups?: Array<{
    role: { id: string; name: string; code: string };
    fields: Array<{ id: string; label: string; value?: unknown }>;
  }>;

  /** Optional role-scoped metrics keyed by partner role id. */
  roleDetails?: Record<string, Record<string, unknown>>;
}

export interface OnboardingApplication {
  id: string;
  partnerName: string;
  partnerRoleIds: string[];
  submittedDate: string;
  currentStage:
    | 'Partner Application'
    | 'Company Information'
    | 'Partner Role Selection'
    | 'Documents Upload'
    | 'Products & Capabilities'
    | 'Internal Review'
    | 'Approval'
    | 'Agreement Signing'
    | 'Certification & Enablement'
    | 'Active Partner';
  status:
    | 'Draft'
    | 'Submitted'
    | 'Under Review'
    | 'Additional Information Required'
    | 'Approved'
    | 'Rejected'
    | 'Active'
    | 'Suspended';
  assignedManager: string;
  reviewer: string;
  missingDocuments: string[];
  lastUpdated: string;
  primaryContactName: string;
  primaryContactEmail: string;
  country: string;
  industry: string;
  requestedTier: PartnerTier;
  approvalHistory: {
    stage: string;
    actor: string;
    date: string;
    decision: 'Approved' | 'Changes Requested' | 'Pending' | 'Rejected';
    comment?: string;
  }[];
  notes?: string[];
}

export interface DealRegistration {
  id: string;
  registrationNumber: string;
  partnerId: string;
  partnerName: string;
  partnerRoleIds: string[];
  customerName: string;
  customerContact: string;
  opportunityName: string;
  productOrSolution: string;
  productFamilyId?: string;
  productFamilyName?: string;
  vendor: string;
  estimatedDealValue: number;
  expectedCloseDate: string;
  registrationDate: string;
  status:
    | 'Pending'
    | 'Under Review'
    | 'Approved'
    | 'Rejected'
    | 'Expiring'
    | 'Expired'
    | 'Converted to Deal'
    | 'Qualified Lead'
    | 'Proposal'
    | 'Negotiation'
    | 'In Pipeline'
    | string;
  assignedReviewer: string;
  opportunityDescription: string;
  competition: string;
  supportingDocuments: string[];
  crmDealId?: string;
  duplicateWarning?: {
    isDuplicate: boolean;
    existingOpportunityName?: string;
    existingPartnerName?: string;
    similarityScore?: number;
  };
  /** Role display name → partner name for multi-partner opportunities. */
  multiPartnerRoles?: Record<string, string>;
  reviewHistory: {
    date: string;
    reviewer: string;
    action: string;
    notes: string;
  }[];
}

export type PRMMainTab =
  | 'overview'
  | 'partner-management'
  | 'product-catalog'
  | 'partner-sales';

export type PartnerManagementSubTab = 'all' | 'onboarding' | string; // role id filter, e.g. role-vendor

export type PartnerSalesSubTab = 'registered-deals' | 'all';

export type PartnerProfileTab =
  | 'overview'
  | 'business'
  | 'capabilities'
  | 'performance'
  | 'engagement'
  | 'documents'
  | 'agreements'
  | 'details'
  | 'audit';

export type PartnerBusinessSubTab = 'deals' | 'customers';
export type PartnerCapabilitiesSubTab = 'products-solutions' | 'certifications';
export type PartnerPerformanceSubTab = 'performance' | 'health';
export type PartnerEngagementSubTab = 'timeline' | 'qbr';
export type PartnerMoreSubTab =
  | 'documents'
  | 'agreements'
  | 'details'
  | 'audit';
