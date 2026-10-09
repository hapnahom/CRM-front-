'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Flag,
  ListTodo,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  Target,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { Button } from '@/components/ui/button';
import {
  TodoItem,
  TodoPriority,
  TodoTaskType,
} from '@/modules/communication/data/mockData';
import { TaskFormModal } from '@/modules/communication/components/TaskFormModal';
import { useEmailAccounts } from '@/modules/communication/components/EmailAccountSettings';
import { crmRelatedHref } from '@/modules/communication/utils/crmRelatedLinks';
import { useGetCommunicationTasks } from '@/store/server/features/communication/queries';
import {
  useDeleteCommunicationTask,
  useToggleCommunicationTask,
} from '@/store/server/features/communication/mutations';
import type { CrmCommunicationTask } from '@/store/server/features/communication/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type TaskBucket = 'overdue' | 'today' | 'upcoming' | 'later' | 'done';
type RelatedFilter = 'all' | 'deal' | 'lead' | 'contact' | 'customer';
type StatusFilter = 'all' | 'open' | 'overdue' | 'today' | 'done';

function mapCrmTask(row: CrmCommunicationTask): TodoItem {
  const relatedLinks = (row.relatedLinks || []).map((l) => ({
    type: l.type as NonNullable<TodoItem['relatedLinks']>[number]['type'],
    name: l.name,
    id: l.id,
    customerId: l.customerId ?? (l.type === 'contact' ? row.customerId : null),
  }));
  const related = row.relatedTo
    ? {
        type: row.relatedTo.type,
        name:
          row.relatedTo.name ||
          relatedLinks.find((l) => l.id === row.relatedTo?.id)?.name ||
          `${row.relatedTo.type} · ${row.relatedTo.id.slice(0, 8)}`,
        id: row.relatedTo.id,
      }
    : relatedLinks[0]
      ? {
          type: relatedLinks[0].type,
          name: relatedLinks[0].name,
          id: relatedLinks[0].id,
        }
      : undefined;
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    completed: row.completed,
    taskType: row.taskType || 'task',
    priority: row.priority,
    dueDate: row.dueDate || undefined,
    isAllDay: Boolean(row.isAllDay),
    tags: row.tags || [],
    createdAt: row.createdAt,
    relatedTo: related,
    relatedLinks: relatedLinks.length ? relatedLinks : undefined,
    leadId: row.leadId,
    dealId: row.dealId,
    customerId: row.customerId,
    contactId: row.contactId,
    connectedAccountId: row.connectedAccountId,
    calendarEventId: row.calendarEventId,
    calendarSyncStatus: row.calendarSyncStatus,
    assigneeUserIds: row.assigneeUserIds,
    ownerUserId: row.ownerUserId,
  };
}

const PRIORITY: Record<
  TodoPriority,
  { label: string; bar: string; chip: string }
> = {
  high: {
    label: 'High',
    bar: 'bg-error',
    chip: 'bg-error/10 text-error border-error/20',
  },
  medium: {
    label: 'Med',
    bar: 'bg-warning',
    chip: 'bg-warning/10 text-warning border-warning/20',
  },
  low: {
    label: 'Low',
    bar: 'bg-muted-foreground/40',
    chip: 'bg-muted text-muted-foreground border-border',
  },
};

const TASK_TYPE: Record<
  TodoTaskType,
  { label: string; icon: LucideIcon; chip: string }
> = {
  task: {
    label: 'To-do',
    icon: ListTodo,
    chip: 'border-teal-200 bg-teal-50 text-teal-700',
  },
  call: {
    label: 'Call',
    icon: Phone,
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  meeting: {
    label: 'Meeting',
    icon: Users,
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
  },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getBucket(todo: TodoItem, today: Date): TaskBucket {
  if (todo.completed) return 'done';
  if (!todo.dueDate) return 'later';
  const raw = new Date(todo.dueDate);
  const due = todo.isAllDay
    ? new Date(
        raw.getUTCFullYear(),
        raw.getUTCMonth(),
        raw.getUTCDate(),
        0,
        0,
        0,
        0,
      )
    : startOfDay(raw);
  const t = startOfDay(today);
  if (due.getTime() < t.getTime()) return 'overdue';
  if (due.getTime() === t.getTime()) return 'today';
  if (due.getTime() <= addDays(t, 7).getTime()) return 'upcoming';
  return 'later';
}

function formatDue(dateStr?: string, isAllDay = false) {
  if (!dateStr) return null;
  const dueAt = new Date(dateStr);
  // All-day dueAt is floating UTC midnight of the calendar date.
  const due = isAllDay
    ? new Date(
        dueAt.getUTCFullYear(),
        dueAt.getUTCMonth(),
        dueAt.getUTCDate(),
        0,
        0,
        0,
        0,
      )
    : startOfDay(dueAt);
  const today = startOfDay(new Date());
  const days = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const hasTime =
    !isAllDay &&
    (dueAt.getHours() !== 0 ||
      dueAt.getMinutes() !== 0 ||
      dueAt.getSeconds() !== 0);
  const timeBit = hasTime
    ? ` · ${dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : isAllDay
      ? ' · All day'
      : '';
  if (days < 0)
    return {
      text: `${Math.abs(days)}d overdue${timeBit}`,
      tone: 'danger' as const,
    };
  if (days === 0) return { text: `Due today${timeBit}`, tone: 'warn' as const };
  if (days === 1)
    return { text: `Tomorrow${timeBit}`, tone: 'neutral' as const };
  if (days <= 7)
    return { text: `In ${days}d${timeBit}`, tone: 'neutral' as const };
  return {
    text: `${due.toLocaleDateString([], { month: 'short', day: 'numeric' })}${timeBit}`,
    tone: 'neutral' as const,
  };
}

function RelatedIcon({
  type,
}: {
  type: NonNullable<TodoItem['relatedTo']>['type'];
}) {
  if (type === 'deal') return <Briefcase size={11} />;
  if (type === 'lead') return <User size={11} />;
  if (type === 'contact') return <Building2 size={11} />;
  return <Target size={11} />;
}

function relatedHref(link: {
  type: string;
  id: string;
  customerId?: string | null;
}): string | null {
  return crmRelatedHref(link);
}

function TaskRow({
  todo,
  activeAccountId,
  onEdit,
}: {
  todo: TodoItem;
  activeAccountId: string | null;
  onEdit: (todo: TodoItem) => void;
}) {
  const router = useRouter();
  const toggleMutation = useToggleCommunicationTask();
  const deleteMutation = useDeleteCommunicationTask();
  const [deletePhase, setDeletePhase] = useState<'idle' | 'deleting' | 'done'>(
    'idle',
  );
  const due = formatDue(todo.dueDate, Boolean(todo.isAllDay));
  const priority = PRIORITY[todo.priority];
  const taskType = TASK_TYPE[todo.taskType || 'task'];
  const TaskTypeIcon = taskType.icon;
  const isDeleting =
    deletePhase === 'deleting' ||
    (deleteMutation.isLoading && deleteMutation.variables === todo.id);
  const isToggling =
    toggleMutation.isLoading && toggleMutation.variables === todo.id;

  const handleDelete = () => {
    if (isDeleting || deletePhase === 'done' || isToggling) return;
    const linked = Boolean(todo.calendarEventId);
    const ok = window.confirm(
      linked
        ? 'Delete this task?\n\nIts linked calendar event will also be removed.'
        : 'Delete this task?',
    );
    if (!ok) return;
    setDeletePhase('deleting');
    deleteMutation.mutate(todo.id, {
      onSuccess: () => {
        setDeletePhase('done');
        toast.success(
          linked ? 'Task and linked calendar event deleted' : 'Task deleted',
        );
      },
      onError: () => {
        setDeletePhase('idle');
        toast.error('Failed to delete task');
      },
    });
  };

  const handleToggle = () => {
    if (isDeleting || deletePhase === 'done' || isToggling) return;
    toggleMutation.mutate(todo.id, {
      onSuccess: () => {
        toast.success(
          todo.completed
            ? 'Task marked open — calendar updated'
            : 'Task completed — calendar event marked ✓',
        );
      },
      onError: () => {
        toast.error('Failed to update task');
      },
    });
  };

  return (
    <div
      className={cn(
        'group flex items-stretch gap-0 border-b border-border/70 bg-white transition-colors last:border-b-0 hover:bg-surface-elevated/60',
        todo.completed && 'opacity-55',
        isDeleting && 'pointer-events-none bg-error/[0.03] opacity-70',
        deletePhase === 'done' && 'pointer-events-none opacity-40',
        isToggling && 'opacity-80',
      )}
      aria-busy={isDeleting || isToggling}
    >
      <div className={cn('w-1 flex-shrink-0', priority.bar)} />

      <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 sm:px-4">
        <button
          type="button"
          disabled={isDeleting || deletePhase === 'done' || isToggling}
          onClick={handleToggle}
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:opacity-50',
            todo.completed
              ? 'border-success bg-success text-white'
              : 'border-muted-foreground/25 hover:border-brand',
          )}
          aria-label={
            isToggling
              ? 'Updating…'
              : todo.completed
                ? 'Mark incomplete'
                : 'Complete task'
          }
        >
          {isToggling ? (
            <Loader2 size={11} className="animate-spin text-brand" />
          ) : (
            todo.completed && <Check size={11} strokeWidth={3} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-medium leading-snug text-foreground',
                todo.completed && 'line-through text-muted-foreground',
                isDeleting && 'text-muted-foreground',
              )}
            >
              {todo.title}
            </p>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {isDeleting ? (
                <span className="inline-flex items-center gap-1 rounded border border-error/20 bg-error/10 px-1.5 py-0.5 text-[10px] font-semibold text-error">
                  <Loader2 size={10} className="animate-spin" />
                  Deleting…
                </span>
              ) : deletePhase === 'done' ? (
                <span className="inline-flex items-center gap-1 rounded border border-success/20 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                  <Check size={10} strokeWidth={3} />
                  Deleted
                </span>
              ) : isToggling ? (
                <span className="inline-flex items-center gap-1 rounded border border-brand/20 bg-brand-muted px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                  <Loader2 size={10} className="animate-spin" />
                  Updating…
                </span>
              ) : (
                <>
                  {todo.completed && (
                    <span className="inline-flex items-center gap-1 rounded border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                      <Check size={9} strokeWidth={3} />
                      Done
                    </span>
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                      priority.chip,
                    )}
                  >
                    <Flag size={9} />
                    {priority.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                      taskType.chip,
                    )}
                  >
                    <TaskTypeIcon size={9} />
                    {taskType.label}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => onEdit(todo)}
                disabled={isDeleting || deletePhase === 'done' || isToggling}
                className={cn(
                  'rounded-md p-1 transition-all',
                  'text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:bg-brand-muted hover:text-brand',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                aria-label="Edit task"
                title="Edit task"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || deletePhase === 'done' || isToggling}
                className={cn(
                  'rounded-md p-1 transition-all',
                  isDeleting || deletePhase === 'done'
                    ? 'opacity-100 text-error'
                    : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive',
                  'disabled:cursor-not-allowed',
                )}
                aria-label={isDeleting ? 'Deleting task' : 'Delete task'}
              >
                {isDeleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </div>
          </div>

          {isDeleting && (
            <p className="mt-1 text-[11px] font-medium text-error/80">
              {todo.calendarEventId
                ? 'Canceling task and removing calendar event…'
                : 'Deleting task…'}
            </p>
          )}

          {!isDeleting && deletePhase !== 'done' && todo.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {todo.description}
            </p>
          )}

          {!isDeleting && deletePhase !== 'done' && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {due && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                    due.tone === 'danger' && 'bg-error/10 text-error',
                    due.tone === 'warn' && 'bg-warning/10 text-warning',
                    due.tone === 'neutral' &&
                      'bg-surface-page text-muted-foreground',
                  )}
                >
                  {due.tone === 'danger' ? (
                    <AlertCircle size={10} />
                  ) : (
                    <CalendarDays size={10} />
                  )}
                  {due.text}
                </span>
              )}

              {todo.calendarEventId ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                    todo.connectedAccountId &&
                      activeAccountId &&
                      todo.connectedAccountId === activeAccountId
                      ? 'border-teal-200 bg-teal-50 text-teal-700'
                      : todo.connectedAccountId
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-border bg-surface-page text-muted-foreground',
                  )}
                  title={
                    todo.connectedAccountId &&
                    activeAccountId &&
                    todo.connectedAccountId === activeAccountId
                      ? 'This CRM task is synced to the active mailbox calendar'
                      : todo.connectedAccountId
                        ? 'This CRM task stays on Tasks. Switch mailbox to see it on calendar, or move it on edit.'
                        : 'CRM task with a due date — not synced to a connected calendar'
                  }
                >
                  <CalendarDays size={10} />
                  {todo.connectedAccountId &&
                  activeAccountId &&
                  todo.connectedAccountId === activeAccountId
                    ? 'On calendar (this mailbox)'
                    : todo.connectedAccountId
                      ? 'On calendar (other mailbox)'
                      : 'On calendar (CRM only)'}
                </span>
              ) : todo.dueDate ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
                  title="Due date is saved on the CRM task. Open the task and choose Sync to active mailbox to attach it to the calendar."
                >
                  <CalendarDays size={10} />
                  Due · not on calendar
                </span>
              ) : null}
              {todo.assigneeUserIds && todo.assigneeUserIds.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-page px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <User size={10} />
                  {todo.assigneeUserIds.length} assigned
                </span>
              )}

              {(todo.relatedLinks?.length
                ? todo.relatedLinks
                : todo.relatedTo
                  ? [
                      {
                        type: todo.relatedTo.type as
                          | 'deal'
                          | 'lead'
                          | 'contact'
                          | 'customer',
                        name: todo.relatedTo.name,
                        id: todo.relatedTo.id || '',
                      },
                    ]
                  : []
              ).map((link) => {
                const href = link.id
                  ? relatedHref({
                      ...link,
                      customerId:
                        link.customerId ||
                        (link.type === 'contact' ? todo.customerId : null),
                    })
                  : null;
                return (
                  <button
                    key={`${link.type}-${link.id || link.name}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!href) return;
                      router.push(href);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-page px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand/30 hover:bg-brand-muted/40 hover:text-brand"
                    title={
                      href
                        ? link.type === 'contact'
                          ? 'Open customer and set this contact as primary'
                          : `Open ${link.type}`
                        : `${link.type}: ${link.name}`
                    }
                  >
                    <RelatedIcon type={link.type} />
                    <span className="capitalize text-muted-foreground/70">
                      {link.type}
                    </span>
                    <span className="max-w-[140px] truncate text-foreground/80">
                      {link.name}
                    </span>
                  </button>
                );
              })}

              {todo.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-brand/15 bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const BUCKET_META: Record<
  Exclude<TaskBucket, 'done'>,
  { title: string; hint: string; accent: string }
> = {
  overdue: {
    title: 'Overdue',
    hint: 'Needs attention now',
    accent: 'text-error',
  },
  today: {
    title: 'Today',
    hint: 'Due on your plate',
    accent: 'text-brand',
  },
  upcoming: {
    title: 'This week',
    hint: 'Next 7 days',
    accent: 'text-foreground',
  },
  later: {
    title: 'Later',
    hint: 'Scheduled ahead',
    accent: 'text-muted-foreground',
  },
};

export default function TodoView() {
  const { data: remoteTasks = [] } = useGetCommunicationTasks();
  const { activeAccountId } = useEmailAccounts();
  const todos = useMemo(() => remoteTasks.map(mapCrmTask), [remoteTasks]);
  const [search, setSearch] = useState('');
  const [relatedFilter, setRelatedFilter] = useState<RelatedFilter>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | 'all'>(
    'all',
  );
  const [taskTypeFilter, setTaskTypeFilter] = useState<TodoTaskType | 'all'>(
    'all',
  );
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const today = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (statusFilter === 'done') {
        if (!t.completed) return false;
      } else if (statusFilter === 'open') {
        if (t.completed) return false;
      } else if (statusFilter === 'overdue') {
        if (t.completed || getBucket(t, today) !== 'overdue') return false;
      } else if (statusFilter === 'today') {
        if (t.completed || getBucket(t, today) !== 'today') return false;
      } else if (!showCompleted && t.completed) {
        return false;
      }

      if (priorityFilter !== 'all' && t.priority !== priorityFilter)
        return false;
      if (taskTypeFilter !== 'all' && (t.taskType || 'task') !== taskTypeFilter)
        return false;
      if (relatedFilter !== 'all') {
        if (!t.relatedTo || t.relatedTo.type !== relatedFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          t.title,
          t.description ?? '',
          t.relatedTo?.name ?? '',
          ...(t.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    todos,
    search,
    relatedFilter,
    showCompleted,
    priorityFilter,
    taskTypeFilter,
    statusFilter,
    today,
  ]);

  const buckets = useMemo(() => {
    const map: Record<TaskBucket, TodoItem[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      later: [],
      done: [],
    };
    for (const t of filtered) {
      map[getBucket(t, today)].push(t);
    }
    const sortFn = (a: TodoItem, b: TodoItem) => {
      const p = { high: 0, medium: 1, low: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    };
    (Object.keys(map) as TaskBucket[]).forEach((k) => map[k].sort(sortFn));
    return map;
  }, [filtered, today]);

  const stats = useMemo(() => {
    const open = todos.filter((t) => !t.completed);
    const done = todos.filter((t) => t.completed).length;
    const overdue = open.filter(
      (t) => getBucket(t, today) === 'overdue',
    ).length;
    const dueToday = open.filter((t) => getBucket(t, today) === 'today').length;
    return { open: open.length, overdue, dueToday, done };
  }, [todos, today]);

  const openBuckets = (
    ['overdue', 'today', 'upcoming', 'later'] as const
  ).filter((k) => buckets[k].length > 0);

  const showDoneSection =
    (statusFilter === 'done' || (statusFilter === 'all' && showCompleted)) &&
    buckets.done.length > 0;

  const selectStatus = (next: StatusFilter) => {
    setStatusFilter((current) => (current === next ? 'all' : next));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex-shrink-0 border-b border-border bg-white px-6 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Sales tasks
            </h2>
          </div>
          <Button
            type="button"
            className="h-9 gap-1.5"
            onClick={() => {
              setEditingTodo(null);
              setIsCreating(true);
            }}
          >
            <Plus size={14} />
            Add task
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border border-border bg-surface-card sm:grid-cols-4 sm:divide-y-0">
          <TaskMetric
            label="Open"
            value={stats.open}
            icon={ListTodo}
            active={statusFilter === 'open'}
            onClick={() => selectStatus('open')}
          />
          <TaskMetric
            label="Overdue"
            value={stats.overdue}
            icon={AlertCircle}
            tone={stats.overdue > 0 ? 'danger' : 'default'}
            active={statusFilter === 'overdue'}
            onClick={() => selectStatus('overdue')}
          />
          <TaskMetric
            label="Today"
            value={stats.dueToday}
            icon={CalendarDays}
            tone="brand"
            active={statusFilter === 'today'}
            onClick={() => selectStatus('today')}
          />
          <TaskMetric
            label="Done"
            value={stats.done}
            icon={CheckCircle2}
            tone={stats.done > 0 ? 'brand' : 'default'}
            active={statusFilter === 'done'}
            onClick={() => selectStatus('done')}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, deals, leads…"
              className="h-9 w-full rounded-lg border border-border bg-white py-2 pl-8 pr-8 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'All'],
                ['deal', dealUiLabel({ plural: true })],
                ...(isLeadsEnabled() ? ([['lead', 'Leads']] as const) : []),
                ['contact', 'Contacts'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRelatedFilter(key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  relatedFilter === key
                    ? 'bg-brand-muted text-brand'
                    : 'text-muted-foreground hover:bg-surface-elevated',
                )}
              >
                {label}
              </button>
            ))}
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as TodoPriority | 'all')
              }
              className="h-8 rounded-full border border-border bg-white px-2.5 text-xs font-medium outline-none"
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={taskTypeFilter}
              onChange={(e) =>
                setTaskTypeFilter(e.target.value as TodoTaskType | 'all')
              }
              className="h-8 rounded-full border border-border bg-white px-2.5 text-xs font-medium outline-none"
            >
              <option value="all">All types</option>
              <option value="task">To-do</option>
              <option value="call">Calls</option>
              <option value="meeting">Meetings</option>
            </select>
            {statusFilter === 'all' ? (
              <button
                type="button"
                onClick={() => setShowCompleted((p) => !p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  showCompleted
                    ? 'bg-brand-muted text-brand'
                    : 'text-muted-foreground hover:bg-surface-elevated',
                )}
              >
                {showCompleted ? 'Hide done' : 'Show done'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="w-full space-y-4 px-6 py-4">
          {openBuckets.length === 0 && !showDoneSection ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <Check size={20} className="text-brand" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Pipeline is clear
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                No open tasks match your filters. Add a follow-up tied to a deal
                or lead to keep momentum.
              </p>
              <Button
                type="button"
                className="mt-4 h-9 gap-1.5"
                onClick={() => {
                  setEditingTodo(null);
                  setIsCreating(true);
                }}
              >
                <Plus size={14} />
                Add task
              </Button>
            </div>
          ) : (
            <>
              {statusFilter !== 'done'
                ? openBuckets.map((key) => (
                    <section
                      key={key}
                      className="overflow-hidden rounded-xl border border-border bg-white shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-border bg-surface-page/50 px-4 py-2.5">
                        <div>
                          <h3
                            className={cn(
                              'text-sm font-semibold',
                              BUCKET_META[key].accent,
                            )}
                          >
                            {BUCKET_META[key].title}
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              {buckets[key].length}
                            </span>
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            {BUCKET_META[key].hint}
                          </p>
                        </div>
                      </div>
                      <div>
                        {buckets[key].map((todo) => (
                          <TaskRow
                            key={todo.id}
                            todo={todo}
                            activeAccountId={activeAccountId}
                            onEdit={(t) => {
                              setIsCreating(false);
                              setEditingTodo(t);
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                : null}

              {showDoneSection && buckets.done.length > 0 ? (
                <section className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
                  <div className="border-b border-border bg-surface-page/50 px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-success">
                      Done
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        {buckets.done.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Completed tasks stay here — uncheck to reopen
                    </p>
                  </div>
                  <div>
                    {buckets.done.map((todo) => (
                      <TaskRow
                        key={todo.id}
                        todo={todo}
                        activeAccountId={activeAccountId}
                        onEdit={(t) => {
                          setIsCreating(false);
                          setEditingTodo(t);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {(isCreating || editingTodo) && (
        <TaskFormModal
          key={editingTodo?.id ?? 'create'}
          task={editingTodo}
          onClose={() => {
            setIsCreating(false);
            setEditingTodo(null);
          }}
        />
      )}
    </div>
  );
}

function TaskMetric({
  label,
  value,
  icon,
  tone = 'default',
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'default' | 'danger' | 'brand';
  active?: boolean;
  onClick: () => void;
}) {
  const MetricIcon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
        active
          ? 'bg-brand-muted/60'
          : 'bg-surface-card hover:bg-surface-elevated',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          active
            ? 'bg-brand text-brand-foreground'
            : tone === 'danger'
              ? 'bg-error/10 text-error'
              : tone === 'brand'
                ? 'bg-brand-muted text-brand'
                : 'bg-surface-page text-muted-foreground',
        )}
      >
        <MetricIcon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'block text-base font-semibold tabular-nums leading-tight',
            tone === 'danger' && value > 0
              ? 'text-error'
              : active
                ? 'text-brand'
                : 'text-foreground',
          )}
        >
          {value}
        </span>
      </span>
    </button>
  );
}
