'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  NotebookPen,
  Phone,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { SimpleModal } from '@/components/pipeline/SimpleModal';
import { cn } from '@/lib/utils';

export type ManualActivityKind =
  | 'call'
  | 'meeting'
  | 'note'
  | 'task'
  | 'follow_up';

export type ManualActivityStatus = 'planned' | 'completed';

export type LogActivityPayload = {
  kind: ManualActivityKind;
  subject: string;
  status: ManualActivityStatus;
  whenLocal: string;
  assignee: string;
  notes: string;
  relatedLabel: string;
};

type RelatedOption = { id: string; label: string };

type LogActivitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedLabel: string;
  relatedOptions?: readonly RelatedOption[];
  onSubmit?: (payload: LogActivityPayload) => void;
};

const KIND_OPTIONS: {
  id: ManualActivityKind;
  label: string;
  icon: typeof Phone;
}[] = [
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'meeting', label: 'Meeting', icon: Users },
  { id: 'note', label: 'Note', icon: NotebookPen },
  { id: 'task', label: 'Task', icon: CheckCircle2 },
  { id: 'follow_up', label: 'Follow-up', icon: CalendarClock },
];

const ASSIGNEE_OPTIONS = [
  { id: 'me', label: 'Me' },
  { id: 'sara', label: 'Sara Bekele' },
  { id: 'daniel', label: 'Daniel Okello' },
  { id: 'helen', label: 'Helen Tesfaye' },
];

const fieldClassName =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

function defaultWhenLocal(status: ManualActivityStatus): string {
  const d = new Date();
  if (status === 'planned') {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(
  status: ManualActivityStatus = 'completed',
): Omit<LogActivityPayload, 'relatedLabel'> {
  return {
    kind: 'call',
    subject: '',
    status,
    whenLocal: defaultWhenLocal(status),
    assignee: 'me',
    notes: '',
  };
}

export function LogActivitySheet({
  open,
  onOpenChange,
  relatedLabel,
  relatedOptions,
  onSubmit,
}: LogActivitySheetProps) {
  const [form, setForm] = useState(() => emptyForm());
  const [selectedRelated, setSelectedRelated] = useState(relatedLabel);
  const [errors, setErrors] = useState<{
    subject?: string;
    whenLocal?: string;
    related?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setForm(emptyForm('completed'));
      setSelectedRelated(relatedLabel);
      setErrors({});
    }
  }, [open, relatedLabel]);

  const whenLabel = useMemo(
    () => (form.status === 'planned' ? 'Due' : 'Occurred'),
    [form.status],
  );

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'subject' || key === 'whenLocal') {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleStatusChange(status: ManualActivityStatus) {
    setForm((prev) => ({
      ...prev,
      status,
      whenLocal: defaultWhenLocal(status),
    }));
  }

  function handleSave() {
    const nextErrors: typeof errors = {};
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required';
    if (!form.whenLocal) nextErrors.whenLocal = `${whenLabel} is required`;
    if (!selectedRelated.trim())
      nextErrors.related = 'Related record is required';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: LogActivityPayload = {
      ...form,
      subject: form.subject.trim(),
      notes: form.notes.trim(),
      relatedLabel: selectedRelated,
    };

    onSubmit?.(payload);
    if (!onSubmit) {
      toast.success(
        form.status === 'planned' ? 'Activity scheduled' : 'Activity logged',
        { description: payload.subject },
      );
    }
    onOpenChange(false);
  }

  return (
    <SimpleModal
      open={open}
      onOpenChange={onOpenChange}
      title="Log activity"
      description="Record something that happened, or schedule work to do."
      bodyClassName="space-y-4"
      footer={
        <>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90"
            onClick={handleSave}
          >
            {form.status === 'planned' ? 'Schedule activity' : 'Save activity'}
          </button>
        </>
      }
    >
      {relatedOptions && relatedOptions.length > 0 ? (
        <div className="space-y-1.5">
          <label htmlFor="activity-related">Related to</label>
          <select
            id="activity-related"
            value={selectedRelated}
            onChange={(e) => {
              setSelectedRelated(e.target.value);
              setErrors((prev) => ({ ...prev, related: undefined }));
            }}
            className={fieldClassName}
            aria-invalid={Boolean(errors.related)}
          >
            <option value="" disabled>
              Select record
            </option>
            {relatedOptions.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.related ? (
            <p className="text-[12px] text-destructive">{errors.related}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Related to
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {relatedLabel}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label>Type</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {KIND_OPTIONS.map((option) => {
            const selected = form.kind === option.id;
            const KindIcon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => update('kind', option.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  selected
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-border text-foreground hover:bg-surface-elevated',
                )}
              >
                <KindIcon className="size-3.5 shrink-0 opacity-80" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="activity-subject">Subject</label>
        <input
          id="activity-subject"
          value={form.subject}
          onChange={(e) => update('subject', e.target.value)}
          placeholder="e.g. Called procurement about pricing"
          className={fieldClassName}
          aria-invalid={Boolean(errors.subject)}
        />
        {errors.subject ? (
          <p className="text-[12px] text-destructive">{errors.subject}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label>Status</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'completed', label: 'Completed' },
              { id: 'planned', label: 'Planned' },
            ] as const
          ).map((option) => {
            const selected = form.status === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleStatusChange(option.id)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                  selected
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-border text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="activity-when">{whenLabel}</label>
          <input
            id="activity-when"
            type="datetime-local"
            value={form.whenLocal}
            onChange={(e) => update('whenLocal', e.target.value)}
            className={fieldClassName}
            aria-invalid={Boolean(errors.whenLocal)}
          />
          {errors.whenLocal ? (
            <p className="text-[12px] text-destructive">{errors.whenLocal}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="activity-assignee">Assignee</label>
          <select
            id="activity-assignee"
            value={form.assignee}
            onChange={(e) => update('assignee', e.target.value)}
            className={fieldClassName}
          >
            {ASSIGNEE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="activity-notes">Notes</label>
        <textarea
          id="activity-notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Optional details…"
          className="min-h-[88px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </SimpleModal>
  );
}
