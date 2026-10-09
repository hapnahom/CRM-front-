'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Calendar,
  CheckSquare,
  FileText,
  Inbox,
  Mail,
  PenSquare,
  RefreshCw,
  Send,
  Star,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getEmailsForFolder,
  MailNavKey,
  useCommunicationStore,
} from '@/store/uistate/features/communication/communicationStore';
import EmailList from '@/modules/communication/components/EmailList';
import EmailDetail from '@/modules/communication/components/EmailDetail';
import CalendarView from '@/modules/communication/components/CalendarView';
import TodoView from '@/modules/communication/components/TodoView';
import ComposeModal from '@/modules/communication/components/ComposeModal';
import {
  AccountTopBar,
  useEmailAccounts,
} from '@/modules/communication/components/EmailAccountSettings';
import { ConnectSyncProgressBanner } from '@/modules/communication/components/ConnectSyncProgressBanner';
import { ConnectionSuccessModal } from '@/modules/communication/components/ConnectionSuccessModal';
import { useSyncCommunicationMailbox } from '@/modules/communication/hooks/useSyncCommunicationMailbox';
import { useMailboxLiveSync } from '@/modules/communication/hooks/useMailboxLiveSync';
import { useQueryClient } from 'react-query';
import {
  communicationQueryKeys,
  fetchEmailAccounts,
  useGetEmailAccounts,
  useGetCommunicationTasks,
  useGetEmailFolders,
  useGetCommunicationSettings,
} from '@/store/server/features/communication/queries';
import {
  useRemoveEmailAccount,
  useTriggerEmailSync,
} from '@/store/server/features/communication/mutations';
import {
  mapWellKnownToUiFolder,
  sortCrmFoldersForUi,
} from '@/store/server/features/communication/mappers';
import type { CrmEmailFolder } from '@/store/server/features/communication/types';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

const EMPTY_FOLDERS: CrmEmailFolder[] = [];
const CONNECT_FLOW_STORAGE_KEY = 'crm-comm-connect-flow';

const MAIL_FOLDERS: {
  key: MailNavKey;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'archive', label: 'Archive', icon: Archive },
];

const VIEWS = [
  { key: 'email' as const, label: 'Mail', icon: Mail },
  { key: 'calendar' as const, label: 'Calendar', icon: Calendar },
  { key: 'todo' as const, label: 'Tasks', icon: CheckSquare },
];

function useOAuthReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveAccountId = useCommunicationStore((s) => s.setActiveAccountId);
  const startConnectFlow = useCommunicationStore((s) => s.startConnectFlow);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const connected = searchParams.get('emailConnected');
    const failed = searchParams.get('emailConnectError');
    const accountId = searchParams.get('accountId');
    const email = searchParams.get('email');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (!connected && !failed) return;
    handled.current = true;

    if (connected === '1') {
      void queryClient.invalidateQueries(communicationQueryKeys.accountsBase);
      if (accountId) {
        setActiveAccountId(accountId);
        startConnectFlow({ accountId, email });
        try {
          sessionStorage.setItem(
            CONNECT_FLOW_STORAGE_KEY,
            JSON.stringify({ accountId, email: email || null }),
          );
        } catch {
          // ignore
        }
        // Backend OAuth callback already starts FULL sync — don't trigger a second one.
      }
    } else if (failed === '1') {
      toast.error(message || error || 'Failed to connect mailbox');
    }

    router.replace('/communication');
  }, [searchParams, router, queryClient, setActiveAccountId, startConnectFlow]);
}

function useConnectSyncProgressUi() {
  const connectFlow = useCommunicationStore((s) => s.connectFlow);
  const startConnectFlow = useCommunicationStore((s) => s.startConnectFlow);
  const updateConnectFlow = useCommunicationStore((s) => s.updateConnectFlow);
  const clearConnectFlow = useCommunicationStore((s) => s.clearConnectFlow);
  const setActiveAccountId = useCommunicationStore((s) => s.setActiveAccountId);
  const removeMutation = useRemoveEmailAccount();
  const queryClient = useQueryClient();
  const restored = useRef(false);
  const sawSyncing = useRef(false);
  const flowStartedAt = useRef<number | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  useEffect(() => {
    if (restored.current || connectFlow.accountId) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(CONNECT_FLOW_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        accountId?: string;
        email?: string | null;
      };
      if (parsed.accountId) {
        // startConnectFlow also pins activeAccountId to this mailbox.
        startConnectFlow({
          accountId: parsed.accountId,
          email: parsed.email,
        });
      }
    } catch {
      try {
        sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [connectFlow.accountId, startConnectFlow]);

  useEffect(() => {
    if (!connectFlow.accountId) return;
    if (!connectFlow.pending && !connectFlow.showProgress) return;
    if (
      useCommunicationStore.getState().activeAccountId === connectFlow.accountId
    ) {
      return;
    }
    setActiveAccountId(connectFlow.accountId);
  }, [
    connectFlow.accountId,
    connectFlow.pending,
    connectFlow.showProgress,
    setActiveAccountId,
  ]);

  useEffect(() => {
    if (
      connectFlow.accountId &&
      (connectFlow.pending || connectFlow.showProgress)
    ) {
      if (!flowStartedAt.current) {
        flowStartedAt.current = Date.now();
        sawSyncing.current = false;
      }
    }
    if (!connectFlow.accountId) {
      flowStartedAt.current = null;
      sawSyncing.current = false;
    }
  }, [connectFlow.accountId, connectFlow.pending, connectFlow.showProgress]);

  const polling =
    Boolean(connectFlow.accountId) &&
    (connectFlow.pending ||
      connectFlow.showProgress ||
      !connectFlow.showSuccess);

  const { data: accounts = [] } = useGetEmailAccounts(true);
  const userId = useAuthenticationStore((s) => s.userId);

  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => {
      void fetchEmailAccounts()
        .then((data) => {
          queryClient.setQueryData(
            communicationQueryKeys.accounts(userId),
            data,
          );
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(id);
  }, [polling, queryClient, userId]);

  useEffect(() => {
    if (!connectFlow.accountId) return;
    if (!connectFlow.pending && !connectFlow.showProgress) return;

    const account = accounts.find((a) => a.id === connectFlow.accountId);

    if (!account && accounts.length > 0 && !connectFlow.pending) {
      clearConnectFlow();
      try {
        sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }
    if (!account) return;

    if (account.emailAddress && account.emailAddress !== connectFlow.email) {
      updateConnectFlow({ email: account.emailAddress });
    }

    const stillSyncing = account.status === 'syncing';
    const percent = account.syncProgressPercent ?? 0;
    const authBroken =
      account.status === 'needs_reauth' ||
      account.lastSyncErrorCode === 'TOKEN_REFRESH_FAILED';

    if (stillSyncing || percent > 0) {
      sawSyncing.current = true;
      if (!connectFlow.showProgress) {
        updateConnectFlow({ pending: false, showProgress: true });
      }
    }

    if (authBroken && !stillSyncing) {
      toast.error(
        account.lastSyncErrorMessage ||
          'Mailbox connected, but authentication failed. Please reconnect.',
      );
      clearConnectFlow();
      try {
        sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    if (!connectFlow.showProgress && !sawSyncing.current) {
      const elapsed = flowStartedAt.current
        ? Date.now() - flowStartedAt.current
        : 0;
      if (elapsed > 45000) {
        toast.error('Sync did not start. Try reconnecting the mailbox.');
        clearConnectFlow();
        try {
          sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      return;
    }

    const finishedOk =
      sawSyncing.current &&
      !stillSyncing &&
      (percent >= 100 || account.lastSyncStatus === 'success');

    if (finishedOk) {
      updateConnectFlow({
        pending: false,
        showProgress: false,
        showSuccess: true,
        minimized: false,
      });
      void queryClient.invalidateQueries(
        communicationQueryKeys.folders(connectFlow.accountId),
      );
      void queryClient.invalidateQueries([
        'communication-messages',
        connectFlow.accountId,
      ]);
      return;
    }

    if (
      sawSyncing.current &&
      !stillSyncing &&
      account.lastSyncStatus === 'failed'
    ) {
      toast.error(
        account.lastSyncErrorMessage ||
          'Mailbox connected, but initial sync failed',
      );
      clearConnectFlow();
      try {
        sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [
    accounts,
    connectFlow.accountId,
    connectFlow.email,
    connectFlow.pending,
    connectFlow.showProgress,
    updateConnectFlow,
    clearConnectFlow,
    queryClient,
  ]);

  const account = accounts.find((a) => a.id === connectFlow.accountId);

  return {
    showProgress: connectFlow.showProgress,
    showSuccess: connectFlow.showSuccess,
    minimized: connectFlow.minimized,
    email: connectFlow.email || account?.emailAddress || '',
    percent: account?.syncProgressPercent ?? 0,
    synced: account?.syncMessagesSynced ?? 0,
    total: account?.syncMessagesTotal ?? 0,
    showStopConfirm,
    stopping: removeMutation.isLoading,
    minimizeProgress: () => {
      setShowStopConfirm(false);
      updateConnectFlow({ minimized: true });
    },
    expandProgress: () => updateConnectFlow({ minimized: false }),
    requestStop: () => setShowStopConfirm(true),
    cancelStop: () => setShowStopConfirm(false),
    confirmStopAndRemove: async () => {
      if (!connectFlow.accountId) return;
      try {
        await removeMutation.mutateAsync(connectFlow.accountId);
        setActiveAccountId(null);
        setShowStopConfirm(false);
        clearConnectFlow();
        try {
          sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
        } catch {
          // ignore
        }
        toast.success('Sync stopped — mailbox removed');
      } catch {
        toast.error('Failed to stop sync and remove mailbox');
      }
    },
    closeSuccess: () => {
      clearConnectFlow();
      try {
        sessionStorage.removeItem(CONNECT_FLOW_STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };
}

function CommunicationHeader() {
  const {
    activeView,
    setActiveView,
    activeFolder,
    setActiveFolder,
    setActiveFolderId,
    emails,
    openCompose,
  } = useCommunicationStore();

  const { accounts, activeAccountId, setActiveAccountId } = useEmailAccounts();
  const { data: remoteTasks = [] } = useGetCommunicationTasks();
  const { data: foldersData } = useGetEmailFolders(activeAccountId || null);
  const folders = useMemo(
    () => sortCrmFoldersForUi(foldersData ?? EMPTY_FOLDERS),
    [foldersData],
  );
  const queryClient = useQueryClient();
  const syncMutation = useTriggerEmailSync();
  const [refreshing, setRefreshing] = useState(false);

  const selectMailFolder = (key: MailNavKey) => {
    setActiveFolder(key);
    if (key === 'starred') {
      setActiveFolderId(null);
      return;
    }
    const match =
      folders.find((f) => mapWellKnownToUiFolder(f.wellKnownType) === key) ||
      null;
    setActiveFolderId(match?.id ?? null);
  };

  const unreadByFolder = useMemo(() => {
    const counts: Partial<Record<MailNavKey, number>> = {};
    for (const e of emails) {
      if (!e.isRead) {
        counts[e.folder] = (counts[e.folder] ?? 0) + 1;
      }
      if (!e.isRead && e.isStarred && e.folder !== 'drafts') {
        counts.starred = (counts.starred ?? 0) + 1;
      }
    }
    return counts;
  }, [emails]);

  const draftCount = useMemo(
    () => emails.filter((e) => e.folder === 'drafts').length,
    [emails],
  );

  const activeTodoCount = useMemo(
    () => remoteTasks.filter((t) => !t.completed).length,
    [remoteTasks],
  );

  const handleRefresh = async () => {
    if (!activeAccountId || refreshing) return;
    setRefreshing(true);
    try {
      // Incremental sync also re-ensures Graph webhooks against the current ngrok URL.
      await syncMutation.mutateAsync({
        accountId: activeAccountId,
        mode: 'incremental',
      });
      await Promise.all([
        queryClient.invalidateQueries(communicationQueryKeys.accountsBase),
        queryClient.invalidateQueries(
          communicationQueryKeys.folders(activeAccountId),
        ),
        queryClient.invalidateQueries([
          'communication-messages',
          activeAccountId,
        ]),
        queryClient.invalidateQueries([
          'communication-message',
          activeAccountId,
        ]),
      ]);
      toast.success('Mailbox updated');
    } catch {
      toast.error('Failed to refresh mailbox');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="flex-shrink-0 border-b border-border bg-surface-card">
      <div className="flex items-start justify-between gap-4 px-6 py-3">
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            Productivity
          </h1>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
          {activeView === 'email' && (
            <>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={!activeAccountId || refreshing}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                title="Reload emails from CRM"
              >
                <RefreshCw
                  size={14}
                  className={cn(refreshing && 'animate-spin')}
                />
              </button>
              <button
                type="button"
                onClick={() => openCompose()}
                disabled={!activeAccountId}
                title={
                  activeAccountId
                    ? 'Compose email'
                    : 'Connect a mailbox to compose'
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand"
              >
                <PenSquare size={15} strokeWidth={2.25} />
                Compose
              </button>
            </>
          )}
          <AccountTopBar
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelect={setActiveAccountId}
          />
        </div>
      </div>

      <nav
        className="flex items-end gap-0 px-6"
        aria-label="Productivity sections"
      >
        {VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.key;
          const badge =
            view.key === 'todo' && activeTodoCount > 0
              ? activeTodoCount
              : view.key === 'email'
                ? (unreadByFolder.inbox ?? 0)
                : 0;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() =>
                view.key === 'email'
                  ? selectMailFolder(activeFolder)
                  : setActiveView(view.key)
              }
              className={cn(
                'relative inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={15} />
              {view.label}
              {badge > 0 && (
                <span
                  className={cn(
                    'min-w-[1.15rem] rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold leading-none',
                    isActive
                      ? 'bg-brand text-brand-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeView === 'email' && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-surface-page/50 px-6 py-2">
          {MAIL_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.key;
            const badge =
              folder.key === 'drafts'
                ? draftCount
                : (unreadByFolder[folder.key] ?? 0);
            return (
              <button
                key={folder.key}
                type="button"
                onClick={() => selectMailFolder(folder.key)}
                className={cn(
                  'inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-brand-muted text-brand'
                    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                )}
              >
                <Icon
                  size={13}
                  className={cn(
                    folder.key === 'starred' && isActive && 'fill-brand',
                  )}
                />
                {folder.label}
                {badge > 0 && (
                  <span
                    className={cn(
                      'min-w-[1.05rem] text-center text-[10px] font-bold leading-none',
                      isActive ? 'text-brand' : 'text-muted-foreground',
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

function EmailPane() {
  const { selectedEmailId, setSelectedEmailId, emails, activeFolder } =
    useCommunicationStore();
  const { messagesLoading } = useSyncCommunicationMailbox();

  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedEmailId) ?? null,
    [emails, selectedEmailId],
  );

  const folderEmails = useMemo(
    () => getEmailsForFolder(emails, activeFolder),
    [emails, activeFolder],
  );

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-surface-page">
      <div
        className={cn(
          'h-full flex-shrink-0 overflow-hidden border-r border-border bg-surface-card',
          selectedEmailId
            ? 'hidden md:flex md:w-[340px] lg:w-[380px] xl:w-[400px]'
            : 'flex w-full md:w-[340px] lg:w-[380px] xl:w-[400px]',
          'flex-col',
        )}
      >
        <EmailList isLoading={messagesLoading} />
      </div>

      <div
        className={cn(
          'h-full min-w-0 flex-1 overflow-hidden bg-surface-card',
          selectedEmailId ? 'flex flex-col' : 'hidden md:flex md:flex-col',
        )}
      >
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmailId(null)}
          />
        ) : (
          <EmptyDetailState folder={activeFolder} count={folderEmails.length} />
        )}
      </div>
    </div>
  );
}

function EmptyDetailState({
  folder,
  count,
}: {
  folder: MailNavKey;
  count: number;
}) {
  const labels: Record<MailNavKey, string> = {
    inbox: 'Inbox',
    starred: 'Starred',
    sent: 'Sent',
    drafts: 'Drafts',
    archive: 'Archive',
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-page/40 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-card shadow-xs">
        <Mail size={28} className="text-muted-foreground/35" />
      </div>
      <div className="max-w-xs text-center">
        <p className="text-base font-semibold text-foreground">
          Select a message
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {count === 0
            ? `${labels[folder]} is empty`
            : `${count} message${count === 1 ? '' : 's'} in ${labels[folder]}`}
        </p>
      </div>
    </div>
  );
}

export default function CommunicationPage() {
  const { activeView, setActiveView } = useCommunicationStore();
  const searchParams = useSearchParams();
  const { accounts, activeAccountId } = useEmailAccounts();
  const { data: commSettings } = useGetCommunicationSettings();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const activeProvider = activeAccount?.provider;

  // Notification deep links use ?tab=tasks (and aliases); map onto store views.
  useEffect(() => {
    const tab = searchParams.get('tab')?.trim().toLowerCase();
    if (!tab) return;
    if (tab === 'tasks' || tab === 'todo') {
      setActiveView('todo');
      return;
    }
    if (tab === 'calendar') {
      setActiveView('calendar');
      return;
    }
    if (tab === 'email' || tab === 'mail') {
      setActiveView('email');
    }
  }, [searchParams, setActiveView]);

  useMailboxLiveSync({
    enabled: activeView === 'email' && Boolean(activeAccountId),
    mailPollingEnabled: commSettings?.sync?.mailPollingEnabled,
    gmailPubSubEnabled: commSettings?.sync?.gmailPubSubEnabled,
    gmailPubSubWatchActive: activeAccount?.gmailPubSubWatchActive,
    accountId: activeAccountId || null,
    provider: activeProvider,
  });

  useOAuthReturnHandler();
  const connectUi = useConnectSyncProgressUi();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-page">
      {connectUi.showProgress && (
        <ConnectSyncProgressBanner
          percent={connectUi.percent}
          synced={connectUi.synced}
          total={connectUi.total}
          email={connectUi.email}
          minimized={connectUi.minimized}
          stopping={connectUi.stopping}
          showStopConfirm={connectUi.showStopConfirm}
          onMinimize={connectUi.minimizeProgress}
          onExpand={connectUi.expandProgress}
          onRequestStop={connectUi.requestStop}
          onConfirmStop={() => void connectUi.confirmStopAndRemove()}
          onCancelStop={connectUi.cancelStop}
        />
      )}
      {connectUi.showSuccess && connectUi.email && (
        <ConnectionSuccessModal
          email={connectUi.email}
          onClose={connectUi.closeSuccess}
        />
      )}

      <CommunicationHeader />

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeView === 'email' && <EmailPane />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'todo' && <TodoView />}
      </div>

      <ComposeModal />
    </div>
  );
}
