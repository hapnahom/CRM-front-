/**
 * Normalize file-server upload responses from CRM `/files/upload`.
 * Handles flat and nested `{ data: { viewImage, image } }` payloads.
 */
export function resolveFileServerUploadUrl(
  responseData: unknown,
): string | null {
  const body = (responseData ?? {}) as Record<string, unknown>;
  const nested =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : {};

  const candidates = [
    nested.viewImage,
    nested.image,
    body.viewImage,
    body.image,
    typeof body === 'string' ? body : null,
  ];

  const raw = candidates.find(
    (value): value is string =>
      typeof value === 'string' && Boolean(value.trim()),
  );

  return raw?.trim() ?? null;
}
