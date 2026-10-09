'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Check,
  ChevronsUpDown,
  Loader2,
  Target,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { usePipelineDealOptions } from '@/store/server/features/deals/pipeline/queries';
import { usePipelineLeadOptions } from '@/store/server/features/leads/pipeline/queries';
import { useGetContactsCatalog } from '@/store/server/features/contacts/queries';

const OVERLAY_Z_INDEX = 2147483647;

type DropdownPanelPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_VIEWPORT_PAD = 8;
const DROPDOWN_PREFERRED_MAX = 240;
/** Prefer opening down unless space below is truly too small. */
const DROPDOWN_MIN_DOWN_SPACE = 100;

function usePortaledDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
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
      const width = Math.min(
        Math.max(rect.width, 280),
        window.innerWidth - DROPDOWN_VIEWPORT_PAD * 2,
      );
      const left = Math.min(
        Math.max(DROPDOWN_VIEWPORT_PAD, rect.left),
        window.innerWidth - width - DROPDOWN_VIEWPORT_PAD,
      );

      const spaceBelow =
        window.innerHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
      const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
      // Keep the menu attached under the field whenever possible so it does
      // not jump to the middle of the modal when the trigger is low.
      const openUpward =
        spaceBelow < DROPDOWN_MIN_DOWN_SPACE && spaceAbove > spaceBelow;
      const available = Math.max(
        96,
        openUpward ? spaceAbove : Math.max(spaceBelow, 96),
      );
      const maxHeight = Math.min(DROPDOWN_PREFERRED_MAX, available);

      if (openUpward) {
        setPosition({
          bottom: window.innerHeight - rect.top + DROPDOWN_GAP,
          left,
          width,
          maxHeight,
        });
      } else {
        setPosition({
          top: rect.bottom + DROPDOWN_GAP,
          left,
          width,
          maxHeight,
        });
      }
    };

    // Bring the trigger into the modal scroll area so more room exists below.
    triggerRef.current.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });

    const frameId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef]);

  return position;
}

export type CrmLinkPrimaryType = 'none' | 'deal' | 'lead' | 'contact';

export type CrmEntityRef = {
  id: string;
  name: string;
  customerId?: string | null;
};

export type TaskCrmLinkValue = {
  primaryType: CrmLinkPrimaryType;
  deal: CrmEntityRef | null;
  lead: CrmEntityRef | null;
  contact: CrmEntityRef | null;
};

export const EMPTY_CRM_LINK: TaskCrmLinkValue = {
  primaryType: 'none',
  deal: null,
  lead: null,
  contact: null,
};

export function taskCrmLinkFromIds(input?: {
  leadId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  relatedLinks?: Array<{ type: string; id: string; name: string }>;
}): TaskCrmLinkValue {
  const byType = new Map(
    (input?.relatedLinks || []).map((l) => [l.type, l] as const),
  );
  const dealLink = byType.get('deal');
  const leadLink = byType.get('lead');
  const contactLink = byType.get('contact');

  if (input?.dealId || dealLink) {
    return {
      primaryType: 'deal',
      deal: {
        id: input?.dealId || dealLink!.id,
        name: dealLink?.name || dealUiLabel(),
        customerId: input?.customerId || null,
      },
      lead: null,
      contact:
        input?.contactId || contactLink
          ? {
              id: input?.contactId || contactLink!.id,
              name: contactLink?.name || 'Contact',
              customerId: input?.customerId || null,
            }
          : null,
    };
  }
  if (input?.leadId || leadLink) {
    return {
      primaryType: 'lead',
      deal: null,
      lead: {
        id: input?.leadId || leadLink!.id,
        name: leadLink?.name || 'Lead',
        customerId: input?.customerId || null,
      },
      contact:
        input?.contactId || contactLink
          ? {
              id: input?.contactId || contactLink!.id,
              name: contactLink?.name || 'Contact',
              customerId: input?.customerId || null,
            }
          : null,
    };
  }
  if (input?.contactId || contactLink) {
    return {
      primaryType: 'contact',
      deal: null,
      lead: null,
      contact: {
        id: input?.contactId || contactLink!.id,
        name: contactLink?.name || 'Contact',
        customerId: input?.customerId || null,
      },
    };
  }
  return { ...EMPTY_CRM_LINK };
}

export function toTaskCrmPayload(value: TaskCrmLinkValue): {
  leadId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  customerId?: string | null;
} {
  if (value.primaryType === 'none') {
    return {
      leadId: null,
      dealId: null,
      contactId: null,
      customerId: null,
    };
  }
  if (value.primaryType === 'deal') {
    return {
      dealId: value.deal?.id || null,
      leadId: null,
      contactId: value.contact?.id || null,
      customerId: value.contact?.customerId || value.deal?.customerId || null,
    };
  }
  if (value.primaryType === 'lead') {
    return {
      leadId: value.lead?.id || null,
      dealId: null,
      contactId: value.contact?.id || null,
      customerId: value.contact?.customerId || value.lead?.customerId || null,
    };
  }
  return {
    leadId: null,
    dealId: null,
    contactId: value.contact?.id || null,
    customerId: value.contact?.customerId || null,
  };
}

function contactLabel(c: {
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
}) {
  const name =
    c.name || [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return name || c.email || 'Contact';
}

type ListItem = {
  id: string;
  name: string;
  subtitle?: string;
  customerId?: string | null;
};

function derivePrimaryType(next: {
  deal: CrmEntityRef | null;
  lead: CrmEntityRef | null;
  contact: CrmEntityRef | null;
}): CrmLinkPrimaryType {
  if (next.deal) return 'deal';
  if (next.lead) return 'lead';
  if (next.contact) return 'contact';
  return 'none';
}

function EntitySelect({
  items,
  selectedId,
  loading,
  disabled,
  placeholder,
  emptyLabel,
  onChange,
}: {
  items: ListItem[];
  selectedId: string | null;
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
  onChange: (item: ListItem | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = usePortaledDropdownPosition(open, triggerRef);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.subtitle ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const frameId = window.requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handlePointerDown, true);
      document.addEventListener('keydown', handleEscape);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const panel =
    open && position && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className="pointer-events-auto flex flex-col overflow-hidden rounded-md border border-border bg-surface-card shadow-md"
            data-entity-multiselect-panel=""
            style={{
              position: 'fixed',
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: OVERLAY_Z_INDEX,
              pointerEvents: 'auto',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border p-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 border-border bg-surface-card text-sm"
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {loading ? (
                <p className="flex items-center justify-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Loading…
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {items.length === 0 ? emptyLabel : 'No matches'}
                </p>
              ) : (
                filtered.map((item) => {
                  const checked = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(item);
                        close();
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-elevated',
                        checked && 'bg-brand-muted/25',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight">
                          {item.name}
                        </span>
                        {item.subtitle ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                      {checked ? (
                        <Check size={13} className="shrink-0 text-brand" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="min-w-0 flex-1">
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="h-auto min-h-9 w-full justify-between border-border bg-surface-card px-3 py-1.5 text-sm font-normal"
        >
          <span className="min-w-0 truncate text-left">
            {selected ? (
              <span className="text-foreground">
                {selected.name}
                {selected.subtitle ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · {selected.subtitle}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {loading ? 'Loading…' : placeholder}
              </span>
            )}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {selected && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className="rounded p-0.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
              >
                <X size={12} />
              </span>
            ) : null}
            <ChevronsUpDown className="size-4 opacity-50" />
          </span>
        </Button>
      </div>
      {panel}
    </div>
  );
}

type TaskCrmLinkFieldsProps = {
  value: TaskCrmLinkValue;
  onChange: (next: TaskCrmLinkValue) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * CRM link: Deal / Lead / Contact checkboxes.
 * Checking one reveals a dropdown list. Deal XOR Lead; contact can be
 * standalone or scoped to the selected deal/lead customer.
 */
export function TaskCrmLinkFields({
  value,
  onChange,
  disabled,
  className,
}: TaskCrmLinkFieldsProps) {
  const showLeads = isLeadsEnabled();
  const opportunityLabel = dealUiLabel();
  const opportunityLabelPlural = dealUiLabel({ plural: true });
  const opportunityLabelLower = dealUiLabel({ lowercase: true });

  const [dealOn, setDealOn] = useState(Boolean(value.deal));
  const [leadOn, setLeadOn] = useState(showLeads && Boolean(value.lead));
  const [contactOn, setContactOn] = useState(Boolean(value.contact));

  useEffect(() => {
    setDealOn(Boolean(value.deal));
    setLeadOn(showLeads && Boolean(value.lead));
    if (value.contact) setContactOn(true);
  }, [value.deal?.id, value.lead?.id, value.contact?.id, showLeads]);

  const {
    dealOptions,
    data: dealData,
    isFetching: dealsLoading,
  } = usePipelineDealOptions({
    enabled: dealOn,
    pageSize: 50,
  });
  const {
    leadOptions,
    data: leadData,
    isFetching: leadsLoading,
  } = usePipelineLeadOptions({
    enabled: leadOn,
    pageSize: 50,
  });

  const scopedCustomerId =
    value.deal?.customerId || value.lead?.customerId || null;
  const contactEnabled =
    contactOn ||
    (dealOn && Boolean(value.deal)) ||
    (leadOn && Boolean(value.lead));

  const { data: catalog, isFetching: contactsLoading } = useGetContactsCatalog({
    enabled: contactEnabled,
  });

  const contactItems = useMemo(() => {
    const rows: ListItem[] = [];
    const contacts = catalog?.contacts || [];
    const associations = catalog?.associations || [];
    const accounts = new Map(
      (catalog?.accounts || []).map((a) => [a.id, a.name]),
    );

    for (const c of contacts) {
      const assoc = associations.find((a) => a.contactId === c.id);
      const customerId = assoc?.accountId || null;
      if (scopedCustomerId && customerId !== scopedCustomerId) continue;
      const name = contactLabel(c);
      rows.push({
        id: c.id,
        name,
        customerId,
        subtitle: customerId
          ? accounts.get(customerId) || undefined
          : undefined,
      });
    }
    return rows.slice(0, 50);
  }, [catalog, scopedCustomerId]);

  const dealCustomerById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const d of dealData?.data || []) {
      map.set(d.id, d.customerId || null);
    }
    return map;
  }, [dealData]);

  const leadCustomerById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const l of leadData?.data || []) {
      map.set(l.id, l.customerId || null);
    }
    return map;
  }, [leadData]);

  const dealItems: ListItem[] = useMemo(
    () =>
      dealOptions.map((d) => ({
        id: d.id,
        name: d.name,
        customerId: dealCustomerById.get(d.id) || null,
      })),
    [dealOptions, dealCustomerById],
  );

  const leadItems: ListItem[] = useMemo(
    () =>
      leadOptions.map((l) => ({
        id: l.id,
        name: l.name,
        customerId: leadCustomerById.get(l.id) || null,
      })),
    [leadOptions, leadCustomerById],
  );

  const emit = (partial: {
    deal?: CrmEntityRef | null;
    lead?: CrmEntityRef | null;
    contact?: CrmEntityRef | null;
  }) => {
    const next = {
      deal: partial.deal !== undefined ? partial.deal : value.deal,
      lead: partial.lead !== undefined ? partial.lead : value.lead,
      contact: partial.contact !== undefined ? partial.contact : value.contact,
    };
    onChange({
      primaryType: derivePrimaryType(next),
      ...next,
    });
  };

  const toggleDeal = (checked: boolean) => {
    setDealOn(checked);
    if (checked) {
      setLeadOn(false);
      onChange({
        primaryType: 'deal',
        deal: value.deal,
        lead: null,
        contact: contactOn ? value.contact : null,
      });
      return;
    }
    const nextContact = contactOn ? value.contact : null;
    onChange({
      primaryType: nextContact ? 'contact' : 'none',
      deal: null,
      lead: null,
      contact: nextContact,
    });
  };

  const toggleLead = (checked: boolean) => {
    setLeadOn(checked);
    if (checked) {
      setDealOn(false);
      onChange({
        primaryType: 'lead',
        deal: null,
        lead: value.lead,
        contact: contactOn ? value.contact : null,
      });
      return;
    }
    const nextContact = contactOn ? value.contact : null;
    onChange({
      primaryType: nextContact ? 'contact' : 'none',
      deal: null,
      lead: null,
      contact: nextContact,
    });
  };

  const toggleContact = (checked: boolean) => {
    setContactOn(checked);
    if (!checked) {
      const next = { deal: value.deal, lead: value.lead, contact: null };
      onChange({
        primaryType: derivePrimaryType(next),
        ...next,
      });
    }
  };

  const linkOptions = [
    {
      key: 'deal',
      label: showLeads ? 'Deal' : opportunityLabel,
      hint: showLeads ? 'Pipeline deal' : 'Pipeline opportunity',
      icon: Briefcase,
      active: dealOn,
      onToggle: () => toggleDeal(!dealOn),
    },
    ...(showLeads
      ? [
          {
            key: 'lead',
            label: 'Lead',
            hint: 'Open lead',
            icon: Target,
            active: leadOn,
            onToggle: () => toggleLead(!leadOn),
          },
        ]
      : []),
    {
      key: 'contact',
      label: 'Contact',
      hint: 'Person link',
      icon: User,
      active: contactOn,
      onToggle: () => toggleContact(!contactOn),
    },
  ] as const;

  const recordLinkOn = dealOn || leadOn;
  const recordLinkLabel = showLeads ? 'deal/lead' : opportunityLabelLower;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn('grid gap-2', showLeads ? 'grid-cols-3' : 'grid-cols-2')}
      >
        {linkOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              aria-pressed={option.active}
              onClick={option.onToggle}
              className={cn(
                'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-60',
                option.active
                  ? 'border-brand/40 bg-brand-muted text-brand shadow-xs'
                  : 'border-border bg-surface-card text-muted-foreground hover:border-brand/25 hover:bg-surface-elevated hover:text-foreground',
              )}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <Icon
                  size={14}
                  className={
                    option.active ? 'text-brand' : 'text-muted-foreground'
                  }
                />
                {option.active ? (
                  <Check size={12} className="text-brand" strokeWidth={3} />
                ) : null}
              </span>
              <span className="text-xs font-semibold leading-tight text-inherit">
                {option.label}
              </span>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  option.active ? 'text-brand/80' : 'text-muted-foreground',
                )}
              >
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      {dealOn || leadOn || contactOn ? (
        <div className="space-y-2.5 rounded-lg border border-border bg-surface-page/60 p-3">
          {dealOn ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Select {opportunityLabelLower}
              </p>
              <EntitySelect
                items={dealItems}
                selectedId={value.deal?.id || null}
                loading={dealsLoading}
                disabled={disabled}
                placeholder={`Select ${opportunityLabelLower}…`}
                emptyLabel={`No ${opportunityLabelPlural.toLowerCase()}`}
                onChange={(item) =>
                  emit({
                    deal: item
                      ? {
                          id: item.id,
                          name: item.name,
                          customerId: item.customerId || null,
                        }
                      : null,
                    lead: null,
                    contact: null,
                  })
                }
              />
            </div>
          ) : null}

          {leadOn ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Select lead
              </p>
              <EntitySelect
                items={leadItems}
                selectedId={value.lead?.id || null}
                loading={leadsLoading}
                disabled={disabled}
                placeholder="Select lead…"
                emptyLabel="No leads"
                onChange={(item) =>
                  emit({
                    lead: item
                      ? {
                          id: item.id,
                          name: item.name,
                          customerId: item.customerId || null,
                        }
                      : null,
                    deal: null,
                    contact: null,
                  })
                }
              />
            </div>
          ) : null}

          {contactOn ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Select contact
                {scopedCustomerId
                  ? ' (scoped to linked customer)'
                  : recordLinkOn
                    ? ` — pick ${recordLinkLabel} first`
                    : ''}
              </p>
              <EntitySelect
                items={contactItems}
                selectedId={value.contact?.id || null}
                loading={contactsLoading}
                disabled={disabled || (recordLinkOn && !scopedCustomerId)}
                placeholder={
                  scopedCustomerId
                    ? 'Select contact for this customer…'
                    : recordLinkOn
                      ? `Select ${recordLinkLabel} first…`
                      : 'Select contact…'
                }
                emptyLabel={
                  scopedCustomerId
                    ? 'No contacts for this customer'
                    : 'No contacts'
                }
                onChange={(item) =>
                  emit({
                    contact: item
                      ? {
                          id: item.id,
                          name: item.name,
                          customerId: item.customerId || null,
                        }
                      : null,
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {showLeads
            ? 'Optional — tap Deal, Lead, or Contact to link this task.'
            : `Optional — tap ${opportunityLabel} or Contact to link this task.`}
        </p>
      )}
    </div>
  );
}
