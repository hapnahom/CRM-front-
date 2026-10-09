'use client';

import { useEffect, useState } from 'react';
import { CRM_URL } from '@/utils/constants';
import { communicationAuthHeaders } from '@/store/server/features/communication/queries';
import { cn } from '@/lib/utils';

type MintResponse = { url: string; exp: number; token: string };

const mintCache = new Map<string, { url: string; exp: number }>();
const mintInflight = new Map<string, Promise<string | null>>();

function cacheKey(
  accountId: string,
  email?: string | null,
  name?: string | null,
) {
  return `${accountId}|${(email || '').trim().toLowerCase()}|${(name || '').trim()}`;
}

export function resolveMintedUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (CRM_URL || '').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

async function mintAvatarUrl(
  accountId: string,
  email?: string | null,
  name?: string | null,
): Promise<string | null> {
  const key = cacheKey(accountId, email, name);
  const cached = mintCache.get(key);
  const now = Math.floor(Date.now() / 1000);
  // Refresh 5 minutes before expiry.
  if (cached && cached.exp > now + 300) {
    return cached.url;
  }

  const existing = mintInflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const headers = await communicationAuthHeaders();
      const qs = new URLSearchParams();
      if (email?.trim()) qs.set('email', email.trim());
      if (name?.trim()) qs.set('name', name.trim());
      const res = await fetch(
        `${CRM_URL}/communication/accounts/${accountId}/people/avatar-url?${qs.toString()}`,
        { headers },
      );
      if (!res.ok) return null;
      const raw = await res.json();
      const data = (raw?.url ? raw : raw?.data) as MintResponse | undefined;
      if (!data?.url) return null;
      const url = resolveMintedUrl(data.url);
      mintCache.set(key, { url, exp: Number(data.exp) || now + 86_400 });
      return url;
    } catch {
      return null;
    } finally {
      mintInflight.delete(key);
    }
  })();

  mintInflight.set(key, promise);
  return promise;
}

function initialsFrom(name?: string | null, email?: string | null) {
  const cleaned = String(name || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned && !cleaned.includes('@')) {
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length) {
      return parts
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
    }
  }
  const local = String(email || '')
    .split('@')[0]
    ?.replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2);
  return (local || '?').toUpperCase();
}

/**
 * Loads a signed CRM avatar proxy URL (HMAC) for <img src>.
 * Skips minting when `avatarUrl` is pre-supplied by the list/detail API.
 */
export function useCommunicationAvatarUrl(
  accountId?: string | null,
  email?: string | null,
  name?: string | null,
  avatarUrl?: string | null,
) {
  const preloaded = avatarUrl?.trim()
    ? resolveMintedUrl(avatarUrl.trim())
    : null;

  const [url, setUrl] = useState<string | null>(() => {
    if (preloaded) return preloaded;
    if (!accountId) return null;
    const cached = mintCache.get(cacheKey(accountId, email, name));
    return cached?.url ?? null;
  });
  const [ready, setReady] = useState(() => {
    if (preloaded) return true;
    if (!accountId) return true;
    return mintCache.has(cacheKey(accountId, email, name));
  });

  useEffect(() => {
    let cancelled = false;
    if (preloaded) {
      setUrl(preloaded);
      setReady(true);
      return;
    }
    if (!accountId) {
      setUrl(null);
      setReady(true);
      return;
    }

    setReady(false);
    void mintAvatarUrl(accountId, email, name).then((next) => {
      if (!cancelled) {
        setUrl(next);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accountId, email, name, preloaded]);

  return { url, ready };
}

type CommunicationAvatarProps = {
  accountId?: string | null;
  email?: string | null;
  name?: string | null;
  /** Pre-minted signed URL from list/detail API — skips per-row mint requests. */
  avatarUrl?: string | null;
  className?: string;
  /** Fallback initials tile classes when mint is still loading */
  fallbackClassName?: string;
};

/**
 * Consistent signed-proxy avatar for lists, threads, compose, and account switcher.
 */
export function CommunicationAvatar({
  accountId,
  email,
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: CommunicationAvatarProps) {
  const { url, ready } = useCommunicationAvatarUrl(
    accountId,
    email,
    name,
    avatarUrl,
  );
  const initials = initialsFrom(name, email);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed CRM avatar proxy URL
      <img src={url} alt="" className={cn('object-cover', className)} />
    );
  }

  if (!ready) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground',
          fallbackClassName || className,
        )}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground',
        fallbackClassName || className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
