'use client';

import { useMemo, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Badge } from '@/components/ui/badge';
import { SettingsListSectionSkeleton } from '@/components/loading/skeleton-screens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCreateCrmCurrency } from '@/store/server/features/currencies/mutations';
import { useGetCrmCurrencies } from '@/store/server/features/currencies/queries';
import {
  useCreateTenantCurrency,
  useDeleteTenantCurrency,
  useSetDefaultCurrency,
} from '@/store/server/features/tenant-management/tenant-currencies/mutations';
import { useGetTenantCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { canEditSettings, canViewSettings } from '@/utils/dataScope';

type CurrenciesSettingsSectionProps = {
  onSave: () => void;
};

export function CurrenciesSettingsSection({
  onSave,
}: CurrenciesSettingsSectionProps) {
  const canView = canViewSettings();
  const canCreate = canEditSettings();
  const canEdit = canEditSettings();
  const canDelete = canEditSettings();

  const { data: tenantCurrencies = [], isLoading: tenantLoading } =
    useGetTenantCurrencies();
  const { data: catalogCurrencies = [], isLoading: catalogLoading } =
    useGetCrmCurrencies(canView);

  const createCurrency = useCreateCrmCurrency();
  const createTenantCurrency = useCreateTenantCurrency();
  const deleteTenantCurrency = useDeleteTenantCurrency();
  const setDefaultCurrency = useSetDefaultCurrency();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [tenantCurrencyToRemove, setTenantCurrencyToRemove] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledCurrencyIds = useMemo(
    () => new Set(tenantCurrencies.map((entry) => entry.currencyId)),
    [tenantCurrencies],
  );

  const catalogOptions = useMemo(
    () =>
      catalogCurrencies.filter(
        (currency) => !enabledCurrencyIds.has(currency.id),
      ),
    [catalogCurrencies, enabledCurrencyIds],
  );

  const isLoading = tenantLoading || catalogLoading;

  const handleCreateAndEnable = async () => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;

    setIsSubmitting(true);
    try {
      const existing = catalogCurrencies.find(
        (currency) => currency.name.toUpperCase() === normalizedCode,
      );

      const currency =
        existing ??
        (await createCurrency.mutateAsync({
          name: normalizedCode,
          description: description.trim() || undefined,
        }));

      if (!enabledCurrencyIds.has(currency.id)) {
        await createTenantCurrency.mutateAsync({
          currencyId: currency.id,
          isActive: tenantCurrencies.length === 0,
        });
      }

      setCode('');
      setDescription('');
      onSave();
      NotificationMessage.success({
        message: 'Currency added',
        description: `${currency.name} is now available for deals, leads, and targets.`,
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to add currency';
      NotificationMessage.error({ message: 'Error', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnableExisting = async () => {
    if (!selectedCatalogId) return;

    setIsSubmitting(true);
    try {
      await createTenantCurrency.mutateAsync({
        currencyId: selectedCatalogId,
        isActive: tenantCurrencies.length === 0,
      });
      setSelectedCatalogId('');
      onSave();
    } catch {
      // mutation hook surfaces errors
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (currencyId: string) => {
    try {
      await setDefaultCurrency.mutateAsync(currencyId);
      onSave();
    } catch {
      // mutation hook surfaces errors
    }
  };

  const handleRemoveTenantCurrency = async () => {
    if (!tenantCurrencyToRemove) return;

    setIsSubmitting(true);
    try {
      await deleteTenantCurrency.mutateAsync(tenantCurrencyToRemove);
      setTenantCurrencyToRemove(null);
      onSave();
    } catch {
      // mutation hook surfaces errors
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hide currency settings when the user lacks view permission (no error copy).
  if (!canView) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Enabled currencies
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Currencies available across CRM modules for this organization.
          </p>
        </div>

        {isLoading ? (
          <SettingsListSectionSkeleton rows={4} />
        ) : tenantCurrencies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No currencies enabled yet. Add your first currency below.
          </p>
        ) : (
          <div className="divide-y rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            {tenantCurrencies.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.currency?.name ?? 'Currency'}
                    </span>
                    {entry.isActive ? (
                      <Badge className="gap-1 border border-brand/20 bg-brand-muted text-brand hover:bg-brand-muted">
                        <Star className="size-3" />
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  {entry.currency?.description ? (
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {entry.currency.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {!entry.isActive && canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSetDefault(entry.currencyId)}
                    >
                      Set default
                    </Button>
                  ) : null}
                  {canDelete && tenantCurrencies.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setTenantCurrencyToRemove(entry.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canCreate ? (
        <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Add currency
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Create a new currency code or enable one that already exists in
              the catalog.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="currency-code"
                className="text-[12px] font-medium text-foreground"
              >
                Currency code
              </Label>
              <Input
                id="currency-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. USD"
                maxLength={10}
                className="h-9 border-border bg-white text-[13px]"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="currency-description"
                className="text-[12px] font-medium text-foreground"
              >
                Description (optional)
              </Label>
              <Input
                id="currency-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. United States Dollar"
                className="h-9 border-border bg-white text-[13px]"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleCreateAndEnable()}
            disabled={isSubmitting || !code.trim()}
            className="h-9 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            <Plus data-icon="inline-start" />
            {isSubmitting ? 'Adding…' : 'Add currency'}
          </Button>

          {catalogOptions.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-4">
              <Label>Or enable an existing catalog currency</Label>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={selectedCatalogId}
                  onValueChange={setSelectedCatalogId}
                >
                  <SelectTrigger className="w-[220px] bg-white">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogOptions.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.name}
                        {currency.description
                          ? ` — ${currency.description}`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting || !selectedCatalogId}
                  onClick={() => void handleEnableExisting()}
                >
                  Enable selected
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <AlertDialog
        open={tenantCurrencyToRemove != null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setTenantCurrencyToRemove(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove currency from organization?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the currency from your organization&apos;s enabled
              list. It will no longer appear when configuring sales target
              plans, leads, or deals. Existing records keep their currency
              values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleRemoveTenantCurrency();
              }}
            >
              {isSubmitting ? 'Removing…' : 'Remove currency'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
