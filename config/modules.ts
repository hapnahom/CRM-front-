/**
 * Frontend module visibility flags.
 *
 * Values come from NEXT_PUBLIC_* env vars (baked in at `next build`).
 * Unset or empty flags default to enabled. Set to "false" to hide a module.
 *
 * Development/test: omit the vars, or set NEXT_PUBLIC_MODULE_*_ENABLED=true
 * Staging/production: NEXT_PUBLIC_MODULE_*_ENABLED=false
 */
function isPublicFlagEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== 'false';
}

export const moduleConfig = {
  marketing: isPublicFlagEnabled(
    process.env.NEXT_PUBLIC_MODULE_MARKETING_ENABLED,
  ),
  reports: isPublicFlagEnabled(process.env.NEXT_PUBLIC_MODULE_REPORTS_ENABLED),
  // Gated by the same env var as Marketing (no separate NEXT_PUBLIC_* flag).
  aiInsights: isPublicFlagEnabled(
    process.env.NEXT_PUBLIC_MODULE_MARKETING_ENABLED,
  ),
} as const;

export type ModuleId = keyof typeof moduleConfig;

const MODULE_PATH_PREFIXES: Record<ModuleId, readonly string[]> = {
  marketing: ['/marketing'],
  reports: ['/reports'],
  // Embedded UI only — no standalone routes to guard.
  aiInsights: [],
};

export function isModuleEnabled(moduleId: ModuleId): boolean {
  return moduleConfig[moduleId];
}

/** Returns false when `pathname` belongs to a disabled module. */
export function isModulePathEnabled(pathname: string): boolean {
  for (const moduleId of Object.keys(MODULE_PATH_PREFIXES) as ModuleId[]) {
    const enabled = moduleConfig[moduleId];
    if (enabled) continue;

    for (const prefix of MODULE_PATH_PREFIXES[moduleId]) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return false;
      }
    }
  }

  return true;
}
