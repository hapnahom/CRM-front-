'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type CustomerAvatarProps = {
  name: string;
  initials: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
} as const;

const ICON_SIZE = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export function CustomerAvatar({
  name,
  logoUrl,
  size = 'sm',
  className,
}: CustomerAvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);
  const showLogo = Boolean(logoUrl) && !failed;

  if (showLogo) {
    return (
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white',
          SIZE_CLASS[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          className="size-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border border-border bg-slate-100 text-sky-600',
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
      title={name}
    >
      <Globe size={ICON_SIZE[size]} strokeWidth={1.75} />
    </span>
  );
}
