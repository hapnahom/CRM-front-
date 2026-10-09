/**
 * Базовая сущность с общими полями
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant related entity
 */
export interface TenantRelatedEntity extends BaseEntity {
  tenantId: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Order direction type
 */
export type OrderDirectionType = 'ASC' | 'DESC';

/**
 * Subscription statuses
 */
export enum SubscriptionStatus {
  PENDING = 'pending',
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  PREPAID = 'prepaid',
}

/**
 * Invoice statuses
 */
export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

/**
 * Invoice types
 */
export enum InvoiceType {
  NEW = 'new',
  RENEWAL = 'renewal',
  UPGRADE = 'upgrade',
  ADDITIONAL_SLOTS = 'additional_slots',
  ADDITIONAL_PERIOD = 'additional_period',
  POST_TRIAL = 'post_trial',
}

/**
 * Payment methods
 */
export enum PaymentMethod {
  LOCAL = 'local',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer',
  ADMIN_MANUAL = 'admin_manual',
}

/**
 * Payment statuses
 */
export enum PaymentStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
  PROCESSING = 'processing',
  CANCELED = 'canceled',
}

/**
 * Refund statuses
 */
export enum RefundStatus {
  NONE = 'none',
  PARTIAL = 'partial',
  FULL = 'full',
}

/**
 * Transaction types
 */
export enum TransactionType {
  PURCHASE_SUBSCRIPTION = 'purchase_subscription',
  PURCHASE_SLOTS = 'purchase_slots',
  REMOVE_SLOTS = 'remove_slots',
  TRIAL = 'trial',
  PERIOD_UPGRADE = 'period_upgrade',
  RENEWAL_SUBSCRIPTION = 'renewal_subscription',
  PREPAY_SUBSCRIPTION = 'prepay_subscription',
}

/**
 * Transaction statuses
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export interface PaymentMetadata {
  operationType: 'new_subscription' | 'subscription_upgrade' | 'slot_purchase';
  targetState: {
    subscriptionId: string;
    planId: string;
    slotTotal: number;
    startAt: string;
    endAt: string;
    price: number;
    isActive: boolean;
  };
  additionalData?: Record<string, unknown>;
}

/**
 * Scheduled changes metadata
 */
export interface ScheduledChangesMetadata {
  effectiveAt: string;
  changes: {
    newPlanId?: string;
    newPlanPeriodId?: string;
    newSlotTotal?: number;
    newTotalAmount?: number;
    createdAt: string;
    reason?: string;
    costAdjustment?: number;
  };
  isApplied?: boolean;
}

/*********************************************
 * Entities
 *********************************************/

/**
 * Currency
 */
export interface Currency extends BaseEntity {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Period type
 */
export interface PeriodType extends BaseEntity {
  code: string;
  description?: string;
  periodInMonths: number;
  successorPeriodTypeId?: string;
  successorPeriodType?: PeriodType;
}

/**
 * Plan
 */
export interface Plan extends BaseEntity {
  name: string;
  description: string;
  slotPrice: number;
  slotDiscountPrice: number | null;
  isFree: boolean;
  isPublic: boolean;
  isActive: boolean;
  successorPlanId: string | null;
  successorPlan: Plan | null;
  lateFeeAmount: number | null;
  lateFeeDescription: string | null;
  invoiceGenerationDaysBefore: number;
  gracePeriodDays: number;
  trialDurationDays: number | null;
  maxTrialSlots: number | null;
  orderIndex: number;
  planDetails: string[];
  currencyId: string;
  currency: Currency;
  periods: PlanPeriod[];
  modules: PlanModule[];
}

/**
 * Plan period
 */
export interface PlanPeriod extends BaseEntity {
  planId: string;
  periodTypeId: string;
  isDefault: boolean;
  periodMultiplier: number;
  periodSlotPrice: number | null;
  periodSlotDiscountPrice: number | null;
  discountPercentage: number | null;
  plan: Plan;
  periodType: PeriodType;
}

/**
 * Plan module
 */
export interface PlanModule extends BaseEntity {
  planId: string;
  moduleId: string;
  settings: Record<string, any> | null;
  plan: Plan;
  module: Module;
}

/**
 * Application module
 */
export interface Module extends BaseEntity {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

/**
 * Subscription
 */
export interface Subscription extends TenantRelatedEntity {
  planId: string;
  plan: Plan;
  planPeriodId: string;
  planPeriod: PlanPeriod;
  currencyId: string;
  currency: Currency;
  startAt: string;
  endAt: string;
  isActive: boolean;
  slotTotal: number;
  subscriptionPrice: number;
  isTrial: boolean;
  trialEndAt?: string;
  canceledAt?: string;
  subscriptionStatus: SubscriptionStatus;
  scheduledChangesMetadata?: ScheduledChangesMetadata;
  totalAmount: number;
  cancelReason?: string;
  cancelDate?: string;
  invoices: Invoice[];
  slotTransactions: SubscriptionSlotTransaction[];
}

/**
 * Invoice
 */
export interface Invoice extends TenantRelatedEntity {
  subscriptionId: string;
  subscription: Subscription;
  invoiceNumber: number;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  invoiceAt: string;
  dueAt: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  currencyId: string;
  currency: Currency;
  notes: string | null;
  paymentMetadata: Record<string, any> | null;
  payments: Payment[];
}

/**
 * Payment
 */
export interface Payment extends BaseEntity {
  invoiceId: string;
  invoice: Invoice;
  amount: number;
  paymentAt: string;
  method: PaymentMethod;
  status: PaymentStatus;
  externalPaymentId?: string;
  paymentProvider?: string;
  paymentMetadata?: Record<string, any>;
  webhookData?: Record<string, any>;
  refundStatus: RefundStatus;
  refundAmount: number;
  errorCode?: string;
  errorMessage?: string;
  receiptUrl?: string;
}

/**
 * Slot transaction
 */
export interface SubscriptionSlotTransaction extends BaseEntity {
  subscriptionId: string;
  subscription: Subscription;
  transactionType: TransactionType;
  slotCount: number;
  pricePerSlot?: number;
  effectiveAt: string;
  periodId?: string;
  transactionAt: string;
  status: TransactionStatus;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, any>;
  userId: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/*********************************************
 * Requests
 *********************************************/

export interface CreateAdvanceInvoiceRequest {
  tenantId: string;
  subscriptionId: string;
}

export interface PayInvoiceRequest {
  paymentMethod: string;
  paymentProvider?: string;
  amount?: number;
}

export interface CancelInvoiceRequest {
  reason?: string;
}

export interface InitiatePaymentRequest {
  paymentMethod: string;
  paymentProvider: string;
  returnUrl?: string;
}

export interface WebhookPayloadRequest {
  [key: string]: any;
}

export interface GetSubscriptionByTenantRequest {
  tenantId: string;
}

/**
 * Subscription upgrade parameters
 */
export interface UpgradeSubscriptionRequest {
  subscriptionId: string;
  planId?: string;
  planPeriodId?: string;
  slots?: number;
  description?: string;
  subscriptionStatus?: SubscriptionStatus;
  cancelReason?: string;
}

/**
 * Additional slots purchase parameters
 */
export interface BuyAdditionalSlotsRequest {
  subscriptionId: string;
  newSlotsAmount: number;
}

export interface RenewSubscriptionRequest {
  subscriptionId: string;
}

export interface PrepaySubscriptionRequest {
  subscriptionId: string;
}
/**
 * Tenant
 */

interface ClientContact {
  contactPersonName: string;
  email: string;
  PhoneNumber: string;
  clientId: string;
  client: string;
}

export interface Tenant {
  id?: string;
  companyName: string;
  companyEmail: string;
  phoneNumber: string;
  address: string;
  businessSize: string;
  industry: string;
  country: string;
  region: string;
  timezone: string;
  subscription: Subscription;
  subscriptionDate: string;
  subscriptionEndDate: string;
  subscriptionType: string;
  subscriptionStatus: string;
  domainName: string;
  domainUrl: string;
  description: string;
  logo: string;
  stamp: string;
  billingEmail: string;
  billingPhoneNumber: string;
  notes: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhoneNumber: string;
  preferredIndustry: string;
  clientContacts: ClientContact[];
}
