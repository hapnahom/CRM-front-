import axios from 'axios';

export function isFiscalYearApiUnavailableError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  if (status === 404 || status === 501 || status === 502 || status === 503) {
    return true;
  }

  if (!error.response && error.code === 'ERR_NETWORK') {
    return true;
  }

  return false;
}
