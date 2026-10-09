'use client';

import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Handshake,
  Megaphone,
  Search,
  Star,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { PARENT_CATEGORIES } from '../definitions';
import { isCategorySetFavorited } from '../favorites';
import type { FavoriteReport, ParentCategoryId } from '../types';
import { FavoriteReports } from './FavoriteReports';
import { PanelCard, PanelHeader, SelectableRow } from './ui-bits';

const ICONS = {
  sales: BriefcaseBusiness,
  customers: Users,
  marketing: Megaphone,
  'partners-vendors': Handshake,
  'targets-performance': Target,
} as const;

const LIST_LABEL: Record<ParentCategoryId, string> = {
  customers: 'Customer Reports',
  sales: 'Sales Reports',
  marketing: 'Marketing Reports',
  'partners-vendors': 'Partners & Vendors Reports',
  'targets-performance': 'Targets & Performance Reports',
};

type CategorySelectorProps = {
  selected: ParentCategoryId[];
  onChange: (next: ParentCategoryId[]) => void;
  favorites: FavoriteReport[];
  activeFavoriteId: string | null;
  onFavoriteSelect: (favorite: FavoriteReport) => void;
  onToggleFavorite: () => void;
  onRemoveFavorite: (id: string) => void;
};

export function CategorySelector({
  selected,
  onChange,
  favorites,
  activeFavoriteId,
  onFavoriteSelect,
  onToggleFavorite,
  onRemoveFavorite,
}: CategorySelectorProps) {
  const [query, setQuery] = useState('');
  const isFavorited = useMemo(
    () => isCategorySetFavorited(favorites, selected),
    [favorites, selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PARENT_CATEGORIES;
    return PARENT_CATEGORIES.filter(
      (c) =>
        LIST_LABEL[c.id].toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (id: ParentCategoryId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
      return;
    }
    onChange([...selected, id]);
  };

  return (
    <PanelCard className="h-full">
      <PanelHeader
        title="Report Categories"
        trailing={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9ca3af]">
              {selected.length}/{PARENT_CATEGORIES.length}
            </span>
            <button
              type="button"
              aria-label={
                isFavorited
                  ? 'Remove category combination from favorites'
                  : 'Save category combination to favorites'
              }
              disabled={selected.length === 0}
              onClick={onToggleFavorite}
              className={cn(
                'flex size-7 items-center justify-center rounded-md border transition-colors',
                selected.length === 0
                  ? 'cursor-not-allowed border-[#e5e7eb] text-[#d1d5db]'
                  : isFavorited
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-[#e5e7eb] text-[#9ca3af] hover:border-brand-border hover:bg-brand-muted hover:text-brand',
              )}
            >
              <Star size={14} className={cn(isFavorited && 'fill-current')} />
            </button>
          </div>
        }
      />

      <div className="flex items-center justify-between border-b border-[#eef0f3] px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#9ca3af]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="h-8 border-[#e5e7eb] bg-white pl-8 text-[12px] shadow-none"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(
              selected.length === PARENT_CATEGORIES.length
                ? []
                : PARENT_CATEGORIES.map((c) => c.id),
            )
          }
          className="ml-2 shrink-0 text-[11px] font-semibold text-brand hover:underline"
        >
          {selected.length === PARENT_CATEGORIES.length
            ? 'Uncheck all'
            : 'Select all'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ul className="min-h-0 shrink overflow-y-auto space-y-0 py-1.5">
          {filtered.map((category) => {
            const isSelected = selected.includes(category.id);
            const Icon = ICONS[category.id];
            return (
              <li key={category.id}>
                <SelectableRow
                  selected={isSelected}
                  onClick={() => toggle(category.id)}
                  className="items-center"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: category.iconBg,
                      color: category.iconColor,
                    }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-[#111827]">
                      {LIST_LABEL[category.id]}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#9ca3af]">
                      {category.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border',
                      isSelected
                        ? 'border-brand bg-brand text-white'
                        : 'border-[#d1d5db] bg-white',
                    )}
                    aria-hidden
                  >
                    {isSelected ? (
                      <span className="text-[10px] leading-none font-bold">
                        ✓
                      </span>
                    ) : null}
                  </span>
                </SelectableRow>
              </li>
            );
          })}
        </ul>

        <FavoriteReports
          favorites={favorites}
          activeId={activeFavoriteId}
          onSelect={onFavoriteSelect}
          onRemove={onRemoveFavorite}
        />
      </div>
    </PanelCard>
  );
}
