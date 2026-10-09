'use client';

import { useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  type PqqFormValues,
  type PqqTemplateFormDefinition,
} from './data/pqqTemplateData';
import { cn } from '@/lib/utils';

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function DynamicPqqForm({
  definition,
  value,
  onChange,
  hideNavigation,
  showOnlyStepId,
  className,
}: {
  definition: PqqTemplateFormDefinition;
  value: PqqFormValues;
  onChange: (next: PqqFormValues) => void;
  hideNavigation?: boolean;
  showOnlyStepId?: string;
  className?: string;
}) {
  const [activeStepId, setActiveStepId] = useState(
    () => showOnlyStepId ?? definition.steps[0]?.id ?? 'discovery',
  );

  const orderedSteps = useMemo(
    () => sortByOrder(definition.steps),
    [definition.steps],
  );
  const activeStep = useMemo(
    () =>
      orderedSteps.find((step) => step.id === activeStepId) ?? orderedSteps[0],
    [orderedSteps, activeStepId],
  );
  const stepSections = useMemo(
    () =>
      sortByOrder(
        definition.sections.filter(
          (section) => section.stepId === activeStep?.id,
        ),
      ),
    [definition.sections, activeStep?.id],
  );

  const patchValue = (fieldId: string, nextValue: PqqFormValues[string]) => {
    onChange({ ...value, [fieldId]: nextValue });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {!hideNavigation && (
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {orderedSteps.map((step, index) => {
            const isActive = step.id === activeStep?.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStepId(step.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-brand bg-brand-muted text-brand-hover'
                    : 'border-border bg-surface-card text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-surface-card text-xs font-semibold text-brand">
                  {index + 1}
                </span>
                {step.title}
              </button>
            );
          })}
        </div>
      )}

      {stepSections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-card px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No fields configured
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This step has no sections yet. Update the PQQ template in lead
            settings to add fields.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stepSections.map((section) => {
            const sectionFields = sortByOrder(
              definition.fields.filter(
                (field) => field.sectionId === section.id,
              ),
            );
            return (
              <div
                key={section.id}
                className="rounded-lg border border-border bg-surface-card p-4 space-y-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {section.title}
                  </p>
                  {section.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {sectionFields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={String(value[field.id] ?? '')}
                          onChange={(event) =>
                            patchValue(field.id, event.target.value)
                          }
                          className="min-h-[72px] border-border bg-surface-card text-sm"
                          placeholder={field.placeholder}
                        />
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={value[field.id] === true}
                            onCheckedChange={(checked) =>
                              patchValue(field.id, checked === true)
                            }
                          />
                          <span>{field.placeholder || 'Yes'}</span>
                        </label>
                      ) : field.type === 'select' ? (
                        <Select
                          value={String(value[field.id] ?? '')}
                          onValueChange={(next) => patchValue(field.id, next)}
                        >
                          <SelectTrigger className="h-9 border-border bg-surface-card text-sm">
                            <SelectValue
                              placeholder={field.placeholder || 'Select'}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'slider' ? (
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={field.min ?? 0}
                            max={field.max ?? 12}
                            value={Number(value[field.id] ?? field.min ?? 0)}
                            onChange={(event) =>
                              patchValue(
                                field.id,
                                Number(event.target.value) || 0,
                              )
                            }
                            className="w-full accent-[#ed6925]"
                          />
                          <p className="text-xs text-muted-foreground">
                            {Number(value[field.id] ?? field.min ?? 0)} /{' '}
                            {field.max ?? 12}
                          </p>
                        </div>
                      ) : (
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={String(value[field.id] ?? '')}
                          onChange={(event) =>
                            patchValue(
                              field.id,
                              field.type === 'number'
                                ? Number(event.target.value) || 0
                                : event.target.value,
                            )
                          }
                          className="h-9 border-border bg-surface-card text-sm"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
