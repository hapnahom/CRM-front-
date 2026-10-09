'use client';

import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describeCategories } from '../favorites';
import type { FavoriteReport } from '../types';

type FavoriteReportsProps = {
  favorites: FavoriteReport[];
  activeId: string | null;
  onSelect: (favorite: FavoriteReport) => void;
  onRemove: (id: string) => void;
};

export function FavoriteReports({
  favorites,
  activeId,
  onSelect,
  onRemove,
}: FavoriteReportsProps) {
  return (
    <div
      id="report-favorites"
      className="flex min-h-0 flex-1 flex-col border-t border-[#eef0f3] bg-white pt-2"
    >
      <div className="flex items-center gap-1.5 px-3 pb-1.5">
        <Star size={12} className="fill-brand text-brand" />
        <h3 className="text-[12px] font-semibold text-[#111827]">Favorites</h3>
      </div>

      {favorites.length === 0 ? (
        <p className="min-h-0 flex-1 px-3 pb-2.5 text-[11px] leading-relaxed text-[#9ca3af]">
          Star a category combination above to save it here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {favorites.map((favorite) => {
            const selected = activeId === favorite.id;
            const label = describeCategories(favorite.categories);
            return (
              <li key={favorite.id}>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-md pr-1 transition-colors',
                    selected ? 'bg-brand-muted' : 'hover:bg-[#f8fafc]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(favorite)}
                    className="min-w-0 flex-1 px-2 py-1.5 text-left"
                  >
                    <span className="block truncate text-[11px] font-semibold text-[#111827]">
                      {label}
                    </span>
                    <span className="text-[10px] text-[#9ca3af]">
                      {favorite.categories.length} categor
                      {favorite.categories.length === 1 ? 'y' : 'ies'}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    onClick={() => onRemove(favorite.id)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#9ca3af] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white hover:text-[#111827]"
                  >
                    <X size={12} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
