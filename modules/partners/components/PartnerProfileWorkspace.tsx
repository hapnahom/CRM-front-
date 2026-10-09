'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit2,
  ExternalLink,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Partner } from '../types';
import {
  partnerActivitiesToApi,
  partnerContactsToApi,
} from '@/store/server/features/partners/mappers';
import { exportPartnersTable } from '../utils/export-table';
import {
  useDeletePartner,
  useUpdatePartner,
} from '@/store/server/features/partners/mutations';
import { EditPartnerModal } from './profile/EditPartnerModal';
import { PartnerCommercialTargetsTab } from './profile/PartnerCommercialTargetsTab';
import { PartnerCapabilitiesTab } from './profile/PartnerCapabilitiesTab';
import { PartnerActivitiesTab } from './profile/PartnerActivitiesTab';
import { PartnerContactsTab } from './profile/PartnerContactsTab';
import {
  RegisterQBRModal,
  type QbrSubmitData,
} from './profile/RegisterQBRModal';
import { PartnerRoleBadges, normalizePartnerRoleIds } from '../roles';
import { usePartnerProductivityTask } from '../hooks/usePartnerProductivityTask';

type ProfileTab =
  | 'activities'
  | 'commercial-targets'
  | 'capabilities'
  | 'contacts';

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'activities', label: 'Activities' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'commercial-targets', label: 'Commercial & Targets' },
  { id: 'capabilities', label: 'Capabilities' },
];

interface PartnerProfileWorkspaceProps {
  partner: Partner;
  onBack: () => void;
  onUpdatePartner?: (updatedPartner: Partner) => void;
  /** Open the Register QBR modal on mount (e.g. "Schedule QBR" from the list). */
  openQbrOnMount?: boolean;
  onQbrModalClosed?: () => void;
}

export function PartnerProfileWorkspace({
  partner,
  onBack,
  onUpdatePartner,
  openQbrOnMount = false,
  onQbrModalClosed,
}: PartnerProfileWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('activities');
  const [isEditPartnerOpen, setIsEditPartnerOpen] = useState(false);
  const [isQbrModalOpen, setIsQbrModalOpen] = useState(openQbrOnMount);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Partner>(partner);
  const { createPartnerTask } = usePartnerProductivityTask(partner);

  React.useEffect(() => {
    setCurrentPartner(partner);
  }, [partner]);

  const handleRegisterQbr = (data: QbrSubmitData) => {
    const agendaText = data.agendaItems?.length
      ? `Agenda: ${data.agendaItems.join(', ')}.`
      : '';
    const details = [
      `Period: ${data.period}`,
      data.meetingTime
        ? `Time: ${data.meetingTime} (${data.duration || '60 min'})`
        : null,
      `Owner: ${data.meetingOwner}`,
      data.partnerLead ? `Partner Lead: ${data.partnerLead}` : null,
      data.location ? `Location: ${data.location}` : null,
      data.deckUrl ? `Deck: ${data.deckUrl}` : null,
      agendaText || null,
    ]
      .filter(Boolean)
      .join(' · ');

    const newActivity = {
      id: `act-qbr-${Date.now()}`,
      type: 'QBR' as const,
      title: `Quarterly Business Review (${data.period})`,
      description: details,
      timestamp: data.meetingDate || new Date().toISOString().split('T')[0],
      actor: data.meetingOwner,
    };

    const updated: Partner = {
      ...currentPartner,
      nextQBRDate: data.meetingDate,
      activities: [newActivity, ...(currentPartner.activities ?? [])],
    };

    void persistPartnerUpdate(updated);
    void createPartnerTask({
      title: newActivity.title,
      description: details,
      activityType: 'QBR',
      date: newActivity.timestamp,
      time: data.meetingTime,
    });
  };

  const roleIds = normalizePartnerRoleIds(currentPartner.roleIds);
  const deletePartner = useDeletePartner();
  const updatePartner = useUpdatePartner();

  const persistPartnerUpdate = async (updated: Partner) => {
    setCurrentPartner(updated);
    onUpdatePartner?.(updated);
    const primary =
      updated.contacts?.find((c) => c.isPrimary) ??
      updated.contacts?.[0] ??
      updated.primaryContact;
    try {
      await updatePartner.mutateAsync({
        id: updated.id,
        payload: {
          primaryContact: primary
            ? {
                name: primary.name,
                email: primary.email,
                phone: primary.phone,
                position: primary.position,
              }
            : null,
          contacts: partnerContactsToApi(updated.contacts ?? []),
          activities: partnerActivitiesToApi(updated.activities ?? []),
        },
      });
    } catch {
      toast.error('Failed to save partner changes');
    }
  };

  const handleExportProfile = () => {
    void exportPartnersTable(
      [
        {
          Partner: currentPartner.name,
          Tier: currentPartner.tier,
          Status: currentPartner.status,
          'Account Manager': currentPartner.accountManager || '—',
          'Primary Contact': currentPartner.primaryContact?.name || '—',
          Email: currentPartner.primaryContact?.email || '—',
          Phone: currentPartner.primaryContact?.phone || '—',
          Website: currentPartner.website || '—',
          Address: currentPartner.address || '—',
          Pipeline: currentPartner.pipelineValue ?? 0,
          Certifications: currentPartner.certifications?.length ?? 0,
        },
      ],
      `${currentPartner.name} profile`,
      'pdf',
      [
        `${currentPartner.name} — Partner Profile`,
        `Generated ${new Date().toLocaleString()}`,
      ],
    )
      .then(() => toast.success('Partner profile exported'))
      .catch(() => toast.error('Failed to export profile'));
  };

  const handleDeletePartner = async () => {
    try {
      await deletePartner.mutateAsync(currentPartner.id);
      toast.success('Partner deleted');
      setIsDeleteConfirmOpen(false);
      onBack();
    } catch {
      toast.error('Failed to delete partner');
    }
  };

  const websiteHost = partner.website
    ? partner.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white text-foreground">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Back to partner directory"
          >
            <ArrowLeft className="size-5" strokeWidth={2.25} />
          </Button>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-[20px] font-semibold text-foreground">
                {partner.name}
              </h1>
              <Badge
                variant="outline"
                className="text-muted-foreground"
                style={{
                  backgroundColor: partner.tierColor || undefined,
                  borderColor: partner.tierBorderColor || undefined,
                }}
              >
                {partner.tier || 'No tier'}
              </Badge>
              {partner.partnershipType ? (
                <Badge
                  variant="outline"
                  className="text-muted-foreground"
                  style={{
                    backgroundColor: partner.partnershipTypeColor || undefined,
                    borderColor:
                      partner.partnershipTypeBorderColor || undefined,
                  }}
                >
                  {partner.partnershipType}
                </Badge>
              ) : null}
              <PartnerRoleBadges roleIds={roleIds} />
            </div>
            <p className="m-0 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{partner.address || '—'}</span>
              {websiteHost ? (
                <>
                  <span>&bull;</span>
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-brand hover:underline"
                  >
                    {websiteHost} <ExternalLink className="size-2.5" />
                  </a>
                </>
              ) : null}
              <span>&bull;</span>
              <span>Managed by {partner.accountManager}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-[31.5px] w-[31.5px] border-border text-muted-foreground hover:text-foreground"
                aria-label="More partner actions"
              >
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => {
                  window.setTimeout(() => setIsEditPartnerOpen(true), 0);
                }}
              >
                <Edit2 size={13} className="mr-2" />
                Edit partner
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.setTimeout(() => setIsQbrModalOpen(true), 0);
                }}
              >
                <Calendar size={13} className="mr-2" />
                Schedule QBR
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportProfile}>
                <Download size={13} className="mr-2" />
                Export profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 size={13} className="mr-2" />
                Delete partner
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="w-full shrink-0 overflow-x-auto border-b border-border bg-white px-4 sm:px-6">
        <div className="flex min-w-max items-center gap-1">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto p-[10.5px] sm:p-[17.5px]">
        {activeTab === 'activities' && (
          <PartnerActivitiesTab
            partner={currentPartner}
            onScheduleQBR={() => setIsQbrModalOpen(true)}
            onUpdatePartner={(updated) => {
              void persistPartnerUpdate(updated);
            }}
          />
        )}
        {activeTab === 'commercial-targets' && (
          <PartnerCommercialTargetsTab
            partner={currentPartner}
            onPartnerUpdated={(updated) => {
              setCurrentPartner(updated);
              onUpdatePartner?.(updated);
            }}
            onSelectOpportunity={(rowType, id) => {
              const path =
                rowType === 'Lead'
                  ? 'leads'
                  : rowType === 'Customer'
                    ? 'customers'
                    : 'deals';
              window.open(
                `${window.location.origin}/sales-hub?tab=${path}`,
                '_blank',
                'noopener',
              );
              void id;
            }}
          />
        )}
        {activeTab === 'capabilities' && (
          <PartnerCapabilitiesTab partner={currentPartner} />
        )}
        {activeTab === 'contacts' && (
          <PartnerContactsTab
            partner={currentPartner}
            onUpdatePartner={(updated) => {
              void persistPartnerUpdate(updated);
            }}
          />
        )}
      </div>

      <EditPartnerModal
        isOpen={isEditPartnerOpen}
        partner={currentPartner}
        onClose={() => setIsEditPartnerOpen(false)}
        onSave={(updated) => {
          setCurrentPartner(updated);
          onUpdatePartner?.(updated);
          setIsEditPartnerOpen(false);
        }}
      />

      <RegisterQBRModal
        isOpen={isQbrModalOpen}
        partner={currentPartner}
        onClose={() => {
          setIsQbrModalOpen(false);
          onQbrModalClosed?.();
          const unlock = () => {
            document.body.style.pointerEvents = '';
            document.documentElement.style.pointerEvents = '';
          };
          unlock();
          window.setTimeout(unlock, 0);
          window.setTimeout(unlock, 250);
        }}
        onRegister={handleRegisterQbr}
      />

      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deletePartner.isLoading) setIsDeleteConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete partner</DialogTitle>
            <DialogDescription>
              Delete &quot;{currentPartner.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-border text-xs"
              disabled={deletePartner.isLoading}
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-8 text-xs font-medium"
              disabled={deletePartner.isLoading}
              onClick={() => void handleDeletePartner()}
            >
              {deletePartner.isLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
