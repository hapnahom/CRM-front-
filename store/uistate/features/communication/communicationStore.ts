import { create } from 'zustand';
import {
  Email,
  EmailFolder,
  TodoItem,
  MOCK_TODOS,
} from '@/modules/communication/data/mockData';
import { mergeEmailDetailPreservingIdentity } from '@/store/server/features/communication/mappers';

export type ActiveView = 'email' | 'calendar' | 'todo';
export type CalendarViewMode = 'month' | 'week' | 'day';
export type TodoFilter = 'all' | 'active' | 'completed';
/** Mail strip destinations — `starred` is a virtual filter across folders */
export type MailNavKey = EmailFolder | 'starred';

interface ComposeState {
  isOpen: boolean;
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyTo?: Email;
  /** Controls Graph createReply / createReplyAll / createForward. */
  composeMode?: 'new' | 'reply' | 'replyAll' | 'forward';
}

interface CommunicationState {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  activeFolder: MailNavKey;
  setActiveFolder: (folder: MailNavKey) => void;
  /** CRM `email_folder.id` for the selected mailbox folder (null for Starred). */
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  emails: Email[];
  setEmails: (emails: Email[]) => void;
  upsertEmail: (email: Email) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;

  /** First-connect OAuth return: progress banner + success modal. */
  connectFlow: {
    accountId: string | null;
    email: string | null;
    pending: boolean;
    showProgress: boolean;
    showSuccess: boolean;
    minimized: boolean;
  };
  startConnectFlow: (params: {
    accountId: string;
    email?: string | null;
  }) => void;
  updateConnectFlow: (
    patch: Partial<CommunicationState['connectFlow']>,
  ) => void;
  clearConnectFlow: () => void;

  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  toggleStar: (id: string) => void;
  archiveEmail: (id: string) => void;
  deleteEmail: (id: string) => void;
  sendEmail: (
    email: Omit<
      Email,
      'id' | 'folder' | 'date' | 'isRead' | 'isStarred' | 'hasAttachments'
    >,
  ) => void;
  saveDraft: (draft: Partial<Email>) => void;

  compose: ComposeState;
  openCompose: (prefill?: Partial<ComposeState>) => void;
  closeCompose: () => void;
  updateCompose: (fields: Partial<ComposeState>) => void;

  calendarViewMode: CalendarViewMode;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
  calendarCurrentDate: Date;
  setCalendarCurrentDate: (date: Date) => void;

  todos: TodoItem[];
  todoFilter: TodoFilter;
  setTodoFilter: (filter: TodoFilter) => void;
  todoSearchQuery: string;
  setTodoSearchQuery: (q: string) => void;
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
}

const DEFAULT_COMPOSE: ComposeState = {
  isOpen: false,
  to: '',
  cc: '',
  subject: '',
  body: '',
  composeMode: 'new',
};

export function getEmailsForFolder(
  emails: Email[],
  folder: MailNavKey,
): Email[] {
  if (folder === 'starred') {
    return emails.filter((e) => e.isStarred && e.folder !== 'drafts');
  }
  return emails.filter((e) => e.folder === folder);
}

export const useCommunicationStore = create<CommunicationState>((set) => ({
  activeView: 'email',
  setActiveView: (view) => set({ activeView: view, selectedEmailId: null }),

  activeFolder: 'inbox',
  setActiveFolder: (folder) =>
    set({ activeFolder: folder, selectedEmailId: null, activeView: 'email' }),
  activeFolderId: null,
  setActiveFolderId: (id) => set({ activeFolderId: id, selectedEmailId: null }),
  selectedEmailId: null,
  setSelectedEmailId: (id) => {
    set((state) => {
      if (id) {
        return {
          selectedEmailId: id,
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, isRead: true } : e,
          ),
        };
      }
      return { selectedEmailId: null };
    });
  },
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  emails: [],
  setEmails: (emails) => set({ emails }),
  upsertEmail: (email) =>
    set((state) => {
      const exists = state.emails.some((e) => e.id === email.id);
      return {
        emails: exists
          ? state.emails.map((e) =>
              e.id === email.id
                ? mergeEmailDetailPreservingIdentity(e, email)
                : e,
            )
          : [email, ...state.emails],
      };
    }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeAccountId: null,
  setActiveAccountId: (id) =>
    set({
      activeAccountId: id,
      selectedEmailId: null,
      emails: [],
      activeFolderId: null,
    }),

  connectFlow: {
    accountId: null,
    email: null,
    pending: false,
    showProgress: false,
    showSuccess: false,
    minimized: false,
  },
  startConnectFlow: ({ accountId, email }) =>
    set({
      // Keep header / mailbox views on the account being connected or refreshed.
      activeAccountId: accountId,
      selectedEmailId: null,
      emails: [],
      activeFolderId: null,
      connectFlow: {
        accountId,
        email: email || null,
        pending: true,
        showProgress: false,
        showSuccess: false,
        minimized: false,
      },
    }),
  updateConnectFlow: (patch) =>
    set((state) => ({
      connectFlow: { ...state.connectFlow, ...patch },
    })),
  clearConnectFlow: () =>
    set({
      connectFlow: {
        accountId: null,
        email: null,
        pending: false,
        showProgress: false,
        showSuccess: false,
        minimized: false,
      },
    }),

  markAsRead: (id) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === id ? { ...e, isRead: true } : e,
      ),
    })),

  markAsUnread: (id) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === id ? { ...e, isRead: false } : e,
      ),
    })),

  toggleStar: (id) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === id ? { ...e, isStarred: !e.isStarred } : e,
      ),
    })),

  archiveEmail: (id) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === id ? { ...e, folder: 'archive' } : e,
      ),
      selectedEmailId:
        state.selectedEmailId === id ? null : state.selectedEmailId,
    })),

  deleteEmail: (id) =>
    set((state) => ({
      emails: state.emails.filter((e) => e.id !== id),
      selectedEmailId:
        state.selectedEmailId === id ? null : state.selectedEmailId,
    })),

  sendEmail: (emailData) =>
    set((state) => ({
      emails: [
        {
          ...emailData,
          id: `sent-${Date.now()}`,
          folder: 'sent' as EmailFolder,
          date: new Date().toISOString(),
          isRead: true,
          isStarred: false,
          hasAttachments: false,
        },
        ...state.emails,
      ],
    })),

  saveDraft: (draft) =>
    set((state) => ({
      emails: [
        {
          id: `draft-${Date.now()}`,
          folder: 'drafts' as EmailFolder,
          subject: draft.subject || '(No Subject)',
          from: { name: 'Me', email: 'me@company.com' },
          to: draft.to || [],
          body: draft.body || '',
          bodyPreview: (draft.body || '').replace(/<[^>]+>/g, '').slice(0, 120),
          date: new Date().toISOString(),
          isRead: true,
          isStarred: false,
          hasAttachments: false,
        },
        ...state.emails,
      ],
    })),

  compose: DEFAULT_COMPOSE,
  openCompose: (prefill) =>
    set({ compose: { ...DEFAULT_COMPOSE, isOpen: true, ...prefill } }),
  closeCompose: () => set({ compose: DEFAULT_COMPOSE }),
  updateCompose: (fields) =>
    set((state) => ({ compose: { ...state.compose, ...fields } })),

  calendarViewMode: 'month',
  setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
  calendarCurrentDate: new Date(),
  setCalendarCurrentDate: (date) => set({ calendarCurrentDate: date }),

  todos: MOCK_TODOS,
  todoFilter: 'all',
  setTodoFilter: (filter) => set({ todoFilter: filter }),
  todoSearchQuery: '',
  setTodoSearchQuery: (q) => set({ todoSearchQuery: q }),
  addTodo: (todo) =>
    set((state) => ({
      todos: [
        ...state.todos,
        {
          ...todo,
          id: `todo-${Date.now()}`,
          createdAt: new Date().toISOString(),
          completed: false,
        },
      ],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    })),
  deleteTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    })),
  updateTodo: (id, updates) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
}));
