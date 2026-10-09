'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Building2, Handshake, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRMMainTab } from './types';
import { PRMOverviewDashboard } from './components/PRMOverviewDashboard';
import { PartnerManagementTab } from './components/tabs/PartnerManagementTab';
import { PartnerSalesTab } from './components/tabs/PartnerSalesTab';
import { AddPartnerWizardModal } from './components/AddPartnerWizardModal';
import { PartnerProfileWorkspace } from './components/PartnerProfileWorkspace';
import { ProductCatalogTab } from './components/tabs/ProductCatalogTab';
import { PartnersReportDialog } from './components/PartnersReportDialog';
import { EditPartnerModal } from './components/profile/EditPartnerModal';
import {
  usePartnerPerformance,
  usePartners,
} from '@/store/server/features/partners/queries';
import { useDealRegistrations } from '@/store/server/features/partners/dealRegistrations';
import {
  useCatalogProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import { useCreatePartner } from '@/store/server/features/partners/mutations';
import { useUpdateProductFamily } from '@/store/server/features/product-catalog/mutations';
import { toast } from 'sonner';

const VALID_MAIN_TABS: PRMMainTab[] = [
  'overview',
  'partner-management',
  'product-catalog',
  'partner-sales',
];

export function PartnersPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<PRMMainTab>(() => {
    return VALID_MAIN_TABS.includes(initialTab as PRMMainTab)
      ? (initialTab as PRMMainTab)
      : 'overview';
  });
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [qbrPartnerPrefillId, setQbrPartnerPrefillId] = useState<string | null>(
    null,
  );

  const partnersQuery = usePartners();
  const productsQuery = useCatalogProducts();
  const familiesQuery = useProductFamilies();
  const createPartner = useCreatePartner();
  const updateProductFamily = useUpdateProductFamily();
  const performanceQuery = usePartnerPerformance();

  const basePartners = useMemo(
    () => partnersQuery.data?.partners ?? [],
    [partnersQuery.data?.partners],
  );
  const products = productsQuery.data ?? [];
  const dealRegsQuery = useDealRegistrations(basePartners);

  const partners = useMemo(() => {
    const withPipeline =
      dealRegsQuery.partnersWithPipeline.length > 0
        ? dealRegsQuery.partnersWithPipeline
        : basePartners;
    const wonByPartner = performanceQuery.data?.wonByPartnerId ?? {};
    return withPipeline.map((partner) => {
      const byCurrency = wonByPartner[partner.id] ?? {};
      const revenue = Object.values(byCurrency).reduce(
        (sum, amount) => sum + (Number(amount) || 0),
        0,
      );
      const scorecardTarget = partner.scorecard?.revenueTarget ?? 0;
      const fromCurrency = (partner.currencyTargets ?? []).reduce(
        (sum, row) => sum + (Number(row.annualAmount) || 0),
        0,
      );
      const target =
        (typeof partner.annualTarget === 'number' && partner.annualTarget > 0
          ? partner.annualTarget
          : 0) ||
        (fromCurrency > 0 ? fromCurrency : 0) ||
        (scorecardTarget > 0 ? scorecardTarget : 0);
      const hasTarget = target > 0;
      return {
        ...partner,
        revenue,
        scorecard: {
          ...partner.scorecard,
          revenue,
          revenueTarget: hasTarget ? target : 0,
          // 0% only when a real target exists; list shows "—" when target is 0.
          targetAchievement: hasTarget ? (revenue / target) * 100 : 0,
        },
      };
    });
  }, [
    basePartners,
    dealRegsQuery.partnersWithPipeline,
    performanceQuery.data?.wonByPartnerId,
  ]);

  const router = useRouter();
  const pathname = usePathname();
  const selectedPartnerId = searchParams.get('partner');

  const setSelectedPartnerId = useCallback(
    (partnerId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (partnerId) {
        params.set('partner', partnerId);
      } else {
        params.delete('partner');
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activePartner = partners.find((p) => p.id === selectedPartnerId);
  const editingPartner = partners.find((p) => p.id === editingPartnerId);
  const isPartnerDetailOpen = Boolean(selectedPartnerId && activePartner);

  const goToRegisterQbr = useCallback(
    (partnerId: string) => {
      setQbrPartnerPrefillId(partnerId);
      setSelectedPartnerId(partnerId);
    },
    [setSelectedPartnerId],
  );

  const mainTabs: {
    id: PRMMainTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    {
      id: 'partner-management',
      label: 'Partner Management',
      icon: <Building2 size={15} />,
      badge: partners.length,
    },
    {
      id: 'product-catalog',
      label: 'Product Catalog',
      icon: <Package size={15} />,
      badge: products.length,
    },
    {
      id: 'partner-sales',
      label: 'Deal Registrations',
      icon: <Handshake size={15} />,
      badge: dealRegsQuery.registrations.length,
    },
  ];

  const handleAddPartner = async (
    payload: import('@/store/server/features/partners/types').CreatePartnerPayload,
    options?: { productFamilyIds?: string[] },
  ) => {
    try {
      const created = await createPartner.mutateAsync(payload);
      const familyIds = options?.productFamilyIds ?? [];
      const roleIds = payload.roleIds ?? [];
      if (created?.id && roleIds.length && familyIds.length) {
        const families = familiesQuery.data ?? [];
        await Promise.all(
          familyIds.map(async (familyId) => {
            const family = families.find((entry) => entry.id === familyId);
            if (!family) return;
            const existing = (family.familyPartners ?? []).map((link) => ({
              partnerId: link.partnerId,
              partnerRoleId: link.partnerRoleId,
            }));
            const next = [...existing];
            for (const roleId of roleIds) {
              const alreadyLinked = next.some(
                (link) =>
                  link.partnerId === created.id &&
                  link.partnerRoleId === roleId,
              );
              if (!alreadyLinked) {
                next.push({ partnerId: created.id, partnerRoleId: roleId });
              }
            }
            if (next.length === existing.length) return;
            await updateProductFamily.mutateAsync({
              id: familyId,
              payload: { familyPartners: next },
            });
          }),
        );
      }
      toast.success('Partner created');
      setActiveTab('partner-management');
    } catch {
      toast.error('Failed to create partner');
    }
  };

  const isMainTabActive = (tabId: PRMMainTab) =>
    activeTab === tabId && !selectedPartnerId;

  const hideMainChrome = isPartnerDetailOpen;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div
        className={cn(
          'flex-shrink-0 border-b border-border bg-white',
          hideMainChrome && 'hidden',
        )}
      >
        <div className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:px-6">
          <h1 className="m-0 text-[20px] font-semibold text-foreground">
            Partners
          </h1>
        </div>

        <div className="flex items-end justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-1">
              {mainTabs.map((tab) => {
                const active = isMainTabActive(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(null);
                      setActiveTab(tab.id);
                    }}
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
                    {tab.badge !== undefined ? (
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                          active
                            ? 'bg-brand-muted text-brand'
                            : 'bg-surface-elevated text-muted-foreground',
                        )}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-1.5 shrink-0">
            <PartnersReportDialog />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {isPartnerDetailOpen && activePartner ? (
          <PartnerProfileWorkspace
            partner={activePartner}
            onBack={() => setSelectedPartnerId(null)}
            openQbrOnMount={qbrPartnerPrefillId === activePartner.id}
            onQbrModalClosed={() => setQbrPartnerPrefillId(null)}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <PRMOverviewDashboard
                partners={partners}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectPartner={(pid) => setSelectedPartnerId(pid)}
              />
            )}

            {activeTab === 'partner-management' && (
              <PartnerManagementTab
                partners={partners}
                isLoading={partnersQuery.isLoading}
                onSelectPartner={(pid) => setSelectedPartnerId(pid)}
                onOpenAddWizard={() => setIsAddPartnerOpen(true)}
                onEditPartner={(partnerId) => setEditingPartnerId(partnerId)}
                onScheduleQBRForPartner={(partnerId) =>
                  goToRegisterQbr(partnerId)
                }
              />
            )}

            {activeTab === 'product-catalog' && (
              <ProductCatalogTab partners={partners} />
            )}

            {activeTab === 'partner-sales' && <PartnerSalesTab />}
          </>
        )}
      </div>

      <AddPartnerWizardModal
        isOpen={isAddPartnerOpen}
        onClose={() => setIsAddPartnerOpen(false)}
        onAddPartner={handleAddPartner}
      />

      {editingPartner ? (
        <EditPartnerModal
          isOpen
          partner={editingPartner}
          onClose={() => setEditingPartnerId(null)}
          onSave={() => setEditingPartnerId(null)}
        />
      ) : null}
    </div>
  );
}
