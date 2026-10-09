'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { message } from 'antd';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import SimpleLogo from '@/components/common/logo/simpleLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/utils/firebaseConfig';
import { cn } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);

  const canSubmit = Boolean(email.trim());
  const submitDisabled = isPending || !canSubmit;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      message.success('Password reset email sent. Check your inbox.');
    } catch {
      message.error('Could not send a reset email. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5">
          <SimpleLogo size={56} />
        </div>

        <h1 className="text-[1.65rem] font-bold tracking-tight text-neutral-900">
          Forgot password?
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          We&apos;ll email you a link to reset your password.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full space-y-3 text-left"
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-lg border-neutral-200 bg-white px-3.5 text-sm shadow-none"
            autoComplete="email"
          />
          <Button
            type="submit"
            size="lg"
            disabled={submitDisabled}
            className={cn(
              'mt-1 h-12 w-full rounded-lg text-sm font-semibold shadow-none',
              submitDisabled &&
                !isPending &&
                'bg-neutral-300 text-white hover:bg-neutral-300',
            )}
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <Link
          href="/authentication/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    </AuthPageShell>
  );
}
