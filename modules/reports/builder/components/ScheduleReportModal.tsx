'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  FileSpreadsheet,
  FileText,
  Mail,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { FieldLabel } from './ui-bits';

export type ScheduleReportPayload = {
  frequency: string;
  format: string;
  recipients: string;
  date: string;
  time: string;
};

type ScheduleReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  categoryLabel: string;
  saving?: boolean;
  onSave: (payload: ScheduleReportPayload) => void | Promise<void>;
};

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', hint: 'Every morning' },
  { id: 'weekly', label: 'Weekly', hint: 'Every Monday' },
  { id: 'monthly', label: 'Monthly', hint: '1st of month' },
  { id: 'quarterly', label: 'Quarterly', hint: 'Start of quarter' },
] as const;

const FORMATS = [
  {
    id: 'excel',
    label: 'Excel',
    hint: 'Spreadsheet export',
    icon: FileSpreadsheet,
    color: tokens.color.success,
    bg: '#ecfdf5',
  },
  {
    id: 'pdf',
    label: 'PDF',
    hint: 'Print-ready document',
    icon: FileText,
    color: tokens.color.error,
    bg: '#fef2f2',
  },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function ScheduleReportModal({
  open,
  onOpenChange,
  reportName,
  categoryLabel,
  saving = false,
  onSave,
}: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState('weekly');
  const [format, setFormat] = useState('excel');
  const [recipients, setRecipients] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrequency('weekly');
    setFormat('excel');
    setRecipients('');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime('09:00');
    setLocalError(null);
  }, [open]);

  const emails = useMemo(() => parseEmails(recipients), [recipients]);

  const schedulePreview = useMemo(() => {
    const freq =
      FREQUENCIES.find((item) => item.id === frequency)?.label ?? frequency;
    const fmt = FORMATS.find((item) => item.id === format)?.label ?? format;
    const start = date || 'the selected start date';
    const to =
      emails.length === 0
        ? 'the emails configured'
        : emails.length === 1
          ? emails[0]
          : `${emails.length} recipients`;
    return `${freq} · ${fmt} · from ${start} at ${time} to ${to}`;
  }, [date, emails, format, frequency, time]);

  const handleSave = async () => {
    setLocalError(null);
    if (!date) {
      setLocalError('Select a start date');
      return;
    }
    if (!emails.length) {
      setLocalError('Add at least one recipient email');
      return;
    }
    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) {
      setLocalError(`Invalid email: ${invalid[0]}`);
      return;
    }
    await onSave({
      frequency,
      format,
      recipients: emails.join(', '),
      date,
      time: time || '09:00',
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-white px-5 py-4 sm:px-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-start gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: tokens.color.brandMuted,
                  color: tokens.color.brand,
                }}
              >
                <CalendarClock size={18} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-[18px] font-semibold text-foreground">
                  Schedule Report
                </DialogTitle>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Automate delivery on a recurring cadence.
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 bg-[#f7f8fa] px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Report
            </p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">
              {reportName}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {categoryLabel}
            </p>
          </div>

          <div>
            <FieldLabel>Frequency</FieldLabel>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FREQUENCIES.map((item) => {
                const selected = frequency === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving}
                    onClick={() => setFrequency(item.id)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-brand bg-brand-muted'
                        : 'border-border bg-white hover:bg-surface-elevated',
                    )}
                  >
                    <span className="block text-[12px] font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel>Export format</FieldLabel>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {FORMATS.map((item) => {
                const selected = format === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving}
                    onClick={() => setFormat(item.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      selected
                        ? 'border-brand bg-brand-muted'
                        : 'border-border bg-white hover:bg-surface-elevated',
                    )}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-[12px] font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {item.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Recipients</FieldLabel>
              <div className="relative mt-1.5">
                <Mail
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="name@company.com, other@company.com"
                  disabled={saving}
                  className="h-10 border-border bg-white pl-9 text-[12px] shadow-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Comma-separated email addresses. Delivery uses the central email
                service.
              </p>
            </div>

            <div>
              <FieldLabel>Start date</FieldLabel>
              <div className="relative mt-1.5">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={saving}
                  className="h-10 border-border bg-white pl-9 text-[12px] shadow-none"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Delivery time</FieldLabel>
              <div className="relative mt-1.5">
                <Clock3
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={saving}
                  className="h-10 border-border bg-white pl-9 text-[12px] shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-muted/70 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wide text-brand uppercase">
              Schedule preview
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#9a4a1f]">
              {schedulePreview}
            </p>
          </div>

          {localError ? (
            <p className="text-[12px] font-medium text-[#dc2626]">
              {localError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-white px-5 py-4 sm:px-6">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-brand text-white hover:bg-brand-hover"
            disabled={saving || !recipients.trim() || !date}
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
