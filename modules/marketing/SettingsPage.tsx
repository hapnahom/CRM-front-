'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Link2,
  Mail,
  Megaphone,
  Search,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FormModalSkeleton,
  SettingsListSectionSkeleton,
} from '@/components/loading/skeleton-screens';
import { tokens } from '@/lib/design-tokens';
import { settingsIntegrationsPath, settingsPath } from '@/lib/routes/settings';
import { cn } from '@/lib/utils';
import { appPath } from '@/utils/constants';
import {
  useMarketingIntegrations,
  useMarketingMailboxes,
} from '@/store/server/features/marketing/queries';
import {
  useConnectMarketingMicrosoft,
  useDisconnectMarketingEmail,
  useSelectMarketingMailbox,
} from '@/store/server/features/marketing/mutations';
import type {
  MarketingIntegration,
  MarketingMailbox,
} from '@/store/server/features/marketing/types';
import {
  DashboardCard,
  EmptyHint,
  MarketingDetailHeader,
  PhaseBadge,
  SectionHeader,
  StatusBadge,
  marketingTabTriggerClass,
  marketingTabsListClass,
} from './ui-kit';

const PROVIDER_META: Record<
  string,
  { Icon: LucideIcon; fg: string; bg: string }
> = {
  google_ads: { Icon: Search, fg: tokens.color.blue, bg: '#E8F1FF' },
  meta: { Icon: Share2, fg: tokens.color.brand, bg: tokens.color.brandMuted },
  linkedin: { Icon: Megaphone, fg: '#0A66C2', bg: '#E8F1FF' },
  email: { Icon: Mail, fg: tokens.color.success, bg: '#E7F8EF' },
  google_analytics: {
    Icon: BarChart3,
    fg: tokens.color.purple,
    bg: tokens.color.lightPurple,
  },
};

function IntegrationCard({
  item,
  onSelect,
}: {
  item: MarketingIntegration;
  onSelect?: (provider: string) => void;
}) {
  const router = useRouter();
  const meta = PROVIDER_META[item.provider] ?? {
    Icon: Link2,
    fg: tokens.color.brand,
    bg: tokens.color.brandMuted,
  };
  const { Icon } = meta;

  return (
    <button
      type="button"
      onClick={() => {
        if (onSelect) {
          onSelect(item.provider);
          return;
        }
        router.push(settingsIntegrationsPath(item.provider));
      }}
      className="flex h-full flex-col rounded-xl border border-border bg-white p-4 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-surface-elevated sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: meta.bg, color: meta.fg }}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="m-0 text-[14px] font-semibold text-foreground">
              {item.name}
            </p>
            <StatusBadge status={item.status} />
          </div>
          <p className="m-0 mt-1 text-[12px] text-muted-foreground">
            {item.description}
          </p>
          <p className="m-0 mt-2 text-[11px] font-medium text-muted-foreground">
            {item.category}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {cap}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[12px] font-medium text-foreground">
          Configure
        </span>
        <span className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-[12px] font-medium text-white opacity-60">
          Connect
        </span>
      </div>
    </button>
  );
}

export function IntegrationsPage({
  embedded = false,
  onSelectProvider,
}: {
  embedded?: boolean;
  onSelectProvider?: (provider: string) => void;
} = {}) {
  const { data: integrations = [], isLoading } = useMarketingIntegrations();
  // Only Email is wired today; restore full list + KPIs when other providers are ready.
  // const connected = integrations.filter((i) => i.status === 'Connected').length;
  const visibleIntegrations = integrations.filter(
    (item) => item.provider === 'email',
  );

  return (
    <div
      className={cn(
        'w-full space-y-4 bg-white min-h-full sm:space-y-5',
        embedded ? 'p-0' : 'p-4 sm:p-5 lg:p-6',
      )}
    >
      {/*
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="m-0 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{connected}</span> of{' '}
          {integrations.length} connected
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Available', value: String(integrations.length) },
          { label: 'Connected', value: String(connected) },
          {
            label: 'Not connected',
            value: String(integrations.length - connected),
          },
          { label: 'Categories', value: '4' },
        ].map((stat) => (
          <DashboardCard key={stat.label} className="px-3.5 py-3 shadow-xs">
            <p className="m-0 text-[11px] text-muted-foreground">
              {stat.label}
            </p>
            <p className="m-0 mt-0.5 text-[18px] font-bold tabular-nums">
              {stat.value}
            </p>
          </DashboardCard>
        ))}
      </section>
      */}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full overflow-hidden">
            <SettingsListSectionSkeleton />
          </div>
        ) : (
          visibleIntegrations.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              onSelect={onSelectProvider}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M13 1h10v10H13z" />
      <path fill="#7FBA00" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function CustomMailLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill="none"
    >
      <rect
        x="2.5"
        y="4.5"
        width="19"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M3.5 7.5 12 13l8.5-5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function mailboxesForProviderTab(
  mailboxes: MarketingMailbox[],
  method: 'google' | 'microsoft',
) {
  if (method === 'google') {
    return mailboxes.filter((mailbox) => mailbox.provider === 'gmail');
  }
  return mailboxes.filter(
    (mailbox) =>
      mailbox.provider === 'microsoft365' || mailbox.provider === 'exchange',
  );
}

function EmailIntegrationDetail({
  integration,
  returnPath = settingsIntegrationsPath('email'),
}: {
  integration: MarketingIntegration;
  returnPath?: string;
}) {
  const [method, setMethod] = useState<'google' | 'microsoft' | 'custom'>(
    'microsoft',
  );
  const syncedConnectedTab = useRef(false);
  const { data: mailboxes = [], isLoading: mailboxesLoading } =
    useMarketingMailboxes();
  const visibleMailboxes = useMemo(
    () =>
      method === 'google' || method === 'microsoft'
        ? mailboxesForProviderTab(mailboxes, method)
        : [],
    [mailboxes, method],
  );
  const connectMicrosoft = useConnectMarketingMicrosoft();
  const selectMailbox = useSelectMarketingMailbox();
  const disconnectEmail = useDisconnectMarketingEmail();

  const methods = [
    {
      id: 'google' as const,
      label: 'Google',
      Logo: GoogleLogo,
      disabled: false,
    },
    {
      id: 'microsoft' as const,
      label: 'Microsoft',
      Logo: MicrosoftLogo,
      disabled: false,
    },
    {
      id: 'custom' as const,
      label: 'Custom SMTP / IMAP',
      Logo: CustomMailLogo,
      disabled: true,
    },
  ];

  const status = integration.status;
  const connectedAccount = integration.connectedAccount;
  const isConnected = status === 'Connected';
  const connecting =
    connectMicrosoft.isLoading ||
    selectMailbox.isLoading ||
    disconnectEmail.isLoading;

  useEffect(() => {
    if (syncedConnectedTab.current || !integration.connectedAccountId) return;
    if (!mailboxes.length) return;
    const connected = mailboxes.find(
      (mailbox) => mailbox.id === integration.connectedAccountId,
    );
    if (!connected) return;
    syncedConnectedTab.current = true;
    setMethod(connected.provider === 'gmail' ? 'google' : 'microsoft');
  }, [integration.connectedAccountId, mailboxes]);

  const connectedOnOtherProvider =
    isConnected &&
    integration.connectedAccountId &&
    !visibleMailboxes.some(
      (mailbox) => mailbox.id === integration.connectedAccountId,
    );

  function handleProviderConnect(provider: 'microsoft365' | 'gmail') {
    const returnUrl = `${window.location.origin}${appPath(returnPath)}`;
    connectMicrosoft.mutate(
      { redirectUrl: returnUrl, provider },
      {
        onSuccess: (result) => {
          if (result?.authorizationUrl) {
            window.location.href = result.authorizationUrl;
          } else {
            toast.error('No authorization URL returned');
          }
        },
      },
    );
  }

  function handleDisconnect() {
    disconnectEmail.mutate();
  }

  return (
    <div className="space-y-4">
      <DashboardCard className="p-4 sm:p-5 shadow-xs">
        <SectionHeader title="Connect email provider" />

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {methods.map((m) => {
            const selected = method === m.id;
            const Logo = m.Logo;
            return (
              <button
                key={m.id}
                type="button"
                disabled={m.disabled}
                onClick={() => setMethod(m.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                  selected
                    ? 'border-brand bg-brand-muted'
                    : 'border-border hover:bg-surface-elevated',
                  m.disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white',
                    m.id === 'custom' && 'text-muted-foreground',
                  )}
                >
                  <Logo className="size-5" />
                </span>
                <span
                  className={cn(
                    'text-[13px] font-semibold',
                    selected ? 'text-brand' : 'text-foreground',
                  )}
                >
                  {m.label}
                  {m.disabled ? (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      (soon)
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border px-3.5 py-3">
            <p className="m-0 text-[11px] text-muted-foreground">Status</p>
            <p className="m-0 mt-0.5 text-[13px] font-medium">{status}</p>
          </div>
          <div className="rounded-lg border border-border px-3.5 py-3">
            <p className="m-0 text-[11px] text-muted-foreground">
              Marketing sender mailbox
            </p>
            <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">
              {connectedAccount ?? '—'}
            </p>
          </div>
        </div>

        {method === 'microsoft' || method === 'google' ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gap-2"
                disabled={connecting}
                onClick={() =>
                  handleProviderConnect(
                    method === 'google' ? 'gmail' : 'microsoft365',
                  )
                }
              >
                {method === 'google' ? (
                  <GoogleLogo className="size-4" />
                ) : (
                  <MicrosoftLogo className="size-4" />
                )}
                {connectMicrosoft.isLoading
                  ? 'Connecting…'
                  : method === 'google'
                    ? 'Connect Google mailbox'
                    : 'Connect Microsoft mailbox'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!isConnected || connecting}
                onClick={handleDisconnect}
              >
                Disconnect marketing sender
              </Button>
            </div>

            <div className="rounded-lg border border-border px-3.5 py-3">
              <p className="m-0 text-[12px] font-semibold text-foreground">
                Select sender mailbox
              </p>
              <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                Mailboxes are shared with Communication. Connecting here only
                sets which mailbox Marketing uses to send.
              </p>
              {mailboxesLoading ? (
                <p className="m-0 mt-3 text-[12px] text-muted-foreground">
                  Loading mailboxes…
                </p>
              ) : visibleMailboxes.length === 0 ? (
                <p className="m-0 mt-3 text-[12px] text-muted-foreground">
                  {method === 'google'
                    ? 'No Google mailboxes connected yet. Use Communication or connect above.'
                    : 'No Microsoft / Outlook mailboxes connected yet. Use Communication or connect above.'}
                </p>
              ) : (
                <ul className="m-0 mt-3 list-none space-y-2 p-0">
                  {visibleMailboxes.map((mailbox) => {
                    const selected =
                      integration.connectedAccountId === mailbox.id ||
                      connectedAccount === mailbox.emailAddress;
                    return (
                      <li
                        key={mailbox.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div>
                          <p className="m-0 text-[13px] font-medium">
                            {mailbox.emailAddress}
                          </p>
                          {mailbox.displayName ? (
                            <p className="m-0 text-[11px] text-muted-foreground">
                              {mailbox.displayName}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          disabled={connecting || selected}
                          onClick={() => selectMailbox.mutate(mailbox.id)}
                        >
                          {selected ? 'Selected' : 'Use for marketing'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {connectedOnOtherProvider ? (
                <p className="m-0 mt-3 text-[11px] text-muted-foreground">
                  Marketing is currently sending from{' '}
                  <span className="font-medium text-foreground">
                    {connectedAccount}
                  </span>
                  . Switch provider tabs to change it.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-elevated px-4 py-6 text-center">
            <PhaseBadge />
            <p className="m-0 mt-2 text-[13px] font-medium text-foreground">
              Custom SMTP / IMAP coming soon
            </p>
            <p className="m-0 mt-1 text-[12px] text-muted-foreground">
              Marketing email currently supports Microsoft 365 and Google Gmail.
            </p>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

export function IntegrationDetailView({
  provider,
  onBack,
  embedded = false,
  backHref = settingsPath('integrations'),
}: {
  provider: string;
  onBack?: () => void;
  embedded?: boolean;
  backHref?: string;
}) {
  const { data: integrations = [], isLoading } = useMarketingIntegrations();
  const integration = integrations.find((i) => i.provider === provider);
  const [tab, setTab] = useState('connection');

  if (isLoading) {
    return (
      <div
        className={cn(
          'overflow-hidden',
          embedded ? 'space-y-4 py-2' : 'space-y-4 p-6',
        )}
      >
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <FormModalSkeleton fields={4} />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className={embedded ? 'py-2' : 'p-6'}>
        <EmptyHint>
          Integration not found.{' '}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-brand underline"
            >
              Back
            </button>
          ) : (
            <Link href={backHref} className="text-brand underline">
              Back
            </Link>
          )}
        </EmptyHint>
      </div>
    );
  }

  const meta = PROVIDER_META[integration.provider] ?? {
    Icon: Link2,
    fg: tokens.color.brand,
    bg: tokens.color.brandMuted,
  };
  const { Icon } = meta;
  const isEmail = integration.provider === 'email';
  const oauthReturnPath = settingsIntegrationsPath(integration.provider);

  return (
    <div
      className={cn(
        'w-full space-y-4 bg-white min-h-full sm:space-y-5',
        embedded ? 'p-0' : 'p-4 sm:p-5 lg:p-6',
      )}
    >
      <MarketingDetailHeader
        backHref={onBack ? undefined : backHref}
        onBack={onBack}
        backLabel="Integrations"
        title={integration.name}
        badges={
          <>
            <StatusBadge status={integration.status} />
            <PhaseBadge />
          </>
        }
      />

      {integration.description ? (
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-lg"
            style={{ backgroundColor: meta.bg, color: meta.fg }}
          >
            <Icon size={20} />
          </span>
          <p className="m-0 text-[13px] text-muted-foreground">
            {integration.description}
          </p>
        </div>
      ) : null}

      {isEmail ? (
        <EmailIntegrationDetail
          integration={integration}
          returnPath={oauthReturnPath}
        />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className={marketingTabsListClass}>
            {(
              [
                ['connection', 'Connection'],
                ['capabilities', 'Capabilities'],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className={marketingTabTriggerClass}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value="connection"
            className="mt-4 space-y-4 outline-none"
          >
            <DashboardCard className="p-4 sm:p-5 shadow-xs">
              <SectionHeader title="Account connection" />
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-border px-3.5 py-3">
                  <p className="m-0 text-[11px] text-muted-foreground">
                    Status
                  </p>
                  <p className="m-0 mt-0.5 text-[13px] font-medium">
                    Not connected
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3.5 py-3">
                  <p className="m-0 text-[11px] text-muted-foreground">
                    Connected account
                  </p>
                  <p className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">
                    —
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled>
                  Connect with {integration.name}
                </Button>
                <Button size="sm" variant="outline" disabled>
                  Disconnect
                </Button>
              </div>
            </DashboardCard>
          </TabsContent>

          <TabsContent
            value="capabilities"
            className="mt-4 space-y-3 outline-none"
          >
            {integration.capabilities.map((cap) => (
              <DashboardCard key={cap} className="p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="m-0 text-[13px] font-semibold">{cap}</p>
                  <StatusBadge status="Not connected" />
                </div>
              </DashboardCard>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export function IntegrationDetailPage() {
  const params = useParams();
  const provider = String(params?.provider ?? '');
  return <IntegrationDetailView provider={provider} />;
}

/** Legacy export name used by old settings route */
export function SettingsPage() {
  return <IntegrationsPage />;
}
