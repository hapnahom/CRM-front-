'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bold,
  CheckCircle2,
  HeartPulse,
  Italic,
  List,
  ListOrdered,
  Star,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  QBRPostMeetingData,
} from '../../types';

interface QBRPostMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qbr: QBRMeeting;
  onComplete: (qbrId: string, data: QBRPostMeetingData) => void;
}

const FIELD =
  'h-[31.5px] border-border bg-white text-[12.25px] shadow-none dark:bg-surface-card';

const SELECT_CONTENT =
  'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]';

const SENTIMENT_OPTIONS = [
  {
    val: 'Green' as const,
    score: 5,
    label: 'Healthy',
    dot: 'bg-emerald-500',
    selected:
      'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-400/20',
    hover: 'hover:bg-emerald-50/60 hover:border-emerald-300',
  },
  {
    val: 'Amber' as const,
    score: 3,
    label: 'At Risk',
    dot: 'bg-amber-500',
    selected:
      'bg-amber-50 text-amber-800 border-amber-500 ring-2 ring-amber-400/20',
    hover: 'hover:bg-amber-50/60 hover:border-amber-300',
  },
  {
    val: 'Red' as const,
    score: 1,
    label: 'Critical',
    dot: 'bg-red-500',
    selected: 'bg-red-50 text-red-800 border-red-500 ring-2 ring-red-400/20',
    hover: 'hover:bg-red-50/60 hover:border-red-300',
  },
];

export function QBRPostMeetingModal({
  open,
  onOpenChange,
  qbr,
  onComplete,
}: QBRPostMeetingModalProps) {
  const [notes, setNotes] = useState(qbr.postMeeting?.executiveSummary || '');
  const [sentiment, setSentiment] = useState<PartnerHealthSentiment | ''>(
    qbr.postMeeting?.healthSentiment || '',
  );
  const [healthScore, setHealthScore] = useState<number>(
    qbr.postMeeting?.healthScore || 4,
  );
  const [targetStatus, setTargetStatus] = useState<
    TargetAchievementStatus | ''
  >(qbr.postMeeting?.targetAchievementStatus || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setNotes(qbr.postMeeting?.executiveSummary || '');
    setSentiment(qbr.postMeeting?.healthSentiment || '');
    setHealthScore(qbr.postMeeting?.healthScore || 4);
    setTargetStatus(qbr.postMeeting?.targetAchievementStatus || '');
    setErrors({});
  }, [open, qbr.id]);

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

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById(
      'qbr-exec-summary',
    ) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText =
      text.substring(0, start) + replacement + text.substring(end);
    setNotes(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + replacement.length - suffix.length,
      );
    }, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!notes.trim()) {
      newErrors.notes = 'Executive summary & meeting notes are required.';
    }
    if (!sentiment) {
      newErrors.sentiment = 'Partner health / sentiment is required.';
    }
    if (!targetStatus) {
      newErrors.targetStatus = 'Target achievement status is required.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onComplete(qbr.id, {
      executiveSummary: notes.trim(),
      healthSentiment: sentiment as PartnerHealthSentiment,
      healthScore,
      targetAchievementStatus: targetStatus as TargetAchievementStatus,
      actionItems: [],
      completedAt: new Date().toISOString().split('T')[0],
      completedBy: qbr.owner || 'Partner Account Manager',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onPointerDownOutside={(e) => {
          if (Object.keys(errors).length > 0) e.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="text-[16px] font-semibold">
            Complete Quarterly Business Review
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {qbr.partnerName} · {qbr.reviewPeriod}. Record executive summary and
            health sentiment before marking completed.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {Object.keys(errors).length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-[12px] text-red-800">
                <div className="mb-1.5 flex items-center gap-2 font-semibold text-red-700">
                  <AlertCircle size={14} />
                  <span>Cannot save — fix the following:</span>
                </div>
                <ul className="list-inside list-disc space-y-0.5 pl-1 text-[11px]">
                  {Object.values(errors)
                    .filter(Boolean)
                    .map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                </ul>
              </div>
            ) : null}

            {/* Section A */}
            <section className="overflow-hidden rounded-xl border border-border bg-white shadow-xs dark:bg-surface-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated/20 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-brand/10 text-[11px] font-bold text-brand">
                    A
                  </span>
                  <h3 className="text-[13px] font-semibold text-foreground">
                    Executive Summary &amp; Health Check
                  </h3>
                </div>
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
                <div className="space-y-2 p-4 lg:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label
                      htmlFor="qbr-exec-summary"
                      className="text-[12px] font-medium text-foreground"
                    >
                      Executive summary / meeting notes
                      <span className="text-destructive"> *</span>
                    </Label>
                    <div className="flex items-center gap-0.5 rounded border border-border bg-surface-elevated/80 px-1 py-0.5 text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**')}
                        className="rounded p-1 transition hover:bg-white hover:text-foreground"
                        title="Bold"
                      >
                        <Bold size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*')}
                        className="rounded p-1 transition hover:bg-white hover:text-foreground"
                        title="Italic"
                      >
                        <Italic size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('\n• ')}
                        className="rounded p-1 transition hover:bg-white hover:text-foreground"
                        title="Bullet list"
                      >
                        <List size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('\n1. ')}
                        className="rounded p-1 transition hover:bg-white hover:text-foreground"
                        title="Numbered list"
                      >
                        <ListOrdered size={11} />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    id="qbr-exec-summary"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      if (errors.notes)
                        setErrors((prev) => ({ ...prev, notes: '' }));
                    }}
                    rows={7}
                    placeholder="Capture discussion points, blockers, opportunities, and executive feedback..."
                    className={cn(
                      'resize-none border-border bg-white text-[12.25px] shadow-none dark:bg-surface-card',
                      errors.notes &&
                        'border-destructive focus-visible:ring-destructive/30',
                    )}
                  />
                  {errors.notes ? (
                    <p className="m-0 text-[11px] text-destructive">
                      {errors.notes}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4 p-4 lg:col-span-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-[12px] font-medium text-foreground">
                      <HeartPulse size={12} className="text-rose-500" />
                      Partner health / sentiment
                      <span className="text-destructive"> *</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SENTIMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            setSentiment(opt.val);
                            setHealthScore(opt.score);
                            setErrors((prev) => ({ ...prev, sentiment: '' }));
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-lg border py-2 text-[12px] font-medium transition',
                            sentiment === opt.val
                              ? opt.selected
                              : `border-border bg-surface-elevated/30 text-muted-foreground ${opt.hover}`,
                          )}
                        >
                          <span
                            className={cn(
                              'mb-1 size-2.5 rounded-full',
                              opt.dot,
                            )}
                          />
                          <span className="text-[11px] font-bold">
                            {opt.val}
                          </span>
                          <span className="text-[10px] opacity-75">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="mr-0.5 text-[11px] text-muted-foreground">
                        Score:
                      </span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setHealthScore(star);
                            if (star >= 4) setSentiment('Green');
                            else if (star === 3) setSentiment('Amber');
                            else setSentiment('Red');
                            setErrors((prev) => ({ ...prev, sentiment: '' }));
                          }}
                          className="p-0.5 transition hover:text-amber-400"
                        >
                          <Star
                            size={15}
                            className={cn(
                              star <= healthScore
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30',
                            )}
                          />
                        </button>
                      ))}
                      {sentiment ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          {healthScore}/5
                        </span>
                      ) : null}
                    </div>
                    {errors.sentiment ? (
                      <p className="m-0 text-[11px] text-destructive">
                        {errors.sentiment}
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-border/60" />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-[12px] font-medium text-foreground">
                      <TrendingUp size={12} className="text-brand" />
                      Target achievement status
                      <span className="text-destructive"> *</span>
                    </Label>
                    <Select
                      value={targetStatus}
                      onValueChange={(val) => {
                        setTargetStatus(val as TargetAchievementStatus);
                        setErrors((prev) => ({ ...prev, targetStatus: '' }));
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          FIELD,
                          'w-full',
                          errors.targetStatus &&
                            'border-destructive focus:ring-destructive/30',
                        )}
                      >
                        <SelectValue placeholder="Select vs goals..." />
                      </SelectTrigger>
                      <SelectContent align="start" className={SELECT_CONTENT}>
                        <SelectItem value="Exceeded" className="text-xs">
                          Exceeded (over 100%)
                        </SelectItem>
                        <SelectItem value="On Track" className="text-xs">
                          On Track (within variance)
                        </SelectItem>
                        <SelectItem value="Behind Target" className="text-xs">
                          Behind Target (action needed)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="m-0 text-[11px] leading-snug text-muted-foreground">
                      Revenue &amp; delivery milestones vs. quarterly partner
                      agreement.
                    </p>
                    {errors.targetStatus ? (
                      <p className="m-0 text-[11px] text-destructive">
                        {errors.targetStatus}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-surface-elevated px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <Button
              type="submit"
              className="h-[31.5px] bg-brand px-4 text-[12.25px] font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              <CheckCircle2 size={13} className="mr-1.5" />
              Save &amp; Complete QBR
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
