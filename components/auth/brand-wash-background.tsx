'use client';

import { cn } from '@/lib/utils';

type BrandWashVariant = 'default' | 'home';

/**
 * Soft atmospheric wash (ported from Selamnew Core).
 * Uses CRM brand orange (`--color-brand`) + peach corner accent.
 */
export function BrandWashBackground({
  variant = 'default',
}: {
  variant?: BrandWashVariant;
}) {
  if (variant === 'home') {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] max-h-[420px]"
          style={{
            background:
              'radial-gradient(90% 80% at 50% 100%, color-mix(in srgb, var(--color-brand) 12%, transparent) 0%, color-mix(in srgb, var(--color-orange) 8%, transparent) 35%, transparent 70%)',
            maskImage: 'linear-gradient(0deg, #000 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(0deg, #000 0%, transparent 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[5%] -bottom-[18%] size-[min(80vw,580px)] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, #f5d4c0 48%, transparent) 0%, transparent 68%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[8%] -bottom-[20%] size-[min(65vw,460px)] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-orange) 28%, transparent) 0%, transparent 70%)',
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[48vh] max-h-96"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -5%, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, color-mix(in srgb, var(--color-orange) 10%, transparent) 38%, transparent 72%)',
          maskImage: 'linear-gradient(180deg, #000 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-[10%] -bottom-[15%] size-[min(70vw,520px)] rounded-full opacity-35 blur-3xl',
        )}
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, #f5d4c0 40%, transparent) 0%, transparent 68%)',
        }}
      />
    </>
  );
}
