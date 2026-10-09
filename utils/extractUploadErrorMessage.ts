import { isAxiosError } from 'axios';

/** User-facing message from CRM `/files/upload` failures. */
export function extractUploadErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      const trimmed = data.trim();
      if (/payload too large/i.test(trimmed)) {
        return 'File is too large. Choose a smaller file or ask your admin to raise the upload limit.';
      }
      return trimmed;
    }
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const message = record.message;
      if (typeof message === 'string' && message.trim()) {
        if (/payload too large|<!doctype html/i.test(message)) {
          return 'File is too large. Choose a smaller file or ask your admin to raise the upload limit.';
        }
        return message.trim();
      }
    }
    if (error.response?.status === 413) {
      return 'File is too large. Choose a smaller file or ask your admin to raise the upload limit.';
    }
    if (error.response?.status === 502 || error.response?.status === 503) {
      return 'File upload service is temporarily unavailable. Please try again later.';
    }
  }

  return 'Could not upload file. Please try again.';
}
