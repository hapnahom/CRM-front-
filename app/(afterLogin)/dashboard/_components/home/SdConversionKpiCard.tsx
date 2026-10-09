'use client';

import React from 'react';
import type { HomeMetrics } from './types';
import { formatPercent } from './utils';
import { KpiCard } from './KpiCard';

interface SdConversionKpiCardProps {
  metrics: HomeMetrics;
}

export function SdConversionKpiCard({ metrics }: SdConversionKpiCardProps) {
  if (!metrics.sdConversionConfigured) return null;

  const label = metrics.sdConversionMetricName?.trim() || 'SD Conversion';

  return (
    <KpiCard
      label={label}
      value={
        metrics.sdConversionRate != null
          ? formatPercent(metrics.sdConversionRate)
          : '—'
      }
      hint={
        metrics.sdConversionDetail ??
        'Target exits ÷ completed exits from source stage'
      }
    />
  );
}
