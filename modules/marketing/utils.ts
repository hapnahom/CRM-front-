export function campaignRoi(
  actualSpend: number,
  revenue: number,
): number | null {
  if (actualSpend <= 0) return null;
  return Math.round(((revenue - actualSpend) / actualSpend) * 100);
}

/** Prefer API totalSpend (campaign + activity + event); fall back to actualSpend. */
export function campaignTotalSpend(campaign: {
  totalSpend?: number;
  actualSpend?: number;
  activitySpend?: number;
  eventSpend?: number;
}) {
  if (typeof campaign.totalSpend === 'number') return campaign.totalSpend;
  return (
    (campaign.actualSpend || 0) +
    (campaign.activitySpend || 0) +
    (campaign.eventSpend || 0)
  );
}

export function resolveCampaignRoi(campaign: {
  roi?: number | null;
  totalSpend?: number;
  actualSpend?: number;
  activitySpend?: number;
  eventSpend?: number;
  revenue?: number;
}) {
  if (campaign.roi !== undefined && campaign.roi !== null) return campaign.roi;
  return campaignRoi(campaignTotalSpend(campaign), campaign.revenue || 0);
}

/** Display label when ROI cannot be calculated (no spend yet). */
export const ROI_UNAVAILABLE_LABEL = 'No spend';

export function formatCampaignRoi(roi: number | null | undefined) {
  if (roi === null || roi === undefined) return ROI_UNAVAILABLE_LABEL;
  return `${roi}%`;
}

export function isManualMarketingChannel(
  channelType?: string | null,
  channelCategory?: string | null,
) {
  return (
    channelType !== 'Email' &&
    channelType !== 'Event' &&
    channelCategory !== 'Event'
  );
}

export function activityResults(details?: Record<string, unknown> | null) {
  const raw =
    details && typeof details.results === 'object' && details.results
      ? (details.results as Record<string, unknown>)
      : {};
  return {
    impressions: Number(raw.impressions) || 0,
    clicks: Number(raw.clicks) || 0,
    leads: Number(raw.leads) || 0,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}
