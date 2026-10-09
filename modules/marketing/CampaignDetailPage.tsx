'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Ban,
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Link2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plug,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  useMarketingAssets,
  useMarketingAudiences,
  useMarketingCampaign,
  useMarketingEvents,
} from '@/store/server/features/marketing/queries';
import {
  useCancelScheduledEmail,
  useDeleteActivity,
  useDeleteCampaign,
  useSendMarketingEmail,
} from '@/store/server/features/marketing/mutations';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { MarketingActivity } from '@/store/server/features/marketing/types';
import { formatUserName } from '@/lib/format-user-name';
import { cn } from '@/lib/utils';
import {
  resolveCampaignRoi,
  formatCampaignRoi,
  isManualMarketingChannel,
} from './utils';
import {
  AddExpenseModal,
  CreateActivityModal,
  CreateCampaignModal,
  RecordActivityResultsModal,
  RecordOutcomesModal,
} from './CampaignModals';
import { MarketingDetailSkeleton } from '@/components/loading/skeleton-screens';
import {
  DashboardCard,
  EmptyHint,
  MarketingDetailHeader,
  PhaseBadge,
  StatusBadge,
  TypeBadge,
  formatMarketingDate,
  formatMoney,
  formatNumber,
} from './ui-kit';

type MenuPosition = { top: number; left: number };

function emailActivityStatus(status: string) {
  return status === 'Completed' ? 'Sent' : status;
}

/** Local calendar date YYYY-MM-DD (matches backend localTodayDateOnly). */
function localTodayDateOnly() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function draftEmailSendWindow(activity: MarketingActivity): {
  state: 'ready' | 'missing-dates' | 'before' | 'after';
  start: string | null;
  end: string | null;
} {
  const start = activity.startDate?.trim().slice(0, 10) || null;
  const end = activity.endDate?.trim().slice(0, 10) || start;
  if (!start || !end) {
    return { state: 'missing-dates', start: null, end: null };
  }
  const today = localTodayDateOnly();
  if (today < start) return { state: 'before', start, end };
  if (today > end) return { state: 'after', start, end };
  return { state: 'ready', start, end };
}

function EmailActivityAction({
  activity,
  sending,
  cancelling,
  onSend,
  onCancel,
}: {
  activity: MarketingActivity;
  sending: boolean;
  cancelling: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  const status = emailActivityStatus(activity.status);
  if (status === 'Sent') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Mail size={12} />
        Sent
      </span>
    );
  }
  if (status === 'Scheduled') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={cancelling}
        onClick={onCancel}
      >
        <Ban size={12} />
        {cancelling ? 'Cancelling…' : 'Cancel'}
      </Button>
    );
  }
  if (status === 'Active') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={sending}
        onClick={onSend}
      >
        <Mail size={12} />
        {sending ? 'Sending…' : 'Send'}
      </Button>
    );
  }
  if (status === 'Draft') {
    const window = draftEmailSendWindow(activity);
    if (window.state === 'missing-dates') {
      return (
        <span
          className="inline-flex max-w-[140px] text-xs leading-snug text-muted-foreground"
          title="Add start and end dates on this draft to open the send window"
        >
          Set schedule dates to send
        </span>
      );
    }
    if (window.state === 'before') {
      return (
        <span
          className="inline-flex max-w-[160px] flex-col text-xs leading-snug text-muted-foreground"
          title={`Draft is ready. Send opens on ${window.start} through ${window.end}`}
        >
          <span className="font-medium text-foreground/80">Draft ready</span>
          <span>Send opens {window.start}</span>
        </span>
      );
    }
    if (window.state === 'after') {
      return (
        <span
          className="inline-flex max-w-[160px] flex-col text-xs leading-snug text-muted-foreground"
          title={`Send window was ${window.start} → ${window.end}`}
        >
          <span className="font-medium text-foreground/80">Window passed</span>
          <span>Ended {window.end}</span>
        </span>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={sending}
        onClick={onSend}
      >
        <Mail size={12} />
        {sending ? 'Sending…' : 'Send'}
      </Button>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function detailText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function manualActivityDetail(details: Record<string, unknown>) {
  const parts = [
    detailText(details.platform),
    detailText(details.postType),
    detailText(details.adName),
    detailText(details.vendor),
    detailText(details.placement),
    detailText(details.market),
    detailText(details.property),
    detailText(details.topic),
  ].filter(Boolean);
  return parts.slice(0, 3).join(' · ');
}

export function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');
  const { data: campaign, isLoading } = useMarketingCampaign(id);
  const { data: allAudiences = [] } = useMarketingAudiences();
  const { data: allAssets = [] } = useMarketingAssets();
  const { data: allEvents = [] } = useMarketingEvents();
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const sendEmail = useSendMarketingEmail();
  const cancelEmail = useCancelScheduledEmail();
  const deleteCampaign = useDeleteCampaign();
  const deleteActivity = useDeleteActivity();
  const [tab, setTab] = useState('activities');
  const [activityOpen, setActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<MarketingActivity | null>(
    null,
  );
  const [deleteActivityTarget, setDeleteActivityTarget] =
    useState<MarketingActivity | null>(null);
  const [openActivityMenuId, setOpenActivityMenuId] = useState<string | null>(
    null,
  );
  const [activityMenuPosition, setActivityMenuPosition] =
    useState<MenuPosition | null>(null);
  const activityMenuRef = useRef<HTMLDivElement | null>(null);
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const [campaignMenuPosition, setCampaignMenuPosition] =
    useState<MenuPosition | null>(null);
  const campaignMenuRef = useRef<HTMLDivElement | null>(null);
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [deleteCampaignOpen, setDeleteCampaignOpen] = useState(false);
  const [spendOpen, setSpendOpen] = useState(false);
  const [outcomesOpen, setOutcomesOpen] = useState(false);
  const [resultsActivity, setResultsActivity] =
    useState<MarketingActivity | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of platformUsersData?.data ?? []) {
      map.set(user.id, formatUserName(user, user.email || '—'));
    }
    return map;
  }, [platformUsersData]);

  const createdByLabel = useMemo(() => {
    if (!campaign?.createdBy) return '—';
    return usersById.get(campaign.createdBy) || '—';
  }, [campaign?.createdBy, usersById]);

  const activities = useMemo(
    () => campaign?.activities ?? [],
    [campaign?.activities],
  );

  const activeMenuActivity = useMemo(
    () => activities.find((a) => a.id === openActivityMenuId) || null,
    [activities, openActivityMenuId],
  );

  useEffect(() => {
    if (!openActivityMenuId) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        target instanceof Element &&
        target.closest('[data-activity-actions-trigger]')
      ) {
        return;
      }
      if (activityMenuRef.current?.contains(target)) return;
      setOpenActivityMenuId(null);
      setActivityMenuPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenActivityMenuId(null);
        setActivityMenuPosition(null);
      }
    }
    function handleRepositionClose() {
      setOpenActivityMenuId(null);
      setActivityMenuPosition(null);
    }
    // Defer so the opening click does not immediately dismiss the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleRepositionClose);
    window.addEventListener('scroll', handleRepositionClose, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleRepositionClose);
      window.removeEventListener('scroll', handleRepositionClose, true);
    };
  }, [openActivityMenuId]);

  useEffect(() => {
    if (!campaignMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        target instanceof Element &&
        target.closest('[data-campaign-actions-trigger]')
      ) {
        return;
      }
      if (campaignMenuRef.current?.contains(target)) return;
      setCampaignMenuOpen(false);
      setCampaignMenuPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCampaignMenuOpen(false);
        setCampaignMenuPosition(null);
      }
    }
    function handleRepositionClose() {
      setCampaignMenuOpen(false);
      setCampaignMenuPosition(null);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleRepositionClose);
    window.addEventListener('scroll', handleRepositionClose, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleRepositionClose);
      window.removeEventListener('scroll', handleRepositionClose, true);
    };
  }, [campaignMenuOpen]);

  function openActivityActionsMenu(
    activityId: string,
    anchor: HTMLElement | null,
  ) {
    if (!anchor) return;
    if (openActivityMenuId === activityId) {
      setOpenActivityMenuId(null);
      setActivityMenuPosition(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const menuWidth = 160;
    const gap = 6;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    const top = Math.min(rect.bottom + gap, window.innerHeight - 96);
    setActivityMenuPosition({ top, left });
    setOpenActivityMenuId(activityId);
  }

  const audiences = useMemo(
    () =>
      campaign
        ? allAudiences.filter((a) => campaign.audienceIds.includes(a.id))
        : [],
    [campaign, allAudiences],
  );

  const events = useMemo(
    () =>
      campaign ? allEvents.filter((e) => e.campaignId === campaign.id) : [],
    [campaign, allEvents],
  );

  const linkedAssets = useMemo(() => {
    if (!campaign) return [];
    const sourcesById = new Map<string, string[]>();
    const addSource = (id: string | undefined, source: string) => {
      if (!id) return;
      const next = sourcesById.get(id) ?? [];
      if (!next.includes(source)) next.push(source);
      sourcesById.set(id, next);
    };

    for (const id of campaign.assetIds || []) addSource(id, 'Campaign');
    for (const asset of allAssets) {
      if (asset.campaignIds.includes(campaign.id))
        addSource(asset.id, 'Campaign');
    }
    for (const activity of campaign.activities || []) {
      const label = activity.name?.trim() || 'Activity';
      for (const id of activity.assetIds || []) addSource(id, label);
    }
    for (const event of events) {
      const label = event.name?.trim() ? `Event · ${event.name}` : 'Event';
      for (const id of event.assetIds || []) addSource(id, label);
    }

    return allAssets
      .filter((asset) => sourcesById.has(asset.id))
      .map((asset) => ({
        asset,
        sources: sourcesById.get(asset.id) || [],
      }));
  }, [campaign, allAssets, events]);

  const eventsById = useMemo(
    () => new Map(allEvents.map((e) => [e.id, e])),
    [allEvents],
  );

  if (isLoading) {
    return <MarketingDetailSkeleton />;
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <EmptyHint>
          Campaign not found.{' '}
          <Link href="/marketing/campaigns" className="text-brand underline">
            Back to campaigns
          </Link>
        </EmptyHint>
      </div>
    );
  }

  const activitySpend = activities.reduce(
    (sum, activity) => sum + (activity.actualSpend || 0),
    0,
  );
  const eventSpend = events.reduce(
    (sum, event) => sum + (event.actualSpend || 0),
    0,
  );
  const totalSpend =
    campaign.totalSpend ?? campaign.actualSpend + activitySpend + eventSpend;
  const roi =
    campaign.roi ??
    resolveCampaignRoi({
      ...campaign,
      totalSpend,
      activitySpend,
      eventSpend,
    });
  const budgetPct =
    campaign.budget > 0 ? Math.round((totalSpend / campaign.budget) * 100) : 0;
  return (
    <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <MarketingDetailHeader
        backHref="/marketing/campaigns"
        backLabel="Campaigns"
        title={campaign.name}
        badges={
          <>
            <StatusBadge status={campaign.status} />
            <TypeBadge label={campaign.objective} />
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-medium"
              onClick={() => setSpendOpen(true)}
            >
              Update spend
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand text-xs font-medium text-brand-foreground hover:bg-brand-hover"
              onClick={() => setActivityOpen(true)}
            >
              <Plus size={14} />
              Add activity
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground"
              aria-label="Campaign actions"
              data-campaign-actions-trigger=""
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const menuWidth = 180;
                setCampaignMenuPosition({
                  top: Math.min(rect.bottom + 6, window.innerHeight - 140),
                  left: Math.min(
                    Math.max(8, rect.right - menuWidth),
                    window.innerWidth - menuWidth - 8,
                  ),
                });
                setCampaignMenuOpen((open) => !open);
              }}
            >
              <MoreHorizontal size={16} />
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Campaign Spend
            </p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
              <CreditCard size={18} />
            </span>
          </div>
          <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
            {formatMoney(totalSpend)}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {budgetPct}% of {formatMoney(campaign.budget)} budget
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Leads Generated
            </p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F1FF] text-[#0062FF]">
              <Users size={18} />
            </span>
          </div>
          <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
            {formatNumber(campaign.leadsGenerated)}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ↗ {campaign.qualifiedLeads} qualified
            </span>
            <span className="text-xs text-muted-foreground">
              target {campaign.expectedLeads}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Opportunities
            </p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E7E7FF] text-[#8C62FF]">
              <Target size={18} />
            </span>
          </div>
          <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
            {formatNumber(campaign.opportunities)}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Pipeline conversions from leads</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Attributed Revenue
            </p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E7F8EF] text-[#0BA259]">
              <TrendingUp size={18} />
            </span>
          </div>
          <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
            {formatMoney(campaign.revenue)}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {roi !== null ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                ↗ {formatCampaignRoi(roi)} ROI
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                ROI {formatCampaignRoi(null)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              target {formatMoney(campaign.expectedRevenue)}
            </span>
          </div>
        </div>
      </section>

      {/* Campaign meta context bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface-elevated px-4 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CalendarDays size={13} className="text-brand" />
            {formatMarketingDate(campaign.startDate)} →{' '}
            {formatMarketingDate(campaign.endDate)}
          </span>
          <span>·</span>
          <span>
            Owner:{' '}
            <strong className="font-medium text-foreground">
              {campaign.owner || '—'}
            </strong>
          </span>
          <span>·</span>
          <span>
            Created by:{' '}
            <strong className="font-medium text-foreground">
              {createdByLabel}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Budget Utilization:</span>
          <span className="font-medium text-foreground tabular-nums">
            {budgetPct}%
          </span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="min-w-0 overflow-x-auto border-b border-border">
          <div className="flex min-w-max items-center gap-1">
            {(
              [
                ['activities', 'Marketing Activities'],
                ['audience', 'Audience'],
                ['assets', 'Content & Assets'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                  tab === value
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent
            value="activities"
            className="mt-4 space-y-4 outline-none"
          >
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-brand text-xs font-medium text-brand-foreground hover:bg-brand-hover shadow-xs"
                onClick={() => setActivityOpen(true)}
              >
                <Plus size={14} />
                Add activity
              </Button>
            </div>

            {activities.length === 0 ? (
              <EmptyHint>
                No marketing activities yet. Add email, social, ads,
                traditional, or event activities.
              </EmptyHint>
            ) : (
              <DashboardCard className="overflow-hidden bg-white shadow-xs border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#FAFAFA] text-xs font-medium uppercase tracking-wide text-[#718096]">
                        <th className="px-4 py-2.5 font-medium sm:px-5">
                          Activity
                        </th>
                        <th className="px-3 py-2.5 font-medium">Channel</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Schedule</th>
                        <th className="px-3 py-2.5 font-medium">Spend</th>
                        <th className="px-3 py-2.5 font-medium">Sync</th>
                        <th className="px-4 py-2.5 font-medium sm:px-5">
                          Details
                        </th>
                        <th className="w-10 px-2 py-2.5 font-medium">
                          <span className="sr-only">More</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((a) => {
                        const details = a.channelDetails || {};
                        const eventRefId =
                          a.eventId ||
                          (typeof details.eventId === 'string'
                            ? details.eventId
                            : undefined);
                        const linkedEvent = eventRefId
                          ? eventsById.get(eventRefId)
                          : null;
                        const subject = detailText(details.subject);
                        const vendor = detailText(details.vendor);
                        const placement = detailText(details.placement);
                        const isEmail = a.channelType === 'Email';
                        const isManual = isManualMarketingChannel(
                          a.channelType,
                          a.channelCategory,
                        );
                        const extraDetail = manualActivityDetail(details);
                        const contentUrl =
                          detailText(details.postUrl) ||
                          detailText(details.destinationUrl) ||
                          detailText(details.url);
                        const detailTextBits = [
                          subject,
                          extraDetail,
                          vendor && !extraDetail
                            ? `${vendor}${placement ? ` · ${placement}` : ''}`
                            : '',
                        ].filter(Boolean);
                        const menuOpen = openActivityMenuId === a.id;
                        return (
                          <tr
                            key={a.id}
                            className="group border-t border-border hover:bg-surface-elevated"
                          >
                            <td className="px-4 py-3 sm:px-5">
                              <p className="m-0 text-sm font-medium text-foreground">
                                {a.name}
                              </p>
                              <p className="m-0 text-xs text-muted-foreground">
                                {a.owner}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-1">
                                <TypeBadge label={a.channelCategory} />
                                <span className="text-xs text-muted-foreground">
                                  {a.channelType}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge status={a.status} />
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {a.startDate || '—'}
                              {a.startDate &&
                              a.endDate &&
                              a.endDate !== a.startDate ? (
                                <>
                                  <br />→ {a.endDate}
                                </>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-sm tabular-nums text-foreground">
                              {formatMoney(a.actualSpend)}
                              <p className="m-0 text-xs text-muted-foreground">
                                budget {formatMoney(a.budget)}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge
                                status={isManual ? 'Manual' : a.syncStatus}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground sm:px-5">
                              <div className="space-y-1.5">
                                <div>
                                  {detailTextBits.length
                                    ? detailTextBits.join(' · ')
                                    : null}
                                  {contentUrl ? (
                                    <>
                                      {detailTextBits.length ? ' · ' : null}
                                      <a
                                        href={contentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand hover:underline"
                                      >
                                        Link
                                      </a>
                                    </>
                                  ) : null}
                                  {linkedEvent ? (
                                    <>
                                      {detailTextBits.length || contentUrl
                                        ? ' · '
                                        : null}
                                      <Link
                                        href={`/marketing/events/${linkedEvent.id}`}
                                        className="inline-flex items-center gap-1 text-brand hover:underline"
                                      >
                                        {linkedEvent.name}
                                        <ExternalLink size={11} />
                                      </Link>
                                    </>
                                  ) : null}
                                  {!detailTextBits.length &&
                                  !contentUrl &&
                                  !linkedEvent
                                    ? '—'
                                    : null}
                                </div>
                                {isEmail ? (
                                  <EmailActivityAction
                                    activity={a}
                                    sending={
                                      sendEmail.isLoading && sendingId === a.id
                                    }
                                    cancelling={
                                      cancelEmail.isLoading &&
                                      sendingId === a.id
                                    }
                                    onSend={() => {
                                      setSendingId(a.id);
                                      sendEmail.mutate(a.id, {
                                        onSettled: () => setSendingId(null),
                                      });
                                    }}
                                    onCancel={() => {
                                      setSendingId(a.id);
                                      cancelEmail.mutate(a.id, {
                                        onSettled: () => setSendingId(null),
                                      });
                                    }}
                                  />
                                ) : isManual ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 text-xs"
                                    disabled={a.status === 'Cancelled'}
                                    onClick={() => setResultsActivity(a)}
                                  >
                                    <ClipboardList size={12} />
                                    Record results
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  'h-7 w-7 p-0 transition-opacity',
                                  menuOpen
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                )}
                                data-activity-actions-trigger=""
                                aria-label={`More actions for ${a.name}`}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openActivityActionsMenu(
                                    a.id,
                                    e.currentTarget,
                                  );
                                }}
                              >
                                <MoreHorizontal size={14} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>
            )}
            <p className="m-0 text-xs text-muted-foreground">
              Email activities send from CRM. Other digital and traditional
              channels are logged here — use Record results after they run.
            </p>

            <DashboardCard className="flex flex-wrap items-center justify-between gap-3 border border-border bg-white p-4 shadow-xs">
              <div className="flex items-start gap-2">
                <Plug size={16} className="mt-0.5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="m-0 text-sm font-semibold text-foreground">
                      Publish & sync activities
                    </p>
                    <PhaseBadge />
                  </div>
                  <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                    Connect Google Ads, Meta, LinkedIn, or Microsoft email to
                    execute and sync these activities.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled>
                Connect integration
              </Button>
            </DashboardCard>
          </TabsContent>

          <TabsContent value="audience" className="mt-4 space-y-4 outline-none">
            {audiences.length === 0 ? (
              <DashboardCard className="border border-border bg-white p-8 text-center shadow-xs">
                <EmptyHint>
                  No audiences linked yet. Link CRM segments from the Audiences
                  tab.
                </EmptyHint>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 text-xs font-medium"
                  asChild
                >
                  <Link href="/marketing/audiences">Browse Audiences</Link>
                </Button>
              </DashboardCard>
            ) : (
              <DashboardCard className="overflow-hidden border border-border bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 text-sm font-semibold text-foreground">
                      Linked Audience Segments
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {audiences.length}
                    </span>
                  </div>
                  <Link
                    href="/marketing/audiences"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    Manage All Audiences
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#FAFAFA] text-xs font-medium uppercase tracking-wide text-[#718096]">
                        <th className="px-4 py-3 font-medium sm:px-5">
                          Segment Name
                        </th>
                        <th className="px-3 py-3 font-medium">Target Entity</th>
                        <th className="px-3 py-3 font-medium">
                          Filter Criteria
                        </th>
                        <th className="px-3 py-3 font-medium">
                          Matched Accounts
                        </th>
                        <th className="px-3 py-3 font-medium">
                          Matched Contacts
                        </th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right sm:px-5">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {audiences.map((aud) => (
                        <tr
                          key={aud.id}
                          className="group transition-colors hover:bg-surface-elevated"
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={`/marketing/audiences/${aud.id}`}
                              className="block text-sm font-medium text-foreground transition-colors group-hover:text-brand"
                            >
                              {aud.name}
                            </Link>
                            <p className="m-0 mt-0.5 line-clamp-1 max-w-[260px] text-xs text-muted-foreground">
                              {aud.description}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              <Users
                                size={11}
                                className="text-muted-foreground"
                              />
                              {aud.targetEntity}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex max-w-[300px] flex-wrap gap-1">
                              {aud.conditions.map((c, i) => (
                                <span
                                  key={`${aud.id}-${i}`}
                                  className="inline-flex items-center rounded-md border border-border/70 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-foreground tabular-nums">
                            {formatNumber(aud.matchedCustomers)}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-muted-foreground tabular-nums">
                            {formatNumber(aud.matchedContacts)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              status={aud.isActive ? 'Active' : 'Draft'}
                            />
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <Link
                              href={`/marketing/audiences/${aud.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand/80"
                            >
                              Manage
                              <ArrowRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>
            )}
          </TabsContent>

          <TabsContent value="assets" className="mt-4 space-y-4 outline-none">
            {linkedAssets.length === 0 ? (
              <EmptyHint>No assets linked to this campaign.</EmptyHint>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {linkedAssets.map(({ asset, sources }) => {
                  const preview =
                    asset.previewUrl?.trim() ||
                    (asset.mediaKind === 'Image' ? asset.url?.trim() : '');
                  const campaignLinked = sources.includes('Campaign');
                  const otherSources = sources.filter((s) => s !== 'Campaign');
                  return (
                    <DashboardCard key={asset.id} className="overflow-hidden">
                      <div
                        className="flex h-36 items-center justify-center"
                        style={{ backgroundColor: asset.thumbnailColor }}
                      >
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Link2 size={22} className="text-foreground/40" />
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="m-0 text-sm font-medium text-foreground">
                            {asset.name}
                          </p>
                          <StatusBadge status={asset.status} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <TypeBadge label={asset.mediaKind} />
                          {asset.platform ? (
                            <TypeBadge label={asset.platform} />
                          ) : null}
                          {campaignLinked ? (
                            <TypeBadge label="Campaign" />
                          ) : null}
                        </div>
                        {otherSources.length > 0 ? (
                          <p className="m-0 text-xs text-muted-foreground">
                            Used in {otherSources.slice(0, 2).join(', ')}
                            {otherSources.length > 2
                              ? ` +${otherSources.length - 2}`
                              : ''}
                          </p>
                        ) : campaignLinked ? (
                          <p className="m-0 text-xs text-muted-foreground">
                            Linked on this campaign
                          </p>
                        ) : null}
                        {asset.url ? (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                          >
                            Open <ExternalLink size={11} />
                          </a>
                        ) : null}
                      </div>
                    </DashboardCard>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href="/marketing/assets">Browse asset library</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateActivityModal
        open={activityOpen}
        onOpenChange={setActivityOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
      {campaignMenuOpen &&
      campaignMenuPosition &&
      typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={campaignMenuRef}
              role="menu"
              style={{
                top: campaignMenuPosition.top,
                left: campaignMenuPosition.left,
              }}
              className="fixed z-[100] w-44 rounded-md border border-border bg-white p-1 text-foreground shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setEditCampaignOpen(true);
                  setCampaignMenuOpen(false);
                  setCampaignMenuPosition(null);
                }}
              >
                <Pencil size={14} className="mr-2 shrink-0" />
                Edit campaign
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setOutcomesOpen(true);
                  setCampaignMenuOpen(false);
                  setCampaignMenuPosition(null);
                }}
              >
                <ClipboardList size={14} className="mr-2 shrink-0" />
                View outcomes
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm text-destructive outline-none hover:bg-accent hover:text-destructive"
                onClick={() => {
                  setDeleteCampaignOpen(true);
                  setCampaignMenuOpen(false);
                  setCampaignMenuPosition(null);
                }}
              >
                <Trash2 size={14} className="mr-2 shrink-0" />
                Delete campaign
              </button>
            </div>,
            document.body,
          )
        : null}
      {activeMenuActivity &&
      activityMenuPosition &&
      typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={activityMenuRef}
              role="menu"
              style={{
                top: activityMenuPosition.top,
                left: activityMenuPosition.left,
              }}
              className="fixed z-[100] w-40 rounded-md border border-border bg-white p-1 text-foreground shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                disabled={
                  activeMenuActivity.channelType === 'Email' &&
                  (activeMenuActivity.status === 'Sent' ||
                    activeMenuActivity.status === 'Completed')
                }
                className={cn(
                  'flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm outline-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                )}
                onClick={() => {
                  if (
                    activeMenuActivity.channelType === 'Email' &&
                    (activeMenuActivity.status === 'Sent' ||
                      activeMenuActivity.status === 'Completed')
                  ) {
                    return;
                  }
                  setEditActivity(activeMenuActivity);
                  setOpenActivityMenuId(null);
                  setActivityMenuPosition(null);
                }}
              >
                <Pencil size={14} className="mr-2 shrink-0" />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={
                  activeMenuActivity.channelType === 'Email' &&
                  (activeMenuActivity.status === 'Sent' ||
                    activeMenuActivity.status === 'Completed' ||
                    activeMenuActivity.status === 'Active' ||
                    activeMenuActivity.status === 'Scheduled')
                }
                className={cn(
                  'flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm outline-none',
                  'text-destructive hover:bg-accent hover:text-destructive',
                  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                )}
                onClick={() => {
                  if (
                    activeMenuActivity.channelType === 'Email' &&
                    (activeMenuActivity.status === 'Sent' ||
                      activeMenuActivity.status === 'Completed' ||
                      activeMenuActivity.status === 'Active' ||
                      activeMenuActivity.status === 'Scheduled')
                  ) {
                    return;
                  }
                  setDeleteActivityTarget(activeMenuActivity);
                  setOpenActivityMenuId(null);
                  setActivityMenuPosition(null);
                }}
              >
                <Trash2 size={14} className="mr-2 shrink-0" />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
      <CreateActivityModal
        open={Boolean(editActivity)}
        onOpenChange={(next) => {
          if (!next) setEditActivity(null);
        }}
        campaignId={campaign.id}
        campaignName={campaign.name}
        activity={editActivity}
      />
      <CreateCampaignModal
        open={editCampaignOpen}
        onOpenChange={setEditCampaignOpen}
        campaign={campaign}
      />
      <AddExpenseModal
        open={spendOpen}
        onOpenChange={setSpendOpen}
        campaignId={campaign.id}
        currentSpend={campaign.actualSpend}
      />
      <RecordOutcomesModal
        open={outcomesOpen}
        onOpenChange={setOutcomesOpen}
        campaignId={campaign.id}
        leadsGenerated={campaign.leadsGenerated}
        qualifiedLeads={campaign.qualifiedLeads}
        opportunities={campaign.opportunities}
        revenue={campaign.revenue}
      />
      <RecordActivityResultsModal
        open={Boolean(resultsActivity)}
        onOpenChange={(next) => {
          if (!next) setResultsActivity(null);
        }}
        campaignId={campaign.id}
        activity={resultsActivity}
      />
      <AlertDialog
        open={deleteCampaignOpen}
        onOpenChange={setDeleteCampaignOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{campaign.name}”, unlinks audiences and assets,
              soft-deletes activities (and related event tasks), and unlinks
              events. Pause the campaign and cancel any Active/Scheduled emails
              first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCampaign.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCampaign.isLoading}
              onClick={(e) => {
                e.preventDefault();
                deleteCampaign.mutate(campaign.id, {
                  onSuccess: () => {
                    setDeleteCampaignOpen(false);
                    router.push('/marketing/campaigns');
                  },
                });
              }}
            >
              {deleteCampaign.isLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(deleteActivityTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteActivityTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This unlinks audiences and assets from “
              {deleteActivityTarget?.name}”. Event activities also delete their
              linked communication tasks. Sent emails cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteActivity.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!deleteActivityTarget || deleteActivity.isLoading}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteActivityTarget) return;
                deleteActivity.mutate(
                  {
                    campaignId: campaign.id,
                    activityId: deleteActivityTarget.id,
                  },
                  { onSuccess: () => setDeleteActivityTarget(null) },
                );
              }}
            >
              {deleteActivity.isLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
