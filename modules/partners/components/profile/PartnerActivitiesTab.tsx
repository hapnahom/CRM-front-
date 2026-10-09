'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Eye,
  FileText,
  HeartPulse,
  Mail,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  Partner,
  PartnerActivity,
  QBRMeeting,
  QBRPostMeetingData,
} from '../../types';
import { FILTER_TRIGGER_CLASS, Panel } from './shared';
import { QBRDetailModal } from './QBRDetailModal';
import { QBRPostMeetingModal } from './QBRPostMeetingModal';
import { usePartnerProductivityTask } from '../../hooks/usePartnerProductivityTask';

type ActivityFilter = 'all' | PartnerActivity['type'];

type ActivityDraft = {
  type: PartnerActivity['type'];
  title: string;
  description: string;
  date: string;
  addToTasks: boolean;
};

const EMPTY_ACTIVITY_DRAFT: ActivityDraft = {
  type: 'Meeting',
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  addToTasks: true,
};

function formatActivityDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // Date-only values (YYYY-MM-DD) → short date; full timestamps → locale string
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function activityTone(type: PartnerActivity['type']) {
  switch (type) {
    case 'Meeting':
      return {
        bg: 'bg-blue-50/70 border-blue-200',
        dot: 'bg-blue-600 border-blue-700 text-white',
        badge: 'bg-blue-100 text-blue-800',
        icon: <Calendar size={11} />,
      };
    case 'Call':
      return {
        bg: 'bg-emerald-50/70 border-emerald-200',
        dot: 'bg-emerald-600 border-emerald-700 text-white',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: <Phone size={11} />,
      };
    case 'Email':
      return {
        bg: 'bg-violet-50/70 border-violet-200',
        dot: 'bg-violet-600 border-violet-700 text-white',
        badge: 'bg-violet-100 text-violet-800',
        icon: <Mail size={11} />,
      };
    case 'QBR':
      return {
        bg: 'bg-orange-50/70 border-orange-200',
        dot: 'bg-brand border-brand text-white',
        badge: 'bg-brand-muted text-brand',
        icon: <CalendarCheck size={11} />,
      };
    case 'Deal Reg':
      return {
        bg: 'bg-orange-50/70 border-orange-200',
        dot: 'bg-orange-600 border-orange-700 text-white',
        badge: 'bg-orange-100 text-orange-800',
        icon: <FileText size={11} />,
      };
    case 'Cert':
      return {
        bg: 'bg-indigo-50/70 border-indigo-200',
        dot: 'bg-indigo-600 border-indigo-700 text-white',
        badge: 'bg-indigo-100 text-indigo-800',
        icon: <CheckCircle2 size={11} />,
      };
    case 'Note':
    default:
      return {
        bg: 'bg-surface-elevated border-border',
        dot: 'bg-slate-500 border-slate-600 text-white',
        badge: 'bg-slate-100 text-slate-700',
        icon: <MessageSquare size={11} />,
      };
  }
}

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

interface PartnerActivitiesTabProps {
  partner: Partner;
  onScheduleQBR?: () => void;
  onUpdatePartner?: (updated: Partner) => void;
}

export function PartnerActivitiesTab({
  partner,
  onScheduleQBR,
  onUpdatePartner,
}: PartnerActivitiesTabProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [search, setSearch] = useState('');
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityDraft, setActivityDraft] =
    useState<ActivityDraft>(EMPTY_ACTIVITY_DRAFT);

  const [selectedQbrForDetail, setSelectedQbrForDetail] =
    useState<QBRMeeting | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedQbrForCompletion, setSelectedQbrForCompletion] =
    useState<QBRMeeting | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const activities: PartnerActivity[] = partner.activities ?? [];
  const { createPartnerTask, isCreatingTask } =
    usePartnerProductivityTask(partner);

  const partnerQbrs: QBRMeeting[] = useMemo(() => {
    if (partner.qbrs && partner.qbrs.length > 0) {
      return partner.qbrs;
    }
    return [
      {
        id: `qbr-${partner.id}-upcoming`,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerRoleIds: partner.roleIds || [],
        reviewPeriod: 'Q2 FY2026',
        meetingDate: partner.nextQBRDate || '2026-06-15',
        meetingTime: '14:00',
        duration: '60m',
        location: 'https://meet.google.com/qbr-partner-review',
        participants: [
          partner.accountManager || 'Account Manager',
          partner.primaryContact?.name || 'Sarah Chen',
        ],
        performanceScore: partner.performanceScore || 85,
        status: partner.nextQBRDate ? 'Scheduled' : 'In Preparation',
        openActionsCount: 0,
        nextQBRDate: partner.nextQBRDate || '2026-06-15',
        owner: partner.accountManager || 'Account Manager',
        partnerLead: partner.primaryContact?.name || 'Sarah Chen',
        agenda: [
          'Quarterly Revenue Achievement vs Annual Target',
          'Partner Tier & Specialization Compliance',
          'Top 5 Joint Pipeline & Deal Registrations',
          'Executive Touchpoints & Joint Action Plan',
        ],
        actions: [],
      },
    ];
  }, [partner]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities.filter((activity) => {
      if (filter !== 'all' && activity.type !== filter) return false;
      if (!query) return true;
      return [activity.title, activity.description, activity.actor].some(
        (field) => field?.toLowerCase().includes(query),
      );
    });
  }, [activities, filter, search]);

  const handleOpenDetails = (qbr: QBRMeeting) => {
    // Let DropdownMenu finish closing before Dialog opens, or its scroll
    // lock can leave the page unresponsive (pointer-events: none on body).
    window.setTimeout(() => {
      setSelectedQbrForDetail(qbr);
      setIsDetailModalOpen(true);
    }, 0);
  };

  const handleTriggerComplete = (qbr: QBRMeeting) => {
    window.setTimeout(() => {
      setSelectedQbrForCompletion(qbr);
      setIsCompletionModalOpen(true);
    }, 0);
  };

  const handleRequestCompleteFromDetail = (qbr: QBRMeeting) => {
    setIsDetailModalOpen(false);
    // Open completion after the detail Dialog releases its body lock.
    window.setTimeout(() => {
      setSelectedQbrForCompletion(qbr);
      setIsCompletionModalOpen(true);
    }, 150);
  };

  const releasePageInteraction = () => {
    const unlock = () => {
      document.body.style.pointerEvents = '';
      document.documentElement.style.pointerEvents = '';
    };
    unlock();
    window.setTimeout(unlock, 0);
    window.setTimeout(unlock, 250);
  };

  const handleDeleteActivity = (activityId: string) => {
    const updated: Partner = {
      ...partner,
      activities: (partner.activities ?? []).filter(
        (activity) => activity.id !== activityId,
      ),
    };
    onUpdatePartner?.(updated);
    toast.success('Activity deleted');
  };

  const handleDeleteQbr = (qbrId: string) => {
    const updated: Partner = {
      ...partner,
      qbrs: (partner.qbrs ?? []).filter((qbr) => qbr.id !== qbrId),
    };
    onUpdatePartner?.(updated);
    toast.success('QBR removed');
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityDraft.title.trim()) {
      toast.error('Activity title is required');
      return;
    }

    const newActivity: PartnerActivity = {
      id: `act-${Date.now()}`,
      type: activityDraft.type,
      title: activityDraft.title.trim(),
      description: activityDraft.description.trim(),
      timestamp: activityDraft.date || new Date().toISOString().split('T')[0],
      actor: partner.accountManager || 'Account Manager',
    };

    onUpdatePartner?.({
      ...partner,
      activities: [newActivity, ...activities],
    });
    if (activityDraft.addToTasks) {
      void createPartnerTask({
        title: newActivity.title,
        description: newActivity.description,
        activityType: newActivity.type,
        date: newActivity.timestamp,
      });
    }
    setActivityFormOpen(false);
    setActivityDraft({
      ...EMPTY_ACTIVITY_DRAFT,
      date: new Date().toISOString().slice(0, 10),
    });
    toast.success('Activity logged');
  };

  const handleSaveCompletedQbr = (
    qbrId: string,
    postMeetingData: QBRPostMeetingData,
  ) => {
    const updatedQbrs = partnerQbrs.map((q) => {
      if (q.id === qbrId) {
        return {
          ...q,
          status: 'Completed' as const,
          actions: postMeetingData.actionItems,
          postMeeting: postMeetingData,
        };
      }
      return q;
    });

    const qbrCompletionActivity: PartnerActivity = {
      id: `act-qbr-complete-${Date.now()}`,
      type: 'QBR',
      title: `QBR Completed (${postMeetingData.targetAchievementStatus})`,
      description: `Executive review concluded. Health: ${postMeetingData.healthSentiment} (${postMeetingData.healthScore}/5).`,
      timestamp: new Date().toISOString().split('T')[0],
      actor: postMeetingData.completedBy || partner.accountManager,
    };

    onUpdatePartner?.({
      ...partner,
      qbrs: updatedQbrs,
      activities: [qbrCompletionActivity, ...activities],
    });
  };

  const handleUpdateQbrFromDetail = (updated: QBRMeeting) => {
    const updatedQbrs = partnerQbrs.map((q) =>
      q.id === updated.id ? updated : q,
    );
    onUpdatePartner?.({
      ...partner,
      qbrs: updatedQbrs,
    });
    setSelectedQbrForDetail(updated);
  };

  const openLogActivity = () => {
    setActivityDraft({
      ...EMPTY_ACTIVITY_DRAFT,
      date: new Date().toISOString().slice(0, 10),
    });
    setActivityFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        {/* Activity timeline — matches Customers Journey Timeline */}
        <Panel className="flex flex-col p-0">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Activity Timeline
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filtered.length}{' '}
                  {filtered.length === 1 ? 'activity' : 'activities'}
                  {filter !== 'all' ? ` · ${filter}` : ''}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover"
                onClick={openLogActivity}
              >
                <Plus size={14} />
                Log activity
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search activities..."
                  className="h-8 border-border bg-white pl-9 text-xs shadow-none dark:bg-surface-card"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as ActivityFilter)}
              >
                <SelectTrigger
                  className={cn(FILTER_TRIGGER_CLASS, 'h-8 w-[132px]')}
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                >
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Meeting">Meetings</SelectItem>
                  <SelectItem value="Call">Calls</SelectItem>
                  <SelectItem value="Email">Emails</SelectItem>
                  <SelectItem value="QBR">QBRs</SelectItem>
                  <SelectItem value="Note">Notes</SelectItem>
                  <SelectItem value="Deal Reg">Deal registrations</SelectItem>
                  <SelectItem value="Cert">Certifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative px-4 py-4 sm:px-5">
            <div className="pointer-events-none absolute bottom-4 left-[27px] top-4 w-px bg-border sm:left-[31px]" />

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {activities.length === 0
                  ? 'No activities yet. Log the first touchpoint with this partner.'
                  : 'No activities match your search and filters.'}
              </p>
            ) : (
              <ol className="relative m-0 list-none space-y-3 p-0">
                {filtered.map((activity) => {
                  const tone = activityTone(activity.type);
                  return (
                    <li
                      key={activity.id}
                      className="group relative grid grid-cols-[28px_1fr] gap-3 sm:grid-cols-[32px_1fr]"
                    >
                      <div
                        className={cn(
                          'z-[1] grid size-7 place-items-center rounded-full border shadow-sm sm:size-8',
                          tone.dot,
                        )}
                      >
                        {tone.icon}
                      </div>

                      <div
                        className={cn(
                          'min-h-0 rounded-lg border px-3.5 py-3',
                          tone.bg,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm font-medium text-foreground">
                                {activity.title}
                              </strong>
                              <span
                                className={cn(
                                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                                  tone.badge,
                                )}
                              >
                                {activity.type}
                              </span>
                            </div>
                            {activity.description ? (
                              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted-foreground">
                                {activity.description}
                              </p>
                            ) : null}
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {activity.actor} ·{' '}
                              {formatActivityDate(activity.timestamp)}
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                                aria-label="Activity options"
                              >
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteActivity(activity.id)
                                }
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                              >
                                <Trash2 size={13} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Panel>

        {/* QBR sidebar */}
        <Panel className="flex flex-col p-0">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Quarterly Business Review
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {partnerQbrs.length}{' '}
              {partnerQbrs.length === 1 ? 'review' : 'reviews'} on record
            </p>
          </div>

          <ul className="m-0 list-none divide-y divide-border p-0">
            {partnerQbrs.map((qbr) => {
              const isCompleted = qbr.status === 'Completed';
              const postMeeting = qbr.postMeeting;

              return (
                <li key={qbr.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {qbr.reviewPeriod}
                        </h3>
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
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatActivityDate(qbr.meetingDate)}
                        {qbr.meetingTime ? ` · ${qbr.meetingTime}` : ''}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="QBR options"
                        >
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleOpenDetails(qbr)}
                        >
                          <Eye size={13} className="mr-2" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onScheduleQBR}>
                          <Pencil size={13} className="mr-2" />
                          Edit schedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteQbr(qbr.id)}
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
                        >
                          <Trash2 size={13} className="mr-2" />
                          Delete QBR
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Internal owner</dt>
                      <dd className="m-0 mt-0.5 font-medium text-foreground">
                        {qbr.owner || partner.accountManager}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Partner lead</dt>
                      <dd className="m-0 mt-0.5 font-medium text-foreground">
                        {qbr.partnerLead || partner.primaryContact?.name || '—'}
                      </dd>
                    </div>
                  </dl>

                  {isCompleted && postMeeting ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold',
                          postMeeting.healthSentiment === 'Green'
                            ? 'bg-emerald-50 text-emerald-700'
                            : postMeeting.healthSentiment === 'Amber'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700',
                        )}
                      >
                        <HeartPulse size={11} />
                        {postMeeting.healthSentiment} (
                        {postMeeting.healthScore || 4}/5)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        <TrendingUp size={11} />
                        {postMeeting.targetAchievementStatus}
                      </span>{' '}
                    </div>
                  ) : null}

                  {!isCompleted ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 h-8 w-full bg-brand text-xs text-brand-foreground hover:bg-brand-hover"
                      onClick={() => handleTriggerComplete(qbr)}
                    >
                      <CheckCircle2 size={13} className="mr-1.5" />
                      Complete QBR
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      <Dialog
        open={activityFormOpen}
        onOpenChange={(open) => {
          setActivityFormOpen(open);
          if (!open) releasePageInteraction();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
            <DialogDescription>
              Record a touchpoint on {partner.name}&apos;s activity timeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveActivity} className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="activity-title">Title</Label>
              <Input
                id="activity-title"
                value={activityDraft.title}
                onChange={(e) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="h-9 border-border"
                placeholder="Executive sync, pipeline review…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={activityDraft.type}
                  onValueChange={(value) =>
                    setActivityDraft((prev) => ({
                      ...prev,
                      type: value as PartnerActivity['type'],
                    }))
                  }
                >
                  <SelectTrigger className="h-9 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Call">Call</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="QBR">QBR</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="Deal Reg">Deal registration</SelectItem>
                    <SelectItem value="Cert">Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-date">Date</Label>
                <Input
                  id="activity-date"
                  type="date"
                  value={activityDraft.date}
                  onChange={(e) =>
                    setActivityDraft((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="h-9 border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-detail">Details</Label>
              <Textarea
                id="activity-detail"
                value={activityDraft.description}
                onChange={(e) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="min-h-[88px] border-border"
                placeholder="Notes, outcomes, or follow-ups…"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface-elevated/40 px-3 py-2.5">
              <Checkbox
                checked={activityDraft.addToTasks}
                onCheckedChange={(checked) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    addToTasks: checked === true,
                  }))
                }
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-[12.25px] font-medium text-foreground">
                  Add to Productivity tasks
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Creates a task due on the activity date in your task list.
                </span>
              </span>
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-border"
                onClick={() => setActivityFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingTask}
                className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                Save activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedQbrForDetail ? (
        <QBRDetailModal
          open={isDetailModalOpen}
          onOpenChange={(open) => {
            setIsDetailModalOpen(open);
            if (!open) releasePageInteraction();
          }}
          qbr={selectedQbrForDetail}
          onUpdateQBR={handleUpdateQbrFromDetail}
          onRequestComplete={handleRequestCompleteFromDetail}
        />
      ) : null}

      {selectedQbrForCompletion ? (
        <QBRPostMeetingModal
          open={isCompletionModalOpen}
          onOpenChange={(open) => {
            setIsCompletionModalOpen(open);
            if (!open) {
              setSelectedQbrForCompletion(null);
              releasePageInteraction();
            }
          }}
          qbr={selectedQbrForCompletion}
          onComplete={handleSaveCompletedQbr}
        />
      ) : null}
    </div>
  );
}
