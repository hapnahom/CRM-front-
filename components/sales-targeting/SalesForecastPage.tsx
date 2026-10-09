'use client';

import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SalesForecastSection } from '@/components/sales-targeting/SalesForecastSection';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import {
  SalesTargetingProvider,
  useSalesTargeting,
} from '@/components/sales-targeting/SalesTargetingContext';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';
import {
  ForecastTabSkeleton,
  ShellHeaderSkeleton,
  TARGETS_PAGE_TITLE_CLASS,
} from '@/components/sales-targeting/ui-kit';

function SalesForecastPageInner() {
  const { isLoading, fiscalCalendar } = useSalesTargeting();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRulesView = searchParams?.get('forecastView') === 'rules';

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
        <ShellHeaderSkeleton />
        <ForecastTabSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
      {!isRulesView ? (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-card px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/sales-targeting')}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Back to Targets"
              aria-label="Back to Targets"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className={TARGETS_PAGE_TITLE_CLASS}>Forecast</h1>
              {fiscalCalendar ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatFiscalYearLabel(fiscalCalendar)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="hidden shrink-0 md:flex md:items-center">
            <SalesTargetingCurrencyToolbar variant="inline" />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SalesForecastSection />
      </div>
    </div>
  );
}

export function SalesForecastPage() {
  return (
    <SalesTargetingProvider>
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
            <ShellHeaderSkeleton />
            <ForecastTabSkeleton />
          </div>
        }
      >
        <SalesForecastPageInner />
      </Suspense>
    </SalesTargetingProvider>
  );
}
