import type { FieldValidationIssue } from '@/modules/custom-fields/validation/types';

export function splitValidationIssues(issues: FieldValidationIssue[]) {
  const required = issues.filter((i) => i.code === 'REQUIRED');
  const ruleFailed = issues.filter((i) => i.code === 'RULE_FAILED');
  return { required, ruleFailed };
}

export function validationSummaryFromIssues(issues: FieldValidationIssue[]) {
  return issues.map((i) => i.message).join('; ');
}

export function issuesToErrorMap(issues: FieldValidationIssue[]) {
  const next: Record<string, string> = {};
  for (const issue of issues) next[issue.entityFieldId] = issue.message;
  return next;
}

export type CustomFieldValidationErrorPayload = {
  canRequestException?: boolean;
  exceptionApprovalWorkflowId?: string | null;
  errors?: FieldValidationIssue[];
  message?: string;
};

/** Nest may nest the payload under `message` or return it at the top level. */
export function parseCustomFieldValidationError(
  error: unknown,
): CustomFieldValidationErrorPayload | null {
  const data = (
    error as {
      response?: {
        data?: CustomFieldValidationErrorPayload & { message?: unknown };
      };
    }
  )?.response?.data;
  if (!data || typeof data !== 'object') return null;
  if (
    data.canRequestException != null ||
    data.exceptionApprovalWorkflowId != null ||
    Array.isArray(data.errors)
  ) {
    return data;
  }
  const nested = data.message;
  if (nested && typeof nested === 'object') {
    return nested as CustomFieldValidationErrorPayload;
  }
  return null;
}
