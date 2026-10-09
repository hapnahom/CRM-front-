'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetCustomerCountries } from '@/store/server/features/customers/queries';

export type CountryOption = {
  name: string;
  code?: string;
  flag?: string;
};

function flagImageSrc(code?: string) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

function CountryFlag({ code, emoji }: { code?: string; emoji?: string }) {
  const src = flagImageSrc(code);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={20}
        height={15}
        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
      />
    );
  }
  if (emoji) {
    return (
      <span className="text-base leading-none" aria-hidden>
        {emoji}
      </span>
    );
  }
  return null;
}

export function normalizeCountryOptions(
  countries: Array<string | CountryOption> | undefined,
  fallback?: string,
): CountryOption[] {
  const source = countries?.length ? countries : fallback ? [fallback] : [];
  return source.map((item) => {
    const name = typeof item === 'string' ? item : String(item.name ?? '');
    const code = typeof item === 'object' && item.code ? item.code : '';
    const flag = (typeof item === 'object' && item.flag) || '';
    return { name, code, flag };
  });
}

export function CountrySelect({
  value,
  onChange,
  countries,
  fallback,
  placeholder = 'Select country',
}: {
  value?: string;
  onChange: (next: string) => void;
  countries?: Array<string | CountryOption>;
  fallback?: string;
  placeholder?: string;
}) {
  const countriesQuery = useGetCustomerCountries();
  const options = normalizeCountryOptions(
    countries?.length ? countries : countriesQuery.data?.countries,
    fallback ?? countriesQuery.data?.defaultCountry,
  );
  const selected = options.find((country) => country.name === value);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 border-border">
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <CountryFlag code={selected.code} emoji={selected.flag} />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((country) => (
          <SelectItem key={country.name} value={country.name}>
            <span className="flex items-center gap-2">
              <CountryFlag code={country.code} emoji={country.flag} />
              <span>{country.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
