'use client';

import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { formatUserName } from '@/lib/format-user-name';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { FilterOption } from './types';

const ALL_OWNERS: FilterOption = { value: 'all', label: 'All Owners' };
const PAGE_SIZE = 40;

type Props = {
  value: string;
  onChange: (ownerId: string) => void;
  className?: string;
};

/**
 * Server-backed owner filter: loads a small initial page and searches via API
 * instead of fetching the entire user directory on dashboard open.
 */
export function DashboardOwnerSelect({ value, onChange, className }: Props) {
  const [search, setSearch] = useState('');
  const [pinnedSelection, setPinnedSelection] = useState<FilterOption | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isFetching } = useGetPlatformUsers({
    page: 1,
    pageSize: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  const remoteOptions = useMemo<FilterOption[]>(
    () =>
      (data?.data ?? []).map((user: any) => ({
        value: user.id,
        label: formatUserName(user, user.email || user.id),
      })),
    [data?.data],
  );

  const options = useMemo(() => {
    const byId = new Map<string, FilterOption>();
    byId.set(ALL_OWNERS.value, ALL_OWNERS);

    for (const option of remoteOptions) {
      byId.set(option.value, option);
    }

    if (
      pinnedSelection &&
      pinnedSelection.value !== 'all' &&
      !byId.has(pinnedSelection.value)
    ) {
      byId.set(pinnedSelection.value, pinnedSelection);
    }

    return Array.from(byId.values());
  }, [pinnedSelection, remoteOptions]);

  return (
    <Select
      value={value}
      options={options}
      className={className}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      searchValue={search}
      loading={isFetching}
      placeholder="Owner"
      allowClear={false}
      optionFilterProp="label"
      onChange={(ownerId) => {
        if (ownerId === 'all') {
          setPinnedSelection(null);
        } else {
          const selected =
            options.find((option) => option.value === ownerId) ?? null;
          setPinnedSelection(selected);
        }
        setSearch('');
        onChange(ownerId);
      }}
      notFoundContent={isFetching ? 'Searching…' : 'No owners found'}
    />
  );
}
