'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { ObserversMultiSelect } from '@/components/pipeline/ObserversMultiSelect';
import type {
  TodoItem,
  TodoPriority,
  TodoTaskType,
} from '@/modules/communication/data/mockData';
import { useEmailAccounts } from '@/modules/communication/components/EmailAccountSettings';
import {
  useCreateCommunicationTask,
  useUpdateCommunicationTask,
} from '@/store/server/features/communication/mutations';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { communicationApiErrorMessage } from '@/modules/communication/utils/apiErrorMessage';
import {
  TaskCrmLinkFields,
  taskCrmLinkFromIds,
  toTaskCrmPayload,
  type TaskCrmLinkValue,
} from '@/modules/communication/components/TaskCrmLinkFields';

const CONTROL_CLASS = 'h-9 border-border bg-surface-card text-sm';

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Calendar Y-M-D from an all-day dueAt stored as floating UTC midnight of that date. */
function utcCalendarDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T00:00`;
}

/**
 * Outlook-style floating all-day dueAt: calendar date at 00:00:00.000Z.
 * Do not convert local midnight via toISOString() — that shifts the day in UTC+N.
 */
function allDayDueAtIso(dayYmd: string) {
  return `${dayYmd.slice(0, 10)}T00:00:00.000Z`;
}

/**
 * Graph timed model: wall-clock string without Z/offset (e.g. 2026-08-12T14:00:00).
 * Backend + Graph use this with the user's IANA timeZone.
 */
function timedWallClock(dueLocal: string) {
  const raw = dueLocal.trim();
  if (!raw) return '';
  // datetime-local is YYYY-MM-DDTHH:mm — pad seconds for Graph.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 19);
  return raw;
}

function defaultDueFromCalendarDate(date: Date): string {
  const due = new Date(date);
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  if (sameDay) {
    due.setHours(now.getHours(), now.getMinutes(), 0, 0);
  } else {
    due.setHours(9, 0, 0, 0);
  }
  return toLocalInputValue(due);
}

function dueIsoToLocal(iso?: string | null, isAllDay = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (isAllDay) return utcCalendarDateInput(d);
  return toLocalInputValue(d);
}

export type TaskFormValues = Pick<
  TodoItem,
  'id' | 'title' | 'priority' | 'completed'
> & {
  taskType?: TodoTaskType;
  description?: string;
  dueDate?: string;
  isAllDay?: boolean;
  assigneeUserIds?: string[];
  connectedAccountId?: string | null;
  calendarEventId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  relatedLinks?: TodoItem['relatedLinks'];
};

type CalendarMailboxMode = 'keep' | 'move' | 'crm_only';

type TaskFormModalProps = {
  /** When set, modal edits this task instead of creating. */
  task?: TaskFormValues | null;
  /** Initial values for a new task, such as a task created from an email. */
  initialValues?: Partial<TaskFormValues>;
  defaultDate?: Date;
  onClose: () => void;
  onSaved?: () => void;
};

/**
 * CRM-first task create/edit. Due date syncs a linked calendar event.
 */
export function TaskFormModal({
  task,
  initialValues,
  defaultDate,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const isEdit = Boolean(task?.id);
  const { accounts, activeAccountId } = useEmailAccounts();
  const currentUserId = useAuthenticationStore((s) => s.userId);
  const createMutation = useCreateCommunicationTask();
  const updateMutation = useUpdateCommunicationTask();
  const { data: usersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 100,
  });
  const teammates = useMemo(
    () => (usersData?.data || []).filter((u) => u.id && u.id !== currentUserId),
    [usersData, currentUserId],
  );

  const taskMailboxId = task?.connectedAccountId ?? null;
  const taskMailboxLabel = useMemo(() => {
    if (!taskMailboxId) return null;
    const acc = accounts.find((a) => a.id === taskMailboxId);
    return acc?.email || 'another mailbox';
  }, [accounts, taskMailboxId]);

  const needsMailboxChoice = Boolean(
    isEdit &&
      activeAccountId &&
      task?.dueDate &&
      ((taskMailboxId && taskMailboxId !== activeAccountId) ||
        !taskMailboxId ||
        !task.calendarEventId),
  );

  const [title, setTitle] = useState(task?.title || initialValues?.title || '');
  const [description, setDescription] = useState(
    task?.description || initialValues?.description || '',
  );
  const [taskType, setTaskType] = useState<TodoTaskType>(
    task?.taskType || initialValues?.taskType || 'task',
  );
  const [priority, setPriority] = useState<TodoPriority>(
    task?.priority || initialValues?.priority || 'medium',
  );
  const [dueLocal, setDueLocal] = useState(() => {
    if (task) return dueIsoToLocal(task.dueDate, Boolean(task.isAllDay));
    if (initialValues?.dueDate) {
      return dueIsoToLocal(
        initialValues.dueDate,
        Boolean(initialValues.isAllDay),
      );
    }
    if (initialValues) return '';
    return defaultDueFromCalendarDate(defaultDate || new Date());
  });
  const [dueIsAllDay, setDueIsAllDay] = useState(
    Boolean(task?.isAllDay || initialValues?.isAllDay),
  );
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(
    task?.assigneeUserIds || initialValues?.assigneeUserIds || [],
  );
  const [completed, setCompleted] = useState(Boolean(task?.completed));
  const [mailboxMode, setMailboxMode] = useState<CalendarMailboxMode>(() => {
    if (!isEdit) return 'move';
    if (!task?.calendarEventId && activeAccountId) return 'move';
    if (!taskMailboxId) return 'crm_only';
    if (activeAccountId && taskMailboxId !== activeAccountId) return 'keep';
    return 'keep';
  });
  const [crmLink, setCrmLink] = useState<TaskCrmLinkValue>(() =>
    taskCrmLinkFromIds({
      leadId: task?.leadId ?? initialValues?.leadId,
      dealId: task?.dealId ?? initialValues?.dealId,
      customerId: task?.customerId ?? initialValues?.customerId,
      contactId: task?.contactId ?? initialValues?.contactId,
      relatedLinks: task?.relatedLinks ?? initialValues?.relatedLinks,
    }),
  );

  const isBusy = createMutation.isLoading || updateMutation.isLoading;

  const resolveConnectedAccountId = (): string | null | undefined => {
    if (!isEdit) return activeAccountId || undefined;
    // Same mailbox / no choice needed — do not touch ownership.
    if (!needsMailboxChoice) return undefined;
    if (mailboxMode === 'keep') {
      return taskMailboxId ?? undefined;
    }
    if (mailboxMode === 'move') {
      return activeAccountId || null;
    }
    return null;
  };

  const submit = () => {
    if (isBusy) return;
    if (!title.trim()) {
      toast.error('Enter a task title');
      return;
    }
    if (!isEdit && !dueLocal) {
      toast.error('Set a due date so the task appears on the calendar');
      return;
    }
    if (crmLink.primaryType === 'deal' && !crmLink.deal) {
      toast.error(
        isLeadsEnabled()
          ? 'Select a deal or choose No CRM link'
          : `Select an ${dealUiLabel({ lowercase: true })} or choose No CRM link`,
      );
      return;
    }
    if (isLeadsEnabled() && crmLink.primaryType === 'lead' && !crmLink.lead) {
      toast.error('Select a lead or choose No CRM link');
      return;
    }
    if (crmLink.primaryType === 'contact' && !crmLink.contact) {
      toast.error('Select a contact or choose No CRM link');
      return;
    }
    if (needsMailboxChoice && mailboxMode === 'move' && !activeAccountId) {
      toast.error('Connect a mailbox before moving this task to your calendar');
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let dueAt: string | null = null;
    if (dueLocal) {
      if (dueIsAllDay) {
        dueAt = allDayDueAtIso(dueLocal.slice(0, 10));
      } else {
        dueAt = timedWallClock(dueLocal);
      }
    }

    const crmPayload = toTaskCrmPayload(crmLink);
    const connectedAccountId = resolveConnectedAccountId();

    if (isEdit && task?.id) {
      updateMutation.mutate(
        {
          taskId: task.id,
          body: {
            title: title.trim(),
            description: description.trim() || null,
            taskType,
            priority,
            dueAt,
            dueIsAllDay: dueAt ? dueIsAllDay : undefined,
            timeZone: dueAt ? timeZone : undefined,
            status: completed ? 'completed' : 'open',
            assigneeUserIds,
            ...(connectedAccountId !== undefined ? { connectedAccountId } : {}),
            leadId: crmPayload.leadId,
            dealId: crmPayload.dealId,
            customerId: crmPayload.customerId,
            contactId: crmPayload.contactId,
          },
        },
        {
          onSuccess: (updated: {
            calendarEventId?: string | null;
            calendarSyncStatus?: string | null;
          }) => {
            const sync = (updated?.calendarSyncStatus || '').toLowerCase();
            if (mailboxMode === 'crm_only' && needsMailboxChoice) {
              toast.success(
                'Task updated — kept in CRM only (calendar sync detached)',
              );
            } else if (mailboxMode === 'move' && needsMailboxChoice) {
              toast.success(
                sync === 'synced'
                  ? 'Task moved to the active mailbox calendar'
                  : 'Task updated — moving to active mailbox calendar',
              );
            } else if (dueAt && sync === 'synced') {
              toast.success('Task updated and synced to calendar');
            } else if (dueAt && sync === 'failed_auth') {
              toast.warning(
                'Task updated in CRM, but calendar sync failed — reconnect mailbox',
              );
            } else if (!dueAt && task.calendarEventId) {
              toast.success(
                'Task updated — removed from calendar (no due date)',
              );
            } else {
              toast.success('Task updated');
            }
            onSaved?.();
            onClose();
          },
          onError: (error) => {
            const msg = communicationApiErrorMessage(
              error,
              'Failed to update task',
            );
            if (msg) toast.error(msg);
          },
        },
      );
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        taskType,
        priority,
        dueAt: dueAt || undefined,
        dueIsAllDay: dueAt ? dueIsAllDay : undefined,
        timeZone: dueAt ? timeZone : undefined,
        connectedAccountId: activeAccountId || undefined,
        assigneeUserIds,
        leadId: crmPayload.leadId || undefined,
        dealId: crmPayload.dealId || undefined,
        customerId: crmPayload.customerId || undefined,
        contactId: crmPayload.contactId || undefined,
      },
      {
        onSuccess: (created: {
          calendarEventId?: string | null;
          calendarSyncStatus?: string | null;
        }) => {
          const sync = (created?.calendarSyncStatus || '').toLowerCase();
          if (sync === 'synced') {
            toast.success('Task created and synced to calendar');
          } else if (sync === 'failed_auth') {
            toast.warning(
              'Task created in CRM, but calendar sync failed — reconnect mailbox with calendar permission',
            );
          } else if (created?.calendarEventId) {
            toast.success(
              'Task created on CRM calendar (provider sync pending or CRM-only)',
            );
          } else if (!activeAccountId) {
            toast.success(
              'Task created in CRM — connect a mailbox to sync it to your calendar',
            );
          } else {
            toast.success('Task created');
          }
          onSaved?.();
          onClose();
        },
        onError: (error) => {
          const msg = communicationApiErrorMessage(
            error,
            'Failed to create task',
          );
          if (msg) toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(860px,92vh)] max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-card shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              {isEdit ? 'Edit task' : 'Add task'}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isEdit
                ? 'Changes sync to your connected calendar when a due date is set. Completing marks the calendar event with ✓.'
                : 'Tasks with a due date sync to your connected calendar. Taken time slots are blocked so CRM and provider calendars stay aligned.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 shrink-0 text-muted-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 px-5 py-4">
            <Field label="Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
                placeholder="e.g. Follow up on proposal"
                aria-label="Task title"
                autoFocus
                disabled={isBusy}
                className={CONTROL_CLASS}
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
                aria-label="Task description"
                rows={2}
                disabled={isBusy}
                className="min-h-[4rem] resize-none border-border bg-surface-card text-sm"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Priority">
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TodoPriority)}
                  disabled={isBusy}
                >
                  <SelectTrigger className={CONTROL_CLASS}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Task type">
                <Select
                  value={taskType}
                  onValueChange={(value) => setTaskType(value as TodoTaskType)}
                  disabled={isBusy}
                >
                  <SelectTrigger className={CONTROL_CLASS}>
                    <SelectValue placeholder="Task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">To-do</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Due">
                <Input
                  type={dueIsAllDay ? 'date' : 'datetime-local'}
                  value={
                    dueIsAllDay && dueLocal ? dueLocal.slice(0, 10) : dueLocal
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (dueIsAllDay) {
                      setDueLocal(v ? `${v}T00:00` : '');
                    } else {
                      setDueLocal(v);
                    }
                  }}
                  disabled={isBusy}
                  className={CONTROL_CLASS}
                  title="Due date/time creates a linked calendar event"
                />
              </Field>

              <Field label="All day">
                <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-card px-3">
                  <Checkbox
                    id="task-modal-all-day"
                    checked={dueIsAllDay}
                    disabled={isBusy}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setDueIsAllDay(next);
                      if (next && dueLocal) {
                        setDueLocal(`${dueLocal.slice(0, 10)}T00:00`);
                      }
                    }}
                  />
                  <Label
                    htmlFor="task-modal-all-day"
                    className="cursor-pointer text-sm font-normal"
                  >
                    All-day event
                  </Label>
                </div>
              </Field>

              {isEdit ? (
                <Field label="Status" className="sm:col-span-4">
                  <div className="flex h-9 max-w-xs items-center gap-2 rounded-md border border-border bg-surface-card px-3">
                    <Checkbox
                      id="task-modal-completed"
                      checked={completed}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        setCompleted(checked === true)
                      }
                    />
                    <Label
                      htmlFor="task-modal-completed"
                      className="cursor-pointer text-sm font-normal"
                    >
                      Completed
                    </Label>
                  </div>
                </Field>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-border px-5 py-4">
            <Field label="Assignees">
              <ObserversMultiSelect
                users={teammates}
                value={assigneeUserIds}
                onChange={setAssigneeUserIds}
                placeholder="Assign teammates…"
                entityLabel="assignee"
                className={
                  isBusy ? 'pointer-events-none opacity-60' : undefined
                }
              />
            </Field>

            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  CRM link
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isLeadsEnabled()
                    ? 'Optionally link this task to a deal, lead, and/or contact.'
                    : `Optionally link this task to an ${dealUiLabel({ lowercase: true })} and/or contact.`}
                </p>
              </div>
              <TaskCrmLinkFields
                value={crmLink}
                onChange={setCrmLink}
                disabled={isBusy}
              />
            </div>

            {needsMailboxChoice && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-amber-950">
                    Calendar mailbox
                  </h4>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    {!task?.calendarEventId
                      ? 'This task has a due date but is not linked to a CRM calendar row. Choose whether to sync it to the active mailbox.'
                      : taskMailboxId
                        ? `This task is on ${taskMailboxLabel}. Choose how to handle calendar sync with your active mailbox.`
                        : 'This task has a due date but is not linked to a mailbox. Choose whether to sync it to the active mailbox.'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {taskMailboxId ? (
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-amber-100/50">
                      <input
                        type="radio"
                        name="mailbox-mode"
                        className="mt-0.5"
                        checked={mailboxMode === 'keep'}
                        disabled={isBusy}
                        onChange={() => setMailboxMode('keep')}
                      />
                      <span className="text-[11px] leading-snug text-foreground">
                        <span className="font-medium">
                          Keep on current mailbox
                        </span>
                        <span className="block text-muted-foreground">
                          Updates stay on {taskMailboxLabel}; no cross-mailbox
                          move.
                        </span>
                      </span>
                    </label>
                  ) : null}
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-amber-100/50">
                    <input
                      type="radio"
                      name="mailbox-mode"
                      className="mt-0.5"
                      checked={mailboxMode === 'move'}
                      disabled={isBusy || !activeAccountId}
                      onChange={() => setMailboxMode('move')}
                    />
                    <span className="text-[11px] leading-snug text-foreground">
                      <span className="font-medium">
                        {taskMailboxId
                          ? 'Move to active mailbox'
                          : 'Sync to active mailbox'}
                      </span>
                      <span className="block text-muted-foreground">
                        {taskMailboxId
                          ? 'Removes the old calendar event (best effort) and creates one on the active mailbox.'
                          : 'Creates / links a calendar event on the active mailbox.'}
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-amber-100/50">
                    <input
                      type="radio"
                      name="mailbox-mode"
                      className="mt-0.5"
                      checked={mailboxMode === 'crm_only'}
                      disabled={isBusy}
                      onChange={() => setMailboxMode('crm_only')}
                    />
                    <span className="text-[11px] leading-snug text-foreground">
                      <span className="font-medium">CRM only</span>
                      <span className="block text-muted-foreground">
                        Keep the due date in CRM; detach from calendar sync.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {activeAccountId
                ? 'This task belongs to your CRM account. The active mailbox is only used to sync the due window to your calendar. Overlapping times on that mailbox are not allowed.'
                : 'This task belongs to your CRM account even without a mailbox. Connect Microsoft or Google to optionally sync the due window to your calendar.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isBusy}
            className="h-9 flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isBusy}
            className="h-9 flex-1 gap-1.5"
          >
            {isBusy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : isEdit ? (
              <>
                <Pencil size={14} />
                Update
              </>
            ) : (
              <>
                <Plus size={14} />
                Create task
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
