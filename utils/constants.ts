// CRM API Configuration

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL;

export const NOTIFICATION_URL = process.env.NOTIFICATION_URL;
export const EMAIL_URL = process.env.EMAIL_URL;

export const IS_CORE =
  (process.env.NEXT_PUBLIC_IS_CORE ?? '').trim().toLowerCase() === 'true';

/**
 * Must match `basePath` in next.config.mjs (set only when IS_CORE).
 * Use for `window.location` navigations — Next's router prefixes automatically,
 * but hard browser navigations do not.
 */
export const APP_BASE_PATH = IS_CORE ? '/business' : '';

/** Prefix an in-app path for hard navigations (`window.location`). */
export function appPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}

export const DATE_FORMAT = 'DD MMM YYYY';
export const DATETIME_FORMAT = 'DD MMM YYYY hh:mm A';
export const TIME_FORMAT = 'hh:mm A';

export const FILE_URL =
  process.env.NEXT_PUBLIC_FILE_URL ?? process.env.FILE_URL;

/** Fallback max upload size when a FILE custom field has no maxFileSize (25 MB). */
export const DEFAULT_FILE_UPLOAD_MAX_MB = (() => {
  const parsed = Number.parseInt(
    process.env.NEXT_PUBLIC_FILE_UPLOAD_MAX_MB ?? '25',
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
})();

export const DEFAULT_FILE_UPLOAD_MAX_BYTES =
  DEFAULT_FILE_UPLOAD_MAX_MB * 1024 * 1024;
