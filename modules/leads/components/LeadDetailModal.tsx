'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Lock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EntityCustomFieldsForm } from '@/components/pipeline/EntityCustomFieldsForm';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import { useEntityFieldValues } from '@/store/server/features/entity-fields/values';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import { useLeadDetail } from '@/store/server/features/leads/detail/queries';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type { PipelineStage } from '@/store/server/features/leads/pipeline/types';
import { formatMoney } from '@/modules/leads/components/leads-pipeline-utils';
import { ConvertLeadModal } from '@/modules/leads/components/ConvertLeadModal';
import { BoundOpportunitySolutions } from '@/modules/product-catalog/components/BoundOpportunitySolutions';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import { FormModalSkeleton } from '@/components/loading/skeleton-screens';

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function contactLabel(lead: {
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}) {
  const c = lead.contact;
  if (!c) return '—';
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  if (name) return name;
  return c.email || '—';
}

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  /** Instant display from the board/list when available */
  lead?: PipelineLead | null;
  stages?: PipelineStage[];
  onConverted?: (result?: {
    dealId?: string;
    pendingApproval?: boolean;
  }) => void;
}

export function LeadDetailModal({
  open,
  onOpenChange,
  leadId,
  lead: leadFromList,
  stages = [],
  onConverted,
}: LeadDetailModalProps) {
  const [convertOpen, setConvertOpen] = useState(false);

  const detailQuery = useLeadDetail(open && leadId ? leadId : '');
  const detail = detailQuery.data;

  const lead = useMemo((): PipelineLead | null => {
    if (!leadId) return null;
    if (leadFromList && leadFromList.id === leadId) {
      return {
        ...leadFromList,
        ...(detail
          ? {
              name: detail.name || leadFromList.name,
              description: detail.description ?? leadFromList.description,
              status: detail.status ?? leadFromList.status,
              pendingApproval:
                detail.pendingApproval ?? leadFromList.pendingApproval,
              convertedAt: detail.convertedAt ?? leadFromList.convertedAt,
              convertedDealId:
                detail.convertedDealId ?? leadFromList.convertedDealId,
              customer: detail.customer ?? leadFromList.customer,
              contact: detail.contact ?? leadFromList.contact,
              responsibleUser:
                detail.responsibleUser ?? leadFromList.responsibleUser,
              value: detail.value ?? leadFromList.value,
              currency:
                (detail.currency as PipelineLead['currency']) ||
                leadFromList.currency,
              stageId: detail.stageId || leadFromList.stageId,
              stage:
                (detail.stage as PipelineStage | undefined) ??
                leadFromList.stage,
            }
          : {}),
      };
    }
    if (!detail) return null;
    return {
      id: detail.id,
      name: detail.name,
      customerId: detail.customerId,
      customer: detail.customer ?? null,
      contactId: detail.contactId,
      contact: detail.contact ?? null,
      stageId: detail.stageId,
      stage: detail.stage as PipelineStage | undefined,
      stageEnteredAt: detail.stageEnteredAt ?? '',
      status: detail.status ?? '—',
      pendingApproval: detail.pendingApproval,
      convertedAt: detail.convertedAt,
      convertedDealId: detail.convertedDealId,
      value: Number(detail.value) || 0,
      currency: (detail.currency as PipelineLead['currency']) || 'ETB',
      baseValue: Number(detail.baseValue) || 0,
      expectedClose: detail.expectedClose ?? null,
      responsibleUserId: detail.responsibleUserId,
      responsibleUser: detail.responsibleUser ?? null,
      description: detail.description ?? null,
    };
  }, [leadId, leadFromList, detail]);

  const stageId = lead?.stageId ?? null;
  const stageFieldsQuery = useFieldsForStage('LEAD', open ? stageId : null);
  const valuesQuery = useEntityFieldValues('LEAD', open ? leadId : null);

  const stageFields = useMemo(
    () =>
      (stageFieldsQuery.data ?? []).map((f) => ({
        ...apiResponseToConfig(f),
        readOnly: true,
      })),
    [stageFieldsQuery.data],
  );

  const customValues = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const row of valuesQuery.data ?? []) {
      out[row.entityFieldId] = row.value;
    }
    return out;
  }, [valuesQuery.data]);

  const stageIndex = stages.findIndex((s) => s.id === lead?.stageId);
  const stage =
    (stageIndex >= 0 ? stages[stageIndex] : undefined) ?? lead?.stage;
  const stageAppearance = stage
    ? pipelineStageAppearance(stage, Math.max(0, stageIndex))
    : null;

  const isConverted =
    Boolean(lead?.convertedAt || lead?.convertedDealId) ||
    lead?.status === 'Converted';
  const canConvert =
    Boolean(stage?.isConversion) && !isConverted && !lead?.pendingApproval;

  const responsible =
    lead?.responsibleUser?.name || lead?.responsibleUser?.email || '—';

  const isLoading =
    Boolean(open && leadId) &&
    !lead &&
    (detailQuery.isLoading || !detailQuery.isFetched);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setConvertOpen(false);
          onOpenChange(next);
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border px-6 py-5 text-left">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="truncate text-[15px] leading-snug">
                {lead?.name || (isLoading ? 'Loading…' : 'Lead')}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                {stage && stageAppearance ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border px-2 py-0 text-[11px] font-medium"
                    style={{
                      backgroundColor: stageAppearance.backgroundColor,
                      borderColor: stageAppearance.borderColor,
                    }}
                  >
                    {stage.name}
                  </Badge>
                ) : null}
                {lead?.pendingApproval ? (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-[11px] font-medium text-amber-800"
                  >
                    Pending approval
                  </Badge>
                ) : null}
                {isConverted ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-[11px] font-medium text-emerald-800"
                  >
                    Converted
                  </Badge>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X size={15} />
            </Button>
          </DialogHeader>

          <div
            className="space-y-5 overflow-y-auto px-6 py-5 scrollbar-hide"
            style={{ maxHeight: 'calc(90vh - 160px)' }}
          >
            {isLoading ? (
              <div className="overflow-hidden py-2">
                <FormModalSkeleton fields={6} />
              </div>
            ) : !lead ? (
              <p className="py-8 text-center text-sm text-red-600">
                Lead not found.
              </p>
            ) : (
              <>
                {lead.pendingApproval ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    <Lock size={15} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Awaiting approval</p>
                      <p className="text-xs text-amber-800">
                        This lead is locked until the approval request is
                        resolved. Conversion is disabled.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailRow label="Customer">
                    {lead.customer?.accountName || '—'}
                  </DetailRow>
                  <DetailRow label="Contact">{contactLabel(lead)}</DetailRow>
                  <DetailRow label="Value">
                    {formatMoney(lead.value, lead.currency)}
                  </DetailRow>
                  <DetailRow label="Currency">{lead.currency || '—'}</DetailRow>
                  <DetailRow label="Stage">{stage?.name || '—'}</DetailRow>
                  <DetailRow label="Status">{lead.status || '—'}</DetailRow>
                  <DetailRow label="Responsible">{responsible}</DetailRow>
                </div>

                {lead.description ? (
                  <DetailRow label="Description">
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {lead.description}
                    </p>
                  </DetailRow>
                ) : null}

                <div className="border-t border-border pt-4">
                  <BoundOpportunitySolutions
                    entityType="lead"
                    entityId={lead.id}
                    opportunityValue={Number(lead.value) || 0}
                    currency={lead.currency || 'USD'}
                  />
                </div>

                {stageFieldsQuery.isLoading && stageId ? (
                  <p className="text-xs text-muted-foreground">
                    Loading custom fields…
                  </p>
                ) : stageFields.length > 0 ? (
                  <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      Custom fields
                    </p>
                    <EntityCustomFieldsForm
                      fields={stageFields}
                      values={customValues}
                      onChange={() => undefined}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {stage?.isConversion && !isConverted && lead ? (
              <Button
                type="button"
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                disabled={!canConvert}
                title={
                  lead.pendingApproval
                    ? 'Cannot convert while pending approval'
                    : undefined
                }
                onClick={() => setConvertOpen(true)}
              >
                <ArrowUpRight size={14} className="mr-1.5" />
                Convert to deal
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lead && convertOpen ? (
        <ConvertLeadModal
          open={convertOpen}
          onOpenChange={setConvertOpen}
          lead={lead}
          onConverted={(result) => {
            setConvertOpen(false);
            onOpenChange(false);
            onConverted?.(result);
          }}
        />
      ) : null}
    </>
  );
}
