import type { SalesTargetPlan } from '@/store/server/features/salesTargeting/types';

/** Same plan pick as SalesTargetingContext (published → draft → latest). */
export function pickActiveSalesTargetPlan(
  plans: SalesTargetPlan[],
  calendarId: string,
): SalesTargetPlan | null {
  const fyPlans = plans
    .filter(
      (plan) => plan.calendarId === calendarId && plan.status !== 'archived',
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const published = fyPlans.find((plan) => plan.status === 'published');
  const draft = fyPlans.find((plan) => plan.status === 'draft');
  return published ?? draft ?? fyPlans[0] ?? null;
}
