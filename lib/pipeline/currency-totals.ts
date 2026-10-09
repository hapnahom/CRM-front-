export type CurrencyTotal = {
  currency: string;
  total: number;
};

export function sumValuesByCurrency<
  T extends { value: number; currency: string },
>(items: T[]): CurrencyTotal[] {
  const totals = new Map<string, number>();

  for (const item of items) {
    const currency = item.currency?.trim();
    if (!currency || !item.value) continue;
    totals.set(currency, (totals.get(currency) ?? 0) + item.value);
  }

  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}
