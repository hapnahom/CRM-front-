'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CatalogFormField,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { cn } from '@/lib/utils';

export function AmountCurrencyFields({
  amountLabel = 'Value',
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  currencyOptions,
  disabled,
  amountClassName,
}: {
  amountLabel?: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  currencyOptions: string[];
  disabled?: boolean;
  amountClassName?: string;
}) {
  const options =
    currency && !currencyOptions.includes(currency)
      ? [currency, ...currencyOptions]
      : currencyOptions;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CatalogFormField label={amountLabel}>
        <Input
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className={cn(catalogControlClass, 'tabular-nums', amountClassName)}
          inputMode="decimal"
          placeholder="0.00"
          disabled={disabled}
        />
      </CatalogFormField>
      <CatalogFormField label="Currency">
        <Select
          value={currency || undefined}
          onValueChange={onCurrencyChange}
          disabled={disabled || options.length === 0}
        >
          <SelectTrigger className={cn(catalogControlClass, 'w-full')}>
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent
            className="w-[var(--radix-select-trigger-width)]"
            position="popper"
            align="start"
          >
            {options.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogFormField>
    </div>
  );
}
