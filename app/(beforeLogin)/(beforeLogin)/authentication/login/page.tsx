'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import {
  auth,
  googleProvider,
  microsoftProvider,
} from '@/utils/firebaseConfig';
import { Eye, EyeOff } from 'lucide-react';
import { Google } from '@/components/Icons/google';
import { Microsoft } from '@/components/Icons/microsoft';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import SimpleLogo from '@/components/common/logo/simpleLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useHandleSignIn } from './_components/signinHandler';
import { cn } from '@/lib/utils';

const Login: FC = () => {
  const { loading } = useAuthenticationStore();
  const { handleSignIn } = useHandleSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = Boolean(email.trim() && password);

  const handleEmailPasswordSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    void handleSignIn(() =>
      signInWithEmailAndPassword(auth, email.toLowerCase(), password),
    );
  };

  const handleGoogleSignIn = () =>
    handleSignIn(() => signInWithPopup(auth, googleProvider), 'google.com');

  const handleMicrosoftSignIn = () =>
    handleSignIn(
      () => signInWithPopup(auth, microsoftProvider),
      'microsoft.com',
    );

  return (
    <AuthPageShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5">
          <SimpleLogo size={56} />
        </div>

        <h1 className="text-[1.65rem] font-bold tracking-tight text-neutral-900">
          Welcome back!
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to open your Selamnew Business.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center gap-2.5 rounded-lg border-neutral-200 bg-white text-sm font-medium text-neutral-800 shadow-none hover:bg-neutral-50"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            <Google />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center gap-2.5 rounded-lg border-neutral-200 bg-white text-sm font-medium text-neutral-800 shadow-none hover:bg-neutral-50"
            disabled={loading}
            onClick={handleMicrosoftSignIn}
          >
            <Microsoft />
            Continue with Microsoft
          </Button>
        </div>

        <div className="my-6 flex w-full items-center gap-3 text-sm text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form
          onSubmit={handleEmailPasswordSignIn}
          className="w-full space-y-3 text-left"
        >
          <Input
            id="email"
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-lg border-neutral-200 bg-white px-3.5 text-sm shadow-none"
            autoComplete="email"
            required
          />

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-lg border-neutral-200 bg-white px-3.5 pr-11 text-sm shadow-none"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-700"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading || !canSubmit}
            className={cn(
              'mt-1 h-12 w-full rounded-lg text-sm font-semibold shadow-none',
              !canSubmit &&
                !loading &&
                'bg-neutral-300 text-white hover:bg-neutral-300',
            )}
          >
            {loading ? 'Signing in…' : 'Log In'}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/authentication/login/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </AuthPageShell>
  );
};

export default Login;
