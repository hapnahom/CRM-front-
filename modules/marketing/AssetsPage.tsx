'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Film, Link2, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetGridSkeleton } from '@/components/loading/skeleton-screens';
import {
  useMarketingAssets,
  useMarketingCampaigns,
} from '@/store/server/features/marketing/queries';
import { useDeleteAsset } from '@/store/server/features/marketing/mutations';
import type { MarketingAsset } from '@/store/server/features/marketing/types';
import { type AssetMediaKind } from './mock-data';
import { AddAssetLinkModal } from './CampaignModals';
import {
  DashboardCard,
  EmptyHint,
  MarketingFilterSelect,
  MarketingSearchField,
  StatusBadge,
  TypeBadge,
} from './ui-kit';

const KIND_FILTERS: Array<'All' | AssetMediaKind> = [
  'All',
  'Image',
  'Video',
  'PDF',
  'Document',
  'Template',
  'Script',
  'Link',
];

function MediaPreview({ asset }: { asset: MarketingAsset }) {
  if (asset.mediaKind === 'Image') {
    const src = (asset.previewUrl ?? asset.url)?.trim();
    if (!src) {
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
          style={{ backgroundColor: asset.thumbnailColor }}
        >
          <Link2 size={24} className="text-foreground/45" />
          <p className="m-0 text-[11px] font-medium text-muted-foreground">
            {asset.mediaKind} · {asset.platform}
          </p>
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={asset.name} className="h-full w-full object-cover" />
    );
  }

  if (asset.mediaKind === 'Video') {
    return (
      <div className="relative h-full w-full">
        {asset.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: asset.thumbnailColor }}
          >
            <Film size={28} className="text-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/95 text-foreground shadow-sm">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
      </div>
    );
  }

  const Icon =
    asset.mediaKind === 'PDF' || asset.mediaKind === 'Document'
      ? Link2
      : asset.mediaKind === 'Template' || asset.mediaKind === 'Script'
        ? Film
        : Link2;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
      style={{ backgroundColor: asset.thumbnailColor }}
    >
      <Icon size={24} className="text-foreground/45" />
      <p className="m-0 text-[11px] font-medium text-muted-foreground">
        {asset.mediaKind} · {asset.platform}
      </p>
    </div>
  );
}

function assetCampaignUsage(
  campaignIds: string[],
  campaignNames: Map<string, string>,
) {
  const names = campaignIds
    .map((id) => campaignNames.get(id))
    .filter((name): name is string => Boolean(name));
  if (!names.length) {
    return `Used in ${campaignIds.length} campaign${campaignIds.length === 1 ? '' : 's'}`;
  }
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2
    ? `Used in ${shown} +${names.length - 2}`
    : `Used in ${shown}`;
}

export function AssetsPage() {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] =
    useState<(typeof KIND_FILTERS)[number]>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MarketingAsset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteAsset = useDeleteAsset();
  const { data: assets = [], isLoading } = useMarketingAssets({
    search: query.trim() || undefined,
    mediaKind: kindFilter,
  });
  const { data: campaigns = [] } = useMarketingCampaigns();
  const campaignNames = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns],
  );

  const filtered = assets;

  return (
    <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <div className="flex flex-wrap items-center gap-2">
        <MarketingSearchField
          value={query}
          onChange={setQuery}
          placeholder="Search assets…"
        />
        <MarketingFilterSelect
          value={kindFilter}
          onValueChange={(v) =>
            setKindFilter(v as (typeof KIND_FILTERS)[number])
          }
          placeholder="Type"
          options={KIND_FILTERS.map((k) => ({
            value: k,
            label: k === 'All' ? 'All types' : k,
          }))}
        />
        <Button
          size="sm"
          className="ml-auto h-8 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
          onClick={() => setAddOpen(true)}
        >
          Add asset
        </Button>
      </div>

      {isLoading ? (
        <div className="overflow-hidden">
          <AssetGridSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyHint>No assets match your filters.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <DashboardCard
              key={asset.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                className="block h-44 w-full"
                onClick={() => setPreviewAsset(asset)}
              >
                <MediaPreview asset={asset} />
              </button>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="m-0 text-left text-[14px] font-semibold leading-snug text-foreground hover:text-brand"
                    onClick={() => setPreviewAsset(asset)}
                  >
                    {asset.name}
                  </button>
                  <StatusBadge status={asset.status} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-rose-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!confirm(`Delete asset "${asset.name}"?`)) return;
                      setDeletingId(asset.id);
                      deleteAsset.mutate(asset.id, {
                        onSettled: () => setDeletingId(null),
                        onSuccess: () => setPreviewAsset(null),
                      });
                    }}
                    disabled={deletingId === asset.id}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <TypeBadge label={asset.mediaKind} />
                  <TypeBadge label={asset.platform} />
                </div>
                {asset.campaignIds.length > 0 ? (
                  <p className="m-0 text-[12px] text-muted-foreground">
                    {assetCampaignUsage(asset.campaignIds, campaignNames)}
                  </p>
                ) : (
                  <p className="m-0 text-[12px] text-muted-foreground">
                    Not linked to a campaign
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {asset.owner} · {asset.updatedAt}
                  </span>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <AddAssetLinkModal open={addOpen} onOpenChange={setAddOpen} />

      <Dialog
        open={Boolean(previewAsset)}
        onOpenChange={(open) => {
          if (!open) setPreviewAsset(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto"
          overlayClassName="bg-black/50 supports-[backdrop-filter]:backdrop-blur-[2px]"
        >
          {previewAsset ? (
            <>
              <DialogHeader>
                <DialogTitle>{previewAsset.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-1 h-72 overflow-hidden rounded-lg border border-border">
                <MediaPreview asset={previewAsset} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TypeBadge label={previewAsset.mediaKind} />
                <TypeBadge label={previewAsset.platform} />
                <StatusBadge status={previewAsset.status} />
              </div>
              <p className="m-0 mt-2 break-all text-[12px] text-muted-foreground">
                {previewAsset.url}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === previewAsset.id}
                  onClick={() => {
                    if (!confirm(`Delete asset "${previewAsset.name}"?`))
                      return;
                    setDeletingId(previewAsset.id);
                    deleteAsset.mutate(previewAsset.id, {
                      onSettled: () => setDeletingId(null),
                      onSuccess: () => setPreviewAsset(null),
                    });
                  }}
                >
                  {deletingId === previewAsset.id ? 'Deleting…' : 'Delete'}
                </Button>
                <Button size="sm" asChild>
                  <a href={previewAsset.url} target="_blank" rel="noreferrer">
                    Open asset
                  </a>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
