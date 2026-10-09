/**
 * Canonical tenant header across services.
 */
export function tenantHeadersFromStoreTenantId(
  tenantId: string | undefined | null,
): Record<string, string> {
  if (tenantId == null || tenantId === '') return {};
  const id = String(tenantId).trim();
  if (!id) return {};
  return { tenantId: id };
}
