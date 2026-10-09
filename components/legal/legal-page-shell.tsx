'use client';

import Link from 'next/link';
import { BrandWashBackground } from '@/components/auth/brand-wash-background';
import SimpleLogo from '@/components/common/logo/simpleLogo';

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="login-page-wash relative flex min-h-svh flex-col overflow-hidden text-foreground">
      <BrandWashBackground />

      <div className="relative z-10 flex flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-3xl animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/authentication/login" className="mb-5">
              <SimpleLogo size={48} />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Last updated: {lastUpdated}
            </p>
          </div>

          <article className="rounded-xl border border-neutral-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-10">
            <div className="legal-prose space-y-6 text-sm leading-relaxed text-neutral-700 sm:text-[0.9375rem]">
              {children}
            </div>
          </article>
        </div>
      </div>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-8 text-sm text-neutral-500">
        <Link href="/privacy" className="transition hover:text-primary">
          Privacy Policy
        </Link>
        <span aria-hidden className="text-neutral-300">
          ·
        </span>
        <Link href="/terms" className="transition hover:text-primary">
          Terms of Service
        </Link>
        <span aria-hidden className="text-neutral-300">
          ·
        </span>
        <Link
          href="mailto:support@selamnew.com"
          className="transition hover:text-primary"
        >
          support@selamnew.com
        </Link>
      </footer>
    </div>
  );
}
