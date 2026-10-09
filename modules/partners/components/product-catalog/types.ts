import type { Partner } from '../../types';

export type CatalogTabView = 'list' | 'detail';

export interface CatalogTabViewProps {
  onViewChange?: (view: CatalogTabView) => void;
}

export interface ProductCatalogTabProps {
  partners: Partner[];
}

export interface ProductFamiliesTabProps extends CatalogTabViewProps {
  partners?: Partner[];
}

export interface ProductsTabProps
  extends ProductCatalogTabProps,
    CatalogTabViewProps {}
