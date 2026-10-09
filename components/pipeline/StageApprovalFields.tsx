'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApprovalWorkflows } from '@/store/server/features/pipeline/workflows';
import {
  isWorkflowCompatible,
  workflowIncompatibilityWarning,
} from '@/components/pipeline/workflowCompatibility';

interface StageApprovalFieldsProps {
  requiresApproval: boolean;
  approvalWorkflowId: string | null | undefined;
  onRequiresApprovalChange: (value: boolean) => void;
  onApprovalWorkflowIdChange: (value: string | null) => void;
  /** Filter workflows by entity scope when provided. */
  entityScope?: 'LEAD' | 'DEAL';
  disabled?: boolean;
  readOnly?: boolean;
}

export function StageApprovalFields({
  requiresApproval,
  approvalWorkflowId,
  onRequiresApprovalChange,
  onApprovalWorkflowIdChange,
  entityScope,
  disabled,
  readOnly = false,
}: StageApprovalFieldsProps) {
  const { data: workflows = [], isLoading } = useApprovalWorkflows({
    activeOnly: true,
  });

  const context = {
    entityScope,
    requiredTrigger: 'stage_approval' as const,
  };

  const options = workflows.filter((wf) => isWorkflowCompatible(wf, context));

  const selectedWorkflow = approvalWorkflowId
    ? workflows.find((wf) => wf.id === approvalWorkflowId)
    : undefined;

  const selectedIsIncompatible =
    !!selectedWorkflow && !isWorkflowCompatible(selectedWorkflow, context);

  const warning = workflowIncompatibilityWarning(selectedWorkflow, context);

  // Keep a stale/incompatible assignment visible in the select so the warning is clear.
  const selectOptions =
    selectedIsIncompatible && selectedWorkflow
      ? [
          selectedWorkflow,
          ...options.filter((wf) => wf.id !== selectedWorkflow.id),
        ]
      : options;

  const workflowLabel =
    selectedWorkflow?.name ??
    (approvalWorkflowId ? 'Unknown workflow' : 'None selected');

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-elevated px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Requires approval</p>
        {readOnly ? (
          <span
            className={
              requiresApproval
                ? 'rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand'
                : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground'
            }
          >
            {requiresApproval ? 'Yes' : 'No'}
          </span>
        ) : (
          <Switch
            checked={requiresApproval}
            onCheckedChange={(checked) => {
              onRequiresApprovalChange(checked);
              if (!checked) onApprovalWorkflowIdChange(null);
            }}
            disabled={disabled}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Approval workflow{requiresApproval ? ' *' : ''}
        </Label>
        {readOnly ? (
          <p className="text-sm font-medium text-foreground">
            {requiresApproval ? workflowLabel : 'Not required'}
          </p>
        ) : (
          <Select
            value={approvalWorkflowId ?? undefined}
            onValueChange={(value) => onApprovalWorkflowIdChange(value)}
            disabled={disabled || !requiresApproval || isLoading}
          >
            <SelectTrigger
              className={
                warning
                  ? 'h-9 w-full border-amber-500/60 focus-visible:border-amber-500 focus-visible:ring-amber-500/20'
                  : 'h-9 w-full'
              }
            >
              <SelectValue
                placeholder={
                  isLoading ? 'Loading workflows…' : 'Select a workflow'
                }
              />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {selectOptions.map((wf) => (
                <SelectItem key={wf.id} value={wf.id}>
                  {wf.name}
                  {wf.entityScope !== 'ANY' ? ` (${wf.entityScope})` : ''}
                  {selectedIsIncompatible && wf.id === selectedWorkflow?.id
                    ? ' — incompatible'
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!readOnly && warning ? (
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            {warning}
          </p>
        ) : null}
      </div>
    </div>
  );
}
