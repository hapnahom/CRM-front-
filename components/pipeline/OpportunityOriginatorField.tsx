'use client';

import { useMemo, useState } from 'react';
import { Building2, Megaphone, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import { CampaignSelector } from '@/components/pipeline/CampaignSelector';
import { UserOptionLabel } from '@/components/pipeline/ObserversMultiSelect';
import type { MarketingCampaign } from '@/store/server/features/marketing/types';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import type { Partner } from '@/modules/partners/types';

export type OpportunityOriginatorType = 'CAMPAIGN' | 'USER' | 'PARTNER';

export type OpportunityOriginatorValue = {
  originatorType: OpportunityOriginatorType | '';
  campaignId: string;
  originatorUserId: string;
  originatorPartnerId: string;
};

const EMPTY_VALUE = '__none__';

const TYPE_OPTIONS: Array<{
  value: OpportunityOriginatorType | '';
  label: string;
  icon: typeof Megaphone;
  hint: string;
}> = [
  {
    value: 'CAMPAIGN',
    label: 'Campaign',
    icon: Megaphone,
    hint: 'Marketing campaign',
  },
  {
    value: 'USER',
    label: 'Team member',
    icon: UserRound,
    hint: 'Internal referrer',
  },
  {
    value: 'PARTNER',
    label: 'Partner',
    icon: Building2,
    hint: 'Partner channel',
  },
];

function userInitials(user: PlatformUser) {
  const name = formatUserName(user, 'User');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function partnerInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function PartnerOptionLabel({
  partner,
  compact = false,
}: {
  partner: Partner;
  compact?: boolean;
}) {
  const subtitle = [partner.tier, partner.status].filter(Boolean).join(' · ');
  return (
    <span className="flex min-w-0 w-full items-center gap-2.5">
      <Avatar className="size-7 shrink-0 rounded-md">
        {partner.logoUrl ? (
          <AvatarImage
            src={partner.logoUrl}
            alt={partner.name}
            className="rounded-md object-cover"
          />
        ) : null}
        <AvatarFallback className="rounded-md bg-brand-muted text-[10px] font-semibold text-brand">
          {partnerInitials(partner.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">
          {partner.name}
        </span>
        {!compact && subtitle ? (
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function CompactUserTrigger({ user }: { user: PlatformUser }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-5 shrink-0">
        {user.avatarUrl ? (
          <AvatarImage
            src={user.avatarUrl}
            alt={formatUserName(user, 'User')}
          />
        ) : null}
        <AvatarFallback className="bg-brand-muted text-[9px] font-semibold text-brand">
          {userInitials(user)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm">{formatUserName(user, 'User')}</span>
    </span>
  );
}

function UserOriginatorSelector({
  users,
  value,
  onChange,
  controlClassName,
  disabled,
  placeholder = 'Select team member',
}: {
  users: PlatformUser[];
  value: string;
  onChange: (userId: string) => void;
  controlClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) =>
        formatUserName(a, 'User').localeCompare(formatUserName(b, 'User')),
      ),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((user) => {
      const name = formatUserName(user, 'User').toLowerCase();
      const email = (user.email ?? '').toLowerCase();
      const team = (user.team?.name ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || team.includes(q);
    });
  }, [search, sorted]);

  const selected = useMemo(
    () => sorted.find((u) => u.id === value || u.selamnewId === value) ?? null,
    [sorted, value],
  );

  return (
    <Select
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
      value={value || EMPTY_VALUE}
      onValueChange={(next) => onChange(next === EMPTY_VALUE ? '' : next)}
      disabled={disabled || sorted.length === 0}
    >
      <SelectTrigger className={cn(controlClassName, 'w-full')}>
        <SelectValue
          placeholder={
            sorted.length === 0 ? 'No team members available' : placeholder
          }
        >
          {selected ? <CompactUserTrigger user={selected} /> : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
        position="popper"
        align="start"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people…"
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <SelectItem value={EMPTY_VALUE} className="py-2">
          <span className="text-sm text-muted-foreground">None</span>
        </SelectItem>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {search.trim()
              ? 'No people match your search'
              : 'No team members available'}
          </div>
        ) : (
          filtered.map((user) => (
            <SelectItem
              key={user.id}
              value={user.id}
              className="py-2 [&_[data-slot=select-item-text]]:w-full"
            >
              <UserOptionLabel user={user} />
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function PartnerOriginatorSelector({
  partners,
  value,
  onChange,
  controlClassName,
  disabled,
  placeholder = 'Select partner',
}: {
  partners: Partner[];
  value: string;
  onChange: (partnerId: string) => void;
  controlClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () => [...partners].sort((a, b) => a.name.localeCompare(b.name)),
    [partners],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((partner) => {
      return (
        partner.name.toLowerCase().includes(q) ||
        (partner.tier ?? '').toLowerCase().includes(q) ||
        (partner.status ?? '').toLowerCase().includes(q)
      );
    });
  }, [search, sorted]);

  const selected = useMemo(
    () => sorted.find((p) => p.id === value) ?? null,
    [sorted, value],
  );

  return (
    <Select
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
      value={value || EMPTY_VALUE}
      onValueChange={(next) => onChange(next === EMPTY_VALUE ? '' : next)}
      disabled={disabled || sorted.length === 0}
    >
      <SelectTrigger className={cn(controlClassName, 'w-full')}>
        <SelectValue
          placeholder={
            sorted.length === 0 ? 'No partners available' : placeholder
          }
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="size-5 shrink-0 rounded-md">
                {selected.logoUrl ? (
                  <AvatarImage
                    src={selected.logoUrl}
                    alt={selected.name}
                    className="rounded-md object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-md bg-brand-muted text-[9px] font-semibold text-brand">
                  {partnerInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{selected.name}</span>
            </span>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
        position="popper"
        align="start"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners…"
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <SelectItem value={EMPTY_VALUE} className="py-2">
          <span className="text-sm text-muted-foreground">None</span>
        </SelectItem>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {search.trim()
              ? 'No partners match your search'
              : 'No partners available'}
          </div>
        ) : (
          filtered.map((partner) => (
            <SelectItem
              key={partner.id}
              value={partner.id}
              className="py-2 [&_[data-slot=select-item-text]]:w-full"
            >
              <PartnerOptionLabel partner={partner} />
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export interface OpportunityOriginatorFieldProps {
  value: OpportunityOriginatorValue;
  onChange: (next: OpportunityOriginatorValue) => void;
  campaigns: MarketingCampaign[];
  users: PlatformUser[];
  partners: Partner[];
  showCampaign?: boolean;
  showPartner?: boolean;
  controlClassName?: string;
  disabled?: boolean;
}

export function emptyOriginatorValue(): OpportunityOriginatorValue {
  return {
    originatorType: '',
    campaignId: '',
    originatorUserId: '',
    originatorPartnerId: '',
  };
}

export function originatorPayloadFromValue(value: OpportunityOriginatorValue): {
  originatorType?: OpportunityOriginatorType;
  campaignId?: string;
  originatorUserId?: string;
  originatorPartnerId?: string;
} {
  if (!value.originatorType) return {};
  if (value.originatorType === 'CAMPAIGN' && value.campaignId) {
    return { originatorType: 'CAMPAIGN', campaignId: value.campaignId };
  }
  if (value.originatorType === 'USER' && value.originatorUserId) {
    return {
      originatorType: 'USER',
      originatorUserId: value.originatorUserId,
    };
  }
  if (value.originatorType === 'PARTNER' && value.originatorPartnerId) {
    return {
      originatorType: 'PARTNER',
      originatorPartnerId: value.originatorPartnerId,
    };
  }
  return {};
}

export function OpportunityOriginatorField({
  value,
  onChange,
  campaigns,
  users,
  partners,
  showCampaign = true,
  showPartner = true,
  controlClassName,
  disabled,
}: OpportunityOriginatorFieldProps) {
  const availableTypes = useMemo(
    () =>
      TYPE_OPTIONS.filter((opt) => {
        if (opt.value === 'CAMPAIGN') return showCampaign;
        if (opt.value === 'PARTNER') return showPartner;
        return true;
      }),
    [showCampaign, showPartner],
  );

  const selectedType = useMemo(
    () => availableTypes.find((opt) => opt.value === value.originatorType),
    [availableTypes, value.originatorType],
  );
  const SelectedTypeIcon = selectedType?.icon;

  const setType = (nextType: OpportunityOriginatorType | '') => {
    onChange({
      originatorType: nextType,
      campaignId: '',
      originatorUserId: '',
      originatorPartnerId: '',
    });
  };

  return (
    <div className="space-y-2">
      <Select
        value={value.originatorType || EMPTY_VALUE}
        onValueChange={(next) =>
          setType(
            next === EMPTY_VALUE ? '' : (next as OpportunityOriginatorType),
          )
        }
        disabled={disabled}
      >
        <SelectTrigger className={cn(controlClassName, 'w-full')}>
          <SelectValue placeholder="Select originator type">
            {selectedType && SelectedTypeIcon ? (
              <span className="flex min-w-0 items-center gap-2">
                <SelectedTypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedType.label}</span>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_VALUE}>
            <span className="text-muted-foreground">None</span>
          </SelectItem>
          {availableTypes.map((opt) => {
            const Icon = opt.icon;
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex min-w-0 items-center gap-2.5 py-0.5">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm leading-tight">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {opt.hint}
                    </span>
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {value.originatorType === 'CAMPAIGN' ? (
        <CampaignSelector
          campaigns={campaigns}
          value={value.campaignId}
          onChange={(campaignId) =>
            onChange({
              ...value,
              campaignId,
              originatorUserId: '',
              originatorPartnerId: '',
            })
          }
          controlClassName={controlClassName}
          placeholder="Select campaign"
          disabled={disabled}
        />
      ) : null}

      {value.originatorType === 'USER' ? (
        <UserOriginatorSelector
          users={users}
          value={value.originatorUserId}
          onChange={(originatorUserId) =>
            onChange({
              ...value,
              originatorUserId,
              campaignId: '',
              originatorPartnerId: '',
            })
          }
          controlClassName={controlClassName}
          placeholder="Select team member"
          disabled={disabled}
        />
      ) : null}

      {value.originatorType === 'PARTNER' ? (
        <PartnerOriginatorSelector
          partners={partners}
          value={value.originatorPartnerId}
          onChange={(originatorPartnerId) =>
            onChange({
              ...value,
              originatorPartnerId,
              campaignId: '',
              originatorUserId: '',
            })
          }
          controlClassName={controlClassName}
          placeholder="Select partner"
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

/** Read-only summary chip for detail views. */
export function OriginatorSummaryLabel({
  type,
  campaign,
  user,
  partner,
}: {
  type?: OpportunityOriginatorType | null;
  campaign?: { name: string } | null;
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  partner?: {
    name: string;
    logoUrl?: string | null;
    tier?: string | null;
  } | null;
}) {
  if (!type) return <span>—</span>;
  if (type === 'CAMPAIGN') {
    return (
      <span className="inline-flex max-w-full items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-muted/60 text-brand">
          <Megaphone className="size-3.5" />
        </span>
        <span className="truncate text-sm">{campaign?.name || 'Campaign'}</span>
      </span>
    );
  }
  if (type === 'USER') {
    const name = user?.name || user?.email || 'Team member';
    return (
      <span className="inline-flex max-w-full items-center gap-2">
        <Avatar className="size-6 shrink-0">
          {user?.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={name} />
          ) : null}
          <AvatarFallback className="bg-brand-muted text-[9px] font-semibold text-brand">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm">{name}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <Avatar className="size-6 shrink-0 rounded-md">
        {partner?.logoUrl ? (
          <AvatarImage
            src={partner.logoUrl}
            alt={partner.name}
            className="rounded-md"
          />
        ) : null}
        <AvatarFallback className="rounded-md bg-brand-muted text-[9px] font-semibold text-brand">
          {partnerInitials(partner?.name || 'P')}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-sm">
          {partner?.name || 'Partner'}
        </span>
        {partner?.tier ? (
          <span className="block truncate text-[11px] text-muted-foreground">
            {partner.tier}
          </span>
        ) : null}
      </span>
    </span>
  );
}
