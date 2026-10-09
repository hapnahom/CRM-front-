'use client';

import { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/modules/marketing/ui-kit';
import type { MarketingCampaign } from '@/store/server/features/marketing/types';

const EMPTY_VALUE = '__none__';

function CampaignOptionLabel({
  campaign,
  compact = false,
}: {
  campaign: MarketingCampaign;
  compact?: boolean;
}) {
  return (
    <span className="flex min-w-0 w-full items-start gap-2.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-muted/60 text-brand">
        <Megaphone className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm font-medium leading-tight">
            {campaign.name}
          </span>
          <StatusBadge status={campaign.status} />
        </span>
        {!compact && campaign.objective ? (
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
            {campaign.objective}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export interface CampaignSelectorProps {
  campaigns: MarketingCampaign[];
  value: string;
  onChange: (campaignId: string) => void;
  controlClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CampaignSelector({
  campaigns,
  value,
  onChange,
  controlClassName,
  placeholder = 'Select campaign',
  disabled,
}: CampaignSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns],
  );

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedCampaigns;
    return sortedCampaigns.filter((campaign) => {
      return (
        campaign.name.toLowerCase().includes(q) ||
        campaign.objective.toLowerCase().includes(q) ||
        campaign.status.toLowerCase().includes(q)
      );
    });
  }, [search, sortedCampaigns]);

  const selectedCampaign = useMemo(
    () => sortedCampaigns.find((campaign) => campaign.id === value),
    [sortedCampaigns, value],
  );

  const isDisabled = Boolean(disabled) || sortedCampaigns.length === 0;
  const triggerPlaceholder =
    sortedCampaigns.length === 0 ? 'No campaigns available' : placeholder;

  return (
    <Select
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
      value={value || EMPTY_VALUE}
      onValueChange={(next) => onChange(next === EMPTY_VALUE ? '' : next)}
      disabled={isDisabled}
    >
      <SelectTrigger className={cn(controlClassName, 'w-full')}>
        <SelectValue placeholder={triggerPlaceholder}>
          {selectedCampaign ? (
            <span className="flex min-w-0 items-center gap-2">
              <Megaphone className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{selectedCampaign.name}</span>
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
            placeholder="Search campaigns…"
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <SelectItem value={EMPTY_VALUE} className="py-2">
          <span className="text-sm text-muted-foreground">None</span>
        </SelectItem>
        {filteredCampaigns.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {search.trim()
              ? 'No campaigns match your search'
              : 'No campaigns available'}
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <SelectItem
              key={campaign.id}
              value={campaign.id}
              className="py-2 [&_[data-slot=select-item-text]]:w-full"
            >
              <CampaignOptionLabel campaign={campaign} />
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
