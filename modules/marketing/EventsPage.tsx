'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  MapPin,
  Plus,
  Users,
  LayoutGrid,
  List,
  ArrowRight,
  ExternalLink,
  CreditCard,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  MailCheck,
  Send,
  KeyRound,
  ShieldCheck,
  Link2,
  Film,
  FileText,
  Check,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMarketingAssets,
  useMarketingCampaign,
  useMarketingEvent,
  useMarketingEvents,
  useMarketingCampaigns,
} from '@/store/server/features/marketing/queries';
import {
  EVENT_ATTENDEES_PREVIEW,
  type EventAttendee,
  type EventStatus,
  type EventType,
  type ParticipantLifecycleStatus,
} from './mock-data';
import { CreateEventModal } from './CampaignModals';
import {
  DataTableSkeleton,
  MarketingDetailSkeleton,
} from '@/components/loading/skeleton-screens';
import {
  DashboardCard,
  EmptyHint,
  MarketingDetailHeader,
  MarketingFilterSelect,
  MarketingSearchField,
  StatusBadge,
  TypeBadge,
  formatMoney,
  formatNumber,
  marketingTabTriggerClass,
  marketingTabsListClass,
} from './ui-kit';
import { cn } from '@/lib/utils';

const TYPE_FILTERS: Array<'All' | EventType> = [
  'All',
  'Webinar',
  'Conference',
  'Workshop',
  'Trade Show',
  'Meetup',
  'Launch',
];

const STATUS_FILTERS: Array<'All' | EventStatus> = [
  'All',
  'Draft',
  'Scheduled',
  'Live',
  'Completed',
  'Cancelled',
];

function parseEventDate(dateStr: string) {
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const months = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
      ];
      const m = parseInt(parts[1], 10) - 1;
      return { month: months[m] || 'DATE', day: parts[2] };
    }
  } catch (e) {}
  return { month: 'DATE', day: '—' };
}

export function EventsPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]>('All');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [eventOpen, setEventOpen] = useState(false);
  const { data: events = [], isLoading } = useMarketingEvents({
    type: typeFilter,
    status: statusFilter,
  });
  const { data: campaigns = [] } = useMarketingCampaigns();
  const campaignNames = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns],
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.owner.toLowerCase().includes(q)
      );
    });
  }, [events, query]);

  return (
    <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <DashboardCard className="overflow-hidden bg-white shadow-xs border border-border">
        <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[15px] font-semibold text-foreground">
                All Events
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-xs transition-all',
                    viewMode === 'table'
                      ? 'bg-white font-bold text-brand shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Table view"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-xs transition-all',
                    viewMode === 'grid'
                      ? 'bg-white font-bold text-brand shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <Button
                size="sm"
                className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
                onClick={() => setEventOpen(true)}
              >
                <Plus size={14} />
                New Event
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <MarketingSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search events, locations, owners…"
            />
            <MarketingFilterSelect
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as (typeof TYPE_FILTERS)[number])
              }
              placeholder="Type"
              options={TYPE_FILTERS.map((t) => ({
                value: t,
                label: t === 'All' ? 'All types' : t,
              }))}
            />
            <MarketingFilterSelect
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as (typeof STATUS_FILTERS)[number])
              }
              placeholder="Status"
              options={STATUS_FILTERS.map((s) => ({
                value: s,
                label: s === 'All' ? 'All statuses' : s,
              }))}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-hidden">
            <DataTableSkeleton columns={8} className="rounded-none border-0" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyHint>No events match your current filters.</EmptyHint>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
                  <th className="px-4 py-3 font-semibold sm:px-5">Event</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Dates</th>
                  <th className="px-3 py-3 font-semibold">Campaign</th>
                  <th className="px-3 py-3 font-semibold">Budget & Spend</th>
                  <th className="px-3 py-3 font-semibold">Leads</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right sm:px-5">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((event) => {
                  const campaignName = event.campaignId
                    ? campaignNames.get(event.campaignId)
                    : null;
                  const spendPct =
                    event.budget > 0
                      ? Math.min(
                          Math.round((event.actualSpend / event.budget) * 100),
                          100,
                        )
                      : 0;

                  return (
                    <tr
                      key={event.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          href={`/marketing/events/${event.id}`}
                          className="font-semibold text-[13px] text-foreground group-hover:text-brand transition-colors block"
                        >
                          {event.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-brand" />
                            {event.location}
                          </span>
                          <span>·</span>
                          <span>{event.owner}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <TypeBadge label={event.type} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground whitespace-nowrap">
                          <CalendarDays
                            size={13}
                            className="text-muted-foreground"
                          />
                          <span>{event.date}</span>
                          {event.endDate && event.endDate !== event.date ? (
                            <span className="text-muted-foreground">
                              → {event.endDate}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px]">
                        {campaignName && event.campaignId ? (
                          <Link
                            href={`/marketing/campaigns/${event.campaignId}`}
                            className="font-medium text-brand hover:underline truncate max-w-[140px] inline-block"
                            title={campaignName}
                          >
                            {campaignName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground tabular-nums">
                              {formatMoney(event.actualSpend)}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              of {formatMoney(event.budget)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all duration-300"
                              style={{ width: `${spendPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] font-bold text-foreground tabular-nums">
                        {event.leads > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            +{event.leads} leads
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <Link
                          href={`/marketing/events/${event.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand/80 transition-colors"
                        >
                          Details
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => {
              const campaignName = event.campaignId
                ? campaignNames.get(event.campaignId)
                : null;
              const dateBadge = parseEventDate(event.date);
              const spendPct =
                event.budget > 0
                  ? Math.min(
                      Math.round((event.actualSpend / event.budget) * 100),
                      100,
                    )
                  : 0;

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all hover:border-brand/40 hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center size-12 shrink-0 rounded-lg bg-orange-50 border border-orange-200/70 text-center">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-brand leading-none">
                          {dateBadge.month}
                        </span>
                        <span className="text-[17px] font-bold text-brand leading-none mt-1">
                          {dateBadge.day}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/marketing/events/${event.id}`}
                          className="block font-bold text-[14px] text-foreground group-hover:text-brand transition-colors line-clamp-1"
                        >
                          {event.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin size={11} className="text-brand shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={event.status} />
                      <TypeBadge label={event.type} />
                      {campaignName ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {campaignName}
                        </span>
                      ) : null}
                    </div>

                    {event.description ? (
                      <p className="m-0 mt-3 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-muted-foreground">
                        Spend: {formatMoney(event.actualSpend)} /{' '}
                        {formatMoney(event.budget)}
                      </span>
                      {event.leads > 0 ? (
                        <span className="font-semibold text-emerald-600">
                          +{event.leads} leads
                        </span>
                      ) : null}
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${spendPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {event.owner}
                      </span>
                      <Link
                        href={`/marketing/events/${event.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                      >
                        View Details
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>

      <CreateEventModal open={eventOpen} onOpenChange={setEventOpen} />
    </div>
  );
}

/* ─── Event-Day Email Check-in Desk Modal ─── */
function OpenCheckInModal({
  open,
  onOpenChange,
  attendees,
  onCheckIn,
  onOpenWalkIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendees: EventAttendee[];
  onCheckIn: (id: string) => void;
  onOpenWalkIn: () => void;
}) {
  const [emailInput, setEmailInput] = useState('');
  const [mode, setMode] = useState<'verify' | 'directory'>('verify');
  const [filterMode, setFilterMode] = useState<'pending' | 'checkedIn' | 'all'>(
    'pending',
  );
  const [directorySearch, setDirectorySearch] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: 'success' | 'error' | 'resend_success';
    message: string;
    attendee?: EventAttendee;
  } | null>(null);

  const pendingCount = attendees.filter(
    (a) => a.attendanceStatus === 'Registered',
  ).length;
  const checkedInCount = attendees.filter(
    (a) =>
      a.attendanceStatus === 'Checked In' || a.attendanceStatus === 'Attended',
  ).length;

  function handleVerifyAndCheckIn(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = emailInput.trim().toLowerCase();
    if (!query) {
      setVerificationResult({
        status: 'error',
        message:
          'Please enter an attendee email address or 6-digit verification code.',
      });
      return;
    }

    // Match by email or verification code
    const match = attendees.find((a) => {
      const emailMatch = a.email.toLowerCase() === query;
      const codeMatch =
        (a.emailVerificationCode &&
          a.emailVerificationCode.toLowerCase() === query) ||
        (a.emailVerificationCode &&
          a.emailVerificationCode.toLowerCase().replace('-', '') ===
            query.replace('-', ''));
      return emailMatch || codeMatch;
    });

    if (match) {
      onCheckIn(match.id);
      const updatedMatch: EventAttendee = {
        ...match,
        attendanceStatus: 'Checked In',
        checkedIn: true,
      };
      setVerificationResult({
        status: 'success',
        message: `Email verification verified! Checked in ${match.name}.`,
        attendee: updatedMatch,
      });
      setEmailInput('');
    } else {
      setVerificationResult({
        status: 'error',
        message: `No registered attendee found matching "${query}". Check email spelling or register as a walk-in.`,
      });
    }
  }

  function handleResendCode() {
    const query = emailInput.trim().toLowerCase();
    if (!query) {
      setVerificationResult({
        status: 'error',
        message:
          'Enter the attendee email address to resend their verification code.',
      });
      return;
    }
    const match = attendees.find((a) => a.email.toLowerCase() === query);
    if (match) {
      setVerificationResult({
        status: 'resend_success',
        message: `Verification code (${match.emailVerificationCode || 'ETH-8491'}) resent to ${match.email}.`,
        attendee: match,
      });
    } else {
      setVerificationResult({
        status: 'resend_success',
        message: `Verification check-in code dispatched to ${query}.`,
      });
    }
  }

  const directoryFiltered = attendees.filter((a) => {
    const q = directorySearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.company.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.emailVerificationCode &&
        a.emailVerificationCode.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (filterMode === 'pending') return a.attendanceStatus === 'Registered';
    if (filterMode === 'checkedIn')
      return (
        a.attendanceStatus === 'Checked In' || a.attendanceStatus === 'Attended'
      );
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white shadow-xl rounded-xl border border-border">
        {/* Header */}
        <DialogHeader className="p-5 pb-3.5 border-b border-border bg-[#FAFAFA]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[17px] font-semibold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-surface-elevated border border-border text-foreground">
                  <MailCheck size={16} className="text-brand" />
                </span>
                Event-Day Email Check-in Desk
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                Verify attendee registration & admission via email confirmation
                code or email address.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0 pr-8">
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {checkedInCount} Checked In
              </span>
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {pendingCount} Pending
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center justify-between gap-2 pt-3">
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('verify');
                  setVerificationResult(null);
                }}
                className={cn(
                  'px-3 py-1 text-[12px] font-medium rounded-md transition-all flex items-center gap-1.5',
                  mode === 'verify'
                    ? 'bg-white text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <KeyRound size={13} />
                Verify Email & Code
              </button>
              <button
                type="button"
                onClick={() => setMode('directory')}
                className={cn(
                  'px-3 py-1 text-[12px] font-medium rounded-md transition-all flex items-center gap-1.5',
                  mode === 'directory'
                    ? 'bg-white text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Users size={13} />
                Directory Lookup
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onOpenWalkIn();
              }}
              className="h-7 text-[11px] font-medium border-border text-foreground hover:bg-surface-elevated"
            >
              <UserPlus size={12} className="mr-1 text-muted-foreground" />+
              Walk-in Registration
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[320px]">
          {mode === 'verify' ? (
            <div className="space-y-4">
              {/* Email Verification Form */}
              <form
                onSubmit={handleVerifyAndCheckIn}
                className="rounded-xl border border-border bg-surface-elevated/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#718096]">
                    Attendee Email or Verification Code
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Check email registration confirmation
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setVerificationResult(null);
                      }}
                      placeholder="e.g. abebe.k@ethiotelecom.et or code ETH-8491…"
                      autoFocus
                      className="h-10 pl-9 text-[13px] bg-white border-border"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-10 bg-brand hover:bg-brand/90 text-white font-medium text-[13px] px-4 shadow-xs"
                  >
                    <ShieldCheck size={16} className="mr-1.5" />
                    Verify & Check In
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendCode}
                    className="h-10 text-[12px] font-medium text-foreground border-border bg-white hover:bg-surface-elevated"
                    title="Resend verification code to this email"
                  >
                    <Send size={13} className="mr-1 text-muted-foreground" />
                    Resend Code
                  </Button>
                </div>

                {verificationResult ? (
                  <div
                    className={cn(
                      'rounded-lg p-3 text-[12px] flex items-start gap-2.5 transition-all border',
                      verificationResult.status === 'success'
                        ? 'bg-surface-elevated border-border text-foreground'
                        : verificationResult.status === 'resend_success'
                          ? 'bg-surface-elevated border-border text-foreground'
                          : 'bg-rose-50 border-rose-200 text-rose-900',
                    )}
                  >
                    {verificationResult.status === 'success' ? (
                      <CheckCircle2
                        size={16}
                        className="text-emerald-600 shrink-0 mt-0.5"
                      />
                    ) : verificationResult.status === 'resend_success' ? (
                      <Send
                        size={15}
                        className="text-muted-foreground shrink-0 mt-0.5"
                      />
                    ) : (
                      <AlertCircle
                        size={16}
                        className="text-rose-600 shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold m-0">
                        {verificationResult.message}
                      </p>
                      {verificationResult.attendee ? (
                        <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] gap-2">
                          <div>
                            <strong className="text-foreground">
                              {verificationResult.attendee.name}
                            </strong>{' '}
                            ·{' '}
                            <span className="text-muted-foreground">
                              {verificationResult.attendee.company} (
                              {verificationResult.attendee.title})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-mono font-medium bg-white px-2 py-0.5 rounded border border-border text-muted-foreground">
                            Code:{' '}
                            {verificationResult.attendee.emailVerificationCode}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </form>

              {/* Quick Pending Verification Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#718096] m-0">
                    Awaiting Email Verification ({pendingCount})
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Click to quick-verify
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attendees
                    .filter((a) => a.attendanceStatus === 'Registered')
                    .slice(0, 4)
                    .map((att) => (
                      <div
                        key={att.id}
                        className="rounded-xl border border-border bg-white p-3 hover:bg-surface-elevated transition-all flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 font-semibold text-[13px] text-foreground truncate">
                            {att.name}
                          </p>
                          <p className="m-0 text-[11px] text-muted-foreground truncate">
                            {att.email}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-[10px] text-muted-foreground bg-surface-elevated border border-border px-1.5 py-0.5 rounded">
                              <KeyRound size={9} />
                              {att.emailVerificationCode || 'ETH-1000'}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onCheckIn(att.id);
                            setVerificationResult({
                              status: 'success',
                              message: `Verified & checked in ${att.name} via email code.`,
                              attendee: {
                                ...att,
                                attendanceStatus: 'Checked In',
                                checkedIn: true,
                              },
                            });
                          }}
                          className="h-7 text-[11px] font-medium border-border text-foreground hover:bg-surface-elevated shrink-0"
                        >
                          Verify
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            /* Directory Lookup Mode */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder="Search by name, organization, email, or code…"
                    autoFocus
                    className="h-9 pl-9 text-[13px] bg-white border-border"
                  />
                </div>
                <div className="flex rounded-md border border-border bg-slate-50 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterMode('pending')}
                    className={cn(
                      'px-2.5 py-1 rounded font-medium transition-colors',
                      filterMode === 'pending'
                        ? 'bg-white text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('checkedIn')}
                    className={cn(
                      'px-2.5 py-1 rounded font-medium transition-colors',
                      filterMode === 'checkedIn'
                        ? 'bg-white text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Checked In ({checkedInCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={cn(
                      'px-2.5 py-1 rounded font-medium transition-colors',
                      filterMode === 'all'
                        ? 'bg-white text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    All ({attendees.length})
                  </button>
                </div>
              </div>

              {/* Directory Attendee List */}
              <div className="divide-y divide-border rounded-xl border border-border bg-white overflow-hidden">
                {directoryFiltered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-[13px]">
                    No matching attendees found.
                  </div>
                ) : (
                  directoryFiltered.map((att) => {
                    const isChecked =
                      att.attendanceStatus === 'Checked In' ||
                      att.attendanceStatus === 'Attended';

                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3.5 transition-colors hover:bg-surface-elevated"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-semibold text-[11px] text-muted-foreground shrink-0">
                            {att.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="m-0 font-semibold text-[13px] text-foreground">
                                {att.name}
                              </p>
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-surface-elevated border border-border px-1.5 py-0.2 rounded font-medium">
                                {att.emailVerificationCode || 'ETH-1000'}
                              </span>
                            </div>
                            <p className="m-0 text-[11px] text-muted-foreground">
                              {att.email} · {att.company}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <span className="inline-flex items-center gap-1">
                              <StatusBadge
                                status={
                                  att.attendanceStatus === 'Attended'
                                    ? 'Attended'
                                    : 'Checked In'
                                }
                              />
                              {att.checkInTime ? (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  ({att.checkInTime})
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onCheckIn(att.id);
                                setVerificationResult({
                                  status: 'success',
                                  message: `Verified & checked in ${att.name} via email code.`,
                                  attendee: {
                                    ...att,
                                    attendanceStatus: 'Checked In',
                                    checkedIn: true,
                                  },
                                });
                              }}
                              className="h-7 text-[11px] font-medium border-border text-foreground hover:bg-surface-elevated shadow-none"
                            >
                              <Check
                                size={12}
                                className="mr-1 text-muted-foreground"
                              />
                              Verify & Check In
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3.5 px-5 border-t border-border bg-[#FAFAFA] flex items-center justify-between">
          <p className="m-0 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-muted-foreground" />
            Admissions authenticated via email registration verification
            protocol.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 border-border text-foreground hover:bg-surface-elevated text-[12px] font-medium"
          >
            Close Desk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Walk-in Registration Modal (Email Verification) ─── */
function WalkInRegistrationModal({
  open,
  onOpenChange,
  onRegister,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (data: {
    name: string;
    company: string;
    title: string;
    email: string;
    phone: string;
    leadStatus: EventAttendee['leadStatus'];
    checkInNow: boolean;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadStatus, setLeadStatus] =
    useState<EventAttendee['leadStatus']>('Qualified Lead');
  const [checkInNow, setCheckInNow] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) return;
    onRegister({
      name,
      company,
      title,
      email,
      phone,
      leadStatus,
      checkInNow,
    });
    setName('');
    setCompany('');
    setTitle('');
    setEmail('');
    setPhone('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md bg-white shadow-xl rounded-xl border border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-[#FAFAFA]">
          <DialogTitle className="text-[17px] font-semibold text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-surface-elevated border border-border text-foreground">
              <UserPlus size={16} className="text-brand" />
            </span>
            Walk-in Email Registration
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
            Register on-site attendees arriving on event day. An admission
            verification code will be assigned to their email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="text-[12px] font-semibold text-foreground block mb-1">
              Participant Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dawit Alemayehu"
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-1">
                Company / Organization *
              </label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Lion Bank"
                required
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-1">
                Job Title / Role
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Head of IT"
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-1">
                Email Address (For Verification Code) *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dawit@lionbank.et"
                required
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-1">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 91 234 5678"
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-foreground block mb-1">
              Initial Lead Status
            </label>
            <select
              value={leadStatus}
              onChange={(e) => setLeadStatus(e.target.value as any)}
              className="w-full h-8 rounded-md border border-border bg-white px-2.5 text-[12px] outline-none text-foreground font-medium"
            >
              <option value="Qualified Lead">Qualified Lead</option>
              <option value="New Lead">New Lead</option>
              <option value="Customer Contact">Customer Contact</option>
            </select>
          </div>

          <div className="rounded-lg bg-surface-elevated border border-border p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground m-0 flex items-center gap-1.5">
              <MailCheck size={13} className="text-brand" />
              Automatic Email Verification Code
            </p>
            <p className="m-0 text-muted-foreground">
              A 6-digit confirmation code will be dispatched to this email for
              registration record & check-in verification.
            </p>
          </div>

          <div className="rounded-lg bg-surface-elevated border border-border p-2.5 flex items-center gap-2">
            <input
              type="checkbox"
              id="checkInNow"
              checked={checkInNow}
              onChange={(e) => setCheckInNow(e.target.checked)}
              className="size-4 rounded border-border text-brand focus:ring-brand accent-[#ed6925] cursor-pointer"
            />
            <label
              htmlFor="checkInNow"
              className="text-[12px] font-medium text-foreground cursor-pointer"
            >
              Verify email code & check in immediately upon registration
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-brand hover:bg-brand/90 text-white font-medium shadow-xs"
            >
              Complete Registration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Event Detail Page ─── */
export function EventDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { data: event, isLoading } = useMarketingEvent(id);
  const { data: campaign } = useMarketingCampaign(event?.campaignId ?? '');
  const { data: allAssets = [] } = useMarketingAssets();
  const [tab, setTab] = useState<'tracking' | 'assets'>('tracking');

  const [attendeesList, setAttendeesList] = useState<EventAttendee[]>(() => {
    return EVENT_ATTENDEES_PREVIEW;
  });
  const [trackingSearch, setTrackingSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('All');
  const [registrationFilter, setRegistrationFilter] = useState<string>('All');

  const [openCheckInDesk, setOpenCheckInDesk] = useState(false);
  const [openWalkInModal, setOpenWalkInModal] = useState(false);

  const [assetSearch, setAssetSearch] = useState('');
  const [assetKindFilter, setAssetKindFilter] = useState('All');

  if (isLoading) {
    return <MarketingDetailSkeleton />;
  }

  if (!event) {
    return (
      <div className="p-6 bg-white min-h-full">
        <EmptyHint>
          Event not found.{' '}
          <Link href="/marketing/events" className="text-brand underline">
            Back
          </Link>
        </EmptyHint>
      </div>
    );
  }

  const assets = allAssets.filter((a) => event.assetIds.includes(a.id));

  const spendPct =
    event.budget > 0
      ? Math.min(Math.round((event.actualSpend / event.budget) * 100), 100)
      : 0;

  const relevantAttendees = attendeesList.filter(
    (a) => a.eventId === event.id || !a.eventId,
  );
  const effectiveAttendees =
    relevantAttendees.length > 0 ? relevantAttendees : attendeesList;

  const totalRegistered = effectiveAttendees.length;
  const checkedInCount = effectiveAttendees.filter(
    (a) =>
      a.attendanceStatus === 'Checked In' || a.attendanceStatus === 'Attended',
  ).length;
  const checkInRate =
    effectiveAttendees.length > 0
      ? Math.round((checkedInCount / effectiveAttendees.length) * 100)
      : 0;

  function updateLifecycleStatus(
    attendeeId: string,
    newStatus: ParticipantLifecycleStatus,
  ) {
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setAttendeesList((prev) =>
      prev.map((att) => {
        if (att.id === attendeeId) {
          const isChecked =
            newStatus === 'Checked In' || newStatus === 'Attended';
          return {
            ...att,
            attendanceStatus: newStatus,
            checkedIn: isChecked,
            checkInTime: isChecked ? att.checkInTime || now : undefined,
            checkedInAt: isChecked ? att.checkedInAt || now : undefined,
          };
        }
        return att;
      }),
    );
  }

  function handleCheckIn(attendeeId: string) {
    updateLifecycleStatus(attendeeId, 'Checked In');
  }

  function handleRegisterWalkIn(data: {
    name: string;
    company: string;
    title: string;
    email: string;
    phone: string;
    leadStatus: EventAttendee['leadStatus'];
    checkInNow: boolean;
  }) {
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const today = new Date().toISOString().split('T')[0];
    const generatedCode = `ETH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newParticipant: EventAttendee = {
      id: `att-${Date.now()}`,
      eventId: event?.id ?? 'evt-1',
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim() || '+251 91 000 0000',
      company: data.company.trim(),
      title: data.title.trim() || 'Attendee',
      ticketType: 'Standard',
      registrationStatus: 'Walk-in',
      emailVerificationCode: generatedCode,
      emailVerified: true,
      checkInTime: data.checkInNow ? now : undefined,
      attendanceStatus: data.checkInNow ? 'Checked In' : 'Registered',
      leadStatus: data.leadStatus,
      registeredAt: today,
      checkedIn: data.checkInNow,
      checkedInAt: data.checkInNow ? now : undefined,
    };
    setAttendeesList((prev) => [newParticipant, ...prev]);
  }

  const filteredAttendees = effectiveAttendees.filter((att) => {
    const q = trackingSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      att.name.toLowerCase().includes(q) ||
      att.company.toLowerCase().includes(q) ||
      att.email.toLowerCase().includes(q) ||
      att.phone.toLowerCase().includes(q);

    const matchesLifecycle =
      lifecycleFilter === 'All' || att.attendanceStatus === lifecycleFilter;

    const matchesRegistration =
      registrationFilter === 'All' ||
      att.registrationStatus === registrationFilter;

    return matchesSearch && matchesLifecycle && matchesRegistration;
  });

  const filteredAssets = assets.filter((a) => {
    const matchesKind =
      assetKindFilter === 'All' || a.mediaKind === assetKindFilter;
    const q = assetSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.platform.toLowerCase().includes(q) ||
      a.owner.toLowerCase().includes(q);
    return matchesKind && matchesQuery;
  });

  return (
    <div className="w-full space-y-5 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <MarketingDetailHeader
        backHref="/marketing/events"
        backLabel="Events"
        title={event.name}
        badges={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={event.status} />
            <TypeBadge label={event.type} />
            {campaign ? (
              <Link
                href={`/marketing/campaigns/${campaign.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Campaign: {campaign.name}
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Event Budget & Spend
              </p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-brand shadow-2xs">
                <CreditCard size={18} />
              </span>
            </div>
            <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
              {formatMoney(event.actualSpend)}
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>{spendPct}% spent</span>
              <span className="tabular-nums font-semibold text-foreground">
                of {formatMoney(event.budget)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${spendPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Registrations & Attendance
              </p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-2xs">
                <Users size={18} />
              </span>
            </div>
            <p className="m-0 mt-2 text-[22px] font-bold leading-none text-foreground tabular-nums">
              {formatNumber(totalRegistered)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">
              {checkedInCount} checked-in ({checkInRate}%)
            </span>
            {event.leads > 0 ? (
              <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-foreground">
                +{event.leads} Leads
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Event Schedule
              </p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 shadow-2xs">
                <CalendarDays size={18} />
              </span>
            </div>
            <p className="m-0 mt-2 text-[18px] font-bold tracking-tight text-foreground tabular-nums">
              {event.date}
            </p>
          </div>
          <div className="mt-3 text-[12px] text-muted-foreground">
            <span>
              Ends{' '}
              <strong className="text-foreground">
                {event.endDate ?? event.date}
              </strong>{' '}
              · {event.type}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Venue & Campaign
              </p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-2xs">
                <MapPin size={18} />
              </span>
            </div>
            <p
              className="m-0 mt-2 text-[15px] font-semibold tracking-tight text-foreground truncate"
              title={event.location}
            >
              {event.location}
            </p>
          </div>
          <div className="mt-3 text-[12px] text-muted-foreground truncate">
            {campaign ? (
              <span className="truncate block">
                Campaign:{' '}
                <strong className="text-foreground">{campaign.name}</strong>
              </span>
            ) : (
              <span>
                Owner:{' '}
                <strong className="text-foreground">{event.owner}</strong>
              </span>
            )}
          </div>
        </div>
      </section>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'tracking' | 'assets')}
      >
        <TabsList variant="line" className={marketingTabsListClass}>
          <TabsTrigger value="tracking" className={marketingTabTriggerClass}>
            Event tracking
          </TabsTrigger>
          <TabsTrigger value="assets" className={marketingTabTriggerClass}>
            Assets ({assets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-4 outline-none">
          <DashboardCard className="overflow-hidden bg-white shadow-xs border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 bg-slate-50/40">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    placeholder="Search participant, company, email…"
                    className="h-8 pl-8 text-[12px] bg-white border-border"
                  />
                </div>
                <select
                  value={lifecycleFilter}
                  onChange={(e) => setLifecycleFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-white px-2.5 text-[12px] outline-none text-foreground font-medium"
                >
                  <option value="All">All Attendance</option>
                  <option value="Registered">Registered</option>
                  <option value="Checked In">Checked In</option>
                  <option value="Attended">Attended</option>
                  <option value="No Show">No Show</option>
                </select>
                <select
                  value={registrationFilter}
                  onChange={(e) => setRegistrationFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-white px-2.5 text-[12px] outline-none text-foreground font-medium"
                >
                  <option value="All">All Registrations</option>
                  <option value="Pre-registered">Pre-registered</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="VIP Invitation">VIP Invitation</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setOpenCheckInDesk(true)}
                  className="h-8 bg-brand hover:bg-brand/90 text-white text-[12px] font-medium gap-1.5 shadow-xs"
                >
                  <MailCheck size={14} />
                  Email Check-in Desk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenWalkInModal(true)}
                  className="h-8 border-border text-foreground hover:bg-surface-elevated text-[12px] font-medium gap-1.5"
                >
                  <UserPlus size={14} className="text-muted-foreground" />+
                  Walk-in Registration
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] border-collapse min-w-[960px]">
                <thead>
                  <tr className="border-b border-border bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
                    <th className="px-4 py-2.5 font-semibold">Participant</th>
                    <th className="px-3 py-2.5 font-semibold">Company</th>
                    <th className="px-3 py-2.5 font-semibold">
                      Registration Status
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Check-in Time</th>
                    <th className="px-3 py-2.5 font-semibold">
                      Attendance Status
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Lead Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No participants match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((att) => {
                      const lifecycle = att.attendanceStatus;

                      return (
                        <tr
                          key={att.id}
                          className="border-t border-border transition-colors hover:bg-surface-elevated"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-semibold text-[11px] text-muted-foreground shrink-0">
                                {att.name.charAt(0)}
                              </div>
                              <span className="text-[13px] font-semibold text-foreground">
                                {att.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                              <Building2
                                size={13}
                                className="text-muted-foreground/70 shrink-0"
                              />
                              <span className="text-foreground font-normal">
                                {att.company}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {att.registrationStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[12px] text-muted-foreground tabular-nums">
                            {att.checkInTime ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock
                                  size={12}
                                  className="text-muted-foreground/70"
                                />
                                {att.checkInTime}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={att.attendanceStatus} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center rounded-full border border-border/80 bg-surface-elevated px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {att.leadStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lifecycle === 'Registered' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckIn(att.id)}
                                className="h-7 px-2.5 text-[11px] font-medium border-border hover:bg-surface-elevated text-foreground"
                              >
                                <Check
                                  size={12}
                                  className="mr-1 text-muted-foreground"
                                />
                                Check In
                              </Button>
                            ) : lifecycle === 'Checked In' ? (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateLifecycleStatus(att.id, 'Attended')
                                  }
                                  className="h-7 px-2.5 text-[11px] font-medium border-border hover:bg-surface-elevated text-foreground"
                                >
                                  Mark Attended
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateLifecycleStatus(att.id, 'Registered')
                                  }
                                  className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-foreground font-normal"
                                >
                                  Undo
                                </Button>
                              </div>
                            ) : lifecycle === 'Attended' ? (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                                <CheckCircle2
                                  size={13}
                                  className="text-emerald-600"
                                />
                                Completed
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckIn(att.id)}
                                className="h-7 px-2.5 text-[11px] font-medium border-border hover:bg-surface-elevated text-foreground"
                              >
                                Check In
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
          <p className="m-0 mt-2 text-[11px] text-muted-foreground">
            Check-in desk uses demo attendee data until registration APIs are
            available.
          </p>
        </TabsContent>

        <TabsContent value="assets" className="mt-4 space-y-4 outline-none">
          {assets.length === 0 ? (
            <DashboardCard className="p-8 text-center bg-white border border-border shadow-xs">
              <EmptyHint>No assets linked to this event yet.</EmptyHint>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 text-[12px]"
                asChild
              >
                <Link href="/marketing/assets">Browse Content Assets</Link>
              </Button>
            </DashboardCard>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      placeholder="Search assets in this event…"
                      className="h-8 pl-8 text-[12px] bg-white border-border"
                    />
                  </div>
                  <select
                    value={assetKindFilter}
                    onChange={(e) => setAssetKindFilter(e.target.value)}
                    className="h-8 rounded-md border border-border bg-white px-2.5 text-[12px] outline-none text-foreground font-medium"
                  >
                    <option value="All">All Media Types</option>
                    <option value="Image">Image</option>
                    <option value="Video">Video</option>
                    <option value="Document">Document</option>
                    <option value="Template">Template</option>
                    <option value="Script">Script</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
                >
                  <Link href="/marketing/assets">
                    <Plus size={14} className="mr-1" />
                    Add Asset
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAssets.map((asset) => (
                  <DashboardCard
                    key={asset.id}
                    className="overflow-hidden bg-white border border-border shadow-xs hover:border-brand/40 transition-all flex flex-col justify-between group"
                  >
                    <div
                      className="flex h-36 items-center justify-center relative overflow-hidden bg-slate-100"
                      style={
                        asset.thumbnailColor
                          ? { backgroundColor: asset.thumbnailColor }
                          : undefined
                      }
                    >
                      {asset.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.previewUrl}
                          alt={asset.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                          {asset.mediaKind === 'Video' ? (
                            <Film size={26} />
                          ) : asset.mediaKind === 'Document' ||
                            asset.mediaKind === 'PDF' ? (
                            <FileText size={26} />
                          ) : (
                            <Link2 size={26} />
                          )}
                          <span className="text-[11px] font-medium">
                            {asset.mediaKind}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="m-0 font-semibold text-[13px] text-foreground line-clamp-1 group-hover:text-brand transition-colors">
                          {asset.name}
                        </p>
                        <StatusBadge status={asset.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {asset.platform}
                        </span>
                        <span>·</span>
                        <span>{asset.mediaKind}</span>
                        <span>·</span>
                        <span>{asset.owner}</span>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50/80 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Updated {asset.updatedAt}
                      </span>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    </div>
                  </DashboardCard>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OpenCheckInModal
        open={openCheckInDesk}
        onOpenChange={setOpenCheckInDesk}
        attendees={effectiveAttendees}
        onCheckIn={handleCheckIn}
        onOpenWalkIn={() => setOpenWalkInModal(true)}
      />

      <WalkInRegistrationModal
        open={openWalkInModal}
        onOpenChange={setOpenWalkInModal}
        onRegister={handleRegisterWalkIn}
      />
    </div>
  );
}
