'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';
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
import { FieldResponsibilityAssign } from '@/components/pipeline/FieldResponsibilityControls';
import { StageExpirationBanner } from '@/components/pipeline/StageExpirationBanner';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import { useEntityFieldValues } from '@/store/server/features/entity-fields/values';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import { useDealDetail } from '@/store/server/features/deals/detail/queries';
import type {
  PipelineDeal,
  PipelineStage,
} from '@/store/server/features/deals/pipeline/types';
import { formatMoney } from '@/modules/deals/components/deals-pipeline-utils';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { BoundOpportunitySolutions } from '@/modules/product-catalog/components/BoundOpportunitySolutions';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import { usePipelineFieldAccess } from '@/hooks/usePipelineFieldAccess';
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

function contactLabel(deal: {
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}) {
  const c = deal.contact;
  if (!c) return '—';
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  if (name) return name;
  return c.email || '—';
}

interface DealDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string | null;
  deal?: PipelineDeal | null;
  stages?: PipelineStage[];
}

export function DealDetailModal({
  open,
  onOpenChange,
  dealId,
  deal: dealFromList,
  stages = [],
}: DealDetailModalProps) {
  const detailQuery = useDealDetail(open && dealId ? dealId : '');
  const detail = detailQuery.data;
  const { canView, canEdit } = usePipelineFieldAccess('DEAL');

  const deal = useMemo((): PipelineDeal | null => {
    if (!dealId) return null;
    if (dealFromList && dealFromList.id === dealId) {
      return {
        ...dealFromList,
        ...(detail
          ? {
              name: detail.name || dealFromList.name,
              description: detail.description ?? dealFromList.description,
              status: detail.status || dealFromList.status,
              pendingApproval:
                detail.pendingApproval ?? dealFromList.pendingApproval,
              customer: detail.customer ?? dealFromList.customer,
              contact: detail.contact ?? dealFromList.contact,
              responsibleUser:
                detail.responsibleUser ?? dealFromList.responsibleUser,
              value: detail.value ?? dealFromList.value,
              currency:
                (detail.currency as PipelineDeal['currency']) ||
                dealFromList.currency,
              stageId: detail.stageId || dealFromList.stageId,
              stage:
                (detail.stage as PipelineStage | undefined) ??
                dealFromList.stage,
              stageEnteredAt:
                detail.stageEnteredAt ?? dealFromList.stageEnteredAt,
              stageExpiresAt:
                detail.stageExpiresAt ?? dealFromList.stageExpiresAt,
              stageExpired: detail.stageExpired ?? dealFromList.stageExpired,
              stageExpirationStatus:
                detail.stageExpirationStatus ??
                dealFromList.stageExpirationStatus,
              expectedClose: detail.expectedClose ?? dealFromList.expectedClose,
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
      stageExpiresAt: detail.stageExpiresAt ?? null,
      stageExpired: detail.stageExpired ?? false,
      stageExpirationStatus: detail.stageExpirationStatus,
      status: detail.status,
      pendingApproval: detail.pendingApproval,
      value: Number(detail.value) || 0,
      currency: (detail.currency as PipelineDeal['currency']) || 'ETB',
      baseValue: Number(detail.baseValue) || 0,
      expectedClose: detail.expectedClose ?? null,
      responsibleUserId: detail.responsibleUserId,
      responsibleUser: detail.responsibleUser ?? null,
      description: detail.description ?? null,
      sourceLeadId: detail.sourceLeadId,
      createdFromLead: detail.createdFromLead,
      leadConvertedAt: detail.leadConvertedAt,
    };
  }, [dealId, dealFromList, detail]);

  const stageId = deal?.stageId ?? null;
  const stageFieldsQuery = useFieldsForStage('DEAL', open ? stageId : null, {
    mode: 'detail',
  });
  const valuesQuery = useEntityFieldValues('DEAL', open ? dealId : null);

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

  const stageIndex = stages.findIndex((s) => s.id === deal?.stageId);
  const stage =
    (stageIndex >= 0 ? stages[stageIndex] : undefined) ?? deal?.stage;
  const stageAppearance = stage
    ? pipelineStageAppearance(stage, Math.max(0, stageIndex))
    : null;

  const responsible =
    deal?.responsibleUser?.name || deal?.responsibleUser?.email || '—';

  const isLoading =
    Boolean(open && dealId) &&
    !deal &&
    (detailQuery.isLoading || !detailQuery.isFetched);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border px-6 py-5 text-left">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="truncate text-[15px] leading-snug">
              {deal?.name || (isLoading ? 'Loading…' : dealUiLabel())}
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
              {deal?.pendingApproval ? (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-[11px] font-medium text-amber-800"
                >
                  Pending approval
                </Badge>
              ) : null}
              {isLeadsEnabled() && deal?.createdFromLead ? (
                <Badge
                  variant="outline"
                  className="border-violet-200 bg-violet-50 text-[11px] font-medium text-violet-800"
                >
                  Converted from lead
                </Badge>
              ) : null}
            </div>
            {deal ? (
              <StageExpirationBanner
                className="mt-2"
                stageEnteredAt={deal.stageEnteredAt}
                stageExpiresAt={deal.stageExpiresAt}
                stageExpired={deal.stageExpired}
                stageExpirationStatus={deal.stageExpirationStatus}
              />
            ) : null}
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
          ) : !deal ? (
            <p className="py-8 text-center text-sm text-red-600">
              {dealUiLabel()} not found.
            </p>
          ) : (
            <>
              {deal.pendingApproval ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  <Lock size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Awaiting approval</p>
                    <p className="text-xs text-amber-800">
                      This {dealUiLabel({ lowercase: true })} is locked until
                      the approval request is resolved.
                    </p>
                  </div>
                </div>
              ) : null}

              {isLeadsEnabled() && deal.createdFromLead && deal.sourceLeadId ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
                  <p className="font-medium">Converted from lead</p>
                  <p className="mt-0.5 text-xs text-violet-800">
                    This deal was created when a lead was converted.
                  </p>
                  <Link
                    href={`/leads/${deal.sourceLeadId}`}
                    className="mt-2 inline-block text-xs font-medium text-violet-900 underline underline-offset-2 hover:text-violet-950"
                    onClick={() => onOpenChange(false)}
                  >
                    View source lead
                  </Link>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow label="Customer">
                  {deal.customer?.accountName || '—'}
                </DetailRow>
                <DetailRow label="Contact">{contactLabel(deal)}</DetailRow>
                <DetailRow label="Value">
                  {formatMoney(deal.value, deal.currency)}
                </DetailRow>
                <DetailRow label="Currency">{deal.currency || '—'}</DetailRow>
                <DetailRow label="Stage">{stage?.name || '—'}</DetailRow>
                <DetailRow label="Status">{deal.status || '—'}</DetailRow>
                <DetailRow label="Responsible">{responsible}</DetailRow>
                {deal.expectedClose ? (
                  <DetailRow label="Expected close">
                    {String(deal.expectedClose).split('T')[0]}
                  </DetailRow>
                ) : null}
              </div>

              {deal.description ? (
                <DetailRow label="Description">
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {deal.description}
                  </p>
                </DetailRow>
              ) : null}

              <div className="border-t border-border pt-4">
                <BoundOpportunitySolutions
                  entityType="deal"
                  entityId={deal.id}
                  opportunityValue={Number(deal.value) || 0}
                  currency={deal.currency || 'USD'}
                />
              </div>

              {canView('customFields') ? (
                stageFieldsQuery.isLoading && stageId ? (
                  <p className="text-xs text-muted-foreground">
                    Loading custom fields…
                  </p>
                ) : stageFields.length > 0 ? (
                  <div className="space-y-4 border-t border-border pt-4">
                    <FieldResponsibilityAssign
                      layout="section"
                      sectionTitle="Custom fields"
                      sectionDescription="Use Assign below to set who fills a field and the due date."
                      fields={stageFields.map((field) => {
                        const meta = valuesQuery.data?.find(
                          (v) => v.entityFieldId === field.id,
                        );
                        return {
                          id: field.id,
                          label: field.label,
                          defaultDueDays: field.settings?.defaultDueDays,
                          allowResponsibleAssignee: Boolean(
                            field.settings?.allowResponsibleAssignee,
                          ),
                          allowDueDate: Boolean(field.settings?.allowDueDate),
                          meta,
                        };
                      })}
                      entityType="DEAL"
                      entityId={deal.id}
                      canReassign={canEdit('customFields')}
                      canEditDueAt={canEdit('customFields')}
                      ownerName={responsible === '—' ? null : responsible}
                      ownerUserId={
                        deal.responsibleUserId ??
                        deal.responsibleUser?.id ??
                        null
                      }
                    >
                      <EntityCustomFieldsForm
                        fields={stageFields}
                        values={customValues}
                        onChange={() => undefined}
                      />
                    </FieldResponsibilityAssign>
                  </div>
                ) : null
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 sm:justify-between">
          {dealId ? (
            <Button type="button" variant="ghost" asChild>
              <Link
                href={`/deals/${dealId}`}
                onClick={() => onOpenChange(false)}
              >
                Open full details
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
