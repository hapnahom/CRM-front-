'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock,
  ArrowRight,
  Shield,
  AtSign,
  CalendarClock,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useGetInvitationDecisionData } from '@/store/server/features/invitations/queries';
import {
  useAcceptInvitation,
  useDeclineInvitation,
} from '@/store/server/features/invitations/mutations';
import type { InvitationDecisionData } from '@/store/server/features/invitations/types';

const PLATFORM_NAME = 'Selamnew Business';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isExpiredDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDistanceStrictToNowFuture(target: Date): string {
  const ms = Math.max(0, target.getTime() - Date.now());
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

// ── Detail row ────────────────────────────────────────────────────────────────

function InvitationDetailRow({
  label,
  value,
  icon,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
        <CardDescription className="text-sm">{label}</CardDescription>
      </div>
      <span
        className={cn(
          'text-sm font-medium text-foreground',
          mono && 'font-mono text-xs',
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Active invitation content ─────────────────────────────────────────────────

function ActiveContent({
  token,
  data,
}: {
  token: string;
  data: InvitationDecisionData;
}) {
  const router = useRouter();
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);

  const { mutate: accept, isLoading: accepting } = useAcceptInvitation();
  const { mutate: decline, isLoading: declining } = useDeclineInvitation();

  const busy = accepting || declining;
  const { invitation, inviter, invitee, assignedRoles, assignedTeam } = data;
  const expires = new Date(invitation.expiresAt);
  const expired = isExpiredDate(expires) || !invitation.canAcceptOrDecline;
  const rolesLabel = assignedRoles.map((r) => r.name).join(', ') || 'Member';
  const teamLabel = assignedTeam?.name ?? null;

  const handleAccept = () => {
    accept(token, { onSuccess: () => setResult('accepted') });
  };

  const handleDecline = () => {
    decline(token, {
      onSuccess: () => {
        setDeclineOpen(false);
        setResult('declined');
      },
    });
  };

  // ── Post-action result screens ────────────────────────────────────────────

  if (result === 'accepted') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-[10px] ring-emerald-50/60">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to {PLATFORM_NAME}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your account has been activated. You&apos;re all set to sign in and
            start collaborating.
          </p>
        </div>
        <Button
          size="lg"
          className="mt-1 min-w-[11rem] bg-brand text-brand-foreground shadow-md shadow-brand/25 hover:bg-brand-hover"
          onClick={() => router.push('/authentication/login')}
        >
          Sign in to get started
        </Button>
      </div>
    );
  }

  if (result === 'declined') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 ring-[10px] ring-slate-100/60">
          <XCircle size={40} className="text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Invitation declined
          </h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ve declined the invitation to join {PLATFORM_NAME}. You can
            close this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Expired / already-used ────────────────────────────────────────────────

  if (!invitation.canAcceptOrDecline) {
    const label =
      invitation.status === 'accepted'
        ? 'already accepted'
        : invitation.status === 'declined' || invitation.status === 'revoked'
          ? 'declined'
          : 'expired';

    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 ring-[10px] ring-amber-50/60">
          <Clock size={40} className="text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold capitalize text-foreground">
            Invitation {label}
          </h2>
          <p className="text-sm text-muted-foreground">
            This invitation link is no longer valid. Please contact your
            administrator for a new one.
          </p>
        </div>
        {invitation.status === 'accepted' && (
          <Button
            size="lg"
            className="mt-1 min-w-[11rem] bg-brand text-brand-foreground shadow-md shadow-brand/25 hover:bg-brand-hover"
            onClick={() => router.push('/authentication/login')}
          >
            Sign in
          </Button>
        )}
      </div>
    );
  }

  // ── Active invitation ─────────────────────────────────────────────────────

  return (
    <>
      {/* Hero section */}
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center text-center mb-3">
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand"
        >
          <Mail className="h-3.5 w-3.5" />
          You&apos;ve been invited
        </Badge>

        {/* Inviter → platform avatars */}
        <div className="mb-7 flex items-center justify-center">
          <Avatar className="h-24 w-24 border-[3px] border-background shadow-lg sm:h-28 sm:w-28 sm:border-4">
            <AvatarImage
              src={inviter.avatarUrl ?? undefined}
              alt={inviter.name ?? 'Inviter'}
            />
            <AvatarFallback className="bg-gradient-to-br from-[#ed6925]/20 to-[#ed6925]/10 text-lg font-semibold text-brand">
              {getInitials(inviter.name)}
            </AvatarFallback>
          </Avatar>
          <div className="mx-1.5 flex items-center gap-0.5 sm:mx-2">
            <div className="h-px w-5 bg-gradient-to-r from-[#ed6925]/30 to-[#ed6925] sm:w-6" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand shadow-md">
              <ArrowRight className="h-4 w-4 text-brand-foreground" />
            </div>
            <div className="h-px w-5 bg-gradient-to-r from-[#ed6925] to-[#ed6925]/30 sm:w-6" />
          </div>
          <Avatar className="h-24 w-24 border-[3px] border-background shadow-lg sm:h-28 sm:w-28 sm:border-4">
            <AvatarImage
              src={invitee.avatarUrl ?? undefined}
              alt={invitee.name ?? 'You'}
            />
            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-50 text-lg font-semibold text-slate-600">
              {getInitials(invitee.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Title */}
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Join{' '}
          <span className="bg-gradient-to-r from-[#ed6925] to-[#f08040] bg-clip-text text-transparent">
            {PLATFORM_NAME}
          </span>
          {assignedRoles.length > 0 && (
            <span className="text-foreground"> as {rolesLabel}</span>
          )}
          {teamLabel && (
            <span className="text-foreground"> on {teamLabel}</span>
          )}
        </h1>

        <p className="mt-3 max-w-lg text-pretty text-base text-muted-foreground">
          <span className="font-semibold text-foreground">
            {inviter.name ?? 'A team member'}
          </span>
          {inviter.email && (
            <span className="text-muted-foreground"> ({inviter.email})</span>
          )}{' '}
          has invited you to collaborate on {PLATFORM_NAME}.
        </p>

        {/* Selamnew credentials notice */}
        {/* <Alert className="mt-6 max-w-lg border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-50/40 text-left shadow-sm [&>svg]:text-emerald-600">
          <KeyRound aria-hidden />
          <AlertTitle className="font-semibold text-emerald-900">
            Access with your Selamnew credentials
          </AlertTitle>
          <AlertDescription className="text-emerald-800/90">
            When you{' '}
            <span className="font-semibold text-emerald-900">accept</span> this
            invitation, you can sign in to this CRM with your{' '}
            <span className="font-semibold text-emerald-900">
              existing Selamnew credentials
            </span>
            .
          </AlertDescription>
        </Alert> */}
      </section>

      {/* Detail card */}
      <section className="mx-auto mt-7 w-full max-w-lg sm:mt-8">
        <Card className="gap-0 overflow-hidden rounded-xl border border-border/60 py-0 shadow-sm">
          <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invitation details
            </p>
          </div>
          <CardContent className="divide-y divide-border/60 px-0 py-0">
            <InvitationDetailRow
              label="Access role"
              value={rolesLabel}
              icon={<Shield size={13} />}
            />
            {teamLabel && (
              <InvitationDetailRow
                label="Team"
                value={teamLabel}
                icon={<Users size={13} />}
              />
            )}
            {invitee.email && (
              <InvitationDetailRow
                label="Invited email"
                value={invitee.email}
                icon={<AtSign size={13} />}
                mono
              />
            )}
            <InvitationDetailRow
              label="Expires"
              value={
                expired
                  ? 'Expired'
                  : `in ${formatDistanceStrictToNowFuture(expires)} · ${formatShortDate(expires)}`
              }
              icon={<CalendarClock size={13} />}
              valueClassName={expired ? 'text-destructive' : undefined}
            />
          </CardContent>
        </Card>
      </section>

      {/* Action buttons */}
      <section className="mx-auto mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        {/* Decline with confirmation dialog */}
        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              className="min-h-11 flex-1 gap-2 border-border/70 px-6 text-sm font-medium shadow-sm hover:border-border hover:bg-muted/50 sm:flex-none sm:min-w-[11rem] [&_svg]:size-[1rem]"
              disabled={busy}
            >
              <XCircle />
              Decline
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Decline this invitation?</DialogTitle>
              <DialogDescription>
                You won&apos;t be able to join {PLATFORM_NAME} unless someone
                sends a new invitation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeclineOpen(false)}
                disabled={declining}
              >
                Keep invitation
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={declining}
              >
                {declining ? 'Declining…' : 'Yes, decline'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accept */}
        <Button
          size="lg"
          className="min-h-11 flex-1 gap-2 bg-brand px-6 text-sm font-medium text-brand-foreground shadow-md shadow-brand/25 hover:bg-brand-hover focus-visible:ring-[#ed6925]/50 sm:flex-none sm:min-w-[11rem] [&_svg]:size-[1rem]"
          disabled={busy}
          onClick={handleAccept}
        >
          {accepting ? (
            'Accepting…'
          ) : (
            <>
              <CheckCircle2 />
              Accept invitation
            </>
          )}
        </Button>
      </section>
    </>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center">
      <div className="h-7 w-40 animate-pulse rounded-full bg-muted" />
      <div className="flex items-center gap-1">
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted sm:h-28 sm:w-28" />
        <div className="flex items-center gap-0.5 px-1">
          <div className="h-px w-5 animate-pulse bg-muted sm:w-6" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="h-px w-5 animate-pulse bg-muted sm:w-6" />
        </div>
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted sm:h-28 sm:w-28" />
      </div>
      <div className="w-full max-w-sm space-y-3">
        <div className="h-9 animate-pulse rounded-lg bg-muted" />
        <div className="mx-auto h-4 w-4/5 animate-pulse rounded-md bg-muted" />
        <div className="mx-auto h-4 w-3/5 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
      <div className="flex w-full gap-3">
        <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorContent({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-[10px] ring-red-50/60">
        <ShieldAlert size={36} className="text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Invalid or expired link
        </h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvitationDecisionPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;

  const { data, isLoading, isError, error } =
    useGetInvitationDecisionData(token);

  const errorMessage = (() => {
    if (!token) return 'No invitation token was found in this link.';
    if (isError) {
      const e = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      return (
        e?.response?.data?.message ||
        e?.message ||
        'This invitation link is invalid or has already been used.'
      );
    }
    return '';
  })();

  const showError = !token || isError;

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#f8fafc]"
      role="region"
      aria-label="Invitation acceptance"
    >
      {/* Ambient gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70% 50% at 50% -5%, rgba(237, 105, 37, 0.10) 0%, transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 70%), radial-gradient(30% 30% at 0% 70%, rgba(237, 105, 37, 0.06) 0%, transparent 60%)',
        }}
      />
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Page header */}
      {/* <header className="flex items-center justify-between border-b border-border/40 bg-surface-card/70 px-6 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <SimpleLogo />
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Selamnew Business
        </p>
      </header> */}

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-2xl">
          {/* Content card */}
          <div className="rounded-2xl border border-border/50 bg-surface-card/90 px-6 py-10 shadow-xl shadow-black/5 backdrop-blur-sm sm:px-10 sm:py-12">
            {isLoading ? (
              <LoadingSkeleton />
            ) : showError ? (
              <ErrorContent message={errorMessage} />
            ) : data ? (
              <ActiveContent token={token!} data={data} />
            ) : null}
          </div>

          {/* Footer note */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-center">
            <CardDescription className="text-xs">
              If you don&apos;t recognize this invitation, you can safely ignore
              it.
            </CardDescription>
            {/* <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/invitations/about">Learn more</Link>
            </Button> */}
          </div>
        </div>
      </main>

      {/* Page footer */}
      <footer className="border-t border-border/40 bg-surface-card/70 px-6 py-3.5 text-center backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PLATFORM_NAME} · All rights reserved.
        </p>
      </footer>
    </div>
  );
}
