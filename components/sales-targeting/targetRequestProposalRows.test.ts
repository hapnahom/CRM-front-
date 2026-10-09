import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';
import {
  departmentDetailsProposalApprovalLabel,
  pickB2TDepartmentDisplayRequest,
  pickCompanyDetailsDisplayRequest,
} from '@/components/sales-targeting/targetRequestProposalRows';

function req(
  id: string,
  teamId: string,
  status: SalesTargetRequest['status'],
  amount: number,
  submittedAt?: string,
): SalesTargetRequest {
  return {
    id,
    teamId,
    status,
    horizon: 'annual',
    sessionId: null,
    currencyId: 'cur-1',
    currentRevisionId: 'rev-1',
    createdAt: submittedAt ?? '2026-01-01T00:00:00.000Z',
    submittedAt: submittedAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: submittedAt ?? '2026-01-01T00:00:00.000Z',
    revisions: [
      {
        id: 'rev-1',
        revisionNumber: 1,
        amount,
        opportunities: [],
      },
    ],
  } as SalesTargetRequest;
}

describe('pickB2TDepartmentDisplayRequest', () => {
  const scope = { horizon: 'annual' as const, currencyId: 'cur-1' };

  it('shows dept-approved when no company-approved yet', () => {
    const rows = [req('1', 't1', 'DEPARTMENT_APPROVED', 100)];
    expect(pickB2TDepartmentDisplayRequest(rows, 't1', scope, false)?.id).toBe(
      '1',
    );
  });

  it('hides pending department (not step 1 complete)', () => {
    const rows = [req('1', 't1', 'PENDING_DEPARTMENT', 100)];
    expect(
      pickB2TDepartmentDisplayRequest(rows, 't1', scope, false),
    ).toBeUndefined();
  });

  it('returns company-approved request and replaces dept-only pipeline', () => {
    const rows = [
      req('1', 't1', 'DEPARTMENT_APPROVED', 100, '2026-01-01T00:00:00.000Z'),
      req('2', 't1', 'COMPANY_APPROVED', 200, '2026-01-02T00:00:00.000Z'),
    ];
    expect(pickB2TDepartmentDisplayRequest(rows, 't1', scope, false)?.id).toBe(
      '2',
    );
  });

  it('prefers pending-company over dept-approved for the same team', () => {
    const rows = [
      req('1', 't1', 'DEPARTMENT_APPROVED', 100, '2026-01-01T00:00:00.000Z'),
      req('2', 't1', 'PENDING_COMPANY', 150, '2026-01-02T00:00:00.000Z'),
    ];
    expect(pickB2TDepartmentDisplayRequest(rows, 't1', scope, false)?.id).toBe(
      '2',
    );
    expect(
      pickB2TDepartmentDisplayRequest(rows, 't1', scope, false)?.status,
    ).toBe('PENDING_COMPANY');
  });

  it('labels pending company as dept approved on department Details', () => {
    expect(departmentDetailsProposalApprovalLabel('PENDING_COMPANY')).toBe(
      'Dept approved',
    );
    expect(departmentDetailsProposalApprovalLabel('COMPANY_APPROVED')).toBe(
      'Company approved',
    );
  });

  it('keeps prior company-approved during in-flight new cycle', () => {
    const rows = [
      req('old', 't1', 'COMPANY_APPROVED', 500, '2026-01-01T00:00:00.000Z'),
      req('new', 't1', 'PENDING_DEPARTMENT', 900, '2026-02-01T00:00:00.000Z'),
    ];
    expect(pickB2TDepartmentDisplayRequest(rows, 't1', scope, false)?.id).toBe(
      'old',
    );
  });
});

describe('pickCompanyDetailsDisplayRequest', () => {
  const scope = { horizon: 'annual' as const, currencyId: 'cur-1' };

  it('returns undefined when only dept-approved exists', () => {
    const rows = [req('1', 't1', 'DEPARTMENT_APPROVED', 100)];
    expect(pickCompanyDetailsDisplayRequest(rows, 't1', scope)).toBeUndefined();
  });

  it('returns company-approved when present', () => {
    const rows = [
      req('1', 't1', 'DEPARTMENT_APPROVED', 100, '2026-01-01T00:00:00.000Z'),
      req('2', 't1', 'COMPANY_APPROVED', 200, '2026-01-02T00:00:00.000Z'),
    ];
    expect(pickCompanyDetailsDisplayRequest(rows, 't1', scope)?.id).toBe('2');
  });
});
