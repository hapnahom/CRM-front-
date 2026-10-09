'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Boxes, Layers, Package, ShieldCheck } from 'lucide-react';
import { lazyNamed } from '@/utils/lazyNamed';
import { Skeleton } from '@/components/ui/skeleton';
import { PRMKpiCard } from '../common/PRMKpiCard';
import {
  MODULE_CONTENT_PAD,
  type CatalogSegment,
} from '../product-catalog/shared';
import type {
  CatalogTabView,
  ProductCatalogTabProps,
} from '../product-catalog/types';
import { cn } from '@/lib/utils';
import {
  useCatalogProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';

function CatalogTabSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    </div>
  );
}

const ProductsTab = lazyNamed(
  () => import('../product-catalog/ProductsTab'),
  'ProductsTab',
  { ssr: false, loading: CatalogTabSkeleton },
);

const ProductFamiliesTab = lazyNamed(
  () => import('../product-catalog/ProductFamiliesTab'),
  'ProductFamiliesTab',
  { ssr: false, loading: CatalogTabSkeleton },
);

const CATALOG_SUB_TABS: {
  id: CatalogSegment;
  label: string;
  icon: ReactNode;
}[] = [
  { id: 'products', label: 'Products', icon: <Package size={14} /> },
  { id: 'families', label: 'Product Families', icon: <Layers size={14} /> },
];

export function ProductCatalogTab({ partners }: ProductCatalogTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<CatalogSegment>('products');
  const [childInDetail, setChildInDetail] = useState(false);
  const productsQuery = useCatalogProducts();
  const familiesQuery = useProductFamilies();

  const products = productsQuery.data ?? [];
  const families = familiesQuery.data ?? [];

  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === 'active').length;
    const activeFamilies = families.filter((f) => f.status === 'active').length;
    const partnerLinks = products.reduce(
      (sum, product) => sum + product.productPartners.length,
      0,
    );
    return { activeProducts, activeFamilies, partnerLinks };
  }, [families, products]);

  const handleSubTabChange = (tab: CatalogSegment) => {
    setActiveSubTab(tab);
    setChildInDetail(false);
  };

  const handleChildViewChange = useCallback((view: CatalogTabView) => {
    setChildInDetail(view === 'detail');
  }, []);

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-4 overflow-hidden bg-surface-card',
        MODULE_CONTENT_PAD,
      )}
    >
      {!childInDetail ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
          <PRMKpiCard
            title="Total Products"
            value={products.length}
            subtitle={`${stats.activeProducts} active`}
            icon={<Package size={14} />}
            iconBgColor="bg-brand-muted text-brand"
            accentColor="text-brand"
          />
          <PRMKpiCard
            title="Product Families"
            value={families.length}
            subtitle={`${stats.activeFamilies} active`}
            icon={<Layers size={14} />}
            iconBgColor="bg-brand-muted text-brand"
            accentColor="text-foreground"
          />
          <PRMKpiCard
            title="Active Products"
            value={stats.activeProducts}
            subtitle="Available on opportunities"
            icon={<Boxes size={14} />}
            iconBgColor="bg-emerald-50 text-emerald-700"
            accentColor="text-emerald-700"
          />
          <PRMKpiCard
            title="Partner Links"
            value={stats.partnerLinks}
            subtitle="Partner role associations"
            icon={<ShieldCheck size={14} />}
            iconBgColor="bg-amber-50 text-amber-700"
            accentColor="text-amber-700"
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!childInDetail ? (
          <div className="w-full shrink-0 overflow-x-auto border-b border-border">
            <div
              className="flex min-w-max items-center gap-1"
              role="tablist"
              aria-label="Product catalog sections"
            >
              {CATALOG_SUB_TABS.map((tab) => {
                const active = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSubTabChange(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                      active
                        ? 'border-brand text-brand'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    <span
                      className={
                        active ? 'text-brand' : 'text-muted-foreground'
                      }
                    >
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3">
          {activeSubTab === 'products' ? (
            <ProductsTab
              partners={partners}
              onViewChange={handleChildViewChange}
            />
          ) : (
            <ProductFamiliesTab
              partners={partners}
              onViewChange={handleChildViewChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
