'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  MailNavKey,
  useCommunicationStore,
} from '@/store/uistate/features/communication/communicationStore';
import {
  useGetEmailFolders,
  useGetEmailMessage,
  useGetEmailMessages,
} from '@/store/server/features/communication/queries';
import {
  mapCrmMessageToUi,
  mapWellKnownToUiFolder,
  sortCrmFoldersForUi,
} from '@/store/server/features/communication/mappers';
import type { CrmEmailFolder } from '@/store/server/features/communication/types';
import type { EmailFolder } from '@/modules/communication/data/mockData';

const EMPTY_FOLDERS: CrmEmailFolder[] = [];

function asEmailFolder(folder: MailNavKey): EmailFolder {
  return folder === 'starred' ? 'inbox' : folder;
}

/**
 * Keeps the Zustand email list in sync with CRM mailbox APIs.
 * Graph → CRM is driven by webhooks (and connect sync). Header Refresh
 * only reloads queries from the CRM DB.
 */
export function useSyncCommunicationMailbox() {
  const activeAccountId = useCommunicationStore((s) => s.activeAccountId);
  const activeFolder = useCommunicationStore((s) => s.activeFolder);
  const activeFolderId = useCommunicationStore((s) => s.activeFolderId);
  const searchQuery = useCommunicationStore((s) => s.searchQuery);
  const selectedEmailId = useCommunicationStore((s) => s.selectedEmailId);
  const setEmails = useCommunicationStore((s) => s.setEmails);
  const upsertEmail = useCommunicationStore((s) => s.upsertEmail);

  const { data: foldersData, isLoading: foldersLoading } =
    useGetEmailFolders(activeAccountId);
  const folders = foldersData ?? EMPTY_FOLDERS;

  const sortedFolders = useMemo(() => sortCrmFoldersForUi(folders), [folders]);

  const isStarredView = activeFolder === 'starred';

  // Default / repair selection when folders load or account changes.
  useEffect(() => {
    if (!activeAccountId || !sortedFolders.length) return;
    if (isStarredView) return;

    const stillValid =
      Boolean(activeFolderId) &&
      sortedFolders.some((f) => f.id === activeFolderId);

    if (stillValid) return;

    const preferredWellKnown =
      activeFolder === 'sent' ||
      activeFolder === 'drafts' ||
      activeFolder === 'archive'
        ? activeFolder
        : 'inbox';

    const match =
      sortedFolders.find((f) => f.wellKnownType === preferredWellKnown) ||
      sortedFolders.find((f) => f.wellKnownType === 'inbox') ||
      sortedFolders[0];
    if (!match) return;

    const uiFolder = mapWellKnownToUiFolder(match.wellKnownType) || 'inbox';
    useCommunicationStore.setState({
      activeFolderId: match.id,
      activeFolder: uiFolder,
      selectedEmailId: null,
    });
  }, [
    activeAccountId,
    sortedFolders,
    activeFolderId,
    activeFolder,
    isStarredView,
  ]);

  const {
    data: messagesPage,
    isLoading: messagesLoading,
    isFetching: messagesFetching,
    isPreviousData,
  } = useGetEmailMessages({
    accountId: activeAccountId,
    // Starred is a cross-folder filter — don't scope by folderId.
    folderId: isStarredView ? null : activeFolderId,
    isStarred: isStarredView ? true : undefined,
    q: searchQuery.trim() || undefined,
    enabled:
      Boolean(activeAccountId) && (isStarredView || Boolean(activeFolderId)),
  });

  const { data: messageDetail } = useGetEmailMessage(
    activeAccountId,
    selectedEmailId,
  );

  const lastListKey = useRef<string>('');
  const lastDetailKey = useRef<string>('');

  useEffect(() => {
    if (!activeAccountId) {
      if (lastListKey.current !== '') {
        lastListKey.current = '';
        setEmails([]);
      }
      return;
    }
    if (!isStarredView && !activeFolderId) {
      if (lastListKey.current !== 'pending-folder') {
        lastListKey.current = 'pending-folder';
        setEmails([]);
      }
      return;
    }
    // Keep optimistic star/archive rows visible while the new folder query loads.
    // Applying keepPreviousData from the *previous* folder would wipe those updates.
    if (isPreviousData) return;
    if (!messagesPage) return;

    const key = `${activeAccountId}:${isStarredView ? 'starred' : activeFolderId}:${searchQuery}:${messagesPage.items
      .map((i) => `${i.id}:${i.isRead}:${i.isStarred}:${i.folderId || ''}`)
      .join(',')}`;
    if (key === lastListKey.current) return;
    lastListKey.current = key;

    setEmails(
      messagesPage.items.map((item) => {
        const folderMeta = sortedFolders.find((f) => f.id === item.folderId);
        const uiFolder =
          mapWellKnownToUiFolder(folderMeta?.wellKnownType) ||
          asEmailFolder(activeFolder);
        return mapCrmMessageToUi(item, { folder: uiFolder });
      }),
    );
  }, [
    activeAccountId,
    activeFolder,
    activeFolderId,
    isStarredView,
    isPreviousData,
    messagesPage,
    searchQuery,
    setEmails,
    sortedFolders,
  ]);

  useEffect(() => {
    if (!messageDetail || !selectedEmailId) return;
    if (messageDetail.id !== selectedEmailId) return;

    const detailKey = `${messageDetail.id}:${messageDetail.updatedAt || ''}:${
      messageDetail.bodyHtml?.length || 0
    }:${messageDetail.bodyText?.length || 0}:${
      messageDetail.attachments?.length || 0
    }:${messageDetail.hasAttachments ? 1 : 0}`;
    if (detailKey === lastDetailKey.current) return;
    lastDetailKey.current = detailKey;

    const folderMeta = sortedFolders.find(
      (f) => f.id === messageDetail.folderId,
    );
    const uiFolder =
      mapWellKnownToUiFolder(folderMeta?.wellKnownType) ||
      asEmailFolder(activeFolder);

    upsertEmail(
      mapCrmMessageToUi(messageDetail, {
        folder: uiFolder,
        detail: messageDetail,
      }),
    );
  }, [
    messageDetail,
    selectedEmailId,
    activeFolder,
    upsertEmail,
    sortedFolders,
  ]);

  return {
    folders: sortedFolders,
    foldersLoading,
    messagesLoading: messagesLoading || (messagesFetching && !isPreviousData),
    hasAccount: Boolean(activeAccountId),
    hasFolder: isStarredView || Boolean(activeFolderId),
  };
}
