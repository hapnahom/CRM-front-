'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  PenLine,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useGetEmailAccounts,
  useGetCommunicationTasks,
} from '@/store/server/features/communication/queries';
import {
  useConnectEmailAccount,
  useReconnectEmailAccount,
  useRemoveEmailAccount,
  useSelectEmailAccount,
} from '@/store/server/features/communication/mutations';
import { mapCrmAccountToUi } from '@/store/server/features/communication/mappers';
import { useCommunicationStore } from '@/store/uistate/features/communication/communicationStore';
import { CommunicationAvatar } from '@/modules/communication/hooks/useCommunicationAvatar';
import { SignatureManagementModal } from '@/modules/communication/components/SignatureManagementModal';

export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'custom';
  isDefault: boolean;
  /** ISO timestamp — last time this mailbox was selected in CRM UI */
  lastSelectedAt?: string | null;
  color: string;
  status?: string;
  /** Gmail Pub/Sub watch is registered and not expired */
  gmailPubSubWatchActive?: boolean;
}

type ConnectProvider = 'microsoft365' | 'gmail';

function isAccountHiddenFromSwitcher(status?: string) {
  return status === 'disconnected' || status === 'revoked';
}

function isAccountNeedsReconnect(status?: string) {
  return status === 'needs_reauth';
}

function canRefreshConnection(provider: EmailAccount['provider']) {
  return provider === 'gmail' || provider === 'outlook';
}

/** Survives Strict Mode remounts and multiple useEmailAccounts() call sites. */
let lastSelectedAccountReported: string | null = null;
let lastSelectedAccountReportedAt = 0;
const SELECT_REPORT_COOLDOWN_MS = 60_000;

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

function ProviderBadge({ provider }: { provider: EmailAccount['provider'] }) {
  if (provider === 'gmail') {
    return (
      <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold tracking-tight">
        <span className="text-[#EA4335]">G</span>
        <span className="text-[#4285F4]">m</span>
        <span className="text-[#FBBC05]">a</span>
        <span className="text-[#4285F4]">i</span>
        <span className="text-[#34A853]">l</span>
      </span>
    );
  }
  if (provider === 'outlook') {
    return (
      <span className="rounded border border-[#0078D4]/30 bg-[#0078D4]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0078D4] dark:border-[#0078D4]/40 dark:bg-[#0078D4]/20 dark:text-[#4CC2FF]">
        Outlook
      </span>
    );
  }
  return (
    <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      IMAP
    </span>
  );
}

/** Prefer last-selected mailbox (survives logout), then default, then first usable. */
function pickPreferredAccountId(
  accounts: EmailAccount[],
  connectFlowAccountId?: string | null,
): string | null {
  if (!accounts.length) return null;
  if (
    connectFlowAccountId &&
    accounts.some((a) => a.id === connectFlowAccountId)
  ) {
    return connectFlowAccountId;
  }
  const usable = accounts.filter((a) => !isAccountNeedsReconnect(a.status));
  const pool = usable.length ? usable : accounts;
  const byLastSelected = [...pool].sort((a, b) => {
    const aT = a.lastSelectedAt ? new Date(a.lastSelectedAt).getTime() : 0;
    const bT = b.lastSelectedAt ? new Date(b.lastSelectedAt).getTime() : 0;
    return bT - aT;
  });
  if (byLastSelected[0]?.lastSelectedAt) {
    return byLastSelected[0].id;
  }
  return pool.find((a) => a.isDefault)?.id ?? pool[0]?.id ?? null;
}

function AccountAvatar({
  account,
  size = 'sm',
}: {
  account: EmailAccount;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-9 w-9 text-xs';

  return (
    <CommunicationAvatar
      accountId={account.id}
      email={undefined}
      name={account.name}
      className={cn('flex-shrink-0 rounded-full object-cover', sizeClass)}
      fallbackClassName={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizeClass,
        account.color,
      )}
    />
  );
}

function RemoveConfirmDialog({
  account,
  linkedTaskCount,
  busy,
  onCancel,
  onConfirm,
}: {
  account: EmailAccount;
  linkedTaskCount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-4 shadow-xl"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Sign out and remove mailbox?
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          This permanently removes{' '}
          <span className="font-medium text-foreground">{account.email}</span>{' '}
          from CRM (mail data and CRM calendar for this mailbox wiped). To use
          it again you must connect it as a new account.
        </p>
        <ul className="mt-3 space-y-1.5 rounded-lg border border-border bg-surface-page/80 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <li>
            {linkedTaskCount > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {linkedTaskCount} task{linkedTaskCount === 1 ? '' : 's'}
                </span>{' '}
                linked to this mailbox stay in CRM with their due dates;
                calendar links are detached.
              </>
            ) : (
              <>No tasks are currently linked to this mailbox calendar.</>
            )}
          </li>
          <li>
            Events on Microsoft 365 or Google Calendar are left as-is (not
            deleted).
          </li>
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {busy ? 'Removing…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderConnectButton({
  provider,
  label,
  busy,
  disabled,
  onClick,
}: {
  provider: ConnectProvider;
  label: string;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Logo = provider === 'gmail' ? GoogleLogo : MicrosoftLogo;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={label}
      aria-label={busy ? `Connecting ${label}…` : `Connect ${label}`}
      className={cn(
        'flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-2.5 transition-colors',
        'hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span className="relative flex h-8 w-8 items-center justify-center">
        <Logo className={cn('h-6 w-6', busy && 'opacity-25')} />
        {busy ? (
          <Loader2
            size={16}
            className="absolute animate-spin text-muted-foreground"
          />
        ) : null}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground">
        {busy ? 'Connecting…' : label}
      </span>
    </button>
  );
}

function AccountMenu({
  accounts,
  activeAccountId,
  onSelect,
  onClose,
  onAddAccount,
  onSignOut,
  onReconnect,
  onManageSignatures,
  connectingProvider,
  reconnectingAccountId,
  align = 'right',
}: {
  accounts: EmailAccount[];
  activeAccountId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAddAccount: (provider: ConnectProvider) => void | Promise<void>;
  onSignOut: (account: EmailAccount) => void;
  onReconnect?: (account: EmailAccount) => void | Promise<void>;
  onManageSignatures?: () => void;
  connectingProvider?: ConnectProvider | null;
  reconnectingAccountId?: string | null;
  align?: 'left' | 'right';
}) {
  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  const activeNeedsReconnect = active
    ? isAccountNeedsReconnect(active.status)
    : false;
  const anyOAuthBusy = Boolean(connectingProvider || reconnectingAccountId);
  const switchAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.id === activeAccountId) return -1;
      if (b.id === activeAccountId) return 1;
      return 0;
    });
  }, [accounts, activeAccountId]);

  return (
    <div
      className={cn(
        'absolute top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-card shadow-lg',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {active ? (
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center gap-2.5">
            <AccountAvatar account={active} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {active.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {active.email}
              </p>
            </div>
            <ProviderBadge provider={active.provider} />
          </div>
          {activeNeedsReconnect ? (
            <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Session expired — refresh connection to sync mail and calendar.
            </p>
          ) : null}
          {canRefreshConnection(active.provider) && onReconnect ? (
            <button
              type="button"
              onClick={() => void onReconnect(active)}
              disabled={anyOAuthBusy}
              className={cn(
                'mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50',
                activeNeedsReconnect
                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-border text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
              )}
            >
              {reconnectingAccountId === active.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {reconnectingAccountId === active.id
                ? 'Opening sign-in…'
                : activeNeedsReconnect
                  ? 'Reconnect mailbox'
                  : 'Refresh connection'}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="border-b border-border px-3 py-3 text-xs text-muted-foreground">
          No mailbox connected
        </div>
      )}

      {switchAccounts.length > 0 && (
        <div className="max-h-48 overflow-y-auto py-1">
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Switch account
          </p>
          {switchAccounts.map((acc) => {
            const isActive = acc.id === activeAccountId;
            const needsReconnect = isAccountNeedsReconnect(acc.status);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  onSelect(acc.id);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-elevated',
                  isActive && 'bg-brand-muted/50',
                )}
              >
                <AccountAvatar account={acc} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {acc.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {acc.email}
                  </p>
                  {needsReconnect ? (
                    <p className="truncate text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Reconnect required
                    </p>
                  ) : null}
                </div>
                {isActive && (
                  <Check size={14} className="flex-shrink-0 text-brand" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t border-border py-1">
        {active && onManageSignatures ? (
          <button
            type="button"
            onClick={() => {
              onManageSignatures();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10">
              <PenLine size={13} className="text-brand" />
            </div>
            Email signatures
          </button>
        ) : null}
        <p className="px-3 pb-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Add account
        </p>
        <div className="flex gap-2 px-3 pb-2">
          <ProviderConnectButton
            provider="microsoft365"
            label="Microsoft"
            busy={connectingProvider === 'microsoft365'}
            disabled={anyOAuthBusy && connectingProvider !== 'microsoft365'}
            onClick={() => void onAddAccount('microsoft365')}
          />
          <ProviderConnectButton
            provider="gmail"
            label="Google"
            busy={connectingProvider === 'gmail'}
            disabled={anyOAuthBusy && connectingProvider !== 'gmail'}
            onClick={() => void onAddAccount('gmail')}
          />
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => onSignOut(active)}
            disabled={anyOAuthBusy}
            className="flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10">
              <LogOut size={13} className="text-destructive" />
            </div>
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Account switcher for the communication top-right header */
export function AccountTopBar({
  accounts,
  activeAccountId,
  onSelect,
}: {
  accounts: EmailAccount[];
  activeAccountId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<EmailAccount | null>(null);
  const [signaturesOpen, setSignaturesOpen] = useState(false);
  const [connectingProvider, setConnectingProvider] =
    useState<ConnectProvider | null>(null);
  const [reconnectingAccountId, setReconnectingAccountId] = useState<
    string | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const connectMutation = useConnectEmailAccount();
  const reconnectMutation = useReconnectEmailAccount();
  const removeMutation = useRemoveEmailAccount();
  const { data: remoteTasks = [] } = useGetCommunicationTasks();
  const setActiveAccountId = useCommunicationStore((s) => s.setActiveAccountId);
  const clearConnectFlow = useCommunicationStore((s) => s.clearConnectFlow);

  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];

  const pendingLinkedTaskCount = useMemo(() => {
    if (!pendingRemove) return 0;
    return remoteTasks.filter((t) => t.connectedAccountId === pendingRemove.id)
      .length;
  }, [pendingRemove, remoteTasks]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleAddAccount = async (provider: ConnectProvider) => {
    setConnectingProvider(provider);
    try {
      try {
        sessionStorage.removeItem('crm-comm-connect-flow');
      } catch {
        // ignore
      }
      const result = await connectMutation.mutateAsync(provider);
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      toast.error('No authorization URL returned');
      setConnectingProvider(null);
    } catch {
      toast.error('Failed to start mailbox connection');
      setConnectingProvider(null);
    }
  };

  const handleReconnectAccount = async (account: EmailAccount) => {
    // Keep header on this mailbox through OAuth redirect + post-connect sync.
    setActiveAccountId(account.id);
    setReconnectingAccountId(account.id);
    try {
      const result = await reconnectMutation.mutateAsync(account.id);
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      toast.error('No authorization URL returned');
      setReconnectingAccountId(null);
    } catch {
      toast.error('Failed to start mailbox reconnect');
      setReconnectingAccountId(null);
    }
  };

  const handleSignOutConfirm = async () => {
    if (!pendingRemove) return;
    try {
      const result = await removeMutation.mutateAsync(pendingRemove.id);
      if (activeAccountId === pendingRemove.id) {
        const next = accounts.find((a) => a.id !== pendingRemove.id);
        setActiveAccountId(next?.id ?? null);
      }
      try {
        sessionStorage.removeItem('crm-comm-connect-flow');
      } catch {
        // ignore
      }
      clearConnectFlow();
      const detached = Number(result?.detachedTaskCount ?? 0);
      setPendingRemove(null);
      setOpen(false);
      toast.success(
        detached > 0
          ? `Mailbox signed out — ${detached} task${
              detached === 1 ? '' : 's'
            } kept in CRM with due dates`
          : 'Mailbox signed out — data and webhooks removed',
      );
    } catch {
      toast.error('Failed to remove account');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title={active?.email || 'Connect mailbox'}
        className={cn(
          'flex h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border bg-surface-card px-2 transition-colors hover:bg-surface-elevated',
          open && 'bg-surface-elevated ring-2 ring-brand/15',
        )}
      >
        {active ? (
          <>
            <AccountAvatar account={active} size="sm" />
            <div className="hidden min-w-0 text-left lg:block">
              <p className="truncate text-xs font-semibold leading-tight text-foreground">
                {active.name}
              </p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                {active.email}
              </p>
            </div>
          </>
        ) : (
          <span className="px-1 text-xs font-medium text-muted-foreground">
            Connect
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'flex-shrink-0 text-muted-foreground/60 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <AccountMenu
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSelect={onSelect}
          onClose={() => setOpen(false)}
          onAddAccount={handleAddAccount}
          onSignOut={(acc) => setPendingRemove(acc)}
          onReconnect={(acc) => void handleReconnectAccount(acc)}
          onManageSignatures={() => setSignaturesOpen(true)}
          connectingProvider={connectingProvider}
          reconnectingAccountId={reconnectingAccountId}
          align="right"
        />
      )}

      <SignatureManagementModal
        open={signaturesOpen}
        onClose={() => setSignaturesOpen(false)}
        accounts={accounts}
        initialAccountId={activeAccountId}
      />

      {pendingRemove && (
        <RemoveConfirmDialog
          account={pendingRemove}
          linkedTaskCount={pendingLinkedTaskCount}
          busy={removeMutation.isLoading}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => void handleSignOutConfirm()}
        />
      )}
    </div>
  );
}

/** @deprecated Use AccountTopBar */
export function AccountSidebarFooter(
  props: React.ComponentProps<typeof AccountTopBar> & { collapsed?: boolean },
) {
  return <AccountTopBar {...props} />;
}

/** @deprecated Use AccountTopBar */
export function AccountPopover(
  props: React.ComponentProps<typeof AccountTopBar>,
) {
  return <AccountTopBar {...props} />;
}

/** @deprecated Use AccountTopBar */
export function AccountSelector(
  props: React.ComponentProps<typeof AccountTopBar>,
) {
  return <AccountTopBar {...props} />;
}

export function useEmailAccounts() {
  const { data: crmAccounts = [], isLoading, isError } = useGetEmailAccounts();
  const accounts = useMemo(
    () =>
      crmAccounts
        .map((a, i) => {
          const ui = mapCrmAccountToUi(a, i);
          return {
            ...ui,
            lastSelectedAt: a.lastSelectedAt ?? null,
          } satisfies EmailAccount;
        })
        .filter((a) => !isAccountHiddenFromSwitcher(a.status)),
    [crmAccounts],
  );

  const activeAccountId = useCommunicationStore((s) => s.activeAccountId);
  const setActiveAccountId = useCommunicationStore((s) => s.setActiveAccountId);
  const connectFlowAccountId = useCommunicationStore(
    (s) => s.connectFlow.accountId,
  );
  const connectFlowBusy = useCommunicationStore(
    (s) => s.connectFlow.pending || s.connectFlow.showProgress,
  );
  const selectMutation = useSelectEmailAccount();

  useEffect(() => {
    // During OAuth return / initial sync, accounts may briefly be empty while
    // refetching — never clear the mailbox we're actively connecting.
    if (!accounts.length) {
      if (activeAccountId && !connectFlowAccountId) {
        setActiveAccountId(null);
      }
      return;
    }

    // Pin selection to the mailbox being synced after connect/reconnect.
    if (
      connectFlowBusy &&
      connectFlowAccountId &&
      accounts.some((a) => a.id === connectFlowAccountId) &&
      activeAccountId !== connectFlowAccountId
    ) {
      setActiveAccountId(connectFlowAccountId);
      return;
    }

    const stillExists = accounts.some((a) => a.id === activeAccountId);
    if (!activeAccountId || !stillExists) {
      setActiveAccountId(
        pickPreferredAccountId(accounts, connectFlowAccountId),
      );
    }
  }, [
    accounts,
    activeAccountId,
    setActiveAccountId,
    connectFlowAccountId,
    connectFlowBusy,
  ]);

  // Persist "current connected mailbox" so task invites target this address.
  // Module-level dedupe: only POST when the active account actually changes
  // (or cooldown expired), across header/calendar/todo/modal remounts.
  useEffect(() => {
    if (!activeAccountId) return;
    const now = Date.now();
    if (
      lastSelectedAccountReported === activeAccountId &&
      now - lastSelectedAccountReportedAt < SELECT_REPORT_COOLDOWN_MS
    ) {
      return;
    }
    lastSelectedAccountReported = activeAccountId;
    lastSelectedAccountReportedAt = now;
    selectMutation.mutate(activeAccountId, {
      onError: () => {
        if (lastSelectedAccountReported === activeAccountId) {
          lastSelectedAccountReported = null;
          lastSelectedAccountReportedAt = 0;
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when active account changes
  }, [activeAccountId]);

  return {
    accounts,
    isLoading,
    isError,
    activeAccountId: activeAccountId || '',
    setActiveAccountId,
  };
}
