import { useMemo } from 'react';
import {
  useGetDefaultCurrency,
  useGetEnabledCurrencies,
} from '@/store/server/features/tenant-management/tenant-currencies/queries';

/**
 * Org-enabled currency codes and tenant default for pipeline forms and display.
 * Source of truth: GET /tenant-currency (`isActive` marks the default).
 */
export function usePipelineCurrencies(options?: { enabled?: boolean }) {
  const hookEnabled = options?.enabled !== false;
  const {
    data: enabledCurrencies = [],
    isLoading: enabledLoading,
    isError: enabledError,
  } = useGetEnabledCurrencies({ enabled: hookEnabled });
  const { data: defaultCurrency, isLoading: defaultLoading } =
    useGetDefaultCurrency({ enabled: hookEnabled });

  const currencyOptions = useMemo(
    () =>
      enabledCurrencies
        .map((c) => c.name?.trim())
        .filter((name): name is string => Boolean(name)),
    [enabledCurrencies],
  );

  const defaultCurrencyCode = defaultCurrency?.name?.trim() ?? '';

  return {
    currencyOptions,
    defaultCurrencyCode,
    defaultCurrency,
    isLoading: enabledLoading || defaultLoading,
    isError: enabledError,
  };
}
