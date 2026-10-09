import axios from 'axios';

/** HTTP status from an Axios (or Axios-like) error, if present. */
export function getHttpStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: unknown } }).response &&
    typeof (error as { response: { status?: unknown } }).response.status ===
      'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
}

/** True when the error is an HTTP 403 Forbidden (missing permission). */
export function isForbiddenError(error: unknown): boolean {
  return getHttpStatus(error) === 403;
}
