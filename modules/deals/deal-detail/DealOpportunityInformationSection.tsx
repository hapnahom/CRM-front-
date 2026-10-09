'use client';

import { FileText, GitBranch, Layers, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DetailSection } from '@/components/entity-detail';
import { FiscalPeriodFields } from '@/components/pipeline/FiscalPeriodFields';
import { FiscalSessionBadge } from '@/components/pipeline/FiscalSessionBadge';
import {
  OpportunityOriginatorField,
  OriginatorSummaryLabel,
  type OpportunityOriginatorValue,
} from '@/components/pipeline/OpportunityOriginatorField';
import {
  PipelineStageOptionLabel,
  PipelineStageSelect,
} from '@/components/pipeline/PipelineStageSelect';
import type { PipelineStage } from '@/modules/pipeline/types';
import { cn } from '@/lib/utils';
import { dealUiLabel } from '@/config/salesWorkflow';
import type { MarketingCampaign } from '@/store/server/features/marketing/types';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import type { Partner } from '@/modules/partners/types';
import type { CrmDeal } from './types';

type OpportunityTypeOption = { id: string; name: string };

function InfoTile({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const IconComponent = icon;
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-elevated/40 p-4',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <IconComponent className="size-3.5 shrink-0 opacity-80" aria-hidden />
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function DealOpportunityInformationSection({
  detailDraft,
  isEditing,
  coreEditable,
  stages,
  stage,
  stageIndex,
  previousStage,
  previousStageIndex,
  opportunityTypes,
  stageColorPresets,
  campaigns = [],
  users = [],
  partners = [],
  showCampaign = false,
  showPartner = false,
  onNameChange,
  onTypeChange,
  onSessionChange,
  onDescriptionChange,
  onStageChange,
  onOriginatorChange,
}: {
  detailDraft: CrmDeal;
  isEditing: boolean;
  coreEditable: boolean;
  stages: PipelineStage[];
  stage: PipelineStage | undefined;
  stageIndex: number;
  previousStage: PipelineStage | undefined;
  previousStageIndex: number;
  opportunityTypes: OpportunityTypeOption[];
  stageColorPresets: typeof import('@/lib/stage-presets').DEALS_STAGE_COLOR_PRESETS;
  campaigns?: MarketingCampaign[];
  users?: PlatformUser[];
  partners?: Partner[];
  showCampaign?: boolean;
  showPartner?: boolean;
  onNameChange: (name: string) => void;
  onTypeChange: (typeId: string, typeName: string) => void;
  onSessionChange: (sessionId: string) => void;
  onDescriptionChange: (description: string) => void;
  onStageChange: (stageId: string) => void;
  onOriginatorChange?: (next: OpportunityOriginatorValue) => void;
}) {
  const entityLabel = dealUiLabel();

  return (
    <DetailSection
      title={`${entityLabel} information`}
      description="Identity, pipeline position, and fiscal period"
      contentClassName="space-y-5"
    >
      <InfoTile
        icon={Tag}
        label={`${entityLabel} name`}
        className="sm:col-span-2"
      >
        {isEditing && coreEditable ? (
          <Input
            value={detailDraft.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-10 border-border bg-surface-card text-base font-medium"
          />
        ) : (
          <p className="text-base font-semibold tracking-tight text-foreground">
            {detailDraft.name || '—'}
          </p>
        )}
      </InfoTile>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoTile icon={Layers} label="Current stage">
          {isEditing && coreEditable ? (
            <PipelineStageSelect
              stages={stages}
              value={detailDraft.stageId}
              presets={stageColorPresets}
              onValueChange={onStageChange}
            />
          ) : stage ? (
            <PipelineStageOptionLabel
              stage={stage}
              index={Math.max(0, stageIndex)}
              presets={stageColorPresets}
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </InfoTile>

        <InfoTile icon={GitBranch} label="Fiscal period">
          {isEditing && coreEditable ? (
            <FiscalPeriodFields
              sessionId={detailDraft.sessionId ?? ''}
              onSessionIdChange={onSessionChange}
              autoSelectCurrent={false}
              required={false}
              hideLabel
              controlClassName="h-9 border-border bg-surface-card"
            />
          ) : (
            <FiscalSessionBadge sessionId={detailDraft.sessionId} />
          )}
        </InfoTile>
      </div>

      {(opportunityTypes.length > 0 || previousStage) && (
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          {opportunityTypes.length > 0 ? (
            <MetaItem
              label="Type"
              value={
                isEditing && coreEditable ? (
                  <Select
                    value={detailDraft.typeId || '__none__'}
                    onValueChange={(v) => {
                      const typeId = v === '__none__' ? '' : v;
                      const typeName =
                        opportunityTypes.find((t) => t.id === typeId)?.name ??
                        '';
                      onTypeChange(typeId, typeName);
                    }}
                  >
                    <SelectTrigger className="h-9 border-border bg-surface-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {opportunityTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  detailDraft.typeName || '—'
                )
              }
            />
          ) : null}

          {previousStage ? (
            <MetaItem
              label="Previous stage"
              value={
                <PipelineStageOptionLabel
                  stage={previousStage}
                  index={Math.max(0, previousStageIndex)}
                  presets={stageColorPresets}
                />
              }
            />
          ) : null}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <MetaItem
          label="Originated from"
          value={
            isEditing && coreEditable && onOriginatorChange ? (
              <OpportunityOriginatorField
                value={
                  {
                    originatorType: (detailDraft.originatorType ||
                      '') as OpportunityOriginatorValue['originatorType'],
                    campaignId: detailDraft.campaignId || '',
                    originatorUserId: detailDraft.originatorUserId || '',
                    originatorPartnerId: detailDraft.originatorPartnerId || '',
                  } satisfies OpportunityOriginatorValue
                }
                onChange={onOriginatorChange}
                campaigns={campaigns}
                users={users}
                partners={partners}
                showCampaign={showCampaign}
                showPartner={showPartner}
                controlClassName="h-9 border-border bg-surface-card"
              />
            ) : (
              <OriginatorSummaryLabel
                type={
                  detailDraft.originatorType === 'CAMPAIGN' ||
                  detailDraft.originatorType === 'USER' ||
                  detailDraft.originatorType === 'PARTNER'
                    ? detailDraft.originatorType
                    : null
                }
                campaign={
                  detailDraft.campaignName
                    ? { name: detailDraft.campaignName }
                    : null
                }
                user={
                  detailDraft.originatorUserId
                    ? {
                        name: detailDraft.originatorUserName,
                        avatarUrl: detailDraft.originatorUserAvatarUrl,
                      }
                    : null
                }
                partner={
                  detailDraft.originatorPartnerId
                    ? {
                        name: detailDraft.originatorPartnerName || 'Partner',
                        tier: detailDraft.originatorPartnerTier,
                      }
                    : null
                }
              />
            )
          }
        />
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="size-3.5 shrink-0 opacity-80" aria-hidden />
          Description
        </div>
        {isEditing && coreEditable ? (
          <Textarea
            value={detailDraft.description ?? ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="min-h-[96px] border-border bg-surface-card"
            placeholder={`Add context about this ${dealUiLabel({ lowercase: true })}…`}
          />
        ) : detailDraft.description?.trim() ? (
          <div className="rounded-lg border border-border/70 bg-surface-elevated/30 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {detailDraft.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No description added.</p>
        )}
      </div>
    </DetailSection>
  );
}
