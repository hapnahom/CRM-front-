'use client';

import { Switch } from '@/components/ui/switch';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  useProductCatalogSettings,
  useUpdateProductCatalogSettings,
} from '@/store/server/features/product-catalog/settings';
import { canEditSettings } from '@/utils/dataScope';
import { cn } from '@/lib/utils';

/**
 * Tenant toggles for what the lead/deal Solutions section requires.
 * Partner role slots (order, placement, etc.) are configured on each role.
 */
export function SolutionsWorkflowSettings() {
  const { data: settings, isLoading } = useProductCatalogSettings();
  const updateMutation = useUpdateProductCatalogSettings();
  const canManage = canEditSettings();

  const requireProductFamily = settings?.requireProductFamily ?? true;
  const requireProduct = settings?.requireProduct ?? true;
  const busy = isLoading || updateMutation.isLoading || !canManage;

  const persist = async (
    patch: Partial<{ requireProductFamily: boolean; requireProduct: boolean }>,
  ) => {
    try {
      await updateMutation.mutateAsync(patch);
      NotificationMessage.success({
        message: 'Solutions settings saved',
      });
    } catch {
      NotificationMessage.error({
        message: 'Could not save settings',
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-surface-card px-4 py-2.5">
      <span className="text-[12px] font-semibold text-foreground">
        Solutions workflow
      </span>

      <div className="hidden h-4 w-px bg-border sm:block" />

      <ToggleRow
        label="Require product family"
        checked={requireProductFamily}
        disabled={busy}
        onCheckedChange={(checked) =>
          void persist({ requireProductFamily: checked })
        }
      />

      <ToggleRow
        label="Require product"
        checked={requireProduct}
        disabled={busy}
        onCheckedChange={(checked) => void persist({ requireProduct: checked })}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="text-[12.25px] text-foreground">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}
