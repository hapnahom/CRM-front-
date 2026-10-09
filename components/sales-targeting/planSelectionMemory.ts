import type { TargetSettingMethod } from '@/store/server/features/salesTargeting/types';

const STORAGE_PREFIX = 'sales-targeting:lastPlanByMethod:';

type MethodPlanMap = Partial<Record<TargetSettingMethod, string>>;

function readStorage(calendarId: string): MethodPlanMap {
  if (typeof window === 'undefined') return {};
  try {
    const key = `${STORAGE_PREFIX}${calendarId}`;
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as MethodPlanMap;
  } catch {
    return {};
  }
}

export function readLastPlanByMethod(calendarId: string): MethodPlanMap {
  return readStorage(calendarId);
}

export function writeLastPlanForMethod(
  calendarId: string,
  method: TargetSettingMethod,
  planId: string,
): void {
  if (typeof window === 'undefined') return;
  const current = readStorage(calendarId);
  current[method] = planId;
  const key = `${STORAGE_PREFIX}${calendarId}`;
  const payload = JSON.stringify(current);
  localStorage.setItem(key, payload);
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    // sessionStorage quota — localStorage is enough
  }
}
