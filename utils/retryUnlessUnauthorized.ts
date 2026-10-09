/**
 * React Query retry helper: do not retry auth / permission failures.
 * Missing permission (403) should not spam the network or surface as errors —
 * the UI hides features the user cannot access.
 */
export function retryUnlessUnauthorized(
  failureCount: number,
  err: unknown,
): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 3;
}
