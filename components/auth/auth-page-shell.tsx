'use client';

import Link from 'next/link';
import { BrandWashBackground } from '@/components/auth/brand-wash-background';

export function AuthPageShell({
  children,
  showHelp = true,
}: {
  children: React.ReactNode;
  showHelp?: boolean;
}) {
  return (
    <div className="login-page-wash relative flex min-h-svh flex-col overflow-hidden text-foreground">
      <BrandWashBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] animate-fade-in">{children}</div>
      </div>

      {showHelp ? (
        <div className="relative z-10 flex flex-col items-center gap-2 pb-6">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            <Link href="/privacy" className="transition hover:text-primary">
              Privacy Policy
            </Link>
            <span aria-hidden className="text-neutral-300">
              ·
            </span>
            <Link href="/terms" className="transition hover:text-primary">
              Terms of Service
            </Link>
          </div>
          <Link
            href="mailto:support@selamnew.com"
            className="text-sm text-neutral-500 transition hover:text-primary"
          >
            Need help?
          </Link>
        </div>
      ) : null}
    </div>
  );
}
