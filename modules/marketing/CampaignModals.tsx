'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  ChevronsUpDown,
  Eye,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plug,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { settingsIntegrationsPath } from '@/lib/routes/settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserOptionLabel } from '@/components/pipeline/ObserversMultiSelect';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import {
  useGetCustomerCities,
  useGetCustomerOrganizationSizes,
} from '@/store/server/features/customers/queries';
import {
  useMarketingAudiences,
  useMarketingAssets,
  useMarketingCampaign,
  useMarketingCampaigns,
  useMarketingEvents,
  useMarketingIntegrations,
  useMarketingMailboxes,
  usePreviewAudienceMembers,
} from '@/store/server/features/marketing/queries';
import {
  useCreateActivity,
  useCreateAsset,
  useCreateAudience,
  useCreateCampaign,
  useCreateEvent,
  useRecordActivityResults,
  useUpdateActivity,
  useUpdateAudience,
  useUpdateCampaign,
} from '@/store/server/features/marketing/mutations';
import type {
  MarketingActivity,
  MarketingAsset,
  MarketingAudience,
  MarketingCampaign,
} from '@/store/server/features/marketing/types';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import { toast } from 'sonner';
import { fileUpload } from '@/utils/fileUpload';
import {
  type AssetMediaKind,
  type AssetPlatform,
  type CampaignObjective,
  type CampaignStatus,
  type ChannelCategory,
  type ChannelType,
  type EventType,
} from './mock-data';
import { StatusBadge } from './ui-kit';
import { activityResults, isManualMarketingChannel } from './utils';

const PLATFORMS: AssetPlatform[] = [
  'YouTube',
  'Vimeo',
  'Google Drive',
  'Dropbox',
  'Figma',
  'Canva',
  'Unsplash',
  'Website',
  'Other',
];

const MEDIA_KINDS: AssetMediaKind[] = [
  'Image',
  'Video',
  'PDF',
  'Document',
  'Template',
  'Script',
  'Link',
];

const OBJECTIVES: CampaignObjective[] = [
  'Lead Generation',
  'Brand Awareness',
  'Product Promotion',
  'Customer Retention',
  'Event Promotion',
  'Revenue Generation',
  'Other',
];

const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'Draft',
  'Scheduled',
  'Active',
  'Paused',
  'Completed',
  'Cancelled',
];

const EMAIL_ACTIVITY_STATUSES = ['Draft', 'Scheduled', 'Active'] as const;
const MANUAL_ACTIVITY_STATUSES = ['Draft', 'Scheduled', 'Active'] as const;

const SOCIAL_PLATFORMS = ['LinkedIn', 'Meta', 'X', 'TikTok', 'Other'];
const SOCIAL_POST_TYPES = ['Post', 'Story', 'Ad'];
const PAID_PLATFORMS = ['Google Ads', 'Meta Ads', 'Other'];

const DIGITAL_TYPES: ChannelType[] = [
  'Email',
  'Social Media',
  'Search Advertising',
  'Display Advertising',
  'SEO',
  'Content',
  'Other Digital',
];

const TRADITIONAL_TYPES: ChannelType[] = [
  'Radio',
  'TV',
  'Print',
  'Outdoor',
  'Direct Mail',
  'Sponsorship',
  'Other Traditional',
];

const EVENT_TYPES: EventType[] = [
  'Webinar',
  'Conference',
  'Workshop',
  'Trade Show',
  'Meetup',
  'Launch',
];

const EVENT_STATUSES = [
  'Draft',
  'Scheduled',
  'Live',
  'Completed',
  'Cancelled',
] as const;

type EventCreateStatus = (typeof EVENT_STATUSES)[number];

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDayIso(dateInput: string) {
  const [y, m, d] = dateInput.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function endOfDayIso(dateInput: string) {
  const [y, m, d] = dateInput.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function mapEventStatusToActivityStatus(status: string): string {
  if (status === 'Live') return 'Active';
  if (
    status === 'Draft' ||
    status === 'Scheduled' ||
    status === 'Completed' ||
    status === 'Cancelled'
  ) {
    return status;
  }
  return 'Draft';
}

function toDateOnly(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function eventFitsCampaign(params: {
  eventStart?: string | null;
  eventEnd?: string | null;
  campaignStart?: string | null;
  campaignEnd?: string | null;
  campaignName?: string | null;
  context: 'event-create' | 'activity-link';
}): string | null {
  const eventStart = toDateOnly(params.eventStart);
  const eventEnd = toDateOnly(params.eventEnd || params.eventStart);
  const campaignStart = toDateOnly(params.campaignStart);
  const campaignEnd = toDateOnly(params.campaignEnd);
  if (!eventStart && !eventEnd) return null;
  if (!campaignStart && !campaignEnd) return null;

  const campaignLabel = params.campaignName?.trim()
    ? `“${params.campaignName.trim()}”`
    : 'the campaign';

  if (campaignStart && eventStart && eventStart < campaignStart) {
    return params.context === 'activity-link'
      ? `Event start (${eventStart}) is before ${campaignLabel} start (${campaignStart}). Change the event timeline or the campaign dates.`
      : `Event start (${eventStart}) is before ${campaignLabel} start (${campaignStart}). Adjust the event dates or the campaign timeline.`;
  }
  if (campaignEnd && eventEnd && eventEnd > campaignEnd) {
    return params.context === 'activity-link'
      ? `Event end (${eventEnd}) is after ${campaignLabel} end (${campaignEnd}). Change the event timeline or the campaign dates.`
      : `Event end (${eventEnd}) is after ${campaignLabel} end (${campaignEnd}). Adjust the event dates or the campaign timeline.`;
  }
  if (campaignStart && eventEnd && eventEnd < campaignStart) {
    return `Event ends (${eventEnd}) before ${campaignLabel} starts (${campaignStart}). Change the event timeline or the campaign dates.`;
  }
  if (campaignEnd && eventStart && eventStart > campaignEnd) {
    return `Event starts (${eventStart}) after ${campaignLabel} ends (${campaignEnd}). Change the event timeline or the campaign dates.`;
  }
  return null;
}

function TimelineClashWarningDialog({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={Boolean(message)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent
        className="z-[60] sm:max-w-md"
        overlayClassName="z-[60] bg-black/20 backdrop-blur-[2px]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Campaign timeline conflict</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-foreground">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const controlClass =
  'h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-brand/30';

function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  // Use a div, not <label>: nested buttons (owner/audience/asset pickers)
  // inside a label steal clicks and toggle the first control instead.
  return (
    <div className={cn('block space-y-1.5', className)}>
      <span className="text-[12px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-error">*</span> : null}
      </span>
      {children}
    </div>
  );
}

function FormSection({
  title,
  children,
  badge,
  actions,
}: {
  title: string;
  children: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-[13px] font-semibold text-foreground">
            {title}
          </h3>
          {badge}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function assetKindIcon(mediaKind: string) {
  if (mediaKind === 'Video') return Film;
  if (mediaKind === 'Image') return ImageIcon;
  if (mediaKind === 'PDF' || mediaKind === 'Document') return FileText;
  return Paperclip;
}

function EmailLinkedAssetCard({ asset }: { asset: MarketingAsset }) {
  const KindIcon = assetKindIcon(asset.mediaKind);
  const isImage = asset.mediaKind === 'Image';
  const thumb = asset.previewUrl || (isImage ? asset.url : null);

  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 overflow-hidden rounded-lg border border-border bg-white transition-colors hover:border-brand/40"
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center"
        style={{ background: asset.thumbnailColor || '#F3F4F6' }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <KindIcon size={18} className="text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 px-2.5 py-2">
        <p className="m-0 truncate text-[12px] font-medium text-foreground group-hover:text-brand">
          {asset.name}
        </p>
        <p className="m-0 truncate text-[11px] text-muted-foreground">
          {asset.mediaKind}
          {asset.fileName ? ` · ${asset.fileName}` : ''}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-brand">
          Open <ExternalLink size={10} />
        </span>
      </div>
    </a>
  );
}

function EmailPreviewDialog({
  open,
  onOpenChange,
  fromLabel,
  toLabels,
  subject,
  body,
  assets,
  activityName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromLabel: string;
  toLabels: string[];
  subject: string;
  body: string;
  assets: MarketingAsset[];
  activityName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,820px)] max-w-[calc(100%-2rem)] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email preview</DialogTitle>
          <DialogDescription>
            How this campaign email will look when sent, including linked assets
            in the message body.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border bg-[#F7F8FA] shadow-sm">
          <div className="border-b border-border bg-white px-4 py-3">
            <p className="m-0 text-[11px] uppercase tracking-wide text-muted-foreground">
              {activityName.trim() || 'Email activity'}
            </p>
            <p className="m-0 mt-1 text-[16px] font-semibold leading-snug text-foreground">
              {subject.trim() || '(No subject)'}
            </p>
          </div>

          <div className="space-y-2 border-b border-border bg-white px-4 py-3 text-[12px]">
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">From</span>
              <span className="min-w-0 font-medium text-foreground">
                {fromLabel || '—'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">To</span>
              <span className="min-w-0 text-foreground">
                {toLabels.length
                  ? toLabels.join(', ')
                  : 'Campaign audiences (default)'}
              </span>
            </div>
          </div>

          <div className="bg-white px-4 py-5">
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
              {body.trim() || (
                <span className="text-muted-foreground">
                  No email body yet.
                </span>
              )}
            </div>

            {assets.length > 0 ? (
              <div className="mt-6 border-t border-border pt-4">
                <p className="m-0 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Linked assets ({assets.length})
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {assets.map((asset) => (
                    <EmailLinkedAssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="m-0 mt-6 border-t border-border pt-4 text-[12px] text-muted-foreground">
                No assets linked to this email yet.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function usePlatformUsers() {
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  return useMemo(() => platformUsersData?.data ?? [], [platformUsersData]);
}

export function OwnerSelect({
  value,
  onChange,
  placeholder = 'Select owner',
}: {
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
}) {
  const users = usePlatformUsers();
  const selected = users.find((u) => u.id === value);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-auto min-h-9 border-border bg-surface-card py-1.5 text-sm [&_[data-slot=select-value]]:line-clamp-none">
        <SelectValue placeholder={placeholder}>
          {selected ? <UserOptionLabel user={selected} /> : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[var(--radix-select-trigger-width)]"
        position="popper"
        align="start"
      >
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <UserOptionLabel user={user} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function useCloseOnOutsideClick(
  open: boolean,
  onClose: () => void,
  rootRef: { current: HTMLElement | null },
) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onClose, rootRef]);
}

function MultiSelectOptionButton({
  checked,
  title,
  subtitle,
  onToggle,
}: {
  checked: boolean;
  title: string;
  subtitle: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-brand-muted',
        checked && 'bg-brand-muted/60 text-brand',
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border',
          checked ? 'border-brand bg-brand text-white' : 'border-border',
        )}
      >
        {checked ? <Check size={10} strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </button>
  );
}

export function AudienceMultiSelect({
  value,
  onChange,
  emptyLabel = 'Select audiences…',
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { data: audiences = [] } = useMarketingAudiences();
  const active = audiences.filter((a) => a.isActive);
  const selected = active.filter((a) => value.includes(a.id));

  useCloseOnOutsideClick(open, () => setOpen(false), rootRef);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          controlClass,
          'flex min-h-9 items-center justify-between gap-2 text-left',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {selected.length === 0
            ? emptyLabel
            : selected.map((a) => a.name).join(', ')}
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div className="max-h-56 overflow-auto rounded-md border border-border bg-white py-1 shadow-sm">
          {active.length === 0 ? (
            <p className="m-0 px-3 py-2 text-[12px] text-muted-foreground">
              No active audiences
            </p>
          ) : (
            active.map((a) => (
              <MultiSelectOptionButton
                key={a.id}
                checked={value.includes(a.id)}
                title={a.name}
                subtitle={`${a.matchedCustomers} customers`}
                onToggle={() => toggle(a.id)}
              />
            ))
          )}
        </div>
      ) : null}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand"
            >
              {a.name}
              <button
                type="button"
                onClick={() => toggle(a.id)}
                className="rounded-sm hover:bg-brand/10"
                aria-label={`Remove ${a.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AssetMultiSelect({
  value,
  onChange,
  emptyLabel = 'Select assets…',
  hint,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
  hint?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { data: assets = [] } = useMarketingAssets();
  const selected = assets.filter((a) => value.includes(a.id));

  useCloseOnOutsideClick(open, () => setOpen(false), rootRef);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          controlClass,
          'flex min-h-9 items-center justify-between gap-2 text-left',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {selected.length === 0
            ? emptyLabel
            : selected.map((a) => a.name).join(', ')}
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div className="max-h-56 overflow-auto rounded-md border border-border bg-white py-1 shadow-sm">
          {assets.length === 0 ? (
            <p className="m-0 px-3 py-2 text-[12px] text-muted-foreground">
              No assets in the library yet. Create them under Marketing →
              Assets.
            </p>
          ) : (
            assets.map((a) => (
              <MultiSelectOptionButton
                key={a.id}
                checked={value.includes(a.id)}
                title={a.name}
                subtitle={`${a.mediaKind} · ${a.platform}`}
                onToggle={() => toggle(a.id)}
              />
            ))
          )}
        </div>
      ) : null}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <span
              key={a.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand"
            >
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-brand/70">{a.mediaKind}</span>
              <button
                type="button"
                onClick={() => toggle(a.id)}
                className="shrink-0 rounded-sm hover:bg-brand/10"
                aria-label={`Remove ${a.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {hint ? (
        <p className="m-0 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function guessMediaKind(url: string): AssetMediaKind {
  const lower = url.toLowerCase();
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    /\.(mp4|webm|mov)(\?|$)/.test(lower)
  ) {
    return 'Video';
  }
  if (/\.pdf(\?|$)/.test(lower)) return 'PDF';
  if (
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(lower) ||
    lower.includes('unsplash.com') ||
    lower.includes('images.')
  ) {
    return 'Image';
  }
  return 'Link';
}

function guessMediaKindFromFile(file: File): AssetMediaKind {
  const mime = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
    return 'Image';
  }
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/.test(name)) {
    return 'Video';
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (mime.includes('html') || /\.(html?|css|js|ts|jsx|tsx|json)$/.test(name)) {
    return 'Script';
  }
  if (
    /\.(docx?|xlsx?|pptx?|txt|rtf|odt|csv)$/.test(name) ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    mime.includes('text/')
  ) {
    return 'Document';
  }
  return 'Document';
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function guessPlatform(url: string): AssetPlatform {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return 'YouTube';
  if (lower.includes('vimeo.com')) return 'Vimeo';
  if (lower.includes('drive.google.com')) return 'Google Drive';
  if (lower.includes('dropbox.com')) return 'Dropbox';
  if (lower.includes('figma.com')) return 'Figma';
  if (lower.includes('canva.com')) return 'Canva';
  if (lower.includes('unsplash.com')) return 'Unsplash';
  return 'Website';
}

export function CreateCampaignModal({
  open,
  onOpenChange,
  campaign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, modal edits this campaign instead of creating. */
  campaign?: MarketingCampaign | null;
}) {
  const isEdit = Boolean(campaign?.id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] =
    useState<CampaignObjective>('Lead Generation');
  const [status, setStatus] = useState<CampaignStatus>('Draft');
  const [owner, setOwner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [expectedLeads, setExpectedLeads] = useState('');
  const [expectedRevenue, setExpectedRevenue] = useState('');
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const saving = createCampaign.isLoading || updateCampaign.isLoading;
  const users = usePlatformUsers();

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setName(campaign.name || '');
      setDescription(campaign.description || '');
      setObjective(
        (campaign.objective as CampaignObjective) || 'Lead Generation',
      );
      setStatus((campaign.status as CampaignStatus) || 'Draft');
      setOwner(campaign.ownerUserId || '');
      setStartDate(campaign.startDate || '');
      setEndDate(campaign.endDate || '');
      setBudget(campaign.budget ? String(campaign.budget) : '');
      setExpectedLeads(
        campaign.expectedLeads ? String(campaign.expectedLeads) : '',
      );
      setExpectedRevenue(
        campaign.expectedRevenue ? String(campaign.expectedRevenue) : '',
      );
      setAudienceIds(campaign.audienceIds ? [...campaign.audienceIds] : []);
      setAssetIds(campaign.assetIds ? [...campaign.assetIds] : []);
      return;
    }
    setName('');
    setDescription('');
    setObjective('Lead Generation');
    setStatus('Draft');
    setOwner('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setExpectedLeads('');
    setExpectedRevenue('');
    setAudienceIds([]);
    setAssetIds([]);
  }, [open, campaign]);

  function handleSubmit() {
    if (!name.trim()) return;
    const ownerUser = users.find((u) => u.id === owner);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      objective,
      status,
      ownerUserId: owner || undefined,
      ownerName: ownerUser
        ? formatUserName(ownerUser, '') || undefined
        : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: Number(budget) || 0,
      expectedLeads: Number(expectedLeads) || 0,
      expectedRevenue: Number(expectedRevenue) || 0,
      audienceIds,
      assetIds,
    };
    if (isEdit && campaign) {
      updateCampaign.mutate(
        { id: campaign.id, body },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }
    createCampaign.mutate(body, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit campaign' : 'New campaign'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <FormSection title="Basics">
            <FormField label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026 Product Launch"
                className="h-9 text-[13px]"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cn(controlClass, 'h-auto py-2')}
                placeholder="What is this campaign trying to achieve?"
              />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Objective" required>
                <select
                  value={objective}
                  onChange={(e) =>
                    setObjective(e.target.value as CampaignObjective)
                  }
                  className={controlClass}
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                  className={controlClass}
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Owner">
              <OwnerSelect value={owner} onChange={setOwner} />
            </FormField>
          </FormSection>

          <FormSection title="Schedule & budget">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Start date">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="End date">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
            </div>
            <FormField label="Budget (ETB)">
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className="h-9 text-[13px]"
              />
            </FormField>
          </FormSection>

          <FormSection title="Expected outcomes">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Expected leads">
                <Input
                  type="number"
                  value={expectedLeads}
                  onChange={(e) => setExpectedLeads(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="Expected revenue (ETB)">
                <Input
                  type="number"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Audiences">
            <FormField label="Audiences">
              <AudienceMultiSelect
                value={audienceIds}
                onChange={setAudienceIds}
              />
            </FormField>
          </FormSection>

          <FormSection title="Content assets">
            <FormField label="Assets">
              <AssetMultiSelect
                value={assetIds}
                onChange={setAssetIds}
                emptyLabel="Optional — select assets…"
                hint="Optional. Link assets from the library when this campaign needs them."
              />
            </FormField>
          </FormSection>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
            disabled={!name.trim() || saving}
            onClick={handleSubmit}
          >
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Save changes'
                : 'Create campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateActivityModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  activity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName?: string;
  /** When set, modal edits this activity instead of creating. */
  activity?: MarketingActivity | null;
}) {
  const isEdit = Boolean(activity?.id);
  const emailTerminal =
    activity?.channelType === 'Email' &&
    (activity.status === 'Sent' || activity.status === 'Completed');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ChannelCategory>('Digital');
  const [channelType, setChannelType] = useState<ChannelType>('Email');
  const [status, setStatus] = useState('Draft');
  const [owner, setOwner] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [platform, setPlatform] = useState('');
  const [caption, setCaption] = useState('');
  const [postType, setPostType] = useState('Post');
  const [postUrl, setPostUrl] = useState('');
  const [adName, setAdName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [property, setProperty] = useState('');
  const [topic, setTopic] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [vendor, setVendor] = useState('');
  const [placement, setPlacement] = useState('');
  const [market, setMarket] = useState('');
  const [flightNote, setFlightNote] = useState('');
  const [eventId, setEventId] = useState('');
  const [timelineWarning, setTimelineWarning] = useState<string | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const saving = createActivity.isLoading || updateActivity.isLoading;
  const users = usePlatformUsers();
  const { data: events = [] } = useMarketingEvents();
  const { data: campaign } = useMarketingCampaign(campaignId);
  const campaignBudget = campaign?.budget || 0;
  const allocatedActivityBudget = useMemo(
    () =>
      (campaign?.activities || []).reduce(
        (sum, row) =>
          sum + (activity?.id && row.id === activity.id ? 0 : row.budget || 0),
        0,
      ),
    [campaign?.activities, activity?.id],
  );
  const remainingCampaignBudget = Math.max(
    0,
    campaignBudget - allocatedActivityBudget,
  );
  const { data: integrations = [] } = useMarketingIntegrations();
  const { data: allAssets = [] } = useMarketingAssets();
  const { data: allAudiences = [] } = useMarketingAudiences();
  const emailIntegration = useMemo(
    () => integrations.find((i) => i.provider === 'email'),
    [integrations],
  );
  const { data: marketingMailboxes = [] } = useMarketingMailboxes();
  const emailMailbox = useMemo(() => {
    if (!emailIntegration?.connectedAccountId) return null;
    return (
      marketingMailboxes.find(
        (mailbox) => mailbox.id === emailIntegration.connectedAccountId,
      ) || null
    );
  }, [emailIntegration?.connectedAccountId, marketingMailboxes]);
  const emailProviderLabel = useMemo(() => {
    const provider = emailMailbox?.provider;
    if (provider === 'gmail') return 'Google Gmail';
    if (provider === 'microsoft365' || provider === 'exchange') {
      return 'Microsoft 365';
    }
    // Fallback when mailbox list has not loaded yet — infer from address.
    const address = (
      emailIntegration?.connectedAccount ||
      emailMailbox?.emailAddress ||
      ''
    ).toLowerCase();
    if (address.includes('@gmail.') || address.includes('@googlemail.')) {
      return 'Google Gmail';
    }
    return provider ? String(provider) : 'Connected mailbox';
  }, [
    emailMailbox?.provider,
    emailMailbox?.emailAddress,
    emailIntegration?.connectedAccount,
  ]);
  const emailConnected = Boolean(
    emailIntegration?.connectedAccountId &&
      emailIntegration?.status === 'Connected',
  );
  const linkedAssets = useMemo(
    () => allAssets.filter((a) => assetIds.includes(a.id)),
    [allAssets, assetIds],
  );
  const emailToLabels = useMemo(() => {
    const ids =
      audienceIds.length > 0 ? audienceIds : campaign?.audienceIds || [];
    return allAudiences.filter((a) => ids.includes(a.id)).map((a) => a.name);
  }, [audienceIds, campaign?.audienceIds, allAudiences]);

  useEffect(() => {
    if (!open) return;
    if (activity) {
      const details = activity.channelDetails || {};
      setName(activity.name || '');
      setCategory((activity.channelCategory as ChannelCategory) || 'Digital');
      setChannelType((activity.channelType as ChannelType) || 'Email');
      setStatus(activity.status || 'Draft');
      setOwner(activity.ownerUserId || '');
      setBudget(activity.budget ? String(activity.budget) : '');
      setStartDate(activity.startDate || '');
      setEndDate(activity.endDate || '');
      setAudienceIds(activity.audienceIds ? [...activity.audienceIds] : []);
      setAssetIds(activity.assetIds ? [...activity.assetIds] : []);
      setNotes(activity.notes || '');
      setSubject(String(details.subject || ''));
      setEmailBody(String(details.body || details.contentPreview || ''));
      setPlatform(String(details.platform || ''));
      setCaption(String(details.caption || ''));
      setPostType(String(details.postType || 'Post'));
      setPostUrl(String(details.postUrl || ''));
      setAdName(String(details.adName || ''));
      setDestinationUrl(String(details.destinationUrl || ''));
      setProperty(String(details.property || ''));
      setTopic(String(details.topic || ''));
      setContentUrl(String(details.url || ''));
      setVendor(String(details.vendor || ''));
      setPlacement(String(details.placement || ''));
      setMarket(String(details.market || ''));
      setFlightNote(String(details.flightNote || ''));
      setEventId(
        activity.eventId ||
          (typeof details.eventId === 'string' ? details.eventId : '') ||
          '',
      );
      setTimelineWarning(null);
      setEmailPreviewOpen(false);
      return;
    }
    setName('');
    setCategory('Digital');
    setChannelType('Email');
    setStatus('Draft');
    setOwner('');
    setBudget('');
    setStartDate('');
    setEndDate('');
    setAudienceIds([]);
    setAssetIds([]);
    setNotes('');
    setSubject('');
    setEmailBody('');
    setPlatform('');
    setCaption('');
    setPostType('Post');
    setPostUrl('');
    setAdName('');
    setDestinationUrl('');
    setProperty('');
    setTopic('');
    setContentUrl('');
    setVendor('');
    setPlacement('');
    setMarket('');
    setFlightNote('');
    setEventId('');
    setTimelineWarning(null);
    setEmailPreviewOpen(false);
  }, [open, activity]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (category === 'Digital') setChannelType('Email');
    else if (category === 'Traditional') setChannelType('Radio');
    else setChannelType('Event');
  }, [category, open, isEdit]);

  useEffect(() => {
    if (channelType !== 'Email') return;
    if (
      !EMAIL_ACTIVITY_STATUSES.includes(
        status as (typeof EMAIL_ACTIVITY_STATUSES)[number],
      )
    ) {
      setStatus('Draft');
    }
  }, [channelType, status]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (channelType !== 'Email' || status !== 'Active') return;
    const today = toDateInputValue();
    setStartDate(today);
    setEndDate(today);
  }, [channelType, status, open, isEdit]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (
      channelType === 'Email' ||
      channelType === 'Event' ||
      category === 'Event'
    ) {
      return;
    }
    if (
      !MANUAL_ACTIVITY_STATUSES.includes(
        status as (typeof MANUAL_ACTIVITY_STATUSES)[number],
      )
    ) {
      setStatus('Draft');
    }
  }, [category, channelType, status, open, isEdit]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (
      channelType === 'Email' ||
      channelType === 'Event' ||
      category === 'Event'
    ) {
      return;
    }
    if (status !== 'Active') return;
    const today = toDateInputValue();
    setStartDate(today);
    setEndDate((prev) => prev || today);
  }, [category, channelType, status, open, isEdit]);

  useEffect(() => {
    if (isEdit || category !== 'Event' || !eventId) return;
    const selected = events.find((e) => e.id === eventId);
    if (!selected) return;
    setStatus(mapEventStatusToActivityStatus(selected.status));
    setOwner(selected.ownerUserId || '');
    setStartDate(selected.date || '');
    setEndDate(selected.endDate || selected.date || '');
    setBudget(selected.budget ? String(selected.budget) : '');
    // Copy only assets already on the event — campaign assets stay optional.
    setAssetIds(selected.assetIds?.length ? [...selected.assetIds] : []);
  }, [category, eventId, events, isEdit]);

  const typeOptions =
    category === 'Digital'
      ? DIGITAL_TYPES
      : category === 'Traditional'
        ? TRADITIONAL_TYPES
        : (['Event'] as ChannelType[]);

  const isEventActivity = category === 'Event';
  const isEmailActivity = channelType === 'Email';
  const isManualActivity = isManualMarketingChannel(channelType, category);
  const emailSendable =
    isEmailActivity && (status === 'Active' || status === 'Scheduled');
  const emailDatesLocked = isEmailActivity && status === 'Active';
  const manualStartLocked = isManualActivity && status === 'Active';
  const datesRequired =
    (isEmailActivity && status === 'Scheduled') ||
    (isManualActivity && (status === 'Scheduled' || status === 'Active'));
  const activityStatusOptions = isEmailActivity
    ? EMAIL_ACTIVITY_STATUSES
    : isManualActivity
      ? MANUAL_ACTIVITY_STATUSES
      : CAMPAIGN_STATUSES;

  function buildChannelDetails(): Record<string, unknown> {
    if (channelType === 'Email') {
      return {
        subject: subject.trim() || undefined,
        body: emailBody.trim() || undefined,
        contentPreview: emailBody.trim() || undefined,
        provider: 'email',
        providerName: emailIntegration?.name || 'Email provider',
        connectedAccountLabel: emailIntegration?.connectedAccount || undefined,
      };
    }
    if (channelType === 'Social Media') {
      return {
        platform: platform.trim() || undefined,
        postType: postType.trim() || undefined,
        caption: caption.trim() || undefined,
        postUrl: postUrl.trim() || undefined,
      };
    }
    if (
      channelType === 'Search Advertising' ||
      channelType === 'Display Advertising'
    ) {
      return {
        platform: platform.trim() || undefined,
        adName: adName.trim() || undefined,
        destinationUrl: destinationUrl.trim() || undefined,
      };
    }
    if (
      channelType === 'SEO' ||
      channelType === 'Content' ||
      channelType === 'Other Digital'
    ) {
      return {
        property: property.trim() || undefined,
        topic: topic.trim() || undefined,
        url: contentUrl.trim() || undefined,
      };
    }
    if (category === 'Traditional') {
      return {
        vendor: vendor.trim() || undefined,
        placement: placement.trim() || undefined,
        market: market.trim() || undefined,
        flightNote: flightNote.trim() || undefined,
      };
    }
    return {};
  }

  function handleSubmit() {
    if (!name.trim() || !campaignId) return;
    if (emailTerminal) {
      toast.error('Sent email activities cannot be edited');
      return;
    }
    if (isEventActivity && !eventId) {
      toast.error('Select a linked event for Event activities');
      return;
    }
    if (channelType === 'Email' && !emailConnected && !isEdit) {
      toast.error(
        'Connect a Microsoft or Google mailbox under Marketing → Integrations before creating an email activity',
      );
      return;
    }
    if (isEmailActivity && status === 'Scheduled') {
      if (!startDate || !endDate) {
        toast.error('Scheduled emails need start and end dates');
        return;
      }
      if (startDate < toDateInputValue()) {
        toast.error('Scheduled start date cannot be in the past');
        return;
      }
      if (endDate < startDate) {
        toast.error('End date must be on or after start date');
        return;
      }
    }
    if (isManualActivity && (status === 'Scheduled' || status === 'Active')) {
      if (!startDate || !endDate) {
        toast.error(
          status === 'Active'
            ? 'Active activities need an end date'
            : 'Scheduled activities need start and end dates',
        );
        return;
      }
      if (status === 'Scheduled' && startDate < toDateInputValue()) {
        toast.error('Scheduled start date cannot be in the past');
        return;
      }
      if (endDate < startDate) {
        toast.error('End date must be on or after start date');
        return;
      }
    }
    if (emailSendable) {
      if (!subject.trim()) {
        toast.error('Subject is required to schedule or send an email');
        return;
      }
      if (!emailBody.trim()) {
        toast.error('Email body is required to schedule or send');
        return;
      }
      const hasAudience =
        audienceIds.length > 0 || (campaign?.audienceIds?.length || 0) > 0;
      if (!hasAudience) {
        toast.error('Select an audience before scheduling or sending');
        return;
      }
    }
    if (isEventActivity && eventId) {
      const selected = events.find((e) => e.id === eventId);
      const mismatch = eventFitsCampaign({
        eventStart: selected?.date || startDate,
        eventEnd: selected?.endDate || selected?.date || endDate,
        campaignStart: campaign?.startDate,
        campaignEnd: campaign?.endDate,
        campaignName: campaign?.name || campaignName,
        context: 'activity-link',
      });
      if (mismatch) {
        setTimelineWarning(mismatch);
        return;
      }
    }
    const nextBudget = Number(budget) || 0;
    if (nextBudget < 0) {
      toast.error('Activity budget cannot be negative');
      return;
    }
    if (campaignBudget <= 0 && nextBudget > 0) {
      toast.error(
        'Set a campaign budget before allocating budget to activities',
      );
      return;
    }
    if (campaignBudget > 0 && nextBudget > campaignBudget) {
      toast.error(
        `Activity budget cannot exceed the campaign budget of ETB ${Math.round(campaignBudget).toLocaleString()}`,
      );
      return;
    }
    if (campaignBudget > 0 && nextBudget > remainingCampaignBudget) {
      toast.error(
        `Only ETB ${Math.round(remainingCampaignBudget).toLocaleString()} remains of the campaign budget`,
      );
      return;
    }
    const ownerUser = users.find((u) => u.id === owner);
    const body: Record<string, unknown> = {
      name: name.trim(),
      channelCategory: category,
      channelType,
      status,
      ownerUserId: owner || undefined,
      ownerName: ownerUser
        ? formatUserName(ownerUser, '') || undefined
        : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: Number(budget) || 0,
      notes: notes.trim() || undefined,
      audienceIds,
      assetIds,
      eventId: eventId || undefined,
      channelDetails: buildChannelDetails(),
      ...(channelType === 'Email' && emailIntegration?.connectedAccountId
        ? {
            connectedAccountId: emailIntegration.connectedAccountId,
            syncStatus: 'Synced',
          }
        : isManualActivity
          ? { syncStatus: 'Manual' }
          : {}),
    };
    const onError = (err: unknown) => {
      const msg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg || '');
      if (/timeline|campaign dates|before .* start|after .* end/i.test(text)) {
        setTimelineWarning(text);
      } else if (/budget/i.test(text) && text) {
        toast.error(text);
      }
    };
    if (isEdit && activity) {
      updateActivity.mutate(
        { campaignId, activityId: activity.id, body },
        { onSuccess: () => onOpenChange(false), onError },
      );
      return;
    }
    createActivity.mutate(
      { campaignId, body },
      { onSuccess: () => onOpenChange(false), onError },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Edit marketing activity' : 'New marketing activity'}
            </DialogTitle>
            {campaignName ? (
              <DialogDescription>
                {isEdit
                  ? `Update activity on “${campaignName}”.`
                  : `Add a channel activity to “${campaignName}”.`}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="space-y-5 py-1">
            <FormSection title="Activity">
              <FormField label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Product announcement email"
                  className="h-9 text-[13px]"
                  disabled={emailTerminal}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Channel category" required>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ChannelCategory)
                    }
                    className={controlClass}
                    disabled={isEdit}
                  >
                    <option value="Digital">Digital</option>
                    <option value="Traditional">Traditional</option>
                    <option value="Event">Event</option>
                  </select>
                </FormField>
                <FormField label="Channel type" required>
                  <select
                    value={channelType}
                    onChange={(e) =>
                      setChannelType(e.target.value as ChannelType)
                    }
                    className={controlClass}
                    disabled={isEdit}
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {isEventActivity ? (
                <FormField label="Linked event" required>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className={controlClass}
                  >
                    <option value="">Select event…</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.date ? ` · ${e.date}` : ''}
                        {e.endDate && e.endDate !== e.date
                          ? ` → ${e.endDate}`
                          : ''}
                      </option>
                    ))}
                  </select>
                  <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                    Owner, status, dates, budget, and assets fill from the
                    selected event. Event dates must fall inside the campaign
                    timeline.
                  </p>
                </FormField>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={controlClass}
                    disabled={isEventActivity && Boolean(eventId)}
                  >
                    {activityStatusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {isEmailActivity ? (
                    <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                      {status === 'Draft'
                        ? 'Set start and end dates for the send window. Send stays available only on those days.'
                        : status === 'Active'
                          ? 'Start and end are today. The email is sent as soon as you create it.'
                          : 'Set start and end dates. The email is sent automatically on the start date.'}
                    </p>
                  ) : isManualActivity ? (
                    <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                      {status === 'Draft'
                        ? 'Dates are optional. Logged in CRM only — no platform sync.'
                        : status === 'Active'
                          ? 'Start is today. Set an end date. Record results after it runs.'
                          : 'Set start and end dates for this booked activity.'}
                    </p>
                  ) : null}
                </FormField>
                <FormField label="Owner">
                  <OwnerSelect value={owner} onChange={setOwner} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="Start" required={datesRequired}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-[13px]"
                    min={
                      (isEmailActivity || isManualActivity) &&
                      status === 'Scheduled'
                        ? toDateInputValue()
                        : undefined
                    }
                    disabled={
                      (isEventActivity && Boolean(eventId)) ||
                      emailDatesLocked ||
                      manualStartLocked
                    }
                  />
                </FormField>
                <FormField label="End" required={datesRequired}>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-[13px]"
                    min={
                      datesRequired
                        ? startDate || toDateInputValue()
                        : undefined
                    }
                    disabled={
                      (isEventActivity && Boolean(eventId)) || emailDatesLocked
                    }
                  />
                </FormField>
                <FormField label="Budget (ETB)">
                  <Input
                    type="number"
                    min={0}
                    max={
                      campaignBudget > 0 ? remainingCampaignBudget : undefined
                    }
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-9 text-[13px]"
                    disabled={isEventActivity && Boolean(eventId)}
                  />
                  <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                    {campaignBudget > 0
                      ? `Campaign budget ETB ${Math.round(campaignBudget).toLocaleString()} · remaining ETB ${Math.round(remainingCampaignBudget).toLocaleString()}`
                      : 'Set a campaign budget first to allocate activity budgets'}
                  </p>
                </FormField>
              </div>
              <FormField label="Audiences" required={emailSendable}>
                <AudienceMultiSelect
                  value={audienceIds}
                  onChange={setAudienceIds}
                  emptyLabel="Use campaign audiences…"
                />
              </FormField>
              {channelType !== 'Email' ? (
                <FormField label="Assets">
                  <AssetMultiSelect
                    value={assetIds}
                    onChange={setAssetIds}
                    emptyLabel="Optional — select assets…"
                    hint={
                      isEventActivity
                        ? 'Optional. Prefills only assets already linked to the event. Add campaign or library assets only if you want them.'
                        : 'Optional. Link campaign or library assets only when needed.'
                    }
                  />
                </FormField>
              ) : null}
            </FormSection>

            {channelType === 'Email' ? (
              <FormSection
                title="Compose email"
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setEmailPreviewOpen(true)}
                    disabled={!subject.trim() && !emailBody.trim()}
                  >
                    <Eye size={14} className="mr-1.5" />
                    Show preview
                  </Button>
                }
              >
                <div className="rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-border bg-[#FAFBFC] px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      New message
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {status === 'Active'
                        ? 'Send now'
                        : status === 'Scheduled'
                          ? 'Scheduled'
                          : 'Draft'}
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span className="w-14 shrink-0 text-[12px] text-muted-foreground">
                        From
                      </span>
                      <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                        {emailIntegration?.connectedAccount ||
                          'Connect a marketing mailbox…'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2.5">
                      <span className="mt-0.5 w-14 shrink-0 text-[12px] text-muted-foreground">
                        To
                      </span>
                      <div className="min-w-0 flex-1">
                        {emailToLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {emailToLabels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex rounded-md bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">
                            Campaign audiences (default)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="w-14 shrink-0 text-[12px] text-muted-foreground">
                        Subject{emailSendable ? ' *' : ''}
                      </span>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Email subject line"
                        className="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    placeholder="Write your email body here…"
                    className="w-full resize-y border-0 border-t border-border bg-white px-3 py-3 text-[13px] leading-relaxed outline-none focus-visible:ring-0"
                  />

                  <div className="space-y-3 border-t border-border bg-[#FAFBFC] px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} className="text-muted-foreground" />
                      <p className="m-0 text-[12px] font-medium text-foreground">
                        Linked assets
                      </p>
                    </div>
                    <AssetMultiSelect
                      value={assetIds}
                      onChange={setAssetIds}
                      emptyLabel="Attach marketing assets…"
                      hint="Linked assets are included in the sent email (in the body and as attachments when possible)."
                    />
                    {linkedAssets.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {linkedAssets.map((asset) => (
                          <EmailLinkedAssetCard key={asset.id} asset={asset} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </FormSection>
            ) : null}

            {channelType === 'Social Media' ? (
              <FormSection title="Social details">
                <p className="m-0 text-[11px] text-muted-foreground">
                  Logged in CRM only. No platform sync.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Platform">
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className={controlClass}
                    >
                      <option value="">Select platform…</option>
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Post type">
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      className={controlClass}
                    >
                      {SOCIAL_POST_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Caption / content">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className={cn(controlClass, 'h-auto py-2')}
                  />
                </FormField>
                <FormField label="Live post URL">
                  <Input
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-9 text-[13px]"
                  />
                </FormField>
              </FormSection>
            ) : null}

            {channelType === 'Search Advertising' ||
            channelType === 'Display Advertising' ? (
              <FormSection title="Paid advertising details">
                <p className="m-0 text-[11px] text-muted-foreground">
                  Logged in CRM only. No ads platform sync yet.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Platform">
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className={controlClass}
                    >
                      <option value="">Select platform…</option>
                      {PAID_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Ad / campaign name">
                    <Input
                      value={adName}
                      onChange={(e) => setAdName(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                </div>
                <FormField label="Destination URL">
                  <Input
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-9 text-[13px]"
                  />
                </FormField>
              </FormSection>
            ) : null}

            {channelType === 'SEO' ||
            channelType === 'Content' ||
            channelType === 'Other Digital' ? (
              <FormSection title="Digital details">
                <p className="m-0 text-[11px] text-muted-foreground">
                  Logged in CRM only. No platform sync.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Property">
                    <Input
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                      placeholder="Site, blog, YouTube…"
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Topic / title">
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                </div>
                <FormField label="URL">
                  <Input
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-9 text-[13px]"
                  />
                </FormField>
              </FormSection>
            ) : null}

            {category === 'Traditional' ? (
              <FormSection title="Traditional details">
                <p className="m-0 text-[11px] text-muted-foreground">
                  Logged in CRM only. No vendor or station sync.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Vendor">
                    <Input
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Placement">
                    <Input
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Market / city">
                    <Input
                      value={market}
                      onChange={(e) => setMarket(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Flight note">
                    <Input
                      value={flightNote}
                      onChange={(e) => setFlightNote(e.target.value)}
                      placeholder="e.g. Drive-time 7–9am"
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                </div>
              </FormSection>
            ) : null}

            {channelType === 'Email' ? (
              <FormSection title="Email provider sync">
                {emailConnected ? (
                  <div className="space-y-3 rounded-lg border border-border bg-surface-elevated px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="m-0 text-[12px] font-semibold text-foreground">
                          {emailIntegration?.name || 'Email provider'}
                        </p>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          Connected mailbox selected for marketing sends
                        </p>
                      </div>
                      <StatusBadge status="Synced" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          Provider
                        </p>
                        <p className="m-0 text-[13px] font-medium text-foreground">
                          {emailProviderLabel}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          From account
                        </p>
                        <p className="m-0 truncate text-[13px] font-medium text-foreground">
                          {emailIntegration?.connectedAccount || '—'}
                        </p>
                      </div>
                    </div>
                    <p className="m-0 text-[11px] text-muted-foreground">
                      This activity will be created as Synced and use this
                      mailbox when you send.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-dashed border-border px-3 py-3">
                    <p className="m-0 text-[13px] font-medium text-foreground">
                      No marketing mailbox selected
                    </p>
                    <p className="m-0 text-[12px] text-muted-foreground">
                      Connect Microsoft or Google and choose a sender under
                      Integrations before creating an email activity.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={settingsIntegrationsPath('email')}>
                        <Plug size={14} className="mr-1.5" />
                        Open email integration
                      </Link>
                    </Button>
                  </div>
                )}
              </FormSection>
            ) : null}

            <FormField label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={cn(controlClass, 'h-auto py-2')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
              disabled={
                !name.trim() ||
                !campaignId ||
                saving ||
                emailTerminal ||
                (isEventActivity && !eventId) ||
                (channelType === 'Email' && !emailConnected && !isEdit)
              }
              onClick={handleSubmit}
            >
              {saving
                ? status === 'Active' && isEmailActivity && !isEdit
                  ? 'Sending…'
                  : isEdit
                    ? 'Saving…'
                    : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : isEmailActivity && status === 'Active'
                    ? 'Create and send'
                    : isEmailActivity && status === 'Scheduled'
                      ? 'Schedule email'
                      : 'Create activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TimelineClashWarningDialog
        message={timelineWarning}
        onClose={() => setTimelineWarning(null)}
      />
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        fromLabel={emailIntegration?.connectedAccount || ''}
        toLabels={emailToLabels}
        subject={subject}
        body={emailBody}
        assets={linkedAssets}
        activityName={name}
      />
    </>
  );
}

export function CreateEventModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('Webinar');
  const [status, setStatus] = useState<EventCreateStatus>('Draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [owner, setOwner] = useState('');
  const [budget, setBudget] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [description, setDescription] = useState('');
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [timelineWarning, setTimelineWarning] = useState<string | null>(null);
  const createEvent = useCreateEvent();
  const { data: campaigns = [] } = useMarketingCampaigns();
  const users = usePlatformUsers();

  useEffect(() => {
    if (!open) return;
    setName('');
    setType('Webinar');
    setStatus('Draft');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setOwner('');
    setBudget('');
    setCampaignId('');
    setDescription('');
    setAssetIds([]);
    setTimelineWarning(null);
  }, [open]);

  useEffect(() => {
    if (status === 'Live') {
      setStartDate(toDateInputValue());
      setEndDate((prev) => prev || toDateInputValue());
      return;
    }
    if (status === 'Completed') {
      const earlier = new Date();
      earlier.setHours(earlier.getHours() - 1);
      setStartDate(toDateInputValue(earlier));
      setEndDate(toDateInputValue());
    }
  }, [status]);

  const startRequired =
    status === 'Scheduled' || status === 'Live' || status === 'Completed';
  const endRequired =
    status === 'Scheduled' || status === 'Live' || status === 'Completed';
  const startLocked = status === 'Live';
  const endLocked = status === 'Completed';

  function resolvePayloadDates(): { date?: string; endDate?: string } | null {
    if (status === 'Draft') {
      return {
        date: startDate ? startOfDayIso(startDate) : undefined,
        endDate: endDate ? endOfDayIso(endDate) : undefined,
      };
    }
    if (status === 'Scheduled') {
      if (!startDate || !endDate) {
        toast.error('Scheduled events need start and end dates');
        return null;
      }
      if (startDate > endDate) {
        toast.error('End date must be on or after start date');
        return null;
      }
      return {
        date: startOfDayIso(startDate),
        endDate: endOfDayIso(endDate),
      };
    }
    if (status === 'Live') {
      if (!endDate) {
        toast.error('Live events need an end date');
        return null;
      }
      const now = new Date();
      const endIso = endOfDayIso(endDate);
      if (endIso && new Date(endIso).getTime() < now.getTime()) {
        toast.error('End date must be today or later for Live events');
        return null;
      }
      return {
        date: now.toISOString(),
        endDate: endIso,
      };
    }
    if (status === 'Completed') {
      if (!startDate) {
        toast.error('Completed events need a start date');
        return null;
      }
      const now = new Date();
      const startIso = startOfDayIso(startDate);
      if (startIso && new Date(startIso).getTime() > now.getTime()) {
        toast.error('Start must be earlier than now for Completed events');
        return null;
      }
      return {
        date: startIso,
        endDate: now.toISOString(),
      };
    }
    // Cancelled — dates optional
    return {
      date: startDate ? startOfDayIso(startDate) : undefined,
      endDate: endDate ? endOfDayIso(endDate) : undefined,
    };
  }

  function handleCreate() {
    if (!name.trim()) return;
    const dates = resolvePayloadDates();
    if (!dates) return;
    if (campaignId) {
      const selectedCampaign = campaigns.find((c) => c.id === campaignId);
      const mismatch = eventFitsCampaign({
        eventStart: dates.date,
        eventEnd: dates.endDate,
        campaignStart: selectedCampaign?.startDate,
        campaignEnd: selectedCampaign?.endDate,
        campaignName: selectedCampaign?.name,
        context: 'event-create',
      });
      if (mismatch) {
        setTimelineWarning(mismatch);
        return;
      }
    }
    const ownerUser = users.find((u) => u.id === owner);
    createEvent.mutate(
      {
        name: name.trim(),
        type,
        status,
        date: dates.date,
        endDate: dates.endDate,
        location: location.trim() || undefined,
        ownerUserId: owner || undefined,
        ownerName: ownerUser
          ? formatUserName(ownerUser, '') || undefined
          : undefined,
        budget: Number(budget) || 0,
        campaignId: campaignId || undefined,
        description: description.trim() || undefined,
        assetIds: assetIds.length ? assetIds : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err: unknown) => {
          const msg = (
            err as { response?: { data?: { message?: string | string[] } } }
          )?.response?.data?.message;
          const text = Array.isArray(msg) ? msg.join(', ') : String(msg || '');
          if (
            /timeline|campaign dates|before .* start|after .* end/i.test(text)
          ) {
            setTimelineWarning(text);
          }
        },
      },
    );
  }

  const canSubmit =
    Boolean(name.trim()) &&
    !createEvent.isLoading &&
    (!startRequired || Boolean(startDate)) &&
    (!endRequired || Boolean(endDate));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] gap-4 overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>
              Create a marketing event. Optionally associate it with a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-0.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Name" required className="sm:col-span-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={cn(controlClass, 'h-auto py-2')}
                  placeholder="What is this event about?"
                />
              </FormField>
              <FormField label="Type">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EventType)}
                  className={controlClass}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as EventCreateStatus)
                  }
                  className={controlClass}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start" required={startRequired}>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-[13px]"
                  disabled={startLocked}
                />
                {status === 'Live' ? (
                  <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                    Start is set to now.
                  </p>
                ) : null}
              </FormField>
              <FormField label="End" required={endRequired}>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-[13px]"
                  disabled={endLocked}
                />
                {status === 'Completed' ? (
                  <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                    End is set to now.
                  </p>
                ) : null}
              </FormField>
              <FormField label="Budget (ETB)">
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="Location">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="Owner">
                <OwnerSelect value={owner} onChange={setOwner} />
              </FormField>
              <FormField label="Campaign (optional)">
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className={controlClass}
                >
                  <option value="">None</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              {campaignId ? (
                <p className="m-0 text-[11px] text-muted-foreground sm:col-span-2">
                  An Event activity is created on that campaign. Assets are not
                  copied from the campaign unless you select them below.
                </p>
              ) : null}
              <FormField label="Assets" className="sm:col-span-2">
                <AssetMultiSelect
                  value={assetIds}
                  onChange={setAssetIds}
                  emptyLabel="Optional — select assets…"
                  hint="Optional. Pick from the marketing asset library."
                />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
              disabled={!canSubmit}
              onClick={handleCreate}
            >
              {createEvent.isLoading ? 'Creating…' : 'Create event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TimelineClashWarningDialog
        message={timelineWarning}
        onClose={() => setTimelineWarning(null)}
      />
    </>
  );
}

export function CreateAudienceModal({
  open,
  onOpenChange,
  audience,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience?: MarketingAudience | null;
}) {
  const isEdit = Boolean(audience?.id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [vector, setVector] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [orgSize, setOrgSize] = useState('');
  const [city, setCity] = useState('');
  const createAudience = useCreateAudience();
  const updateAudience = useUpdateAudience();
  const { data: vectorsData, refetch: refetchVectors } = useGetVectors();
  const { data: sizesData } = useGetCustomerOrganizationSizes();
  const { data: citiesData, refetch: refetchCities } = useGetCustomerCities(
    country.trim() || undefined,
  );
  const vectors = vectorsData?.data ?? [];
  const organizationSizes = sizesData?.organizationSizes ?? [];
  const cities = citiesData?.cities ?? [];
  const saving = createAudience.isLoading || updateAudience.isLoading;

  useEffect(() => {
    if (!open) return;
    if (audience) {
      const conditions = audience.conditions ?? [];
      const findCond = (field: string) =>
        conditions.find((c) => c.field === field)?.value ?? '';
      setName(audience.name ?? '');
      setDescription(audience.description ?? '');
      setIsActive(audience.isActive ?? true);
      setVector(findCond('vector'));
      setOrgSize(findCond('organizationSize'));
      setCountry(findCond('country') || 'Ethiopia');
      setCity(findCond('city'));
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
      setVector('');
      setCountry('Ethiopia');
      setOrgSize('');
      setCity('');
    }
    void refetchVectors();
    void refetchCities();
  }, [open, audience, refetchVectors, refetchCities]);

  useEffect(() => {
    if (!open) return;
    void refetchCities();
  }, [country, open, refetchCities]);

  useEffect(() => {
    if (vector && !vectors.some((v) => v.name === vector)) {
      setVector('');
    }
  }, [vector, vectors]);

  function buildConditions() {
    const conditions: Array<{
      field: string;
      operator: string;
      value: string;
      label: string;
    }> = [];
    if (vector) {
      conditions.push({
        field: 'vector',
        operator: 'equals',
        value: vector,
        label: `Vector ${vector}`,
      });
    }
    if (orgSize) {
      conditions.push({
        field: 'organizationSize',
        operator: 'equals',
        value: orgSize,
        label: `Size ${orgSize}`,
      });
    }
    if (country.trim()) {
      conditions.push({
        field: 'country',
        operator: 'equals',
        value: country.trim(),
        label: `Country ${country.trim()}`,
      });
    }
    if (city.trim()) {
      conditions.push({
        field: 'city',
        operator: 'equals',
        value: city.trim(),
        label: `City ${city.trim()}`,
      });
    }
    return conditions;
  }

  const previewConditions = useMemo(
    () =>
      buildConditions().map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    [vector, orgSize, country, city],
  );

  const {
    data: previewCounts,
    isFetching: previewCountsFetching,
    isLoading: previewCountsLoading,
  } = usePreviewAudienceMembers(previewConditions, open);

  function handleSubmit() {
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
      conditions: buildConditions(),
    };
    if (isEdit && audience) {
      updateAudience.mutate(
        { id: audience.id, body },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }
    createAudience.mutate(body, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit audience' : 'New audience'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this CRM segment using the same filters as when it was created.'
              : 'Build a reusable segment over existing CRM customers. Contacts are resolved from matching accounts — nothing is duplicated.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <FormField label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-[13px]"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(controlClass, 'h-auto py-2')}
            />
          </FormField>
          {isEdit ? (
            <FormField label="Status">
              <select
                value={isActive ? 'Active' : 'Inactive'}
                onChange={(e) => setIsActive(e.target.value === 'Active')}
                className={controlClass}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          ) : null}
          <FormSection title="CRM filter conditions">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Vector">
                <select
                  value={vector}
                  onChange={(e) => setVector(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Any</option>
                  {vectors.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Organization size">
                <select
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Any</option>
                  {organizationSizes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Country">
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <FormField label="City">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Any</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {city && !cities.includes(city) ? (
                    <option value={city}>{city}</option>
                  ) : null}
                </select>
              </FormField>
            </div>
          </FormSection>
          <div className="rounded-lg border border-dashed border-border bg-surface-elevated px-3 py-2.5 text-[12px] text-muted-foreground">
            {previewCountsLoading || previewCountsFetching ? (
              'Resolving preview count…'
            ) : previewCounts ? (
              <>
                Matched customers: {previewCounts.matchedCustomers} · matched
                contacts: {previewCounts.matchedContacts}
              </>
            ) : (
              'Preview count resolves from live CRM customers when saved.'
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
            disabled={!name.trim() || saving}
            onClick={handleSubmit}
          >
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Save audience'
                : 'Create audience'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddAssetLinkModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedSize, setUploadedSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [platform, setPlatform] = useState<AssetPlatform>('Website');
  const [mediaKind, setMediaKind] = useState<AssetMediaKind>('Link');
  const createAsset = useCreateAsset();

  useEffect(() => {
    if (!open) return;
    setName('');
    setUrl('');
    setStorageKey('');
    setFileName('');
    setUploadedSize(0);
    setUploading(false);
    setPlatform('Website');
    setMediaKind('Link');
  }, [open]);

  useEffect(() => {
    if (!url.trim() || storageKey) return;
    setPlatform(guessPlatform(url));
    setMediaKind(guessMediaKind(url));
  }, [url, storageKey]);

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(url.trim() || storageKey) &&
    !uploading &&
    !createAsset.isLoading;

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      // Large marketing creatives — allow up to 10 minutes.
      const response = await fileUpload(file, { timeoutMs: 600_000 });
      const filePath = response.data?.image || response.data?.viewImage;
      if (!filePath) {
        toast.error('Upload succeeded but no file URL was returned');
        return;
      }
      setStorageKey(filePath);
      setFileName(file.name);
      setUploadedSize(file.size);
      setUrl(filePath);
      setMediaKind(guessMediaKindFromFile(file));
      setPlatform('Other');
      if (!name.trim()) {
        setName(file.name.replace(/\.[^.]+$/, '') || file.name);
      }
      toast.success('File uploaded to file server');
    } catch {
      // fileUpload already shows a notification
    } finally {
      setUploading(false);
    }
  }

  function clearUpload() {
    if (url === storageKey) setUrl('');
    setStorageKey('');
    setFileName('');
    setUploadedSize(0);
  }

  function handleCreate() {
    if (!canSubmit) return;
    const resolvedUrl = url.trim() || storageKey;
    createAsset.mutate(
      {
        name: name.trim(),
        url: resolvedUrl,
        mediaKind,
        platform,
        ...(storageKey
          ? {
              storageKey,
              fileName: fileName || undefined,
              previewUrl: mediaKind === 'Image' ? resolvedUrl : undefined,
            }
          : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,560px)] max-w-md gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add content asset</DialogTitle>
          <DialogDescription>
            Link an external URL or upload a file from your computer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-0.5">
          <FormField label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-[13px]"
            />
          </FormField>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />

          {storageKey ? (
            <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-medium text-muted-foreground">
                    Uploaded file
                  </p>
                  <p className="m-0 truncate text-[13px] font-medium text-foreground">
                    {fileName || 'File ready'}
                  </p>
                  {uploadedSize ? (
                    <p className="m-0 text-[11px] text-muted-foreground">
                      {formatFileSize(uploadedSize)}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  className="h-8 shrink-0 px-2"
                  onClick={clearUpload}
                  disabled={uploading}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <>
              <FormField label="URL" required>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  className="h-9 text-[13px]"
                  disabled={uploading}
                />
              </FormField>
              <div className="relative flex items-center gap-3 py-0.5">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full justify-center text-[13px]"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 size-3.5" />
                    Upload from computer
                  </>
                )}
              </Button>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select
                value={mediaKind}
                onChange={(e) => setMediaKind(e.target.value as AssetMediaKind)}
                className={controlClass}
              >
                {MEDIA_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Platform">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as AssetPlatform)}
                className={controlClass}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
            disabled={!canSubmit}
            onClick={handleCreate}
          >
            {createAsset.isLoading ? 'Adding…' : 'Add asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddExpenseModal({
  open,
  onOpenChange,
  campaignId,
  currentSpend = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  currentSpend?: number;
  contextLabel?: string | null;
}) {
  const [amount, setAmount] = useState('');
  const updateCampaign = useUpdateCampaign();

  useEffect(() => {
    if (!open) return;
    setAmount('');
  }, [open]);

  function handleSave() {
    if (!campaignId) {
      onOpenChange(false);
      return;
    }
    const nextSpend = Number(amount);
    if (!Number.isFinite(nextSpend) || nextSpend < 0) return;
    updateCampaign.mutate(
      { id: campaignId, body: { actualSpend: nextSpend } },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record spend</DialogTitle>
          <DialogDescription>
            Update actual spend on the campaign. Platform spend sync arrives
            with integrations.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Amount (ETB)">
          <Input
            type="number"
            className="h-9 text-[13px]"
            placeholder={String(currentSpend || 0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
            disabled={!campaignId || updateCampaign.isLoading || !amount.trim()}
            onClick={handleSave}
          >
            {updateCampaign.isLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordOutcomesModal({
  open,
  onOpenChange,
  leadsGenerated = 0,
  qualifiedLeads = 0,
  opportunities = 0,
  revenue = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  leadsGenerated?: number;
  qualifiedLeads?: number;
  opportunities?: number;
  revenue?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>CRM outcomes</DialogTitle>
          <DialogDescription>
            Live counts from leads linked to this campaign and deals converted
            from those leads. Assign a campaign on leads to grow these metrics.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Leads generated">
            <Input
              readOnly
              className="h-9 bg-muted/40 text-[13px]"
              value={String(leadsGenerated || 0)}
            />
          </FormField>
          <FormField label="Qualified leads">
            <Input
              readOnly
              className="h-9 bg-muted/40 text-[13px]"
              value={String(qualifiedLeads || 0)}
            />
          </FormField>
          <FormField label="Opportunities">
            <Input
              readOnly
              className="h-9 bg-muted/40 text-[13px]"
              value={String(opportunities || 0)}
            />
          </FormField>
          <FormField label="Revenue (ETB)">
            <Input
              readOnly
              className="h-9 bg-muted/40 text-[13px]"
              value={String(revenue || 0)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordActivityResultsModal({
  open,
  onOpenChange,
  campaignId,
  activity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  activity: MarketingActivity | null;
}) {
  const [spend, setSpend] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [leads, setLeads] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(false);
  const recordResults = useRecordActivityResults();

  useEffect(() => {
    if (!open || !activity) return;
    const recorded = activityResults(activity.channelDetails);
    setSpend(String(activity.actualSpend || 0));
    setImpressions(String(recorded.impressions || 0));
    setClicks(String(recorded.clicks || 0));
    setLeads(String(recorded.leads || 0));
    setResultNotes(recorded.notes || '');
    setMarkCompleted(activity.status === 'Completed');
  }, [open, activity]);

  function handleSave() {
    if (!activity) return;
    const nextSpend = Number(spend);
    const nextImpressions = Number(impressions);
    const nextClicks = Number(clicks);
    const nextLeads = Number(leads);
    if (
      ![nextSpend, nextImpressions, nextClicks, nextLeads].every(
        (n) => Number.isFinite(n) && n >= 0,
      )
    ) {
      toast.error('Enter zero or a positive number for each result');
      return;
    }
    recordResults.mutate(
      {
        campaignId,
        activityId: activity.id,
        body: {
          actualSpend: nextSpend,
          impressions: nextImpressions,
          clicks: nextClicks,
          leads: nextLeads,
          resultNotes,
          markCompleted,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record results</DialogTitle>
          <DialogDescription>
            {activity
              ? `Manual results for “${activity.name}” (${activity.channelType}).`
              : 'Manual activity results'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Actual spend (ETB)">
            <Input
              type="number"
              min={0}
              className="h-9 text-[13px]"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
            />
          </FormField>
          <FormField label="Impressions / reach">
            <Input
              type="number"
              min={0}
              className="h-9 text-[13px]"
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
            />
          </FormField>
          <FormField label="Clicks / engagements">
            <Input
              type="number"
              min={0}
              className="h-9 text-[13px]"
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
            />
          </FormField>
          <FormField label="Leads">
            <Input
              type="number"
              min={0}
              className="h-9 text-[13px]"
              value={leads}
              onChange={(e) => setLeads(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Result notes">
          <textarea
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            rows={2}
            className={cn(controlClass, 'h-auto py-2')}
          />
        </FormField>
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input
            type="checkbox"
            checked={markCompleted}
            onChange={(e) => setMarkCompleted(e.target.checked)}
          />
          Mark this activity as Completed
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-medium"
            disabled={!activity || recordResults.isLoading}
            onClick={handleSave}
          >
            {recordResults.isLoading ? 'Saving…' : 'Save results'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
