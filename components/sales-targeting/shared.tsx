'use client';

import { tokens } from '@/lib/design-tokens';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import { useQueries } from 'react-query';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';
import { fetchSalesTeamMembers } from '@/store/server/features/salesTargeting/queries';
import type { CommercialTeamMember } from '@/store/server/features/salesTargeting/types';
import { cn } from '@/lib/utils';
import { formatTargetPercent } from '@/lib/target-format';
import {
  formatCompactMoney,
  getQuarterTarget,
  getQuarterPeriodLabel,
  quarterSum,
  computeLeadTargetPct,
  type FiscalQuarterDefinition,
  type LeadQuarter,
  type LeadQuarterTarget,
  type PersonAllocation,
  type SalesTeamAllocation,
} from '@/components/sales-targeting/targetingUtils';
import { ConfirmReseatDialog } from '@/components/sales-targeting/ConfirmReseatDialog';
import {
  ManualTargetPanel,
  type ManualSolutionDraft,
  TargetDetailsDialog,
  type DetailsLayout,
  type DetailsOpp,
  type DetailsPendingManual,
  type DetailsStage,
  type DetailsStat,
  type DetailsTeamGroup,
} from '@/components/sales-targeting/TargetDetailsModal';
import {
  opportunityKey,
  sumUniqueOpportunityForecastValue,
  uniqueOpportunityCountFromRows,
} from '@/components/sales-targeting/targetingSectionHelpers';
import type {
  ForecastOpportunityRow,
  SalesTargetSourceType,
} from '@/store/server/features/salesTargeting/types';

const QUARTERS = [1, 2, 3, 4] as const;

export const PIPELINE_TABLE_HEAD_CLASS =
  'py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
export const PIPELINE_TABLE_HEAD_FIRST_CLASS = cn(
  'pl-5',
  PIPELINE_TABLE_HEAD_CLASS,
);
export const PIPELINE_TABLE_HEAD_CELL_CLASS = cn(
  'px-4',
  PIPELINE_TABLE_HEAD_CLASS,
);
export const PIPELINE_TABLE_CELL_FIRST_CLASS =
  'pl-5 py-3.5 font-medium text-foreground';
export const PIPELINE_TABLE_CELL_CLASS = 'px-4 py-3.5 text-sm text-foreground';

export const SALES_TARGETING_PAGE_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-card';

export function SaveBar({
  hasChanges,
  saved,
  onSave,
}: {
  hasChanges: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onSave}
        disabled={!hasChanges}
        size="sm"
        className="bg-brand text-brand-foreground hover:bg-brand-hover"
      >
        Save
      </Button>
      {saved ? (
        <span className="inline-flex items-center gap-1 text-[12px] text-success">
          <Check size={13} />
          Saved
        </span>
      ) : null}
    </div>
  );
}

export type TargetingSelectOption = {
  value: string;
  label: string;
};

const TARGETING_SELECT_CONTENT_CLASS = 'z-[2147483647]';
const TARGETING_OVERLAY_Z_INDEX = 2147483647;

type DropdownPanelPosition = {
  top: number;
  left: number;
  right: number;
  width: number;
};

function usePortaledDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState<DropdownPanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        right: window.innerWidth - rect.right,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef]);

  return position;
}

export function CurrencyToolbar({
  currencyOptions,
  activeCurrencyId,
  activeCurrencyLabel,
  onSelectCurrencyId,
  onAddCurrency,
  onRemoveCurrency,
  canRemoveCurrency,
  availableToAdd = [],
  configureCurrencies = false,
  leading,
  trailing,
  variant = 'bar',
  mobileLeadingOnly = false,
}: {
  currencyOptions: TargetingSelectOption[];
  activeCurrencyId: string;
  activeCurrencyLabel: string;
  onSelectCurrencyId: (currencyId: string) => void;
  onAddCurrency?: (currencyCode: string) => void;
  onRemoveCurrency?: (currencyCode: string) => void;
  /** When set, controls per-option X visibility. Defaults to allowing remove when handler exists. */
  canRemoveCurrency?: (currencyCode: string) => boolean;
  availableToAdd?: string[];
  configureCurrencies?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** `bar` = section toolbar (mobile picker); `inline` = shell tab-row picker. */
  variant?: 'bar' | 'inline';
  /** Section bar only: hide on md+ when context is shown in the shell currency row. */
  mobileLeadingOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = usePortaledDropdownPosition(open, triggerRef);

  const configuredLabels = new Set(
    currencyOptions.map((option) => option.label),
  );
  const available = availableToAdd.filter(
    (currency) => !configuredLabels.has(currency),
  );
  const canConfigure =
    configureCurrencies && Boolean(onAddCurrency || onRemoveCurrency);
  const showAddSection = Boolean(onAddCurrency) && available.length > 0;
  const isDisabled = currencyOptions.length === 0 && available.length === 0;
  const showRemoveOnOption = (currencyCode: string) => {
    if (!canConfigure || !onRemoveCurrency || currencyOptions.length <= 1) {
      return false;
    }
    // Prefer explicit gate when provided; otherwise allow remove on every option.
    if (canRemoveCurrency) return canRemoveCurrency(currencyCode);
    return true;
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const frameId = window.requestAnimationFrame(() => {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleEscape);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const picker = (
    <div ref={triggerRef} className="inline-flex shrink-0">
      <button
        type="button"
        disabled={isDisabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex h-9 min-w-[120px] items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-surface-elevated',
          isDisabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span>{activeCurrencyLabel || 'Currency'}</span>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
    </div>
  );

  const panel =
    open && position && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className="rounded-md border border-border bg-surface-card p-1 shadow-md"
            style={{
              position: 'fixed',
              top: position.top,
              // Shell picker sits on the right — pin the menu to the trigger's right edge.
              ...(variant === 'inline'
                ? { right: position.right, left: 'auto' }
                : { left: position.left }),
              width: Math.max(position.width, 168),
              minWidth: Math.max(position.width, 168),
              zIndex: TARGETING_OVERLAY_Z_INDEX,
            }}
          >
            {currencyOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No currencies configured
              </p>
            ) : (
              currencyOptions.map((option) => {
                const removable = showRemoveOnOption(option.label);
                const isActive = activeCurrencyId === option.value;
                return (
                  <div
                    key={option.value}
                    className="flex w-full items-center gap-1 rounded-sm hover:bg-surface-elevated"
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onSelectCurrencyId(option.value);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm text-foreground"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {option.label}
                      </span>
                      {isActive ? (
                        <Check
                          size={14}
                          className="ml-auto shrink-0 text-brand"
                        />
                      ) : (
                        <span className="ml-auto inline-block w-3.5 shrink-0" />
                      )}
                    </button>
                    {/* Fixed right column so X always lines up, even when hidden on some rows */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center pr-0.5">
                      {removable ? (
                        <button
                          type="button"
                          aria-label={`Remove ${option.label}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRemoveCurrency?.(option.label);
                            setOpen(false);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            {showAddSection ? (
              <>
                <div className="-mx-1 my-1 h-px bg-muted" />
                {available.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onAddCurrency?.(currency);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 pr-8 text-left text-sm text-brand hover:bg-brand-muted"
                  >
                    <Plus size={14} className="shrink-0" />
                    Add {currency}
                  </button>
                ))}
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  if (variant === 'inline') {
    return (
      <>
        <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
          {leading}
          {picker}
          {trailing}
        </div>
        {panel}
      </>
    );
  }

  // Section bar: keep mobile currency picker; desktop picker lives in the shell tab row.
  // If there is no leading content, hide the whole bar on desktop (empty strip).
  return (
    <div
      className={cn(
        'flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-card px-4 py-4 sm:px-6',
        (!leading || mobileLeadingOnly) && 'md:hidden',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 md:hidden">
          {picker}
          {trailing}
        </div>
        {leading}
      </div>
      {panel}
    </div>
  );
}

export function SimpleSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  minWidth = '280px',
  disabled = false,
}: {
  options: TargetingSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minWidth?: string;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = useState<string | undefined>();

  const syncMenuWidth = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const triggerWidth = trigger.getBoundingClientRect().width;
    const parsedMin = Number.parseFloat(minWidth) || 280;
    const unit = minWidth.replace(String(parsedMin), '') || 'px';
    const width = Math.max(triggerWidth, parsedMin);
    setMenuWidth(`${width}${unit}`);
  };

  return (
    <div className="inline-flex w-auto shrink-0">
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled || options.length === 0}
        onOpenChange={(open) => {
          if (open) syncMenuWidth();
        }}
      >
        <SelectTrigger
          ref={triggerRef}
          size="sm"
          className="h-9 min-h-9 max-h-9 w-auto max-w-full gap-2 border-border bg-surface-card px-3 py-0 text-sm font-medium leading-none text-foreground shadow-none [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
          style={{ minWidth }}
        >
          <SelectValue placeholder={placeholder}>
            {selected?.label ?? placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className={cn(
            TARGETING_SELECT_CONTENT_CLASS,
            'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]',
          )}
          style={{ width: menuWidth, minWidth: menuWidth ?? minWidth }}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="w-full whitespace-nowrap"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SimpleCurrencyDropdown({
  currencyOptions,
  value,
  onChange,
}: {
  currencyOptions: TargetingSelectOption[];
  value: string;
  onChange: (currencyId: string) => void;
}) {
  return (
    <SimpleSelectDropdown
      options={currencyOptions}
      value={value}
      onChange={onChange}
      placeholder="Currency"
      minWidth="120px"
    />
  );
}

export function PerformanceTable({
  rows,
  currency,
  emptyMessage = 'No items to display.',
}: {
  rows: { id: string; name: string; achieved: number; target: number }[];
  currency: string;
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const aPct = computeLeadTargetPct(a.achieved, a.target);
    const bPct = computeLeadTargetPct(b.achieved, b.target);
    if (bPct !== aPct) return bPct - aPct;
    return b.achieved - a.achieved;
  });

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-surface-card">
        <TableRow>
          <TableHead className={PIPELINE_TABLE_HEAD_FIRST_CLASS}>
            Name
          </TableHead>
          <TableHead
            className={cn(PIPELINE_TABLE_HEAD_CELL_CLASS, 'text-right')}
          >
            Achieved
          </TableHead>
          <TableHead
            className={cn(PIPELINE_TABLE_HEAD_CELL_CLASS, 'text-right')}
          >
            Target
          </TableHead>
          <TableHead className={PIPELINE_TABLE_HEAD_CELL_CLASS}>
            Progress
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="bg-surface-card">
        {sorted.map((row) => {
          const pct = computeLeadTargetPct(row.achieved, row.target);
          return (
            <TableRow key={row.id}>
              <TableCell className={PIPELINE_TABLE_CELL_FIRST_CLASS}>
                {row.name}
              </TableCell>
              <TableCell
                className={cn(
                  PIPELINE_TABLE_CELL_CLASS,
                  'text-right tabular-nums',
                )}
              >
                {formatCompactMoney(row.achieved, currency)}
              </TableCell>
              <TableCell
                className={cn(
                  PIPELINE_TABLE_CELL_CLASS,
                  'text-right tabular-nums text-muted-foreground',
                )}
              >
                {row.target > 0
                  ? formatCompactMoney(row.target, currency)
                  : '—'}
              </TableCell>
              <TableCell className={PIPELINE_TABLE_CELL_CLASS}>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-brand-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'w-10 shrink-0 text-right text-sm font-semibold tabular-nums',
                      pct >= 100
                        ? 'text-success'
                        : pct > 0
                          ? 'text-brand'
                          : 'text-muted-foreground',
                    )}
                  >
                    {row.target > 0 ? formatTargetPercent(pct) : '—'}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function SectionShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      {title || actions ? (
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          {title ? (
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">
                {title}
              </h2>
              {description ? (
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}
          {actions}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export function PillSelect<T extends string>({
  items,
  value,
  onChange,
  getKey,
  getLabel,
  label,
  layout = 'column',
}: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  label?: string;
  layout?: 'row' | 'column';
}) {
  return (
    <div>
      {label ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div
        className={cn(
          'flex gap-1',
          layout === 'row' ? 'flex-row flex-wrap' : 'flex-col',
        )}
      >
        {items.map((item) => {
          const selected = getKey(item) === value;
          return (
            <button
              key={getKey(item)}
              type="button"
              onClick={() => onChange(item)}
              className={cn(
                'rounded-md border px-3 py-2 text-[13px] font-medium transition-colors',
                layout === 'row' ? 'whitespace-nowrap' : 'text-left',
                selected
                  ? 'border-brand-border bg-brand-muted text-brand-hover'
                  : 'border-border bg-surface-card text-muted-foreground hover:border-brand-border hover:text-foreground',
              )}
            >
              {getLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchableFilter<T extends string>({
  items,
  value,
  onChange,
  getKey,
  getLabel,
  label,
  placeholder = 'Search...',
}: {
  items: T[];
  value: T | '';
  onChange: (value: T | '') => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery(value ? getLabel(value) : '');
    }
  }, [value, open, getLabel]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      getLabel(item).toLowerCase().includes(normalized),
    );
  }, [items, query, getLabel]);

  const selectItem = (item: T) => {
    onChange(item);
    setQuery(getLabel(item));
    setOpen(false);
  };

  return (
    <div>
      {label ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div
        className="relative"
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            window.setTimeout(() => setOpen(false), 120);
          }
        }}
      >
        <Input
          value={query}
          placeholder={placeholder}
          className="h-9 border-border bg-surface-card pr-9 text-sm shadow-none"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            if (!next.trim()) {
              onChange('');
            }
          }}
        />
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
        {open ? (
          <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-surface-card p-1 shadow-md">
            {filteredItems.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matches found
              </p>
            ) : (
              filteredItems.map((item) => {
                const selected = getKey(item) === value;
                return (
                  <button
                    key={getKey(item)}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectItem(item)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-elevated',
                      selected
                        ? 'bg-brand-muted text-brand-hover ring-1 ring-brand-border'
                        : 'text-foreground',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {getLabel(item)}
                    </span>
                    {selected ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EditableTargetInput({
  value,
  currency,
  onSave,
  placeholder = 'Enter target',
  inputClassName,
  saveClassName,
  editFirst = false,
  compact = false,
  /** When true, block direct numeric entry (targets must come from opportunities). */
  opportunityDriven = true,
}: {
  value: number;
  currency: string;
  onSave: (value: number) => void | Promise<void>;
  placeholder?: string;
  inputClassName?: string;
  saveClassName?: string;
  editFirst?: boolean;
  compact?: boolean;
  opportunityDriven?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const hasValue = value > 0;
  const isInputEditable = editFirst ? isEditing : !hasValue || isEditing;

  useEffect(() => {
    setIsEditing(false);
    setDraft('');
  }, [currency]);

  useEffect(() => {
    if (!isEditing && !saving) {
      setDraft(hasValue ? String(value) : '');
    }
  }, [value, isEditing, hasValue, saving]);

  if (opportunityDriven) {
    return (
      <div className="space-y-0.5">
        <p
          className={cn(
            'font-semibold tabular-nums text-foreground',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {value > 0 ? formatCompactMoney(value, currency) : 'Not set'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Set from forecast opportunities (direct entry disabled)
        </p>
      </div>
    );
  }

  const startEditing = () => {
    setDraft(hasValue ? String(value) : '');
    setIsEditing(true);
  };

  const save = async () => {
    if (draft.trim() === '' || saving) return;
    const next = Number(draft) || 0;
    setSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const displayValue = isInputEditable
    ? draft
    : hasValue
      ? formatCompactMoney(value, currency)
      : compact
        ? '—'
        : 'Not set';

  return (
    <div
      className={cn(
        compact
          ? 'flex items-center gap-1'
          : 'flex w-full flex-col gap-1.5 sm:flex-row sm:items-center',
      )}
    >
      <Input
        type={isInputEditable ? 'number' : 'text'}
        min={0}
        readOnly={!isInputEditable || saving}
        value={displayValue}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (isInputEditable && e.key === 'Enter') void save();
          if (isEditing && e.key === 'Escape' && !saving) {
            setIsEditing(false);
            setDraft('');
          }
        }}
        className={cn(
          'h-9 w-full min-w-[11rem] border-border bg-surface-card text-sm tabular-nums text-foreground sm:min-w-[12rem]',
          !isInputEditable && 'cursor-default focus-visible:ring-0',
          inputClassName,
        )}
        placeholder={placeholder}
      />
      {isInputEditable ? (
        <Button
          type="button"
          size="sm"
          disabled={draft.trim() === '' || saving}
          className={cn(
            compact
              ? 'h-7 shrink-0 bg-brand px-2 text-[11px] text-brand-foreground hover:bg-brand-hover disabled:opacity-50'
              : 'h-8 shrink-0 bg-brand px-2.5 text-xs text-brand-foreground hover:bg-brand-hover disabled:opacity-50',
            saveClassName,
          )}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 text-muted-foreground hover:text-foreground',
            compact ? 'size-7' : 'size-8',
          )}
          onClick={startEditing}
          aria-label="Edit target"
        >
          <Pencil className={compact ? 'size-3' : 'size-3.5'} />
        </Button>
      )}
    </div>
  );
}

export function CompactQuarterTable({
  quarters,
  quarterDefinitions,
  currency,
  onQuarterChange,
}: {
  quarters: LeadQuarterTarget[];
  quarterDefinitions: FiscalQuarterDefinition[];
  currency: string;
  onQuarterChange: (q: LeadQuarter, value: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {QUARTERS.map((q) => (
        <div key={q} className="min-w-0">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Q{q}
            <span className="ml-1 font-normal text-muted-foreground">
              {getQuarterPeriodLabel(quarterDefinitions, q)}
            </span>
          </label>
          <EditableTargetInput
            key={`${currency}-q${q}`}
            value={getQuarterTarget(quarters, q)}
            currency={currency}
            placeholder="Enter target"
            editFirst
            onSave={(value) => onQuarterChange(q, value)}
          />
        </div>
      ))}
    </div>
  );
}

export function DistributionCard({ children }: { children: ReactNode }) {
  return <div className={cn(SALES_TARGETING_PAGE_CLASS)}>{children}</div>;
}

export function SalesTargetingTableArea({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-auto">{children}</div>;
}

export function SalesTargetingTableFooter({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center border-t border-border bg-surface-card px-6 py-3">
      {children}
    </div>
  );
}

export type QuarterMatrixRow = {
  id: string;
  label: string;
  subtitle?: string;
  quarters: LeadQuarterTarget[];
  readOnly?: boolean;
};

export function QuarterTargetsMatrix({
  rows,
  rowLabel,
  currency,
  quarterDefinitions,
  onQuarterChange,
  emptyMessage = 'Nothing to display.',
}: {
  rows: QuarterMatrixRow[];
  rowLabel: string;
  currency: string;
  quarterDefinitions: FiscalQuarterDefinition[];
  onQuarterChange: (id: string, q: LeadQuarter, value: number) => void;
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-surface-card">
        <TableRow>
          <TableHead className={PIPELINE_TABLE_HEAD_FIRST_CLASS}>
            {rowLabel}
          </TableHead>
          {QUARTERS.map((q) => (
            <TableHead key={q} className={PIPELINE_TABLE_HEAD_CELL_CLASS}>
              <span className="block">Q{q}</span>
              <span className="mt-0.5 block font-normal normal-case tracking-normal text-muted-foreground">
                {getQuarterPeriodLabel(quarterDefinitions, q)}
              </span>
            </TableHead>
          ))}
          <TableHead
            className={cn(PIPELINE_TABLE_HEAD_CELL_CLASS, 'text-right')}
          >
            Annual
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="bg-surface-card">
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className={PIPELINE_TABLE_CELL_FIRST_CLASS}>
              {row.label}
            </TableCell>
            {QUARTERS.map((q) => (
              <TableCell key={q} className={PIPELINE_TABLE_CELL_CLASS}>
                {row.readOnly ? (
                  <span className="tabular-nums text-muted-foreground">
                    {formatCompactMoney(
                      getQuarterTarget(row.quarters, q),
                      currency,
                    )}
                  </span>
                ) : (
                  <EditableTargetInput
                    key={`${currency}-${row.id}-q${q}`}
                    value={getQuarterTarget(row.quarters, q)}
                    currency={currency}
                    placeholder="0"
                    compact
                    inputClassName="h-8 w-full min-w-[4.5rem] border-border bg-surface-card text-sm tabular-nums"
                    onSave={(value) => onQuarterChange(row.id, q, value)}
                  />
                )}
              </TableCell>
            ))}
            <TableCell
              className={cn(
                PIPELINE_TABLE_CELL_CLASS,
                'text-right tabular-nums text-muted-foreground',
              )}
            >
              {quarterSum(row) > 0
                ? formatCompactMoney(quarterSum(row), currency)
                : formatCompactMoney(0, currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TeamTargetsMatrix({
  teams,
  currency,
  quarterDefinitions,
  onQuarterChange,
  readOnly = false,
}: {
  teams: SalesTeamAllocation[];
  currency: string;
  quarterDefinitions: FiscalQuarterDefinition[];
  onQuarterChange: (teamId: string, q: LeadQuarter, value: number) => void;
  readOnly?: boolean;
}) {
  return (
    <QuarterTargetsMatrix
      rowLabel="Team"
      currency={currency}
      quarterDefinitions={quarterDefinitions}
      emptyMessage="No sales teams configured."
      rows={teams.map((team) => ({
        id: team.teamId,
        label: team.teamName,
        quarters: team.quarters,
        readOnly,
      }))}
      onQuarterChange={onQuarterChange}
    />
  );
}

export function PersonTargetsMatrix({
  persons,
  currency,
  quarterDefinitions,
  onQuarterChange,
  readOnly = false,
}: {
  persons: PersonAllocation[];
  currency: string;
  quarterDefinitions: FiscalQuarterDefinition[];
  onQuarterChange: (personId: string, q: LeadQuarter, value: number) => void;
  readOnly?: boolean;
}) {
  return (
    <QuarterTargetsMatrix
      rowLabel="Rep"
      currency={currency}
      quarterDefinitions={quarterDefinitions}
      emptyMessage="No reps on this team."
      rows={persons.map((person) => ({
        id: person.personId,
        label: person.personName,
        quarters: person.quarters,
        readOnly,
      }))}
      onQuarterChange={onQuarterChange}
    />
  );
}

export function SimpleProgressList({
  rows,
}: {
  rows: {
    id: string;
    label: string;
    subtitle?: string;
    currency: string;
    target: number;
    achieved: number;
    pct: number;
  }[];
}) {
  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No targets set for this level.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {row.label}
            </p>
            {row.subtitle ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {row.subtitle}
              </p>
            ) : null}
          </div>
          <div className="hidden w-32 sm:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(row.pct, 100)}%` }}
              />
            </div>
          </div>
          <p className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-brand">
            {formatTargetPercent(row.pct)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function QuarterEditor({
  title,
  subtitle,
  quarters,
  quarterDefinitions,
  onQuarterChange,
}: {
  title: string;
  subtitle?: string;
  quarters: LeadQuarterTarget[];
  quarterDefinitions: FiscalQuarterDefinition[];
  onQuarterChange: (q: LeadQuarter, raw: string) => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUARTERS.map((q) => (
          <div
            key={q}
            className="rounded-md border border-border bg-surface-elevated p-3"
          >
            <div className="mb-2">
              <p className="text-[13px] font-medium text-foreground">Q{q}</p>
              <p className="text-[11px] text-muted-foreground">
                {getQuarterPeriodLabel(quarterDefinitions, q)}
              </p>
            </div>
            <Input
              type="number"
              min={0}
              value={getQuarterTarget(quarters, q)}
              onChange={(e) => onQuarterChange(q, e.target.value)}
              className="h-9 border-border bg-surface-card text-sm tabular-nums"
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressRow({
  label,
  subtitle,
  currency,
  target,
  achieved,
  pct,
}: {
  label: string;
  subtitle?: string;
  currency: string;
  target: number;
  achieved: number;
  pct: number;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {label}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-sm font-bold text-brand">
          {formatTargetPercent(pct)}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {formatCompactMoney(achieved, currency)}
        <span className="font-medium text-muted-foreground">
          {' '}
          / {formatCompactMoney(target, currency)}
        </span>
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const DONUT_COLORS = tokens.chart.palette;

/** Donut chart of team shares within a scope (company or department annual target). */
export function TeamDistributionDonut({
  label,
  currency,
  scopeAnnual,
  teams,
  className,
  scopeSubtitle = 'target',
  departmentFilter,
  compact = false,
}: {
  label: string;
  currency: string;
  /** Total target for the current scope (company or department). */
  scopeAnnual: number;
  teams: { name: string; annual: number }[];
  className?: string;
  /** e.g. "department target" shown after the scope amount */
  scopeSubtitle?: string;
  /** Optional department filter shown top-right */
  departmentFilter?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  /** Use the compact dashboard treatment used by the annual overview. */
  compact?: boolean;
}) {
  const distributed = teams.reduce((sum, team) => sum + team.annual, 0);
  const distributedPct = computeLeadTargetPct(distributed, scopeAnnual);
  const remaining = Math.max(0, scopeAnnual - distributed);
  const isOverAllocated = scopeAnnual > 0 && distributed > scopeAnnual;
  const total = scopeAnnual > 0 ? scopeAnnual : distributed;

  const coloredTeams = teams.map((team, index) => ({
    ...team,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));

  const segments: { value: number; color: string }[] = coloredTeams
    .filter((team) => team.annual > 0)
    .map((team) => ({ value: team.annual, color: team.color }));
  if (total > 0 && remaining > 0 && !isOverAllocated) {
    segments.push({ value: remaining, color: tokens.color.borderDefault });
  }

  let cursor = 0;
  const gradientStops =
    total > 0
      ? segments
          .map((segment) => {
            const start = cursor;
            cursor += (segment.value / total) * 100;
            return `${segment.color} ${start}% ${cursor}%`;
          })
          .join(', ')
      : `${tokens.color.borderDefault} 0% 100%`;

  const selectedDeptLabel = departmentFilter?.options.find(
    (opt) => opt.value === departmentFilter.value,
  )?.label;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated px-5 py-4',
        className,
      )}
    >
      <div className="flex flex-shrink-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {formatCompactMoney(distributed, currency)}
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
              of {formatCompactMoney(scopeAnnual, currency)} {scopeSubtitle}
            </span>
          </p>
          {selectedDeptLabel ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {selectedDeptLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {departmentFilter ? (
            <Select
              value={departmentFilter.value}
              onValueChange={departmentFilter.onChange}
            >
              <SelectTrigger
                size="sm"
                className="h-9 min-w-[11rem] border-border bg-surface-card text-[13px] font-medium"
              >
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent
                align="end"
                position="popper"
                className="min-w-[11rem]"
              >
                {departmentFilter.options.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="py-2.5 pl-3 text-[13px] font-medium"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {scopeAnnual > 0 && remaining > 0 && !isOverAllocated ? (
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {formatCompactMoney(remaining, currency)} left
            </span>
          ) : null}
          {isOverAllocated ? (
            <span className="rounded-md bg-error/10 px-2 py-1 text-[10px] font-medium text-error">
              Over by {formatCompactMoney(distributed - scopeAnnual, currency)}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col lg:flex-row lg:items-center',
          compact ? 'mt-3 gap-3 lg:gap-4' : 'mt-4 gap-5 lg:gap-6',
        )}
      >
        <div
          role="img"
          aria-label={`Team distribution within ${scopeSubtitle}`}
          className={cn(
            'relative mx-auto flex shrink-0 items-center justify-center rounded-full lg:mx-0',
            compact ? 'size-[92px]' : 'size-[180px] sm:size-[200px]',
          )}
          style={{ background: `conic-gradient(${gradientStops})` }}
        >
          <div
            className={cn(
              'absolute rounded-full bg-surface-elevated',
              compact ? 'inset-[12px]' : 'inset-[22px] sm:inset-[24px]',
            )}
          />
          <div className="relative z-10 text-center">
            <p
              className={cn(
                'font-semibold tabular-nums tracking-tight text-foreground',
                compact ? 'text-sm' : 'text-2xl',
              )}
            >
              {scopeAnnual > 0 ? formatTargetPercent(distributedPct) : '—'}
            </p>
            <p
              className={cn(
                'font-medium uppercase tracking-wide text-muted-foreground',
                compact ? 'text-[8px]' : 'text-[10px]',
              )}
            >
              distributed
            </p>
          </div>
        </div>

        {coloredTeams.length > 0 ? (
          <div
            className={cn(
              'grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start overflow-y-auto no-scrollbar sm:grid-cols-2',
              compact ? 'gap-1.5' : 'gap-3',
            )}
          >
            {coloredTeams.map((team) => {
              const teamPct = computeLeadTargetPct(team.annual, scopeAnnual);
              return (
                <div
                  key={team.name}
                  className={cn(
                    'rounded-lg border border-border bg-surface-elevated transition-colors hover:bg-muted/40',
                    compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {team.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {scopeAnnual > 0 ? formatTargetPercent(teamPct) : '—'}
                    </span>
                  </div>
                  <div className={compact ? 'mt-1' : 'mt-2'}>
                    <span
                      className={cn(
                        'font-semibold tabular-nums text-foreground',
                        compact ? 'text-xs' : 'text-sm',
                      )}
                    >
                      {formatCompactMoney(team.annual, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            No teams in this department yet.
          </p>
        )}
      </div>
    </div>
  );
}

function forecastRowKey(row: ForecastOpportunityRow): string {
  if (row.proposalApprovalLabel && row.salesTeamId) {
    return `${row.salesTeamId}:${row.opportunityType}:${row.opportunityId}`;
  }
  return `${row.opportunityType}:${row.opportunityId}`;
}

export type DraftCustomSolution = {
  productFamilyId: string;
  name: string;
  amount: number;
  teamIds: string[];
  memberIds: string[];
};

export type DraftCustomForecast = {
  /** Local temp id until saved */
  localId: string;
  opportunityName: string;
  /** Client-minted UUID shared across team rows on save */
  groupId: string;
  /** Opportunity value. Each selected team and member receives this amount. */
  value?: number;
  /** Amount per team. For new customs each amount equals `value`. */
  teams: Array<{ salesTeamId: string; amount: number }>;
  /** Optional people amounts (flat, not nested under teams) */
  assignees: Array<{ userId: string; amount: number }>;
  solutions?: DraftCustomSolution[];
};

/** @deprecated Prefer draft.teams — kept for transitional call sites */
export function draftCustomSalesTeamIds(draft: DraftCustomForecast): string[] {
  return draft.teams.map((t) => t.salesTeamId);
}

export function draftCustomTotalAmount(draft: DraftCustomForecast): number {
  if (draft.value != null && draft.value > 0) return draft.value;
  return draft.teams.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/** People and solutions stored once for a custom group. */
export function draftCustomCreateExtras(
  draft: DraftCustomForecast,
  index: number,
) {
  if (index !== 0) return {};
  const value =
    draft.value != null && draft.value > 0 ? draft.value : undefined;
  return {
    assignees: (value
      ? draft.assignees.map((assignee) => ({
          userId: assignee.userId,
          amount: value,
        }))
      : draft.assignees
    ).filter((assignee) => assignee.amount > 0),
    solutions: (draft.solutions ?? []).map((solution) => ({
      productFamilyId: solution.productFamilyId,
      amount: solution.amount,
      teamIds: solution.teamIds,
      memberIds: solution.memberIds,
    })),
  };
}

/** Commit lines for a custom forecast. The company counts `value` once. */
export function draftCustomCommitLines(draft: DraftCustomForecast) {
  const value =
    draft.value != null && draft.value > 0 ? draft.value : undefined;
  return draft.teams.map((team, index) => ({
    groupId: draft.groupId,
    opportunityName: draft.opportunityName,
    forecastValue: value ?? team.amount,
    salesTeamId: team.salesTeamId,
    ...(index === 0
      ? {
          assignees: value
            ? draft.assignees.map((assignee) => ({
                userId: assignee.userId,
                amount: value,
              }))
            : draft.assignees,
          solutions: (draft.solutions ?? []).map((solution) => ({
            productFamilyId: solution.productFamilyId,
            amount: solution.amount,
            teamIds: solution.teamIds,
            memberIds: solution.memberIds,
          })),
        }
      : {}),
  }));
}

export type ForecastRowWithAllocation = ForecastOpportunityRow & {
  /** User allocation when `allowPartialAllocation` is on (forecastValue stays the deal forecast). */
  allocatedAmount?: number;
};

export type TargetSelectionSavePayload = {
  amount: number;
  sourceType: SalesTargetSourceType;
  /** Selected rows; use `allocatedAmount` for partial allocations (forecastValue unchanged). */
  rows: ForecastRowWithAllocation[];
  /** New custom forecasts (not yet persisted) */
  draftCustoms: DraftCustomForecast[];
  /** Existing custom rows that were selected (allocated amounts applied) */
  selectedCustomRows: ForecastRowWithAllocation[];
  /** Partial allocations to persist on the commit snapshot */
  overrides: Array<{
    opportunityType: ForecastOpportunityRow['opportunityType'];
    opportunityId: string;
    forecastValue: number;
  }>;
};

/**
 * Opportunity-driven target editor. Amount is the sum of allocated values on
 * selected forecast opportunities (+ optional draft customs at company level).
 * At department/team level, each opportunity can take a portion of its max.
 */
export function TargetAmountField({
  value,
  currency,
  editable,
  forecastRows = [],
  onSaveSelection,
  onDraftAmountChange,
  allowCustomAdd = false,
  allowPartialAllocation = false,
  teamOptions = [],
  teamGroups = [],
  emptyMessage = 'No forecast opportunities available for this scope.',
  preferredSelectedKeys,
  preferredAllocatedAmounts,
  triggerLabel = 'Details',
  modalTitle = 'Company Details & Target Management',
  modalDescription,
  hideSummaryAmount = false,
  renderTrigger,
  /**
   * When true, do not auto-open the opportunity editor for unset targets.
   * Used for team/person so a parent save (department/team) only updates the
   * available pool — saved amount stays until this level clicks Edit & Save.
   */
  requireManualEdit = false,
  /** Blocks saving until hierarchy and sequencing rules are satisfied. */
  targetBlockedReason,
  /** @deprecated Use targetBlockedReason */
  manualTargetBlockedReason,
  /** B2T read-only dept Details: hide Status/Stage column (snapshot is implicit). */
  hideProposalStatusColumn = false,
  /** B2T read-only: static department header + expandable teams (no flat table). */
  readOnlyTeamGroupedView = false,
  /** Department name shown as a fixed category header in read-only grouped view. */
  departmentGroupLabel,
  /** Company read-only Details: nest teams under each department from `teamGroups`. */
  groupReadOnlyByDepartment = false,
  /** Teams that report to company (not a department) — grouped under Company in Details. */
  companyDirectTeamIds = [],
  /** TTB company: seated lines for dept → team grouped preview (flat edit uses `forecastRows`). */
  groupedForecastRows,
  /** TTB company Details: department-scoped rollup (unique opps per dept). */
  departmentRollupRowsByLabel,
  /**
   * Single-dept or single-team Details: team → opp or opp list only (no dept/team category headers).
   * Company card uses `groupReadOnlyByDepartment` instead — do not set scope there.
   */
  groupedModalScope,
  /** B2T/Hybrid team Details: flat opportunity table (no team-name chevron groups). */
  workflowTeamFlatOpportunityList = false,
  /** Pre-select team when adding a custom opportunity from team Details. */
  customDefaultTeamId,
  /** Toolbar button when adding customs (TTB default unchanged). */
  customAddTriggerLabel,
  /** Optional people for custom assignees (flat multi-select amounts). */
  assigneeOptions = [],
  currencyOptions = [],
  activeCurrencyId,
  onCurrencyChange,
  memberShare,
}: {
  value: number;
  currency: string;
  editable: boolean;
  forecastRows?: ForecastOpportunityRow[];
  onSaveSelection?: (
    payload: TargetSelectionSavePayload,
    meta?: { reseatConfirmed?: boolean },
  ) =>
    | void
    | boolean
    | 'confirm-reseat'
    | Promise<void | boolean | 'confirm-reseat'>;
  /** Live draft total while the editor is open; `null` when closed. */
  onDraftAmountChange?: (amount: number | null) => void;
  compact?: boolean;
  /** Company level: allow adding custom forecast lines */
  allowCustomAdd?: boolean;
  /** When set, replaces the default top-to-bottom custom opportunity footnote. */
  customOpportunityHint?: string | null;
  /** Department/team: allow taking part of each opportunity's value */
  allowPartialAllocation?: boolean;
  teamOptions?: { value: string; label: string }[];
  /** Department-grouped teams for the custom forecast multi-select */
  teamGroups?: TeamSelectGroup[];
  emptyMessage?: string;
  /** When editing an existing target, prefer these keys as the starting selection */
  preferredSelectedKeys?: string[];
  /** Starting allocated amounts by opportunity key (`type:id`) */
  preferredAllocatedAmounts?: Record<string, number>;
  /** Label for the compact target-details trigger. */
  triggerLabel?: string;
  /** Heading shown when the opportunity editor is modal. */
  modalTitle?: string;
  /** Sub-heading shown when the opportunity editor is modal. */
  modalDescription?: string;
  /** Let the surrounding card own the displayed amount. */
  hideSummaryAmount?: boolean;
  /**
   * Modal mode: render the opening control yourself so the card layout owns
   * its placement. Receives a callback that hydrates and opens the editor.
   */
  renderTrigger?: (openEditor: () => void) => ReactNode;
  requireManualEdit?: boolean;
  savedSourceType?: SalesTargetSourceType;
  targetBlockedReason?: string | null;
  manualTargetBlockedReason?: string | null;
  hideProposalStatusColumn?: boolean;
  readOnlyTeamGroupedView?: boolean;
  departmentGroupLabel?: string;
  groupReadOnlyByDepartment?: boolean;
  companyDirectTeamIds?: string[];
  groupedForecastRows?: ForecastOpportunityRow[];
  departmentRollupRowsByLabel?: Map<string, ForecastOpportunityRow[]>;
  groupedModalScope?: 'department' | 'team';
  workflowTeamFlatOpportunityList?: boolean;
  customDefaultTeamId?: string;
  customAddTriggerLabel?: string;
  customAddFormHeading?: string;
  assigneeOptions?: { value: string; label: string }[];
  /** Plan currencies. Changing one keeps this dialog open and reloads rows. */
  currencyOptions?: { value: string; label: string }[];
  activeCurrencyId?: string;
  onCurrencyChange?: (currencyId: string) => void;
  /**
   * Team-member Details: list the team's opportunities next to this member's
   * share of each one.
   */
  memberShare?: { memberName: string; teamName: string };
}) {
  const customAddButtonLabel =
    customAddTriggerLabel?.trim() || 'Add manual target';
  const blockedReason =
    (targetBlockedReason ?? manualTargetBlockedReason)?.trim() || null;
  const hasValue = value > 0;
  const showProposalMeta = useMemo(
    () =>
      !hideProposalStatusColumn &&
      forecastRows.some((row) => Boolean(row.proposalApprovalLabel)),
    [forecastRows, hideProposalStatusColumn],
  );
  const showStatusStageColumn = !hideProposalStatusColumn;
  const [isEditing, setIsEditing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [allocatedAmounts, setAllocatedAmounts] = useState<
    Record<string, number>
  >({});
  const [draftCustoms, setDraftCustoms] = useState<DraftCustomForecast[]>([]);
  const [customName, setCustomName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualTeamIds, setManualTeamIds] = useState<string[]>([]);
  const [manualMemberIds, setManualMemberIds] = useState<string[]>([]);
  const [manualSolutions, setManualSolutions] = useState<ManualSolutionDraft[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [reseatDialogOpen, setReseatDialogOpen] = useState(false);
  const reseatConfirmedRef = useRef(false);
  const manualMemberLabelsRef = useRef(new Map<string, string>());
  const [selectionLayout, setSelectionLayout] = useState<'grouped' | 'flat'>(
    'flat',
  );
  /** TTB company grouped modal: view-only until user clicks Edit forecast selection. */
  const [groupedSelectionEditing, setGroupedSelectionEditing] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const hydratedRef = useRef(false);

  const isOpen =
    editable && (requireManualEdit ? isEditing : !hasValue || isEditing);

  const rowMax = (row: ForecastOpportunityRow) =>
    Math.max(0, Number(row.forecastValue) || 0);

  const resolveAllocatedForRow = (row: ForecastOpportunityRow) => {
    const key = forecastRowKey(row);
    const max = rowMax(row);
    const preferred = preferredAllocatedAmounts?.[key];
    if (preferred !== undefined && Number.isFinite(preferred)) {
      return Math.min(max, Math.max(0, Math.round(preferred * 100) / 100));
    }
    return max;
  };

  const resolveInitialSelection = () => {
    if (preferredSelectedKeys != null) {
      const available = new Set(forecastRows.map(forecastRowKey));
      const preferred = preferredSelectedKeys.filter((key) =>
        available.has(key),
      );
      // Explicit prior selection (including empty) — never fall back to select-all.
      return new Set(preferred);
    }
    return new Set(forecastRows.map(forecastRowKey));
  };

  const hydrateAllocations = (keys: Set<string>) => {
    const next: Record<string, number> = {};
    for (const row of forecastRows) {
      const key = forecastRowKey(row);
      if (!keys.has(key)) continue;
      next[key] = resolveAllocatedForRow(row);
    }
    setAllocatedAmounts(next);
  };

  useEffect(() => {
    setDraftCustoms([]);
    setCustomName('');
    setManualAmount('');
    setManualMemberIds([]);
    setManualSolutions([]);
    setManualTeamIds(
      groupedModalScope === 'team' && customDefaultTeamId?.trim()
        ? [customDefaultTeamId.trim()]
        : [],
    );
    setSearchQuery('');
    setShowCustomForm(false);
    hydratedRef.current = false;
    if (!isEditing) {
      setChecked(new Set());
      setAllocatedAmounts({});
      return;
    }
    const initial = resolveInitialSelection();
    setChecked(initial);
    hydrateAllocations(initial);
    // Currency switches inside the open dialog. Closing here would force the
    // user to reopen Details for every currency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const lockedManualTeamId =
    groupedModalScope === 'team' ? (customDefaultTeamId?.trim() ?? '') : '';
  const selectedManualTeamIds = lockedManualTeamId
    ? [lockedManualTeamId]
    : manualTeamIds.map((id) => id.trim()).filter(Boolean);
  const familiesQuery = useProductFamilies();
  const productFamilies = familiesQuery.data ?? [];
  const familyForSolution = (productFamilyId: string) =>
    productFamilies.find((item) => item.id === productFamilyId);
  const resolveSolutionTeamIds = (solution: ManualSolutionDraft) =>
    familyForSolution(solution.productFamilyId)?.responsibleTeamIds ?? [];
  const resolveSolutionMemberIds = (solution: ManualSolutionDraft) =>
    familyForSolution(solution.productFamilyId)?.responsibleUserIds ?? [];
  const solutionHasResponsibleParties = (solution: ManualSolutionDraft) => {
    const teamIds = resolveSolutionTeamIds(solution);
    const memberIds = resolveSolutionMemberIds(solution);
    return teamIds.length > 0 || memberIds.length > 0;
  };
  const isManualSolutionComplete = (solution: ManualSolutionDraft) => {
    const touched =
      Boolean(solution.productFamilyId) ||
      Boolean(String(solution.amount).trim());
    if (!touched) return true;
    return (
      Boolean(solution.productFamilyId) &&
      Number(solution.amount) > 0 &&
      solutionHasResponsibleParties(solution)
    );
  };
  const manualMemberQueryKey =
    isEditing && showCustomForm
      ? [...new Set(selectedManualTeamIds)].join('|')
      : '';
  const manualMemberQueryOptions = useMemo(
    () =>
      manualMemberQueryKey
        .split('|')
        .filter(Boolean)
        .map((teamId) => ({
          queryKey: ['sales-team-members', teamId],
          queryFn: () => fetchSalesTeamMembers(teamId),
          staleTime: 30_000,
        })),
    [manualMemberQueryKey],
  );
  const memberQueries = useQueries(manualMemberQueryOptions);
  const manualMembersLoading = memberQueries.some(
    (query) => query.isLoading || query.isFetching,
  );

  useEffect(() => {
    // Auto-hydrate only for company/department first-time flow. Team/person
    // must click Edit so a parent save never looks like a child save.
    if (requireManualEdit) return;
    if (!hasValue && !hydratedRef.current && forecastRows.length > 0) {
      const initial = resolveInitialSelection();
      setChecked(initial);
      hydrateAllocations(initial);
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValue, forecastRows, requireManualEdit]);

  const startEditing = () => {
    const initial = resolveInitialSelection();
    setChecked(initial);
    hydrateAllocations(initial);
    setDraftCustoms([]);
    setShowCustomForm(false);
    setCustomName('');
    setManualAmount('');
    setManualMemberIds([]);
    setManualSolutions([]);
    setManualTeamIds(
      groupedModalScope === 'team' && customDefaultTeamId?.trim()
        ? [customDefaultTeamId.trim()]
        : [],
    );
    hydratedRef.current = true;
    const groupedRows = groupedForecastRows?.length
      ? groupedForecastRows
      : forecastRows;
    setGroupedSelectionEditing(false);
    if (
      groupedModalScope === 'department' ||
      (groupedModalScope === 'team' && !workflowTeamFlatOpportunityList) ||
      (readOnlyTeamGroupedView &&
        groupReadOnlyByDepartment &&
        (editable || groupedRows.length > 0)) ||
      (readOnlyTeamGroupedView && !editable)
    ) {
      setSelectionLayout('grouped');
    } else {
      setSelectionLayout('flat');
    }
    setIsEditing(true);
  };

  const enterGroupedForecastEdit = () => {
    const initial = resolveInitialSelection();
    setChecked(initial);
    hydrateAllocations(initial);
    setGroupedSelectionEditing(true);
  };

  const exitGroupedForecastEdit = () => {
    setGroupedSelectionEditing(false);
    const initial = resolveInitialSelection();
    setChecked(initial);
    hydrateAllocations(initial);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectionLayout('flat');
    setGroupedSelectionEditing(false);
    setDraftCustoms([]);
    setCustomName('');
    setManualAmount('');
    setManualMemberIds([]);
    setManualSolutions([]);
    setManualTeamIds([]);
    setAllocatedAmounts({});
    setSearchQuery('');
    setShowCustomForm(false);
  };

  const selectedRows = useMemo(
    () => forecastRows.filter((row) => checked.has(forecastRowKey(row))),
    [forecastRows, checked],
  );
  const selectedCustomRows = selectedRows.filter(
    (row) => row.opportunityType === 'custom',
  );
  const selectedLiveRows = selectedRows.filter(
    (row) => row.opportunityType !== 'custom',
  );

  const amountForRow = (row: ForecastOpportunityRow) => {
    const key = forecastRowKey(row);
    const max = rowMax(row);
    if (!allowPartialAllocation) return max;
    const allocated = allocatedAmounts[key];
    if (allocated === undefined) return max;
    return Math.min(max, Math.max(0, allocated));
  };

  // Draft customs: sum of per-team amounts.
  const draftCustomTotal = draftCustoms.reduce(
    (sum, row) => sum + draftCustomTotalAmount(row),
    0,
  );
  const selectedRowsTotal = selectedRows.reduce(
    (sum, row) => sum + amountForRow(row),
    0,
  );
  const selectedTotal = selectedRowsTotal + draftCustomTotal;
  const roundedSelectedTotal = Math.round(selectedTotal * 100) / 100;
  const effectiveAmount = roundedSelectedTotal;
  // Always allow Save while the opportunity editor is open so users can
  // include/exclude even when the current saved target is 0 / Not set.
  const saveBlocked = Boolean(blockedReason);
  const canSave = isOpen && !saveBlocked;

  useEffect(() => {
    if (!onDraftAmountChange) return;
    if (editable && isOpen) {
      onDraftAmountChange(effectiveAmount);
      return;
    }
    onDraftAmountChange(null);
  }, [editable, isOpen, effectiveAmount, onDraftAmountChange]);

  const toggleRow = (row: ForecastOpportunityRow) => {
    const key = forecastRowKey(row);
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
        setAllocatedAmounts((amounts) => {
          const copy = { ...amounts };
          delete copy[key];
          return copy;
        });
      } else {
        next.add(key);
        setAllocatedAmounts((amounts) => ({
          ...amounts,
          [key]: resolveAllocatedForRow(row),
        }));
      }
      return next;
    });
  };

  const setRowAllocation = (row: ForecastOpportunityRow, raw: string) => {
    const key = forecastRowKey(row);
    const max = rowMax(row);
    const parsed = Number(raw);
    const nextValue = Number.isFinite(parsed)
      ? Math.min(max, Math.max(0, Math.round(parsed * 100) / 100))
      : 0;
    setAllocatedAmounts((current) => ({ ...current, [key]: nextValue }));
  };

  const addCustomDraft = () => {
    const name = customName.trim();
    const amount = Number(manualAmount) || 0;
    const teamIds = selectedManualTeamIds;
    if (!name || teamIds.length === 0 || amount <= 0) return;

    const teams = teamIds.map((salesTeamId) => ({
      salesTeamId,
      amount,
    }));

    const memberIds = manualMemberIds.filter((id) =>
      manualMemberOptions.some((option) => option.value === id),
    );
    const assignees = memberIds.map((userId) => ({
      userId,
      amount,
    }));
    const solutions = manualSolutions
      .filter(
        (solution) =>
          solution.productFamilyId &&
          Number(solution.amount) > 0 &&
          solutionHasResponsibleParties(solution),
      )
      .map((solution) => ({
        productFamilyId: solution.productFamilyId,
        name: familyForSolution(solution.productFamilyId)?.name || 'Solution',
        amount: Number(solution.amount) || 0,
        teamIds: resolveSolutionTeamIds(solution),
        memberIds: resolveSolutionMemberIds(solution),
      }));

    for (const assignee of assignees) {
      const label = manualMemberOptions.find(
        (option) => option.value === assignee.userId,
      )?.label;
      if (label) manualMemberLabelsRef.current.set(assignee.userId, label);
    }

    setDraftCustoms((current) => [
      ...current,
      {
        localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        opportunityName: name,
        groupId:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        value: amount,
        teams,
        assignees,
        solutions,
      },
    ]);
    setCustomName('');
    setManualAmount('');
    setManualMemberIds([]);
    setManualSolutions([]);
    setManualTeamIds(lockedManualTeamId ? [lockedManualTeamId] : []);
  };

  const removeDraftCustom = (localId: string) => {
    setDraftCustoms((current) =>
      current.filter((row) => row.localId !== localId),
    );
  };

  const save = async () => {
    if (saving || !canSave || !onSaveSelection) return;
    if (saveBlocked) return;
    setSaving(true);
    try {
      const sourceType: SalesTargetSourceType = 'edited_forecast';
      const rowsWithAllocation: ForecastRowWithAllocation[] = [
        ...selectedLiveRows,
        ...selectedCustomRows,
      ].map((row) => ({
        ...row,
        allocatedAmount: amountForRow(row),
      }));
      const overrides = rowsWithAllocation.map((row) => ({
        opportunityType: row.opportunityType,
        opportunityId: row.opportunityId,
        forecastValue:
          Number(row.allocatedAmount) || Number(row.forecastValue) || 0,
      }));
      const saved = await onSaveSelection(
        {
          amount: effectiveAmount,
          sourceType,
          rows: rowsWithAllocation,
          draftCustoms,
          selectedCustomRows: rowsWithAllocation.filter(
            (row) => row.opportunityType === 'custom',
          ),
          overrides,
        },
        { reseatConfirmed: reseatConfirmedRef.current },
      );
      if (saved === false) return;
      if (saved === 'confirm-reseat') {
        setReseatDialogOpen(true);
        return;
      }
      reseatConfirmedRef.current = false;
      setIsEditing(false);
      setSelectionLayout('flat');
      setGroupedSelectionEditing(false);
      setDraftCustoms([]);
      setAllocatedAmounts({});
    } finally {
      setSaving(false);
    }
  };

  const teamLabel = useCallback(
    (teamId: string) =>
      teamOptions.find((t) => t.value === teamId)?.label ??
      teamGroups.flatMap((g) => g.options).find((t) => t.value === teamId)
        ?.label ??
      teamId,
    [teamOptions, teamGroups],
  );

  const rowMatchesSearch = useCallback(
    (row: ForecastOpportunityRow, query: string) => {
      const teamName = row.salesTeamId ? teamLabel(row.salesTeamId) : '';
      return (
        row.opportunityName?.toLowerCase().includes(query) ||
        row.customerName?.toLowerCase().includes(query) ||
        row.ownerName?.toLowerCase().includes(query) ||
        row.stageName?.toLowerCase().includes(query) ||
        row.department?.toLowerCase().includes(query) ||
        teamName.toLowerCase().includes(query)
      );
    },
    [teamLabel],
  );

  const filteredForecastRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return forecastRows;
    return forecastRows.filter((row) => rowMatchesSearch(row, query));
  }, [forecastRows, searchQuery, rowMatchesSearch]);

  const rowsForGroupedView = useMemo(() => {
    const source = groupedForecastRows?.length
      ? groupedForecastRows
      : forecastRows;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((row) => rowMatchesSearch(row, query));
  }, [groupedForecastRows, forecastRows, searchQuery, rowMatchesSearch]);

  type ReadOnlyGroupedTeam = {
    teamKey: string;
    label: string;
    rows: ForecastOpportunityRow[];
    total: number;
  };

  const readOnlyTeamsGrouped = useMemo((): ReadOnlyGroupedTeam[] => {
    if (
      !readOnlyTeamGroupedView &&
      groupedModalScope !== 'department' &&
      groupedModalScope !== 'team'
    ) {
      return [];
    }
    const map = new Map<string, ForecastOpportunityRow[]>();
    for (const row of rowsForGroupedView) {
      const teamId = row.salesTeamId?.trim() ?? '';
      const bucketKey = teamId || 'unassigned';
      if (!map.has(bucketKey)) map.set(bucketKey, []);
      map.get(bucketKey)!.push(row);
    }
    return [...map.entries()]
      .map(([teamKey, rows]) => ({
        teamKey,
        label: teamKey === 'unassigned' ? 'Unassigned' : teamLabel(teamKey),
        rows,
        total:
          Math.round(
            rows.reduce((sum, row) => sum + Number(row.forecastValue ?? 0), 0) *
              100,
          ) / 100,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    readOnlyTeamGroupedView,
    groupedModalScope,
    rowsForGroupedView,
    teamLabel,
  ]);

  const readOnlyDepartmentsGrouped = useMemo(() => {
    if (
      !readOnlyTeamGroupedView ||
      !groupReadOnlyByDepartment ||
      departmentGroupLabel ||
      groupedModalScope
    ) {
      return [];
    }

    const groupDeptRowsIntoTeams = (
      departmentLabel: string,
      deptRows: ForecastOpportunityRow[],
    ) => {
      const teamsMap = new Map<string, ReadOnlyGroupedTeam>();
      for (const row of deptRows) {
        const teamId = row.salesTeamId?.trim() ?? '';
        const teamKey = teamId || `unassigned:${forecastRowKey(row)}`;
        const teamLabelText = teamId
          ? teamLabel(teamId)
          : row.ownerName?.trim() || 'Unassigned';
        const rowKey = opportunityKey(row.opportunityType, row.opportunityId);
        const existing = teamsMap.get(teamKey);
        if (existing) {
          if (
            existing.rows.some(
              (entry) =>
                opportunityKey(entry.opportunityType, entry.opportunityId) ===
                rowKey,
            )
          ) {
            continue;
          }
          existing.rows.push(row);
          existing.total =
            Math.round(
              (existing.total + (Number(row.forecastValue) || 0)) * 100,
            ) / 100;
        } else {
          teamsMap.set(teamKey, {
            teamKey,
            label: teamLabelText,
            rows: [row],
            total: Math.round((Number(row.forecastValue) || 0) * 100) / 100,
          });
        }
      }
      const group = teamGroups.find((entry) => entry.label === departmentLabel);
      if (group) {
        for (const option of group.options) {
          if (teamsMap.has(option.value)) continue;
          teamsMap.set(option.value, {
            teamKey: option.value,
            label: option.label,
            rows: [],
            total: 0,
          });
        }
      }
      const teams = [...teamsMap.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      return {
        departmentLabel,
        teams,
        total: sumUniqueOpportunityForecastValue(deptRows),
      };
    };

    if (departmentRollupRowsByLabel?.size) {
      const departments = [...departmentRollupRowsByLabel.entries()].map(
        ([departmentLabel, deptRows]) =>
          groupDeptRowsIntoTeams(departmentLabel, deptRows),
      );
      departments.sort((a, b) => {
        if (a.departmentLabel === 'Company') return -1;
        if (b.departmentLabel === 'Company') return 1;
        return a.departmentLabel.localeCompare(b.departmentLabel);
      });
      return departments;
    }

    const teamToDept = new Map<string, string>();
    for (const group of teamGroups) {
      for (const option of group.options) {
        teamToDept.set(option.value, group.label);
      }
    }
    const directTeamSet = new Set(companyDirectTeamIds);
    const deptMap = new Map<
      string,
      { departmentLabel: string; teams: Map<string, ReadOnlyGroupedTeam> }
    >();

    for (const row of rowsForGroupedView) {
      const teamId = row.salesTeamId?.trim() ?? '';
      const deptLabel =
        teamId && directTeamSet.has(teamId)
          ? 'Company'
          : ((teamId ? teamToDept.get(teamId) : null) ??
            row.department?.trim() ??
            'Other');
      const teamKey = teamId || `unassigned:${forecastRowKey(row)}`;
      const teamLabelText = teamId
        ? teamLabel(teamId)
        : row.ownerName?.trim() || 'Unassigned';

      if (!deptMap.has(deptLabel)) {
        deptMap.set(deptLabel, {
          departmentLabel: deptLabel,
          teams: new Map(),
        });
      }
      const dept = deptMap.get(deptLabel)!;
      const existing = dept.teams.get(teamKey);
      const rowKey = opportunityKey(row.opportunityType, row.opportunityId);
      if (existing) {
        if (
          existing.rows.some(
            (entry) =>
              opportunityKey(entry.opportunityType, entry.opportunityId) ===
              rowKey,
          )
        ) {
          continue;
        }
        existing.rows.push(row);
        existing.total =
          Math.round(
            (existing.total + (Number(row.forecastValue) || 0)) * 100,
          ) / 100;
      } else {
        dept.teams.set(teamKey, {
          teamKey,
          label: teamLabelText,
          rows: [row],
          total: Math.round((Number(row.forecastValue) || 0) * 100) / 100,
        });
      }
    }

    for (const group of teamGroups) {
      if (!deptMap.has(group.label)) {
        deptMap.set(group.label, {
          departmentLabel: group.label,
          teams: new Map(),
        });
      }
      const dept = deptMap.get(group.label)!;
      for (const option of group.options) {
        if (dept.teams.has(option.value)) continue;
        dept.teams.set(option.value, {
          teamKey: option.value,
          label: option.label,
          rows: [],
          total: 0,
        });
      }
    }

    const departments = [...deptMap.values()].map((dept) => {
      const teams = [...dept.teams.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      const rollupRows = teams.flatMap((team) => team.rows);
      return {
        departmentLabel: dept.departmentLabel,
        teams,
        total: sumUniqueOpportunityForecastValue(rollupRows),
      };
    });
    departments.sort((a, b) => {
      if (a.departmentLabel === 'Company') return -1;
      if (b.departmentLabel === 'Company') return 1;
      return a.departmentLabel.localeCompare(b.departmentLabel);
    });
    return departments;
  }, [
    readOnlyTeamGroupedView,
    groupReadOnlyByDepartment,
    departmentGroupLabel,
    groupedModalScope,
    teamGroups,
    companyDirectTeamIds,
    rowsForGroupedView,
    teamLabel,
    departmentRollupRowsByLabel,
  ]);

  const isCompanyGroupedModal =
    readOnlyTeamGroupedView && groupReadOnlyByDepartment && !groupedModalScope;

  const workflowTeamFlatList =
    groupedModalScope === 'team' && workflowTeamFlatOpportunityList;

  const isScopedGroupedModal =
    (groupedModalScope === 'department' || groupedModalScope === 'team') &&
    !workflowTeamFlatList;

  const isMemberModal = Boolean(memberShare);

  const showGroupedModalLayout =
    !isMemberModal &&
    (isCompanyGroupedModal || isScopedGroupedModal) &&
    (selectionLayout === 'grouped' || !editable || isScopedGroupedModal);

  const canSelectInModal = editable && Boolean(onSaveSelection) && !saveBlocked;

  const groupedHierarchySelectable =
    showGroupedModalLayout &&
    canSelectInModal &&
    (groupedModalScope === 'department' || groupedModalScope === 'team'
      ? true
      : isCompanyGroupedModal && groupedSelectionEditing);

  const detailsSelectable = isMemberModal
    ? canSelectInModal
    : showGroupedModalLayout
      ? groupedHierarchySelectable
      : editable && !saveBlocked;

  const toggleGroupedRows = (rows: ForecastOpportunityRow[]) => {
    if (!rows.length) return;
    const keys = rows.map(forecastRowKey);
    const allRowsSelected = keys.every((key) => checked.has(key));
    setChecked((current) => {
      const next = new Set(current);
      for (const row of rows) {
        const key = forecastRowKey(row);
        if (allRowsSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
    if (allRowsSelected) {
      setAllocatedAmounts((amounts) => {
        const copy = { ...amounts };
        for (const key of keys) delete copy[key];
        return copy;
      });
    } else {
      setAllocatedAmounts((amounts) => {
        const copy = { ...amounts };
        for (const row of rows) {
          const key = forecastRowKey(row);
          copy[key] = resolveAllocatedForRow(row);
        }
        return copy;
      });
    }
  };

  const draftTeamLabels = (ids: string[]) =>
    ids.map(teamLabel).filter(Boolean).join(', ');

  const selectAllRows = () => {
    const next = new Set(forecastRows.map(forecastRowKey));
    setChecked(next);
    hydrateAllocations(next);
  };

  const clearSelection = () => {
    setChecked(new Set());
    setAllocatedAmounts({});
  };

  const displayedModalTotal =
    groupedHierarchySelectable || !showGroupedModalLayout
      ? roundedSelectedTotal
      : value;

  const flatTeamOptions =
    teamOptions.length > 0
      ? teamOptions
      : teamGroups.flatMap((group) =>
          group.options.map((team) => ({
            value: team.value,
            label: team.label,
          })),
        );

  const manualMemberTeamByUserId = new Map<string, string>();
  const queriedMemberTeamIds = manualMemberQueryKey.split('|').filter(Boolean);
  const memberGroupsForTeams = (teamIds: string[]) => {
    const seen = new Set<string>();
    return teamIds.flatMap((teamId) => {
      const index = queriedMemberTeamIds.indexOf(teamId);
      const members =
        (memberQueries[index]?.data as CommercialTeamMember[] | undefined) ??
        [];
      const options = members.flatMap((member) => {
        const id = member.id?.trim();
        if (!id || seen.has(id)) return [];
        seen.add(id);
        manualMemberTeamByUserId.set(id, teamId);
        const label =
          [member.firstName, member.middleName, member.lastName]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(' ') ||
          member.email?.trim() ||
          id;
        return [{ value: id, label }];
      });
      if (options.length === 0) return [];
      return [{ label: teamLabel(teamId), options }];
    });
  };
  const manualMemberGroups = memberGroupsForTeams(selectedManualTeamIds);
  const manualMemberOptions = manualMemberGroups.flatMap(
    (group) => group.options,
  );
  const manualMemberOptionKey = manualMemberOptions
    .map((option) => option.value)
    .join('|');
  const manualTeamLocked = Boolean(lockedManualTeamId);
  const canAddManualTarget =
    Boolean(customName.trim()) &&
    selectedManualTeamIds.length > 0 &&
    Number(manualAmount) > 0 &&
    manualSolutions.every(isManualSolutionComplete);
  const manualAmountHint =
    'Each selected team and member receives this value. The company counts it once.';

  useEffect(() => {
    if (manualMembersLoading) return;
    const allowed = new Set(manualMemberOptionKey.split('|').filter(Boolean));
    setManualMemberIds((current) => {
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length ? current : next;
    });
  }, [manualMembersLoading, manualMemberOptionKey]);

  const openManualTarget = () => {
    if (isCompanyGroupedModal && !groupedSelectionEditing) {
      enterGroupedForecastEdit();
    }
    if (lockedManualTeamId) {
      setManualTeamIds([lockedManualTeamId]);
    }
    setShowCustomForm(true);
  };

  const closeManualTarget = () => {
    setShowCustomForm(false);
    setCustomName('');
    setManualAmount('');
    setManualMemberIds([]);
    setManualSolutions([]);
    setManualTeamIds(lockedManualTeamId ? [lockedManualTeamId] : []);
  };

  const stageForRow = (row: ForecastOpportunityRow): DetailsStage | null => {
    if (!showStatusStageColumn) return null;
    if (showProposalMeta) {
      const label = row.proposalApprovalLabel?.trim();
      if (!label) return null;
      const approved =
        label === 'Dept approved' ||
        label === 'Company approved' ||
        label === 'Official';
      return { label, tone: approved ? 'positive' : 'pending' };
    }
    const label = row.stageName?.trim();
    return label ? { label, tone: 'neutral' } : null;
  };

  const toDetailsOpp = (
    row: ForecastOpportunityRow,
  ): DetailsOpp<ForecastOpportunityRow> => {
    const key = forecastRowKey(row);
    const isChecked = checked.has(key);
    return {
      key,
      row,
      name: row.opportunityName,
      isCustom: row.opportunityType === 'custom',
      customer: row.customerName,
      owner: row.ownerName,
      teamLabel: row.salesTeamId
        ? teamLabel(row.salesTeamId)
        : (row.department ?? null),
      stage: stageForRow(row),
      closeDate: row.expectedCloseDate,
      solutions: row.solutions?.map((solution) => ({
        name: solution.name,
        amount: solution.amount,
        assigneeNames: solution.assigneeNames,
      })),
      poolAmount: rowMax(row),
      amount: isChecked ? amountForRow(row) : rowMax(row),
      checked: isChecked,
    };
  };

  const detailsLayout: DetailsLayout<ForecastOpportunityRow> = (() => {
    if (isMemberModal && memberShare) {
      const rows = detailsSelectable
        ? filteredForecastRows
        : filteredForecastRows.filter((row) =>
            checked.has(forecastRowKey(row)),
          );
      return {
        kind: 'teams',
        teams: [
          {
            key: 'member-team',
            label: memberShare.teamName,
            opps: rows.map(toDetailsOpp),
          },
        ],
      };
    }
    if (showGroupedModalLayout) {
      const toTeam = (
        team: ReadOnlyGroupedTeam,
        prefix: string,
      ): DetailsTeamGroup<ForecastOpportunityRow> => ({
        key: `team:${prefix}::${team.teamKey}`,
        label: team.label,
        opps: team.rows.map(toDetailsOpp),
      });
      if (readOnlyDepartmentsGrouped.length > 0) {
        return {
          kind: 'departments',
          departments: readOnlyDepartmentsGrouped.map((dept) => ({
            key: `dept:${dept.departmentLabel}`,
            label: dept.departmentLabel,
            teams: dept.teams.map((team) => toTeam(team, dept.departmentLabel)),
          })),
        };
      }
      if (
        groupedModalScope === 'department' &&
        departmentGroupLabel?.trim() &&
        readOnlyTeamsGrouped.length > 0
      ) {
        const deptLabel = departmentGroupLabel.trim();
        return {
          kind: 'teams',
          teams: readOnlyTeamsGrouped.map((team) => toTeam(team, deptLabel)),
        };
      }
      return {
        kind: 'teams',
        teams: readOnlyTeamsGrouped.map((team) =>
          toTeam(team, departmentGroupLabel ?? groupedModalScope ?? 'teams'),
        ),
      };
    }
    return { kind: 'flat', opps: filteredForecastRows.map(toDetailsOpp) };
  })();

  const modalPoolRows = showGroupedModalLayout
    ? groupedForecastRows?.length
      ? groupedForecastRows
      : forecastRows
    : forecastRows;
  const modalPoolTotal = sumUniqueOpportunityForecastValue(
    modalPoolRows.map((row) => ({
      ...row,
      forecastValue: rowMax(row),
    })),
  );
  const modalCoverage =
    modalPoolTotal > 0
      ? `${Math.round((displayedModalTotal / modalPoolTotal) * 100)}%`
      : '—';
  const modalUniqueOpportunityCount =
    uniqueOpportunityCountFromRows(modalPoolRows);
  const opportunityCountLabel = `${modalUniqueOpportunityCount} ${
    modalUniqueOpportunityCount === 1 ? 'opportunity' : 'opportunities'
  }`;

  const modalStats: DetailsStat[] = isMemberModal
    ? [
        {
          label: 'Member target',
          value: formatCompactMoney(displayedModalTotal, currency),
          hint: `${checked.size} of ${uniqueOpportunityCountFromRows(forecastRows)} team opportunities`,
          highlight: true,
        },
        {
          label: 'Team forecast',
          value: formatCompactMoney(modalPoolTotal, currency),
          hint: memberShare?.teamName,
        },
        {
          label: 'Share of team',
          value: modalCoverage,
          hint: 'of team forecast',
        },
      ]
    : [
        {
          label: 'Target amount',
          value: formatCompactMoney(displayedModalTotal, currency),
          hint: draftCustoms.length
            ? `Includes ${draftCustoms.length} manual target${draftCustoms.length === 1 ? '' : 's'}`
            : detailsSelectable
              ? `${checked.size} of ${forecastRows.length} selected`
              : undefined,
          highlight: true,
        },
        {
          label: 'Forecast pool',
          value: formatCompactMoney(modalPoolTotal, currency),
          hint: opportunityCountLabel,
        },
        {
          label: 'Coverage',
          value: modalCoverage,
          hint: 'of forecast pool',
        },
      ];

  const pendingManualItems: DetailsPendingManual[] = draftCustoms.map((row) => {
    const memberNames = row.assignees.map(
      (assignee) =>
        manualMemberLabelsRef.current.get(assignee.userId) ??
        assigneeOptions.find((option) => option.value === assignee.userId)
          ?.label ??
        manualMemberOptions.find((option) => option.value === assignee.userId)
          ?.label ??
        'Member',
    );
    return {
      id: row.localId,
      name: row.opportunityName,
      meta:
        [
          draftTeamLabels(row.teams.map((team) => team.salesTeamId)),
          memberNames.join(', '),
          (row.solutions ?? [])
            .map((solution) => solution.name)
            .filter(Boolean)
            .join(', '),
        ]
          .filter(Boolean)
          .join(' · ') || 'Manual target',
      amount: draftCustomTotalAmount(row),
    };
  });

  const manualTrigger =
    allowCustomAdd && editable && !saveBlocked && !showCustomForm ? (
      <Button
        type="button"
        variant="outline"
        className="h-9 gap-1.5 border-brand/50 bg-surface-card px-3 text-sm font-medium text-brand shadow-none hover:bg-brand-muted hover:text-brand"
        onClick={openManualTarget}
      >
        <Plus className="size-4" />
        {customAddButtonLabel}
      </Button>
    ) : null;

  const manualPanel =
    allowCustomAdd && editable && showCustomForm ? (
      <ManualTargetPanel
        currency={currency}
        name={customName}
        onNameChange={setCustomName}
        amount={manualAmount}
        onAmountChange={setManualAmount}
        amountHint={manualAmountHint}
        teamIds={selectedManualTeamIds}
        teamLocked={manualTeamLocked}
        teamLockedLabel={teamLabel(lockedManualTeamId)}
        teamGroups={
          teamGroups.length > 0
            ? teamGroups
            : [{ label: '', options: flatTeamOptions }]
        }
        onTeamIdsChange={setManualTeamIds}
        memberIds={manualMemberIds}
        memberGroups={manualMemberGroups}
        memberPlaceholder={
          selectedManualTeamIds.length === 0
            ? 'Select a team first'
            : manualMembersLoading
              ? 'Loading members…'
              : manualMemberOptions.length === 0
                ? 'No members on these teams'
                : 'Select members'
        }
        memberEmptyLabel={
          selectedManualTeamIds.length === 0
            ? 'Select a team first'
            : 'No members on these teams'
        }
        memberDisabled={
          selectedManualTeamIds.length === 0 ||
          (!manualMembersLoading && manualMemberOptions.length === 0)
        }
        memberLoading={manualMembersLoading}
        onMemberIdsChange={setManualMemberIds}
        solutions={manualSolutions}
        onSolutionsChange={setManualSolutions}
        familyOptions={productFamilies.map((family) => ({
          value: family.id,
          label: family.name,
          responsibleTeamIds: family.responsibleTeamIds ?? [],
          responsibleUserIds: family.responsibleUserIds ?? [],
        }))}
        canAdd={canAddManualTarget}
        onAdd={addCustomDraft}
        onCancel={closeManualTarget}
      />
    ) : null;

  const savedOpportunityCount =
    preferredSelectedKeys?.length ?? (hasValue ? forecastRows.length : 0);

  const footerScopeLabel = isMemberModal
    ? 'Member total'
    : showGroupedModalLayout
      ? groupedModalScope === 'team'
        ? 'Team total'
        : groupedModalScope === 'department'
          ? 'Department total'
          : 'Company total'
      : 'Total';

  const dismissLabel =
    isCompanyGroupedModal && groupedSelectionEditing
      ? 'Back'
      : detailsSelectable || !showGroupedModalLayout
        ? 'Cancel'
        : 'Close';

  return (
    <>
      {renderTrigger ? (
        renderTrigger(startEditing)
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                'text-lg font-semibold tabular-nums text-foreground',
                hideSummaryAmount && 'hidden',
              )}
            >
              {value > 0 ? formatCompactMoney(value, currency) : 'Not set'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {savedOpportunityCount} contributing opportunit
              {savedOpportunityCount === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="h-8 shrink-0 gap-1.5 border-brand/40 px-3 text-[11px] font-semibold text-brand hover:bg-brand-muted"
          >
            <Pencil className="size-3.5" />
            {triggerLabel}
          </Button>
        </div>
      )}

      <TargetDetailsDialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!open && (saving || reseatDialogOpen)) return;
          if (!open) cancelEditing();
        }}
        title={modalTitle}
        description={
          modalDescription ??
          'Choose the forecast opportunities that count toward this target.'
        }
        currency={currency}
        currencyControl={
          onCurrencyChange && currencyOptions.length > 0 ? (
            <SimpleCurrencyDropdown
              currencyOptions={currencyOptions}
              value={activeCurrencyId ?? ''}
              onChange={onCurrencyChange}
            />
          ) : null
        }
        blockedReason={saveBlocked ? blockedReason : null}
        stats={modalStats}
        layout={detailsLayout}
        selectable={detailsSelectable}
        member={isMemberModal}
        shareEditable={
          isMemberModal && detailsSelectable && allowPartialAllocation
        }
        showStageColumn={showStatusStageColumn}
        stageColumnLabel={showProposalMeta ? 'Status' : 'Stage'}
        selectedCount={checked.size}
        totalCount={forecastRows.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        emptyMessage={emptyMessage}
        onToggleOpp={(opp) => toggleRow(opp.row)}
        onToggleMany={(opps) => toggleGroupedRows(opps.map((opp) => opp.row))}
        onSelectAll={selectAllRows}
        onClear={clearSelection}
        onShareChange={(opp, raw) => setRowAllocation(opp.row, raw)}
        manualTrigger={manualTrigger}
        manualPanel={manualPanel}
        pendingManual={pendingManualItems}
        onRemovePending={removeDraftCustom}
        footerSummary={
          <>
            {footerScopeLabel}
            <span className="ml-2 text-sm font-semibold tabular-nums text-foreground">
              {formatCompactMoney(
                groupedHierarchySelectable || !showGroupedModalLayout
                  ? effectiveAmount
                  : value,
                currency,
              )}
            </span>
          </>
        }
        footerActions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={
                isCompanyGroupedModal && groupedSelectionEditing
                  ? exitGroupedForecastEdit
                  : cancelEditing
              }
            >
              {dismissLabel}
            </Button>
            {isCompanyGroupedModal &&
            editable &&
            onSaveSelection &&
            !groupedSelectionEditing ? (
              <Button
                type="button"
                className="h-9 bg-brand px-4 text-sm text-brand-foreground hover:bg-brand-hover"
                onClick={enterGroupedForecastEdit}
              >
                Edit selection
              </Button>
            ) : null}
            {groupedHierarchySelectable || !showGroupedModalLayout ? (
              <Button
                type="button"
                disabled={!onSaveSelection || saving || !canSave}
                className="h-9 bg-brand px-4 text-sm text-brand-foreground hover:bg-brand-hover"
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </>
        }
      >
        <ConfirmReseatDialog
          open={reseatDialogOpen}
          confirming={saving}
          onOpenChange={(open) => {
            if (open || saving || reseatConfirmedRef.current) return;
            setReseatDialogOpen(false);
          }}
          onConfirm={() => {
            reseatConfirmedRef.current = true;
            setReseatDialogOpen(false);
            void save();
          }}
        />
      </TargetDetailsDialog>
    </>
  );
}

export function PerformanceStatus({
  label,
  currency,
  totalTarget,
  items,
  emptyMessage = 'No items to display.',
  sections = 'all',
}: {
  label: string;
  currency: string;
  totalTarget: number;
  items: { name: string; target: number; achieved: number }[];
  emptyMessage?: string;
  sections?: 'all' | 'summary' | 'table';
}) {
  const totalAchieved = items.reduce((sum, item) => sum + item.achieved, 0);
  const achievedPct = computeLeadTargetPct(totalAchieved, totalTarget);
  const remaining = Math.max(0, totalTarget - totalAchieved);
  const isOverAchieved = totalTarget > 0 && totalAchieved > totalTarget;
  const ringPct = Math.min(achievedPct, 100);
  const ringSize = 88;
  const ringStroke = 7;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringPct / 100) * ringCircumference;

  const sortedItems = [...items].sort((a, b) => {
    const aPct = computeLeadTargetPct(a.achieved, a.target);
    const bPct = computeLeadTargetPct(b.achieved, b.target);
    if (bPct !== aPct) return bPct - aPct;
    return b.achieved - a.achieved;
  });

  const showSummary = sections === 'all' || sections === 'summary';
  const showTable = sections === 'all' || sections === 'table';

  return (
    <div className="flex w-full flex-col">
      {showSummary ? (
        <div className="border-b border-border px-6 py-4">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              <div className="relative flex size-[88px] shrink-0 items-center justify-center">
                <svg
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                  className="-rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke={tokens.color.brandMuted}
                    strokeWidth={ringStroke}
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke={
                      isOverAchieved ? tokens.color.success : tokens.color.brand
                    }
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {totalTarget > 0 ? formatTargetPercent(achievedPct) : '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Achieved
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {formatCompactMoney(totalAchieved, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Target
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {totalTarget > 0
                      ? formatCompactMoney(totalTarget, currency)
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {isOverAchieved ? 'Over' : 'Remaining'}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-base font-semibold tabular-nums',
                      isOverAchieved ? 'text-success' : 'text-foreground',
                    )}
                  >
                    {totalTarget > 0
                      ? formatCompactMoney(
                          isOverAchieved
                            ? totalAchieved - totalTarget
                            : remaining,
                          currency,
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {items.length} {items.length === 1 ? 'entity' : 'entities'}{' '}
                tracked
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showTable ? (
        <PerformanceTable
          rows={sortedItems.map((item) => ({
            id: item.name,
            name: item.name,
            achieved: item.achieved,
            target: item.target,
          }))}
          currency={currency}
          emptyMessage={emptyMessage}
        />
      ) : null}
    </div>
  );
}

export function AnnualTargetGlance({
  teamName,
  currency,
  annual,
}: {
  teamName: string;
  currency: string;
  annual: number;
}) {
  return (
    <div className="flex max-w-full items-center gap-2.5 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 sm:max-w-sm">
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Annual · {currency}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{teamName}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {annual > 0 ? formatCompactMoney(annual, currency) : 'Not set'}
      </p>
    </div>
  );
}

export function AnnualSummary({
  label,
  subtitle,
  currency,
  annual,
  achieved,
  onAnnualChange,
  compact = false,
}: {
  label: string;
  subtitle?: string;
  currency: string;
  annual: number;
  achieved?: number;
  onAnnualChange?: (annual: number) => void | Promise<void>;
  compact?: boolean;
}) {
  const achievedPct = computeLeadTargetPct(achieved ?? 0, annual);

  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className={subtitle ? 'mt-2' : 'mt-1'}>
        {onAnnualChange ? (
          <EditableTargetInput
            key={`${currency}-annual`}
            value={annual}
            currency={currency}
            placeholder="Enter annual target"
            inputClassName={
              compact
                ? 'h-9 text-sm font-semibold'
                : 'h-10 text-lg font-semibold'
            }
            saveClassName={compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm'}
            onSave={onAnnualChange}
          />
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatCompactMoney(annual, currency)}
          </p>
        )}
      </div>
      {achieved !== undefined && annual > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Achieved to date
            </p>
            <p className="text-[12px] font-semibold tabular-nums text-brand">
              {formatTargetPercent(achievedPct)}
            </p>
          </div>
          <p className="mt-1 text-[12px] font-semibold tabular-nums text-foreground">
            {formatCompactMoney(achieved, currency)}
            <span className="font-medium text-muted-foreground">
              {' '}
              / {formatCompactMoney(annual, currency)}
            </span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${Math.min(achievedPct, 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { quarterSum };
