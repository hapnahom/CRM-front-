/** Normalize partner role id lists (dedupe, drop empties). */
export function normalizePartnerRoleIds(
  roleIds: string[] | undefined,
): string[] {
  if (!roleIds?.length) return [];
  return [...new Set(roleIds.filter(Boolean))];
}
