import { PARENT_CATEGORIES, getCategory } from './definitions';
import type { FavoriteReport, ParentCategoryId } from './types';

const STORAGE_KEY = 'crm-report-category-favorites';

export function categoryKey(categories: ParentCategoryId[]): string {
  return [...categories].sort().join('|');
}

export function isSameCategorySet(
  a: ParentCategoryId[],
  b: ParentCategoryId[],
): boolean {
  return categoryKey(a) === categoryKey(b);
}

export function describeCategories(categories: ParentCategoryId[]): string {
  if (categories.length === 0) return 'No categories';
  if (categories.length === PARENT_CATEGORIES.length) return 'All categories';
  return categories
    .map((id) => getCategory(id)?.shortName)
    .filter(Boolean)
    .join(' + ');
}

export function loadCategoryFavorites(): FavoriteReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistCategoryFavorites(favorites: FavoriteReport[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function toggleCategoryFavorite(
  favorites: FavoriteReport[],
  categories: ParentCategoryId[],
): { favorites: FavoriteReport[]; added: boolean; removed: boolean } {
  if (categories.length === 0) {
    return { favorites, added: false, removed: false };
  }

  const key = categoryKey(categories);
  const existing = favorites.find((f) => categoryKey(f.categories) === key);

  if (existing) {
    return {
      favorites: favorites.filter((f) => f.id !== existing.id),
      added: false,
      removed: true,
    };
  }

  return {
    favorites: [
      {
        id: `fav-${Date.now()}`,
        categories: [...categories],
      },
      ...favorites,
    ],
    added: true,
    removed: false,
  };
}

export function isCategorySetFavorited(
  favorites: FavoriteReport[],
  categories: ParentCategoryId[],
): boolean {
  if (categories.length === 0) return false;
  const key = categoryKey(categories);
  return favorites.some((f) => categoryKey(f.categories) === key);
}
