'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  ListChecks,
  TrendingUp,
  User,
  Users,
  Video,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  QBRMeeting,
  PartnerHealthSentiment,
  TargetAchievementStatus,
} from '../../types';
interface QBRDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qbr: QBRMeeting | null;
  onUpdateQBR?: (updated: QBRMeeting) => void;
  /** Open the completion flow without nesting another Dialog (avoids body pointer-events lock). */
  onRequestComplete?: (qbr: QBRMeeting) => void;
}

const STATUS_OPTIONS: {
  value: QBRMeeting['status'];
  label: string;
  dot: string;
}[] = [
  { value: 'Scheduled', label: 'Scheduled', dot: 'bg-blue-500' },
  { value: 'In Preparation', label: 'In Preparation', dot: 'bg-amber-500' },
  { value: 'Completed', label: 'Completed', dot: 'bg-emerald-500' },
];

function qbrStatusStyle(status: QBRMeeting['status']) {
  switch (status) {
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Overdue':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'In Preparation':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function statusDot(status: QBRMeeting['status']) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.dot ?? 'bg-amber-500';
}

function formatDisplayDate(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDisplayTime(value?: string) {
  if (!value) return '—';
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return value;
}

function healthSentimentStyle(sentiment: PartnerHealthSentiment) {
  switch (sentiment) {
    case 'Green':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'Amber':
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      };
    case 'Red':
      return {
        badge: 'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
      };
  }
}

function targetStatusStyle(status: TargetAchievementStatus) {
  switch (status) {
    case 'Exceeded':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'On Track':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Behind Target':
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function DetailField({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  className?: string;
}) {
  const display = value?.trim() || '—';

  return (
    <div className={className}>
      <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="m-0 mt-1 break-words text-[12.25px] font-medium text-foreground">
        {display}
      </dd>
    </div>
  );
}

export function QBRDetailModal({
  open,
  onOpenChange,
  qbr,
  onUpdateQBR,
  onRequestComplete,
}: QBRDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'post-meeting'>(
    'overview',
  );

  useEffect(() => {
    if (open) setActiveTab('overview');
  }, [open, qbr?.id]);

  // Nested / stacked Dialogs (and DropdownMenu → Dialog) can leave
  // pointer-events:none on <body>. Clear it whenever this dialog closes.
  useEffect(() => {
    if (open) return;
    const unlock = () => {
      document.body.style.pointerEvents = '';
      document.documentElement.style.pointerEvents = '';
    };
    unlock();
    const t0 = window.setTimeout(unlock, 0);
    const t1 = window.setTimeout(unlock, 250);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [open]);

  if (!qbr) return null;

  const isCompleted = qbr.status === 'Completed';
  const postMeeting = qbr.postMeeting;
  const hasPostMeetingContent = isCompleted || Boolean(postMeeting);

  const healthSentiment: PartnerHealthSentiment =
    postMeeting?.healthSentiment || 'Green';
  const healthStyles = healthSentimentStyle(healthSentiment);
  const targetStatus: TargetAchievementStatus =
    postMeeting?.targetAchievementStatus || 'On Track';

  const requestComplete = () => {
    onRequestComplete?.(qbr);
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'Completed' && qbr.status !== 'Completed') {
      requestComplete();
      return;
    }
    onUpdateQBR?.({
      ...qbr,
      status: newStatus as QBRMeeting['status'],
    });
  };

  const modalMaxWidth =
    activeTab === 'post-meeting' && hasPostMeetingContent
      ? 'sm:max-w-3xl'
      : 'sm:max-w-xl';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0',
          modalMaxWidth,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b-0 px-5 py-4 pr-12 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
              <Calendar size={18} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[16px] font-semibold leading-tight">
                  Quarterly Business Review
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-md px-1.5 py-0 text-[10px] font-semibold',
                    qbrStatusStyle(qbr.status),
                  )}
                >
                  {qbr.status}
                </Badge>
              </div>
              <DialogDescription className="text-[12px]">
                {qbr.partnerName} · {qbr.reviewPeriod}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="w-full shrink-0 overflow-x-auto border-b border-border bg-white px-5 dark:bg-surface-card">
          <nav
            className="flex min-w-max items-center gap-1"
            aria-label="QBR detail sections"
          >
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                activeTab === 'overview'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <Calendar size={13} />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('post-meeting')}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                activeTab === 'post-meeting'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <ListChecks size={13} />
              Post-Meeting
              {isCompleted ? (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              ) : null}
            </button>
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'overview' ? (
            <div className="flex w-full flex-col gap-3.5">
              <section className="rounded-xl border border-border bg-white p-4 shadow-xs dark:bg-surface-card">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailField label="Partner" value={qbr.partnerName} />
                  <DetailField
                    label="Period / Quarter"
                    value={qbr.reviewPeriod}
                  />
                  <DetailField
                    label="Meeting owner"
                    value={qbr.owner}
                    icon={<User size={12} className="text-muted-foreground" />}
                  />
                  <DetailField
                    label="Partner lead"
                    value={
                      qbr.partnerLead || qbr.participants?.[1] || undefined
                    }
                    icon={<Users size={12} className="text-muted-foreground" />}
                  />
                </dl>
              </section>

              <section className="rounded-xl border border-border bg-white p-4 shadow-xs dark:bg-surface-card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    <Clock size={13} className="text-brand" />
                    Meeting schedule
                  </h4>
                  {qbr.performanceScore ? (
                    <span className="text-[11px] font-medium text-emerald-600">
                      Score {qbr.performanceScore}/100
                    </span>
                  ) : null}
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  <DetailField
                    label="Date"
                    value={formatDisplayDate(qbr.meetingDate)}
                  />
                  <DetailField
                    label="Start time"
                    value={formatDisplayTime(qbr.meetingTime)}
                  />
                  <DetailField label="Duration" value={qbr.duration} />
                </dl>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-xs dark:bg-surface-card">
                <div>
                  <Label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Video size={12} />
                    Location / meeting link
                  </Label>
                  {qbr.location ? (
                    <a
                      href={qbr.location}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-[12.25px] font-medium text-brand hover:underline"
                    >
                      <span className="truncate">{qbr.location}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <p className="m-0 text-[12.25px] text-muted-foreground">
                      Not provided
                    </p>
                  )}
                </div>

                <div className="border-t border-border/60 pt-3">
                  <Label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <FileText size={12} />
                    Pre-read / slide deck
                  </Label>
                  {qbr.preReadUrl ? (
                    <a
                      href={qbr.preReadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-[12.25px] font-medium text-brand hover:underline"
                    >
                      <span className="truncate">{qbr.preReadUrl}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <p className="m-0 text-[12.25px] text-muted-foreground">
                      Not provided
                    </p>
                  )}
                </div>

                <div className="border-t border-border/60 pt-3">
                  <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Agenda topics
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {qbr.agenda?.length ? (
                      qbr.agenda.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center rounded-md border border-brand/20 bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand"
                        >
                          {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-muted-foreground">
                        No agenda topics recorded.
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {isCompleted ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <div>
                    <p className="m-0 text-[12px] font-semibold text-emerald-900">
                      Review completed and documented
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-emerald-800">
                      Open the Post-Meeting tab to review summary, sentiment,
                      and action items.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <Clock size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="m-0 text-[12px] font-semibold text-amber-900">
                      Post-meeting review pending
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-amber-800">
                      Mark completed after the review to record notes,
                      sentiment, and action items.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'post-meeting' ? (
            <div className="space-y-3.5">
              {!hasPostMeetingContent ? (
                <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                    <Clock size={20} />
                  </span>
                  <div className="max-w-sm space-y-1">
                    <p className="m-0 text-[13px] font-semibold text-foreground">
                      Post-meeting review pending
                    </p>
                    <p className="m-0 text-[12px] leading-relaxed text-muted-foreground">
                      This review is currently{' '}
                      <span className="font-medium text-foreground">
                        {qbr.status}
                      </span>
                      . Complete it to record summary, health sentiment, and
                      action items.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={requestComplete}
                    className="h-[31.5px] bg-brand px-4 text-[12.25px] font-semibold text-brand-foreground hover:bg-brand-hover"
                  >
                    <CheckCircle2 size={13} className="mr-1.5" />
                    Complete QBR Review
                  </Button>
                </div>
              ) : (
                <>
                  <section className="overflow-hidden rounded-xl border border-border bg-white shadow-xs dark:bg-surface-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated/20 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded bg-brand/10 text-[11px] font-bold text-brand">
                          A
                        </span>
                        <h4 className="text-[13px] font-semibold text-foreground">
                          Executive Summary &amp; Health Check
                        </h4>
                      </div>
                      {postMeeting?.completedAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          Completed {formatDisplayDate(postMeeting.completedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-5">
                      <div className="sm:col-span-3">
                        <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          Meeting notes / executive summary
                        </Label>
                        <div className="min-h-[88px] rounded-md border border-border bg-surface-elevated/20 p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                          {postMeeting?.executiveSummary ||
                            qbr.discussionPoints?.join('\n\n') ||
                            'No summary notes recorded.'}
                        </div>
                      </div>

                      <div className="space-y-4 sm:col-span-2">
                        <div>
                          <Label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <HeartPulse size={12} className="text-rose-500" />
                            Partner health sentiment
                          </Label>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-semibold',
                              healthStyles.badge,
                            )}
                          >
                            <span
                              className={cn(
                                'size-2 rounded-full',
                                healthStyles.dot,
                              )}
                            />
                            {healthSentiment} ({postMeeting?.healthScore || 4}
                            /5)
                          </span>
                        </div>

                        <div>
                          <Label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <TrendingUp size={12} className="text-brand" />
                            Target achievement
                          </Label>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-semibold',
                              targetStatusStyle(targetStatus),
                            )}
                          >
                            <TrendingUp size={12} className="mr-1" />
                            {targetStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border bg-surface-elevated px-5 py-3 sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[12px] font-medium text-muted-foreground">
              Status
            </span>
            <Select value={qbr.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-[31.5px] w-[168px] border-border bg-white text-[12px] shadow-none dark:bg-surface-card">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        statusDot(qbr.status),
                      )}
                    />
                    {qbr.status}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="start"
                className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-[12px]"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', opt.dot)}
                      />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={requestComplete}
            className="h-[31.5px] shrink-0 bg-brand px-4 text-[12.25px] font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            <CheckCircle2 size={13} className="mr-1.5" />
            {isCompleted ? 'Edit Review' : 'Mark Completed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
