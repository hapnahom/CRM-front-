'use client';

import { toast } from 'sonner';
import { useCommunicationStore } from '@/store/uistate/features/communication/communicationStore';
import {
  useDeleteMailboxMessage,
  useMoveMailboxMessage,
  useUpdateMailboxMessage,
} from '@/store/server/features/communication/mutations';

/**
 * Optimistic UI + CRM/Graph persistence for mailbox message actions.
 */
export function useMailboxMessageActions() {
  const activeAccountId = useCommunicationStore((s) => s.activeAccountId);
  const markAsRead = useCommunicationStore((s) => s.markAsRead);
  const markAsUnread = useCommunicationStore((s) => s.markAsUnread);
  const toggleStar = useCommunicationStore((s) => s.toggleStar);
  const archiveEmail = useCommunicationStore((s) => s.archiveEmail);
  const deleteEmail = useCommunicationStore((s) => s.deleteEmail);

  const updateMutation = useUpdateMailboxMessage();
  const moveMutation = useMoveMailboxMessage();
  const deleteMutation = useDeleteMailboxMessage();

  const requireAccount = () => {
    if (!activeAccountId) {
      toast.error('Connect a mailbox first');
      return null;
    }
    return activeAccountId;
  };

  const setRead = async (messageId: string, isRead: boolean) => {
    const accountId = requireAccount();
    if (!accountId) return;
    if (isRead) markAsRead(messageId);
    else markAsUnread(messageId);
    try {
      await updateMutation.mutateAsync({ accountId, messageId, isRead });
    } catch {
      if (isRead) markAsUnread(messageId);
      else markAsRead(messageId);
      toast.error(
        isRead ? 'Failed to mark as read' : 'Failed to mark as unread',
      );
    }
  };

  const setStarred = async (messageId: string, nextStarred: boolean) => {
    const accountId = requireAccount();
    if (!accountId) return;
    const current = useCommunicationStore
      .getState()
      .emails.find((e) => e.id === messageId)?.isStarred;
    if (Boolean(current) === nextStarred) return;
    toggleStar(messageId);
    try {
      await updateMutation.mutateAsync({
        accountId,
        messageId,
        isStarred: nextStarred,
      });
    } catch {
      toggleStar(messageId);
      toast.error('Failed to update star');
    }
  };

  const toggleStarred = async (messageId: string) => {
    const current = useCommunicationStore
      .getState()
      .emails.find((e) => e.id === messageId)?.isStarred;
    await setStarred(messageId, !current);
  };

  const moveToArchive = async (messageId: string, onDone?: () => void) => {
    const accountId = requireAccount();
    if (!accountId) return;
    archiveEmail(messageId);
    onDone?.();
    try {
      await moveMutation.mutateAsync({
        accountId,
        messageId,
        action: 'archive',
      });
    } catch {
      toast.error('Failed to archive message');
    }
  };

  const removeMessage = async (messageId: string, onDone?: () => void) => {
    const accountId = requireAccount();
    if (!accountId) return;
    deleteEmail(messageId);
    onDone?.();
    try {
      await deleteMutation.mutateAsync({ accountId, messageId });
    } catch {
      toast.error('Failed to delete message');
    }
  };

  return {
    setRead,
    setStarred,
    toggleStarred,
    moveToArchive,
    removeMessage,
    busy:
      updateMutation.isLoading ||
      moveMutation.isLoading ||
      deleteMutation.isLoading,
  };
}
