/** NestJS / axios error message helper for communication mutations. */
export function communicationApiErrorMessage(
  error: unknown,
  fallback: string,
): string | null {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 403) {
    return null;
  }
  const data = (error as { response?: { data?: unknown } })?.response?.data as
    | {
        message?: string | string[] | { message?: string };
      }
    | undefined;
  const msg = data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (Array.isArray(msg) && msg[0]) return String(msg[0]);
  if (msg && typeof msg === 'object' && typeof msg.message === 'string') {
    return msg.message;
  }
  return fallback;
}
