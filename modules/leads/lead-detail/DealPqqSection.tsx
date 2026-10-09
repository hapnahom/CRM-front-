'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  type DealPqq,
  type DealPqqBant,
  type PqqBantAuthorityTier,
  type PqqBantBudgetTier,
  type PqqBantNeedTier,
  type PqqBantTimelineTier,
  PQQ_BANT_DEFAULT_SCORES,
  PQQ_DECISION_THRESHOLD,
  PQQ_MAX_TOTAL,
  clampPqqScore,
  computeDealPqqTotal,
} from './data/pqqData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function BantRow({
  label,
  tierValue,
  tierOptions,
  score,
  notes,
  onTierChange,
  onScoreChange,
  onNotesChange,
}: {
  label: string;
  tierValue: string;
  tierOptions: { value: string; label: string }[];
  score: number;
  notes: string;
  onTierChange: (v: string) => void;
  onScoreChange: (n: number) => void;
  onNotesChange: (s: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-3 space-y-2">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Criteria band
          </Label>
          <Select value={tierValue} onValueChange={onTierChange}>
            <SelectTrigger className="mt-1 h-9 border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tierOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Score (0–12)
          </Label>
          <Input
            type="number"
            min={0}
            max={12}
            value={String(score)}
            onChange={(e) => onScoreChange(Number(e.target.value) || 0)}
            className="mt-1 h-9 border-border text-xs"
          />
        </div>
        <div className="sm:col-span-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Notes
          </Label>
          <Input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="mt-1 h-9 border-border text-xs"
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  );
}

export function DealPqqSection({
  value,
  onChange,
  className,
  hideHeader,
  showOnly,
  compact,
  decisionThreshold = PQQ_DECISION_THRESHOLD,
}: {
  value: DealPqq;
  onChange: (next: DealPqq) => void;
  className?: string;
  /** Tighter spacing for dialogs */
  compact?: boolean;
  hideHeader?: boolean;
  showOnly?: 'discovery' | 'bant';
  decisionThreshold?: number;
}) {
  const patch = (partial: Partial<DealPqq>) =>
    onChange({ ...value, ...partial });
  const patchBant = (partial: Partial<DealPqqBant>) =>
    onChange({ ...value, bant: { ...value.bant, ...partial } });

  const total = computeDealPqqTotal(value.bant);
  const meetsThreshold = total >= decisionThreshold;

  const gap = compact ? 'gap-3' : 'gap-4';

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-card',
        className,
      )}
    >
      {!hideHeader && (
        <div className="border-b border-border bg-surface-elevated px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Lead Discovery &amp; PQQ
              </h3>
              <p className="text-xs text-muted-foreground">
                Qualify the opportunity (BANT) while capturing discovery context
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  meetsThreshold
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
                )}
              >
                BANT total: {total} / {PQQ_MAX_TOTAL}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {meetsThreshold
                  ? '≥ threshold — Proceed'
                  : 'Below threshold — Do not proceed'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={cn('p-3 sm:p-4', compact && 'p-3')}>
        {showOnly === 'discovery' ? (
          <div className={cn('space-y-4', gap)}>
            {discoveryContent(value, patch, patchBant, gap)}
          </div>
        ) : showOnly === 'bant' ? (
          <div className={cn('space-y-3', gap)}>
            {bantContent(
              value,
              patch,
              patchBant,
              gap,
              total,
              meetsThreshold,
              decisionThreshold,
            )}
          </div>
        ) : (
          <Tabs defaultValue="discovery" className="w-full">
            <TabsList className="mb-3 h-9 w-full justify-start sm:w-auto">
              <TabsTrigger value="discovery" className="text-xs">
                Discovery
              </TabsTrigger>
              <TabsTrigger value="bant" className="text-xs">
                BANT &amp; validation
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="discovery"
              className={cn('mt-0 space-y-4 outline-none', gap)}
            >
              {discoveryContent(value, patch, patchBant, gap)}
            </TabsContent>

            <TabsContent
              value="bant"
              className={cn('mt-0 space-y-3 outline-none', gap)}
            >
              {bantContent(
                value,
                patch,
                patchBant,
                gap,
                total,
                meetsThreshold,
                decisionThreshold,
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function discoveryContent(
  value: DealPqq,
  patch: (partial: Partial<DealPqq>) => void,
  patchBant: (partial: Partial<DealPqqBant>) => void,
  gap: string,
) {
  return (
    <>
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', gap)}>
        <Field label="Owner (AE)">
          <Input
            value={value.owner}
            onChange={(e) => patch({ owner: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Reviewed by (STL)">
          <Input
            value={value.reviewedBy}
            onChange={(e) => patch({ reviewedBy: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
      </div>

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        1. Opportunity information
      </p>
      <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', gap)}>
        <Field label="Opportunity name">
          <Input
            value={value.opportunityName}
            onChange={(e) => patch({ opportunityName: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Client name">
          <Input
            value={value.clientName}
            onChange={(e) => patch({ clientName: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Industry / sector">
          <Input
            value={value.industry}
            onChange={(e) => patch({ industry: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Contact person">
          <Input
            value={value.contactPerson}
            onChange={(e) => patch({ contactPerson: e.target.value })}
            className="h-9 border-border text-sm"
            placeholder="e.g. Not specified (via RFP)"
          />
        </Field>
      </div>
      <Field label="Opportunity description">
        <Textarea
          value={value.opportunityDescription}
          onChange={(e) => patch({ opportunityDescription: e.target.value })}
          className="min-h-[72px] border-border text-sm"
          placeholder="Scope, products, services…"
        />
      </Field>

      <div className="rounded-lg border border-border bg-surface-elevated p-3">
        <p className="mb-2 text-xs font-medium text-foreground">
          Opportunity source
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['sourceDirectClient', 'Direct client request'],
              ['sourceTender', 'Tender / RFP'],
              ['sourcePartner', 'Partner'],
              ['sourceReferral', 'Referral'],
              ['sourceRenewal', 'Renewal / existing client'],
            ] as const
          ).map(([key, lab]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                checked={value[key]}
                onCheckedChange={(c) =>
                  patch({ [key]: c === true } as Partial<DealPqq>)
                }
              />
              {lab}
            </label>
          ))}
        </div>
        {value.sourceTender && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              For bids / RFP only
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={value.rfpPreviouslyWorked}
                onCheckedChange={(c) =>
                  patch({ rfpPreviouslyWorked: c === true })
                }
              />
              RFP we have previously worked on
            </label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={value.rfpNew}
                onCheckedChange={(c) => patch({ rfpNew: c === true })}
              />
              New RFP (no prior engagement)
            </label>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        2. Business need &amp; pain
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Problem">
          <Textarea
            value={value.problem}
            onChange={(e) => patch({ problem: e.target.value })}
            className="min-h-[64px] border-border text-sm"
          />
        </Field>
        <Field label="Why now">
          <Textarea
            value={value.whyNow}
            onChange={(e) => patch({ whyNow: e.target.value })}
            className="min-h-[64px] border-border text-sm"
          />
        </Field>
        <Field label="Impact if not solved">
          <Textarea
            value={value.impactIfNotSolved}
            onChange={(e) => patch({ impactIfNotSolved: e.target.value })}
            className="min-h-[64px] border-border text-sm"
          />
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        3. Current environment
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Existing systems">
          <Textarea
            value={value.existingSystems}
            onChange={(e) => patch({ existingSystems: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Current vendors">
          <Textarea
            value={value.currentVendors}
            onChange={(e) => patch({ currentVendors: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Limitations">
          <Textarea
            value={value.limitations}
            onChange={(e) => patch({ limitations: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        4. Requirements
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Expected solution">
          <Textarea
            value={value.expectedSolution}
            onChange={(e) => patch({ expectedSolution: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Preferred vendors">
          <Textarea
            value={value.preferredVendors}
            onChange={(e) => patch({ preferredVendors: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Key features">
          <Textarea
            value={value.keyFeatures}
            onChange={(e) => patch({ keyFeatures: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        5–7. Scope, timeline, budget
      </p>
      <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', gap)}>
        <Field label="Scope">
          <Textarea
            value={value.scope}
            onChange={(e) => patch({ scope: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Locations">
          <Textarea
            value={value.locations}
            onChange={(e) => patch({ locations: e.target.value })}
            className="min-h-14 border-border text-sm"
          />
        </Field>
        <Field label="Project size">
          <Input
            value={value.projectSize}
            onChange={(e) => patch({ projectSize: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Project start">
          <Input
            value={value.projectStart}
            onChange={(e) => patch({ projectStart: e.target.value })}
            className="h-9 border-border text-sm"
            placeholder="e.g. Within 3–6 months"
          />
        </Field>
        <Field label="Deadline / required completion">
          <Input
            value={value.deadline}
            onChange={(e) => patch({ deadline: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Budget status">
          <Input
            value={value.budgetStatus}
            onChange={(e) => patch({ budgetStatus: e.target.value })}
            className="h-9 border-border text-sm"
            placeholder="e.g. Not disclosed"
          />
        </Field>
        <Field label="Budget estimate">
          <Input
            value={value.budgetEstimate}
            onChange={(e) => patch({ budgetEstimate: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Approval">
          <Input
            value={value.approvalStatus}
            onChange={(e) => patch({ approvalStatus: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        8–10. Stakeholders, competition, risks
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Decision maker">
          <Input
            value={value.decisionMaker}
            onChange={(e) => patch({ decisionMaker: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Influencers">
          <Input
            value={value.influencers}
            onChange={(e) => patch({ influencers: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Approver">
          <Input
            value={value.approver}
            onChange={(e) => patch({ approver: e.target.value })}
            className="h-9 border-border text-sm"
          />
        </Field>
        <Field label="Competition">
          <Textarea
            value={value.competition}
            onChange={(e) => patch({ competition: e.target.value })}
            className="min-h-[48px] border-border text-sm"
          />
        </Field>
        <Field label="Opportunity stage">
          <Input
            value={value.opportunityStage}
            onChange={(e) => patch({ opportunityStage: e.target.value })}
            className="h-9 border-border text-sm"
            placeholder="e.g. Formal tender"
          />
        </Field>
        <Field label="Risks">
          <Textarea
            value={value.risks}
            onChange={(e) => patch({ risks: e.target.value })}
            className="min-h-[48px] border-border text-sm"
          />
        </Field>
      </div>
      <Field label="Unclear areas">
        <Textarea
          value={value.unclearAreas}
          onChange={(e) => patch({ unclearAreas: e.target.value })}
          className="min-h-14 border-border text-sm"
        />
      </Field>
    </>
  );
}

function bantContent(
  value: DealPqq,
  patch: (partial: Partial<DealPqq>) => void,
  patchBant: (partial: Partial<DealPqqBant>) => void,
  gap: string,
  total: number,
  meetsThreshold: boolean,
  decisionThreshold: number,
) {
  const setBantTier = (
    field: 'budgetTier' | 'authorityTier' | 'needTier' | 'timelineTier',
    tier: string,
  ) => {
    const map = PQQ_BANT_DEFAULT_SCORES[field];
    const def = (map as any)[tier] as number | undefined;
    const score = def ?? 0;
    if (field === 'budgetTier') {
      patchBant({ budgetTier: tier as PqqBantBudgetTier, budgetScore: score });
    } else if (field === 'authorityTier') {
      patchBant({
        authorityTier: tier as PqqBantAuthorityTier,
        authorityScore: score,
      });
    } else if (field === 'needTier') {
      patchBant({ needTier: tier as PqqBantNeedTier, needScore: score });
    } else {
      patchBant({
        timelineTier: tier as PqqBantTimelineTier,
        timelineScore: score,
      });
    }
  };

  return (
    <>
      <BantRow
        label="Budget (0–3 / 4–6 / 7–9 / 10–12)"
        tierValue={value.bant.budgetTier}
        tierOptions={[
          { value: 'none', label: 'No budget (0–3)' },
          { value: 'unclear', label: 'Unclear (4–6)' },
          { value: 'expected', label: 'Expected (7–9)' },
          { value: 'confirmed', label: 'Confirmed (10–12)' },
        ]}
        score={value.bant.budgetScore}
        notes={value.bant.budgetNotes}
        onTierChange={(v) => setBantTier('budgetTier', v)}
        onScoreChange={(n) => patchBant({ budgetScore: clampPqqScore(n) })}
        onNotesChange={(s) => patchBant({ budgetNotes: s })}
      />
      <BantRow
        label="Authority"
        tierValue={value.bant.authorityTier}
        tierOptions={[
          { value: 'none', label: 'No access (0–3)' },
          { value: 'indirect', label: 'Indirect (4–6)' },
          { value: 'influencer', label: 'Influencer (7–9)' },
          { value: 'decisionMaker', label: 'Decision maker (10–12)' },
        ]}
        score={value.bant.authorityScore}
        notes={value.bant.authorityNotes}
        onTierChange={(v) => setBantTier('authorityTier', v)}
        onScoreChange={(n) => patchBant({ authorityScore: clampPqqScore(n) })}
        onNotesChange={(s) => patchBant({ authorityNotes: s })}
      />
      <BantRow
        label="Need"
        tierValue={value.bant.needTier}
        tierOptions={[
          { value: 'weak', label: 'Weak (0–3)' },
          { value: 'general', label: 'General (4–6)' },
          { value: 'defined', label: 'Defined (7–9)' },
          { value: 'strong', label: 'Strong (10–12)' },
        ]}
        score={value.bant.needScore}
        notes={value.bant.needNotes}
        onTierChange={(v) => setBantTier('needTier', v)}
        onScoreChange={(n) => patchBant({ needScore: clampPqqScore(n) })}
        onNotesChange={(s) => patchBant({ needNotes: s })}
      />
      <BantRow
        label="Timeline"
        tierValue={value.bant.timelineTier}
        tierOptions={[
          { value: 'none', label: 'None (0–3)' },
          { value: 'long', label: 'Long (4–6)' },
          { value: 'medium', label: 'Medium (7–9)' },
          { value: 'immediate', label: 'Immediate (10–12)' },
        ]}
        score={value.bant.timelineScore}
        notes={value.bant.timelineNotes}
        onTierChange={(v) => setBantTier('timelineTier', v)}
        onScoreChange={(n) => patchBant({ timelineScore: clampPqqScore(n) })}
        onNotesChange={(s) => patchBant({ timelineNotes: s })}
      />

      <Separator />

      <div className="rounded-lg border border-border bg-surface-card p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">
          Total &amp; decision
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            Total: {total} / {PQQ_MAX_TOTAL}
          </span>
          <Badge
            variant="outline"
            className={cn(
              meetsThreshold
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900',
            )}
          >
            {meetsThreshold
              ? `≥ ${decisionThreshold} — Proceed`
              : `< ${decisionThreshold} — Do not proceed`}
          </Badge>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Validation (STL)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="STL name">
          <Input
            value={value.stlName}
            onChange={(e) => patch({ stlName: e.target.value })}
            className="h-9 border-border text-sm"
            placeholder="Sales TL name"
          />
        </Field>
        <Field label="Outcome">
          <Select
            value={value.stlOutcome}
            onValueChange={(v) =>
              patch({ stlOutcome: v as DealPqq['stlOutcome'] })
            }
          >
            <SelectTrigger className="h-9 border-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="STL comments">
        <Textarea
          value={value.stlComments}
          onChange={(e) => patch({ stlComments: e.target.value })}
          className="min-h-[72px] border-border text-sm"
          placeholder="e.g. Below threshold; proceed only under approved strategic exception"
        />
      </Field>

      {!meetsThreshold && (
        <>
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Exception justification (if proceeding below threshold)
          </p>
          <Field label="Justification">
            <Textarea
              value={value.exceptionJustification}
              onChange={(e) =>
                patch({ exceptionJustification: e.target.value })
              }
              className="min-h-[64px] border-border text-sm"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Approved by">
              <Input
                value={value.exceptionApprovedBy}
                onChange={(e) => patch({ exceptionApprovedBy: e.target.value })}
                className="h-9 border-border text-sm"
              />
            </Field>
            <Field label="Remarks">
              <Input
                value={value.exceptionRemarks}
                onChange={(e) => patch({ exceptionRemarks: e.target.value })}
                className="h-9 border-border text-sm"
                placeholder="e.g. Controlled effort; limit presales"
              />
            </Field>
          </div>
        </>
      )}
    </>
  );
}
