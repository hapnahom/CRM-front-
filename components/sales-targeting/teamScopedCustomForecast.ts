/**
 * Team-scoped custom forecast (one salesTeamId on create) — used by:
 * - Hybrid company Details (expanded team under a department)
 * - B2T / Hybrid team Details (`customDefaultTeamId` on TargetAmountField)
 * - My Approvals proposal modify (`TeamProposalOpportunityPicker.salesTeamId`)
 *
 * Company-level TTB Details with multi-team select is intentionally different.
 */

/** Default footnote on TTB/Hybrid team Details when the team is fixed (no Teams field). */
export const TEAM_SCOPED_CUSTOM_OPPORTUNITY_HINT =
  'Attached to this team proposal and included in the approval workflow.';

export function resolveCustomForecastSalesTeamId(
  teamId: string | null | undefined,
): string | undefined {
  const id = teamId?.trim();
  return id || undefined;
}
