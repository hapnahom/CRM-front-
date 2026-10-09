'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/** Normalise Axios / generic errors into user-facing copy for user-management. */
export function parseUserManagementHttpError(error: unknown): {
  status?: number;
  title: string;
  description: string;
  isUnauthorized: boolean;
  isForbidden: boolean;
} {
  let status: number | undefined;
  let rawMessage = '';

  if (axios.isAxiosError(error)) {
    status = error.response?.status;
    const data = error.response?.data;
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
    ) {
      rawMessage = (data as { message: string }).message.trim();
    } else if (typeof data === 'string' && data.trim()) {
      rawMessage = data.trim();
    } else {
      rawMessage = (error.response?.statusText ?? error.message ?? '').trim();
    }
  } else if (error instanceof Error) {
    rawMessage = error.message;
  }

  const isUnauthorized = status === 401;
  const isForbidden = status === 403;

  if (isUnauthorized) {
    return {
      status,
      title: 'Session expired or access denied',
      description:
        'Your CRM session may have expired, or your account cannot access user management right now. Sign in again or contact an administrator.',
      isUnauthorized: true,
      isForbidden: false,
    };
  }

  if (isForbidden) {
    return {
      status,
      title: 'Permission denied',
      description:
        rawMessage ||
        'You do not have permission to view or change this information.',
      isUnauthorized: false,
      isForbidden: true,
    };
  }

  if (status === 503 || status === 502 || status === 504) {
    return {
      status,
      title: 'Service temporarily unavailable',
      description:
        rawMessage ||
        'The server could not complete this request. Please try again in a moment.',
      isUnauthorized: false,
      isForbidden: false,
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      status,
      title: 'Server error',
      description:
        rawMessage ||
        'Something went wrong on the server. Please try again later.',
      isUnauthorized: false,
      isForbidden: false,
    };
  }

  return {
    status,
    title: 'Unable to load data',
    description:
      rawMessage ||
      (status !== undefined
        ? `Request failed (${status}).`
        : 'Check your connection and try again.'),
    isUnauthorized: false,
    isForbidden: false,
  };
}

/**
 * Ant Design / mutation-friendly one-liner message.
 * Returns null for 403 — callers must not toast missing-permission errors;
 * UI should hide features the user cannot access instead.
 */
export function userManagementErrorToast(error: unknown): string | null {
  const { isUnauthorized, isForbidden, description, title } =
    parseUserManagementHttpError(error);
  if (isForbidden) {
    return null;
  }
  return isUnauthorized ? `${title}: ${description}` : description || title;
}

type BannerProps = {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function UserManagementQueryErrorBanner({
  error,
  onRetry,
  retrying,
  className,
}: BannerProps) {
  const router = useRouter();
  const parsed = parseUserManagementHttpError(error);

  if (parsed.isForbidden) return null;

  return (
    <Alert
      variant="destructive"
      className={cn(
        'border-[#fecaca] bg-[#fef2f2] text-[#991b1b] [&_*[data-slot=alert-description]]:text-[#7f1d1d]',
        className,
      )}
    >
      {parsed.isUnauthorized ? (
        <ShieldAlert className="text-[#b91c1c]" aria-hidden />
      ) : (
        <AlertCircle className="text-[#b91c1c]" aria-hidden />
      )}
      <AlertTitle className="text-[#7f1d1d]">{parsed.title}</AlertTitle>
      <AlertDescription className="text-[#991b1b]">
        {parsed.description}
      </AlertDescription>
      {(onRetry || parsed.isUnauthorized) && (
        <AlertAction className="flex gap-2">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              className="h-8 border-[#fca5a5] bg-surface-card text-[#991b1b] hover:bg-[#fff7f7]"
              onClick={() => onRetry()}
              disabled={retrying}
            >
              {retrying ? 'Retrying…' : 'Try again'}
            </Button>
          )}
          {parsed.isUnauthorized && (
            <Button
              size="sm"
              type="button"
              className="h-8 bg-[#dc2626] text-brand-foreground hover:bg-[#b91c1c]"
              onClick={() => router.push('/authentication/login')}
            >
              Sign in
            </Button>
          )}
        </AlertAction>
      )}
    </Alert>
  );
}

type FillProps = {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/** Centered block for empty table / full-page region. */
export function UserManagementQueryErrorFill({
  error,
  onRetry,
  retrying,
  className,
}: FillProps) {
  const router = useRouter();
  const parsed = parseUserManagementHttpError(error);

  if (parsed.isForbidden) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2]">
        {parsed.isUnauthorized ? (
          <ShieldAlert size={22} className="text-[#b91c1c]" aria-hidden />
        ) : (
          <AlertCircle size={22} className="text-[#b91c1c]" aria-hidden />
        )}
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-base font-semibold text-[#7f1d1d]">
          {parsed.title}
        </h3>
        <p className="text-sm text-[#991b1b]">{parsed.description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="border-[#fca5a5] bg-surface-card text-[#991b1b] hover:bg-[#fff7f7]"
            onClick={() => onRetry()}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Try again'}
          </Button>
        )}
        {parsed.isUnauthorized && (
          <Button
            size="sm"
            type="button"
            className="bg-[#dc2626] text-brand-foreground hover:bg-[#b91c1c]"
            onClick={() => router.push('/authentication/login')}
          >
            Sign in
          </Button>
        )}
      </div>
    </div>
  );
}

type InlineProps = {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function UserManagementQueryErrorInline({
  error,
  onRetry,
  retrying,
  className,
}: InlineProps) {
  const parsed = parseUserManagementHttpError(error);

  if (parsed.isForbidden) return null;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-4 text-center text-sm text-[#991b1b]',
        className,
      )}
    >
      <p className="font-medium text-[#7f1d1d]">{parsed.title}</p>
      <p className="mt-1 text-[#991b1b]">{parsed.description}</p>
      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 h-8 border-[#fca5a5] bg-surface-card text-[#991b1b]"
          onClick={() => onRetry()}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      )}
    </div>
  );
}
