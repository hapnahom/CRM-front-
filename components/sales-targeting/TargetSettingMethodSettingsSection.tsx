'use client';

import { useEffect, useState } from 'react';
import { useGetSalesTargetingSettings } from '@/store/server/features/salesTargeting/queries';
import { useUpdateSalesTargetingSettings } from '@/store/server/features/salesTargeting/mutations';
import type { TargetSettingMethod } from '@/store/server/features/salesTargeting/types';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { PrimaryButton } from '@/components/sales-targeting/ui-kit';
import { SettingsListSectionSkeleton } from '@/components/loading/skeleton-screens';
import { canEditSettings } from '@/utils/dataScope';
import { cn } from '@/lib/utils';

const METHODS: {
  value: TargetSettingMethod;
  title: string;
  description: string;
}[] = [
  {
    value: 'TOP_TO_BOTTOM',
    title: 'Top to Bottom',
    description:
      'Company sets the annual target, then departments and teams commit downward. Matches the current CRM target flow.',
  },
  {
    value: 'BOTTOM_TO_TOP',
    title: 'Bottom to Top',
    description:
      'Teams propose opportunity-backed targets. Department review and consolidation precede company review. Open company Details and finalize to publish official targets.',
  },
  {
    value: 'HYBRID',
    title: 'Hybrid',
    description:
      'Company sets a strategic amount on Annual/Periods anytime. Teams propose bottom-up via Approvals. Reconcile the gap, then finalize to officialize.',
  },
];

type Props = {
  embedded?: boolean;
};

export function TargetSettingMethodSettingsSection({
  embedded = false,
}: Props) {
  const canManage = canEditSettings();
  const { data: settings, isLoading } = useGetSalesTargetingSettings();
  const updateSettings = useUpdateSalesTargetingSettings();
  const [method, setMethod] = useState<TargetSettingMethod>('TOP_TO_BOTTOM');

  useEffect(() => {
    if (settings?.targetSettingMethod) {
      setMethod(settings.targetSettingMethod);
    }
  }, [settings?.targetSettingMethod]);

  const dirty = method !== (settings?.targetSettingMethod ?? 'TOP_TO_BOTTOM');

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ targetSettingMethod: method });
      NotificationMessage.success({
        message: 'Target Setting Method Saved',
        description:
          'This applies to newly created target plans only. Existing plans keep their original workflow.',
      });
    } catch {
      NotificationMessage.error({
        message: 'Save Failed',
        description: 'Could not update the target-setting method.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface-card p-4">
        <SettingsListSectionSkeleton rows={3} />
      </div>
    );
  }

  return (
    <section
      className={cn(
        'space-y-3 rounded-lg border border-border bg-surface-card p-4',
        embedded && 'shadow-none',
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Target Setting Method
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Changing this setting affects new target plans only. Existing plans
          retain the workflow method that was active when they were created.
        </p>
      </div>

      <div className="space-y-2">
        {METHODS.map((item) => (
          <label
            key={item.value}
            className={cn(
              'flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 transition-colors',
              method === item.value
                ? 'border-brand bg-brand/5'
                : 'border-border hover:border-brand/40',
              !canManage && 'cursor-not-allowed opacity-70',
            )}
          >
            <input
              type="radio"
              name="targetSettingMethod"
              className="mt-1"
              disabled={!canManage}
              checked={method === item.value}
              onChange={() => setMethod(item.value)}
            />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-[13px] font-semibold text-foreground">
                {item.title}
              </span>
              <span className="block text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      {canManage ? (
        <div className="flex justify-end">
          <PrimaryButton
            disabled={!dirty || updateSettings.isLoading}
            onClick={() => void handleSave()}
          >
            {updateSettings.isLoading ? 'Saving…' : 'Save Method'}
          </PrimaryButton>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Edit-settings permission is required to change the target-setting
          method.
        </p>
      )}
    </section>
  );
}
