'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Files, Mail, Share2 } from 'lucide-react';
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

export type ShareReportPayload = {
  formats: Array<'excel' | 'pdf'>;
  recipients: string;
};

type ShareFormatChoice = 'excel' | 'pdf' | 'both';

type ShareReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  sending?: boolean;
  onShare: (payload: ShareReportPayload) => void | Promise<void>;
};

const FORMAT_CHOICES: Array<{
  id: ShareFormatChoice;
  label: string;
  hint: string;
  icon: typeof FileSpreadsheet;
  color: string;
  bg: string;
}> = [
  {
    id: 'excel',
    label: 'Excel',
    hint: 'Spreadsheet only',
    icon: FileSpreadsheet,
    color: tokens.color.success,
    bg: '#ecfdf5',
  },
  {
    id: 'pdf',
    label: 'PDF',
    hint: 'Document only',
    icon: FileText,
    color: tokens.color.error,
    bg: '#fef2f2',
  },
  {
    id: 'both',
    label: 'Both',
    hint: 'Excel + PDF',
    icon: Files,
    color: tokens.color.brand,
    bg: tokens.color.brandMuted,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function formatsFromChoice(choice: ShareFormatChoice): Array<'excel' | 'pdf'> {
  if (choice === 'both') return ['excel', 'pdf'];
  return [choice];
}

export function ShareReportModal({
  open,
  onOpenChange,
  reportName,
  sending = false,
  onShare,
}: ShareReportModalProps) {
  const [formatChoice, setFormatChoice] = useState<ShareFormatChoice>('excel');
  const [recipients, setRecipients] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormatChoice('excel');
    setRecipients('');
    setLocalError(null);
  }, [open]);

  const emails = useMemo(() => parseEmails(recipients), [recipients]);

  const handleShare = async () => {
    setLocalError(null);
    const formats = formatsFromChoice(formatChoice);
    if (!emails.length) {
      setLocalError('Add at least one recipient email');
      return;
    }
    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) {
      setLocalError(`Invalid email: ${invalid[0]}`);
      return;
    }
    await onShare({
      formats,
      recipients: emails.join(', '),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (sending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-white px-5 py-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-start gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: tokens.color.brandMuted,
                  color: tokens.color.brand,
                }}
              >
                <Share2 size={18} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-[18px] font-semibold text-foreground">
                  Share Report
                </DialogTitle>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Email the report as Excel, PDF, or both.
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 bg-[#f7f8fa] px-5 py-5">
          <div>
            <FieldLabel>Report</FieldLabel>
            <Input
              value={reportName}
              readOnly
              className="mt-1.5 h-10 border-border bg-white text-[12px] shadow-none"
            />
          </div>

          <div>
            <FieldLabel>Export format</FieldLabel>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {FORMAT_CHOICES.map((item) => {
                const selected = formatChoice === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={sending}
                    onClick={() => setFormatChoice(item.id)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
                      selected
                        ? 'border-brand bg-brand-muted'
                        : 'border-border bg-white hover:bg-surface-elevated',
                    )}
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      <Icon size={15} />
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

          <div>
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
                disabled={sending}
                className="h-10 border-border bg-white pl-9 text-[12px] shadow-none"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Comma-separated emails. Sent via the central email service.
            </p>
          </div>

          {localError ? (
            <p className="text-[12px] font-medium text-[#dc2626]">
              {localError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-white px-5 py-4">
          <Button
            variant="outline"
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-brand text-white hover:bg-brand-hover"
            disabled={sending || !recipients.trim()}
            onClick={() => {
              void handleShare();
            }}
          >
            {sending ? 'Sending…' : 'Share Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
