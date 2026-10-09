'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { FieldType } from '../types';
import {
  DATE_OPERATOR_OPTIONS,
  FILE_OPERATOR_OPTIONS,
  LIST_OPERATOR_OPTIONS,
  NUMBER_OPERATOR_OPTIONS,
  TEXT_OPERATOR_OPTIONS,
  createEmptyRule,
  ruleCategoryForFieldType,
  type ValidationRule,
  type ValidationRuleOperator,
} from '../validation/types';

interface ValidationRulesEditorProps {
  fieldType: FieldType;
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
  exceptionApprovalWorkflowId?: string | null;
  onExceptionApprovalWorkflowIdChange?: (workflowId: string | null) => void;
  entityScope?: 'LEAD' | 'DEAL';
}

function operatorOptionsForCategory(category: ValidationRule['category']) {
  switch (category) {
    case 'number':
      return NUMBER_OPERATOR_OPTIONS;
    case 'text':
      return TEXT_OPERATOR_OPTIONS;
    case 'date':
      return DATE_OPERATOR_OPTIONS;
    case 'list':
      return LIST_OPERATOR_OPTIONS;
    case 'file':
      return FILE_OPERATOR_OPTIONS;
    default:
      return [];
  }
}

export function ValidationRulesEditor({
  fieldType,
  rules,
  onChange,
  exceptionApprovalWorkflowId,
  onExceptionApprovalWorkflowIdChange,
  entityScope,
}: ValidationRulesEditorProps) {
  const { data: workflows = [], isLoading } = useApprovalWorkflows({
    activeOnly: true,
  });

  const context = {
    entityScope,
    requiredTrigger: 'rule_exception' as const,
  };

  const compatibleOptions = workflows.filter((wf) =>
    isWorkflowCompatible(wf, context),
  );

  const selectedWorkflow = exceptionApprovalWorkflowId
    ? workflows.find((wf) => wf.id === exceptionApprovalWorkflowId)
    : undefined;

  const selectedIsIncompatible =
    !!selectedWorkflow && !isWorkflowCompatible(selectedWorkflow, context);

  const warning = workflowIncompatibilityWarning(selectedWorkflow, context);

  const workflowOptions =
    selectedIsIncompatible && selectedWorkflow
      ? [
          selectedWorkflow,
          ...compatibleOptions.filter((wf) => wf.id !== selectedWorkflow.id),
        ]
      : compatibleOptions;

  const category = ruleCategoryForFieldType(fieldType);
  if (!category) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Validation rules are not available for this field type yet.
      </p>
    );
  }

  const updateRule = (id: string, partial: Partial<ValidationRule>) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-page/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Validation Rules
          </Label>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Enforced when entering a stage that includes this field. Lost stages
            only enforce fields configured on that lost stage.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onChange([...rules, createEmptyRule(category)])}
        >
          <Plus size={13} className="mr-1" />
          Add rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No rules configured. Example: number must be greater than 50.
        </p>
      ) : (
        <div className="space-y-2.5">
          {rules.map((rule) => {
            const ops = operatorOptionsForCategory(rule.category);
            const isBetween = rule.operator === 'between';
            const bounds =
              rule.value && typeof rule.value === 'object'
                ? (rule.value as {
                    min?: string | number;
                    max?: string | number;
                  })
                : { min: '', max: '' };

            return (
              <div
                key={rule.id}
                className="space-y-2 rounded-md border border-border bg-surface-card p-2.5"
              >
                <div className="flex items-start gap-2">
                  <Select
                    value={rule.operator}
                    onValueChange={(op) =>
                      updateRule(rule.id, {
                        operator: op as ValidationRuleOperator,
                        value:
                          op === 'between'
                            ? { min: '', max: '' }
                            : typeof rule.value === 'object'
                              ? ''
                              : rule.value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 flex-1 border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRule(rule.id)}
                    aria-label="Remove rule"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>

                {isBetween ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type={rule.category === 'date' ? 'date' : 'number'}
                      value={bounds.min ?? ''}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          value: { ...bounds, min: e.target.value },
                        })
                      }
                      placeholder="Min"
                      className="h-8 border-border text-xs"
                    />
                    <Input
                      type={rule.category === 'date' ? 'date' : 'number'}
                      value={bounds.max ?? ''}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          value: { ...bounds, max: e.target.value },
                        })
                      }
                      placeholder="Max"
                      className="h-8 border-border text-xs"
                    />
                  </div>
                ) : (
                  <Input
                    type={
                      rule.category === 'number' ||
                      rule.operator === 'minLength' ||
                      rule.operator === 'maxLength' ||
                      rule.operator === 'maxFileSize'
                        ? 'number'
                        : rule.category === 'date'
                          ? 'date'
                          : 'text'
                    }
                    value={
                      typeof rule.value === 'string' ||
                      typeof rule.value === 'number'
                        ? String(rule.value)
                        : ''
                    }
                    onChange={(e) =>
                      updateRule(rule.id, { value: e.target.value })
                    }
                    placeholder={
                      rule.operator === 'regex'
                        ? 'Regular expression'
                        : rule.operator === 'allowedExtensions'
                          ? '.pdf, .docx'
                          : 'Value'
                    }
                    className="h-8 border-border text-xs"
                  />
                )}

                <Input
                  value={rule.message ?? ''}
                  onChange={(e) =>
                    updateRule(rule.id, { message: e.target.value })
                  }
                  placeholder="Custom error message (optional)"
                  className="h-8 border-border text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {rules.length > 0 ? (
        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">
            Exception approval workflow
          </Label>
          <Select
            value={exceptionApprovalWorkflowId ?? undefined}
            onValueChange={(value) =>
              onExceptionApprovalWorkflowIdChange?.(value)
            }
            disabled={isLoading}
          >
            <SelectTrigger
              className={
                warning
                  ? 'h-8 w-full border-amber-500/60 text-xs focus-visible:border-amber-500 focus-visible:ring-amber-500/20'
                  : 'h-8 w-full text-xs'
              }
            >
              <SelectValue
                placeholder={
                  isLoading ? 'Loading workflows…' : 'Select a workflow'
                }
              />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {workflowOptions.map((wf) => (
                <SelectItem key={wf.id} value={wf.id}>
                  {wf.name}
                  {selectedIsIncompatible && wf.id === selectedWorkflow?.id
                    ? ' — incompatible'
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {warning ? (
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              {warning}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Used when a user continues past a failed validation rule for this
              field. Only workflows that allow Rule Exception for this entity
              are listed. Configure under Settings → Approvals.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
