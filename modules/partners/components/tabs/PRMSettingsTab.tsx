'use client';

import { PartnerRolesSettings } from '../../roles';

/**
 * Partner Settings — tiers, partnership types, solutions workflow toggles,
 * partners report coloring, and partner roles (including per-role solution
 * slot config and role-scoped custom fields).
 */
export function PRMSettingsTab({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  return <PartnerRolesSettings embedded={embedded} />;
}
