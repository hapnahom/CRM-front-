'use client';

import Link from 'next/link';
import { FormModalSkeleton } from '@/components/loading/skeleton-screens';
import { useGetSalesTargetingSettings } from '@/store/server/features/salesTargeting/queries';
import { settingsPath } from '@/lib/routes/settings';
import { canEditCompanyTargets } from '@/utils/dataScope';

type SalesTargetingSettingsSectionProps = {
  onSave: () => void;
};

/** Legacy stub — redirects to the correct configuration surfaces. */
export function SalesTargetingSettingsSection({
  onSave,
}: SalesTargetingSettingsSectionProps) {
  const canManage = canEditCompanyTargets();
  const { isLoading } = useGetSalesTargetingSettings();

  if (isLoading) {
    return <FormModalSkeleton fields={4} />;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-card p-5">
      <p className="text-sm font-semibold text-foreground">
        Targets configuration
      </p>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Forecast inclusion rules are configured on the Forecast page. Target
        setting method and planning sequencing are managed here for
        administrators.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/sales-targeting/forecast?forecastView=rules"
          className="inline-flex h-8 items-center rounded-md border border-border bg-surface-card px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40"
          onClick={() => onSave()}
        >
          Open forecast rules
        </Link>
        {canManage ? (
          <Link
            href={settingsPath('targets')}
            className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover"
            onClick={() => onSave()}
          >
            Target planning settings
          </Link>
        ) : null}
      </div>
    </div>
  );
}
