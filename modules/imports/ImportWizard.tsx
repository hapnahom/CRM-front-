'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { dealUiLabel } from '@/config/salesWorkflow';
import { UserSingleSelect } from '@/components/pipeline/ObserversMultiSelect';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import {
  useConfirmImport,
  useDownloadImportTemplate,
  useResolveImportRow,
  useSkipImportRow,
  useUploadImportFile,
} from '@/store/server/features/imports/mutations';
import { useImportPreview } from '@/store/server/features/imports/queries';
import type {
  ImportIssue,
  ImportPreview,
  ImportPreviewRow,
  ImportRowStatus,
  ImportSummary,
  ImportTemplateKind,
  ResolveImportRowInput,
} from '@/store/server/features/imports/types';

const KIND_COPY: Record<
  ImportTemplateKind,
  {
    title: string;
    description: string;
    templateTitle: string;
    templateDetail: string;
    recordLabel: string;
  }
> = {
  customer: {
    title: 'Import customers',
    description:
      'Download the customer template, fill the Customers sheet, then upload. Nothing is saved until you confirm.',
    templateTitle: 'Customer template',
    templateDetail: 'One sheet for accounts only.',
    recordLabel: 'Customer',
  },
  contact: {
    title: 'Import contacts',
    description:
      'Download the contact template. Same fields as Add contact. Contacts with a customer show on that account’s Contacts tab.',
    templateTitle: 'Contact template',
    templateDetail:
      'One sheet for contacts. Customer and First Name are required.',
    recordLabel: 'Contact',
  },
  lead: {
    title: 'Import leads',
    description:
      'Download the lead template. One row is one New Lead: name, customer, contact, stage, and the same dropdowns as the dialog. Missing customers can be created on confirm or linked from the preview.',
    templateTitle: 'Lead template',
    templateDetail:
      'One sheet for leads. Lists are filled from CRM when you download.',
    recordLabel: 'Lead',
  },
  deal: {
    title: `Import ${dealUiLabel({ plural: true, lowercase: true })}`,
    description: `Download the ${dealUiLabel({ lowercase: true })} template. One row is one New ${dealUiLabel()}: name, customer, contact, stage, and the same dropdowns as the dialog. Missing customers can be created on confirm or linked from the preview.`,
    templateTitle: `${dealUiLabel()} template`,
    templateDetail: `One sheet for ${dealUiLabel({ plural: true, lowercase: true })}. Lists are filled from CRM when you download.`,
    recordLabel: dealUiLabel(),
  },
  catalog_product: {
    title: 'Import products',
    description:
      'Download the product template. Same fields as Add product, with dropdown lists for vendors and implementation partners.',
    templateTitle: 'Product template',
    templateDetail: 'Products sheet plus Lists from your catalog.',
    recordLabel: 'Product',
  },
};

function getKindCopy(kind: ImportTemplateKind) {
  const base = KIND_COPY[kind];
  if (kind !== 'deal') return base;
  const singular = dealUiLabel();
  const plural = dealUiLabel({ plural: true, lowercase: true });
  return {
    ...base,
    title: `Import ${plural}`,
    description: `Download the ${singular.toLowerCase()} template. One row is one New ${singular}: name, customer, contact, stage, and the same dropdowns as the dialog. Missing customers can be created on confirm or linked from the preview.`,
    templateTitle: `${singular} template`,
    templateDetail: `One sheet for ${plural}. Lists are filled from CRM when you download.`,
    recordLabel: singular,
  };
}

const STATUS_BADGE: Record<
  ImportRowStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'muted' | 'brand';
  }
> = {
  valid: { label: 'Ready', variant: 'success' },
  duplicate: { label: 'Duplicate', variant: 'warning' },
  ambiguous: { label: 'Pick match', variant: 'warning' },
  missing: { label: 'Missing', variant: 'danger' },
  error: { label: 'Error', variant: 'danger' },
  skipped: { label: 'Skipped', variant: 'muted' },
  created: { label: 'Created', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
};

type Step = 'upload' | 'preview' | 'summary';
type FilterKey = 'all' | 'issues' | 'ready' | 'skipped';

function apiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof response === 'string' && response.trim()) return response;
  if (response && typeof response === 'object') {
    const message = (response as { message?: string | string[] }).message;
    if (Array.isArray(message) && message[0]) return String(message[0]);
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

type LegacyEntityCounts = {
  customer?: number;
  contact?: number;
  lead?: number;
  deal?: number;
};

function countFrom(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const counts = value as LegacyEntityCounts;
    return (
      (Number(counts.customer) || 0) +
      (Number(counts.contact) || 0) +
      (Number(counts.lead) || 0) +
      (Number(counts.deal) || 0)
    );
  }
  return 0;
}

function normalizeSummary(raw: unknown): ImportSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const failures = Array.isArray(value.failures)
    ? value.failures
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const failure = item as Record<string, unknown>;
          const rowId = typeof failure.rowId === 'string' ? failure.rowId : '';
          const rowNumber = Number(failure.rowNumber);
          const message =
            typeof failure.message === 'string' ? failure.message : '';
          if (!rowId || !Number.isFinite(rowNumber)) return null;
          return { rowId, rowNumber, message };
        })
        .filter(
          (item): item is ImportSummary['failures'][number] => item !== null,
        )
    : [];

  return {
    created: countFrom(value.created),
    skipped: countFrom(value.skipped),
    failed: countFrom(value.failed),
    failures,
  };
}

function blockingCount(preview: ImportPreview | undefined): number {
  if (!preview) return 0;
  return (
    preview.counts.duplicate +
    preview.counts.ambiguous +
    preview.counts.missing +
    preview.counts.error
  );
}

function rowNeedsAttention(row: ImportPreviewRow): boolean {
  return (
    ['duplicate', 'ambiguous', 'missing', 'error'].includes(row.status) ||
    row.issues.some((issue) => issue.code === 'WILL_CREATE')
  );
}

function willCreateRelated(row: ImportPreviewRow): boolean {
  return row.issues.some((issue) => issue.code === 'WILL_CREATE');
}

export function ImportWizard({
  open,
  onOpenChange,
  kind = 'customer',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: ImportTemplateKind;
}) {
  const copy = getKindCopy(kind);
  const [step, setStep] = useState<Step>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const previewQuery = useImportPreview(jobId);
  const preview = previewQuery.data;
  const downloadTemplate = useDownloadImportTemplate(kind);
  const uploadFile = useUploadImportFile(kind);
  const confirmImport = useConfirmImport();

  const reset = () => {
    setStep('upload');
    setJobId(null);
    setFilter('all');
    setExpandedRowId(null);
    setSummary(null);
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile.mutateAsync(file);
      setJobId(result.id);
      setStep('preview');
      const firstIssue = result.rows.find((row) => rowNeedsAttention(row));
      setExpandedRowId(firstIssue?.id ?? null);
      if (blockingCount(result) === 0) {
        const willCreate = result.rows.some((row) => willCreateRelated(row));
        toast.success(
          willCreate
            ? 'Rows are ready. Related customers or contacts will be created on confirm unless you pick existing ones.'
            : 'All rows look ready. Review and confirm the import.',
        );
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not read this Excel file.'));
    }
  };

  const handleConfirm = async () => {
    if (!jobId) return;
    try {
      const result = await confirmImport.mutateAsync(jobId);
      setSummary(
        normalizeSummary(result) ?? {
          created: 0,
          skipped: 0,
          failed: 0,
          failures: [],
        },
      );
      setStep('summary');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not confirm this import.'));
    }
  };

  const rows = preview?.rows ?? [];
  const visibleRows = rows.filter((row) => {
    if (filter === 'issues') {
      return rowNeedsAttention(row);
    }
    if (filter === 'ready') return row.status === 'valid';
    if (filter === 'skipped') return row.status === 'skipped';
    return true;
  });

  const issuesLeft = blockingCount(preview);
  const readyCount = preview?.counts.valid ?? 0;
  const canConfirm =
    Boolean(preview) &&
    issuesLeft === 0 &&
    readyCount > 0 &&
    !confirmImport.isLoading;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <UploadStep
            templateTitle={copy.templateTitle}
            templateDetail={copy.templateDetail}
            downloading={downloadTemplate.isLoading}
            uploading={uploadFile.isLoading}
            onDownload={() => downloadTemplate.mutate()}
            onFile={(file) => void handleUpload(file)}
          />
        ) : null}

        {step === 'preview' && preview ? (
          <PreviewStep
            preview={preview}
            recordLabel={copy.recordLabel}
            filter={filter}
            onFilterChange={setFilter}
            visibleRows={visibleRows}
            expandedRowId={expandedRowId}
            onToggleRow={(id) =>
              setExpandedRowId((current) => (current === id ? null : id))
            }
            jobId={jobId}
          />
        ) : null}

        {step === 'summary' &&
        (summary || normalizeSummary(preview?.summary)) ? (
          <SummaryStep
            kind={kind}
            summary={(summary || normalizeSummary(preview?.summary))!}
          />
        ) : null}

        <DialogFooter className="shrink-0 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {step === 'summary' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'preview' ? (
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={!canConfirm}
              onClick={() => void handleConfirm()}
            >
              {confirmImport.isLoading ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : null}
              Confirm import{readyCount ? ` (${readyCount})` : ''}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadStep({
  templateTitle,
  templateDetail,
  downloading,
  uploading,
  onDownload,
  onFile,
}: {
  templateTitle: string;
  templateDetail: string;
  downloading: boolean;
  uploading: boolean;
  onDownload: () => void;
  onFile: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-sm font-medium text-foreground">{templateTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{templateDetail}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Download size={14} className="mr-1.5" />
          )}
          Download template
        </Button>
      </div>

      <input
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onFile(file);
        }}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-card px-4 py-10 text-center hover:border-border-strong"
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin text-brand" />
        ) : (
          <Upload size={22} className="text-muted-foreground" />
        )}
        <p className="mt-3 text-sm font-medium text-foreground">
          {uploading ? 'Reading file…' : 'Upload Excel file'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx only, up to 5 MB and 1,000 rows
        </p>
      </button>
    </div>
  );
}

function PreviewStep({
  preview,
  recordLabel,
  filter,
  onFilterChange,
  visibleRows,
  expandedRowId,
  onToggleRow,
  jobId,
}: {
  preview: ImportPreview;
  recordLabel: string;
  filter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  visibleRows: ImportPreviewRow[];
  expandedRowId: string | null;
  onToggleRow: (id: string) => void;
  jobId: string | null;
}) {
  const filters: Array<{ id: FilterKey; label: string; count: number }> = [
    { id: 'all', label: 'All', count: preview.counts.total },
    {
      id: 'issues',
      label: 'Needs attention',
      count: preview.rows.filter((row) => rowNeedsAttention(row)).length,
    },
    { id: 'ready', label: 'Ready', count: preview.counts.valid },
    { id: 'skipped', label: 'Skipped', count: preview.counts.skipped },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              filter === item.id
                ? 'border-brand bg-brand-muted text-brand'
                : 'border-border text-muted-foreground',
            )}
          >
            {item.label} {item.count}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {preview.sourceFilename} · fix errors, duplicates, and unmatched owners
        before confirming. Related customers or contacts that will be created
        are listed on those rows.
      </p>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-card text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">{recordLabel}</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No rows in this filter.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <RowBlock
                  key={row.id}
                  row={row}
                  expanded={expandedRowId === row.id}
                  onToggle={() => onToggleRow(row.id)}
                  jobId={jobId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowBlock({
  row,
  expanded,
  onToggle,
  jobId,
}: {
  row: ImportPreviewRow;
  expanded: boolean;
  onToggle: () => void;
  jobId: string | null;
}) {
  const badge = STATUS_BADGE[row.status];

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-t border-border hover:bg-muted/40',
          expanded && 'bg-muted/30',
        )}
        onClick={onToggle}
      >
        <td className="px-3 py-2 tabular-nums text-muted-foreground">
          {row.rowNumber}
        </td>
        <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {willCreateRelated(row) && row.status === 'valid' ? (
              <Badge variant="brand">Will create related</Badge>
            ) : null}
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-border bg-white">
          <td colSpan={3} className="px-3 py-3">
            <RowActions row={row} jobId={jobId} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function RowActions({
  row,
  jobId,
}: {
  row: ImportPreviewRow;
  jobId: string | null;
}) {
  const skip = useSkipImportRow(jobId);
  const resolve = useResolveImportRow(jobId);
  const busy = skip.isLoading || resolve.isLoading;

  const run = async (work: () => Promise<unknown>, fallback: string) => {
    try {
      await work();
    } catch (error) {
      toast.error(apiErrorMessage(error, fallback));
    }
  };

  return (
    <div className="space-y-3">
      {row.issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This row is ready to import.
        </p>
      ) : (
        row.issues.map((issue, index) => (
          <IssueResolver
            key={`${issue.code}-${issue.field}-${index}`}
            issue={issue}
            disabled={busy}
            onSelect={(payload) =>
              run(
                () => resolve.mutateAsync({ rowId: row.id, payload }),
                'Could not save that match.',
              )
            }
          />
        ))
      )}
      <div className="flex flex-wrap gap-2">
        {row.status !== 'skipped' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() => skip.mutateAsync(row.id), 'Could not skip this row.')
            }
          >
            Skip row
          </Button>
        ) : null}
        {row.status === 'duplicate' ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  resolve.mutateAsync({
                    rowId: row.id,
                    payload: { action: 'importAnyway' },
                  }),
                'Could not mark this duplicate.',
              )
            }
          >
            Import anyway
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function IssueResolver({
  issue,
  disabled,
  onSelect,
}: {
  issue: ImportIssue;
  disabled: boolean;
  onSelect: (payload: ResolveImportRowInput) => void;
}) {
  const field = issue.field ?? '';
  const candidates = issue.candidates ?? [];
  const isUserField =
    field === 'owner' || field === 'responsible' || field.startsWith('role:');

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm text-foreground">{issue.message}</p>
      {issue.code === 'WILL_CREATE' ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {issue.field === 'customerName'
            ? 'This customer does not exist yet. Confirm creates it like Add customer, or pick an existing account.'
            : 'Not blocking. Confirm creates it, or pick an existing record.'}
        </p>
      ) : null}
      {candidates.length > 0 && field && !isUserField ? (
        <div className="mt-2 max-w-md">
          <Select
            disabled={disabled}
            onValueChange={(value) => {
              onSelect({ action: 'select', field, entityId: value });
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  issue.code === 'WILL_CREATE'
                    ? 'Select an existing record instead'
                    : 'Select the correct record'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.label}
                  {candidate.subtitle ? ` · ${candidate.subtitle}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isUserField ? (
        <OwnerPicker
          disabled={disabled}
          onSelect={(userId) =>
            onSelect({ action: 'select', field, entityId: userId })
          }
        />
      ) : null}
    </div>
  );
}

function OwnerPicker({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (userId: string) => void;
}) {
  const { data } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const users = data?.data ?? [];
  const [value, setValue] = useState('');

  return (
    <div className="mt-3 max-w-md">
      <Label className="mb-1.5 block text-xs">Select owner</Label>
      <UserSingleSelect
        users={users}
        value={value}
        disabled={disabled}
        placeholder="Search users"
        onChange={(userId) => {
          setValue(userId);
          onSelect(userId);
        }}
      />
    </div>
  );
}

function SummaryStep({
  kind,
  summary,
}: {
  kind: ImportTemplateKind;
  summary: ImportSummary;
}) {
  const pipelineKind = kind === 'lead' || kind === 'deal';
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Created" value={summary.created} tone="success" />
        <SummaryCard label="Skipped" value={summary.skipped} tone="muted" />
        <SummaryCard label="Failed" value={summary.failed} tone="danger" />
      </div>
      {pipelineKind && summary.created > 0 ? (
        <p className="text-sm text-muted-foreground">
          Imported{' '}
          {kind === 'lead'
            ? 'leads'
            : dealUiLabel({ plural: true, lowercase: true })}{' '}
          are real pipeline records (same API as New{' '}
          {kind === 'lead' ? 'Lead' : dealUiLabel()}). They appear in Sales Hub
          when the toolbar{' '}
          <span className="font-medium text-foreground">currency</span> and{' '}
          <span className="font-medium text-foreground">fiscal period</span>{' '}
          match the row — use{' '}
          <span className="font-medium text-foreground">Annual</span> or pick
          the same session you used in the file. Clear org filters if you scoped
          by team or person.
        </p>
      ) : null}
      {summary.failures.length > 0 ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {summary.failures.map((failure) => (
            <p key={failure.rowId}>
              Row {failure.rowNumber}: {failure.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'muted' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold',
          tone === 'success' && 'text-foreground',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ImportButton({
  kind = 'customer',
  className,
  label = 'Import',
}: {
  kind?: ImportTemplateKind;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <FileSpreadsheet size={14} className="mr-1.5" />
        {label}
      </Button>
      <ImportWizard kind={kind} open={open} onOpenChange={setOpen} />
    </>
  );
}
