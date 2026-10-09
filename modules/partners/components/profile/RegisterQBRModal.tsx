'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CatalogFormField,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { FiscalPeriodFields } from '@/components/pipeline/FiscalPeriodFields';
import { UserSingleSelect } from '@/components/pipeline/ObserversMultiSelect';
import {
  resolveFiscalSessionDisplay,
  type FiscalYearWithSessions,
} from '@/components/pipeline/fiscal-session-display';
import { sortFiscalSessions } from '@/modules/sales-pipeline/pipeline-filter';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { formatUserName } from '@/lib/format-user-name';
import type { Partner, PartnerContact } from '../../types';
import { toast } from 'sonner';

export interface QbrSubmitData {
  partnerId: string;
  partnerName: string;
  /** Human-readable period label, e.g. "FY2026 · Q2". */
  period: string;
  sessionId?: string;
  meetingDate: string;
  meetingTime?: string;
  duration?: string;
  meetingOwner: string;
  meetingOwnerId?: string;
  partnerLead?: string;
  location?: string;
  agendaItems: string[];
  deckUrl?: string;
}

interface RegisterQBRModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner;
  onRegister: (data: QbrSubmitData) => void;
}

const DEFAULT_RECOMMENDED_TAGS = [
  'Pipeline Review',
  'Enablement Status',
  'GTM Strategy',
  'Target & Quota Review',
  'Deal Registrations',
  'Customer Escalations',
];

const DURATION_OPTIONS = ['30 min', '45 min', '60 min', '90 min', '120 min'];

const SELECT_MENU_CLASS =
  'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]';

const PARTNER_LEAD_NONE = '__none__';

function defaultMeetingDate(): string {
  const next = new Date();
  next.setDate(next.getDate() + 14);
  return next.toISOString().split('T')[0]!;
}

export function RegisterQBRModal({
  isOpen,
  onClose,
  partner,
  onRegister,
}: RegisterQBRModalProps) {
  const { fiscalYears, allSessions } = usePipelineFiscalSessions();
  const { data: platformUsersData } = useGetPlatformUsers(
    { page: 1, pageSize: 1000 },
    { enabled: isOpen },
  );
  const users = useMemo(
    () => platformUsersData?.data ?? [],
    [platformUsersData],
  );

  const yearsWithSessions = useMemo<FiscalYearWithSessions[]>(
    () =>
      fiscalYears
        .map((year) => ({
          ...year,
          sessions: sortFiscalSessions(year.sessions ?? []),
        }))
        .filter((year) => year.sessions.length > 0),
    [fiscalYears],
  );

  const contacts: PartnerContact[] = partner?.contacts ?? [];

  const [sessionId, setSessionId] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [duration, setDuration] = useState('60 min');
  const [meetingOwnerId, setMeetingOwnerId] = useState('');
  const [partnerLead, setPartnerLead] = useState('');
  const [location, setLocation] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const [agendaTags, setAgendaTags] = useState<string[]>([
    'Pipeline Review',
    'Enablement Status',
    'GTM Strategy',
  ]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !partner) return;

    setSessionId('');
    setMeetingDate(defaultMeetingDate());
    setMeetingTime('10:00');
    setDuration('60 min');
    setLocation('');
    setDeckUrl('');
    setCurrentTagInput('');
    setAgendaTags(['Pipeline Review', 'Enablement Status', 'GTM Strategy']);
    setIsSubmitting(false);
    setPeriodError(null);
    setDateError(null);
    setOwnerError(null);

    const primary = contacts.find((c) => c.isPrimary || c.role === 'Primary');
    setPartnerLead(primary?.name || '');
  }, [isOpen, partner?.id]);

  // Prefer matching the partner account manager once users load.
  useEffect(() => {
    if (!isOpen || meetingOwnerId || !users.length) return;
    const manager = (partner?.accountManager || '').trim().toLowerCase();
    if (!manager) return;
    const match = users.find((user) => {
      const name = formatUserName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name === manager || email === manager || name.includes(manager);
    });
    if (match) setMeetingOwnerId(match.id);
  }, [isOpen, meetingOwnerId, partner?.accountManager, users]);

  useEffect(() => {
    if (isOpen) return;
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
  }, [isOpen]);

  const handleAddTag = () => {
    const trimmed = currentTagInput.trim();
    if (trimmed && !agendaTags.includes(trimmed)) {
      setAgendaTags([...agendaTags, trimmed]);
      setCurrentTagInput('');
    }
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setAgendaTags(agendaTags.filter((t) => t !== tagToRemove));
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!agendaTags.includes(tag)) {
      setAgendaTags([...agendaTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextPeriodError = sessionId ? null : 'Select a fiscal period';
    const nextDateError = meetingDate ? null : 'Select a meeting date';
    const nextOwnerError = meetingOwnerId ? null : 'Select a meeting owner';
    setPeriodError(nextPeriodError);
    setDateError(nextDateError);
    setOwnerError(nextOwnerError);
    if (nextPeriodError || nextDateError || nextOwnerError) return;

    const periodDisplay =
      resolveFiscalSessionDisplay(sessionId, yearsWithSessions, allSessions)
        ?.primaryLabel || sessionId;

    const owner = users.find((user) => user.id === meetingOwnerId);
    const meetingOwner = owner
      ? formatUserName(owner)
      : partner.accountManager || 'Meeting owner';

    setIsSubmitting(true);
    try {
      onRegister({
        partnerId: partner.id,
        partnerName: partner.name,
        period: periodDisplay,
        sessionId,
        meetingDate,
        meetingTime,
        duration,
        meetingOwner,
        meetingOwnerId,
        partnerLead: partnerLead.trim() || undefined,
        location: location.trim() || undefined,
        agendaItems: agendaTags,
        deckUrl: deckUrl.trim() || undefined,
      });
      toast.success(`QBR scheduled for ${partner.name}`);
      onClose();
    } catch {
      toast.error('Failed to register QBR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSubmitting && !open) return;
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogHeader className="space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                Register &amp; schedule QBR
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Schedule a quarterly review for {partner.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <CatalogFormField
              label="Period / quarter"
              required
              error={periodError ?? undefined}
            >
              <FiscalPeriodFields
                sessionId={sessionId}
                onSessionIdChange={(id) => {
                  setSessionId(id);
                  if (periodError) setPeriodError(null);
                }}
                hideLabel
                className="space-y-0"
                controlClassName={catalogControlClass}
              />
            </CatalogFormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CatalogFormField
                label="Meeting date"
                required
                error={dateError ?? undefined}
              >
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => {
                    setMeetingDate(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  className={catalogControlClass}
                />
              </CatalogFormField>

              <CatalogFormField label="Start time">
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className={catalogControlClass}
                />
              </CatalogFormField>

              <CatalogFormField label="Duration">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className={catalogControlClass}>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_MENU_CLASS}>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CatalogFormField>
            </div>

            <CatalogFormField
              label="Meeting owner"
              required
              error={ownerError ?? undefined}
            >
              <UserSingleSelect
                users={users}
                value={meetingOwnerId}
                onChange={(userId) => {
                  setMeetingOwnerId(userId);
                  if (ownerError) setOwnerError(null);
                }}
                placeholder="Select internal owner"
                allowClear={false}
              />
            </CatalogFormField>

            <CatalogFormField label="Partner lead / counterpart">
              {contacts.length > 0 ? (
                <Select
                  value={partnerLead || PARTNER_LEAD_NONE}
                  onValueChange={(value) =>
                    setPartnerLead(value === PARTNER_LEAD_NONE ? '' : value)
                  }
                >
                  <SelectTrigger className={catalogControlClass}>
                    <SelectValue placeholder="Select attendee" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_MENU_CLASS}>
                    <SelectItem value={PARTNER_LEAD_NONE}>None</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.name}>
                        {contact.name}
                        {contact.role ? ` (${contact.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={partnerLead}
                  onChange={(e) => setPartnerLead(e.target.value)}
                  placeholder="e.g. Tariq Mansoor"
                  className={catalogControlClass}
                />
              )}
            </CatalogFormField>

            <CatalogFormField
              label="Location / meeting link"
              hint="Meet link, Zoom URL, or room name"
            >
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="https://meet.google.com/… or Boardroom A"
                className={catalogControlClass}
              />
            </CatalogFormField>

            <CatalogFormField label="Agenda topics">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={currentTagInput}
                    onChange={(e) => setCurrentTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    placeholder="Type a topic and press Enter"
                    className={`${catalogControlClass} flex-1`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    className="h-9 shrink-0"
                  >
                    <Plus size={13} className="mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-border bg-white p-2 dark:bg-surface-card">
                  {agendaTags.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      No topics yet. Add one or pick a suggestion below.
                    </span>
                  ) : (
                    agendaTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="rounded p-0.5 hover:bg-brand/10"
                          aria-label={`Remove ${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Suggested:
                  </span>
                  {DEFAULT_RECOMMENDED_TAGS.filter(
                    (tag) => !agendaTags.includes(tag),
                  )
                    .slice(0, 4)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddSuggestedTag(tag)}
                        className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            </CatalogFormField>

            <CatalogFormField label="Pre-read / slide deck link">
              <Input
                type="url"
                value={deckUrl}
                onChange={(e) => setDeckUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/…"
                className={catalogControlClass}
              />
            </CatalogFormField>
          </div>

          <DialogFooter className="rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule QBR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
