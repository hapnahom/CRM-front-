'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Layers,
  Loader2,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Check,
} from 'lucide-react';
import { DataTableSkeleton } from '@/components/loading/skeleton-screens';
import {
  Partner,
  PartnerManagementSubTab,
  OnboardingApplication,
} from '../../types';
import {
  useUpdatePartner,
  useDeletePartner,
} from '@/store/server/features/partners/mutations';
import { PRMKpiCard } from '../common/PRMKpiCard';
import {
  PartnerRoleBadges,
  normalizePartnerRoleIds,
  usePartnerRoles,
} from '../../roles';
import { usePartnerTiers } from '../../tiers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import { cn } from '@/lib/utils';
import { formatDealMoney } from '../../utils/deal-registrations';

const TABLE_HEAD_CLASS =
  'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground';
const TABLE_CELL_CLASS = 'px-4 py-3 text-sm text-foreground';

/** Same “has target” rule as the partners report Target vs Achievement sheet. */
function partnerTargetAmount(partner: Partner): number {
  if (typeof partner.annualTarget === 'number' && partner.annualTarget > 0) {
    return partner.annualTarget;
  }
  const fromCurrency = (partner.currencyTargets ?? []).reduce(
    (sum, row) => sum + (Number(row.annualAmount) || 0),
    0,
  );
  if (fromCurrency > 0) return fromCurrency;
  const fromScorecard = partner.scorecard?.revenueTarget ?? 0;
  return fromScorecard > 0 ? fromScorecard : 0;
}

/** Revenue attainment against the partner's agreed target, in percent. */
function getTargetAchievement(partner: Partner): number | null {
  const target = partnerTargetAmount(partner);
  if (target <= 0) return null;

  const revenue = partner.scorecard?.revenue ?? partner.revenue;
  if (!Number.isFinite(revenue)) return null;

  const direct = partner.scorecard?.targetAchievement;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  return (revenue / target) * 100;
}

function achievementBarClass(value: number) {
  if (value >= 100) return 'bg-emerald-600';
  if (value >= 75) return 'bg-blue-600';
  return 'bg-amber-600';
}

interface PartnerManagementTabProps {
  partners: Partner[];
  isLoading?: boolean;
  onSelectPartner: (partnerId: string) => void;
  onOpenAddWizard: () => void;
  onEditPartner?: (partnerId: string) => void;
  onScheduleQBRForPartner?: (partnerId: string) => void;
}

export function PartnerManagementTab({
  partners,
  isLoading = false,
  onSelectPartner,
  onOpenAddWizard,
  onEditPartner,
  onScheduleQBRForPartner,
}: PartnerManagementTabProps) {
  const [subTab, setSubTab] = useState<PartnerManagementSubTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);
  const { activeRoles } = usePartnerRoles();
  const { activeTiers, getTierByName } = usePartnerTiers();
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();
  const [approvingAppId, setApprovingAppId] = useState<string | null>(null);

  /** Onboarding queue derives from real partner records in onboarding-ish states. */
  const apps: OnboardingApplication[] = partners
    .filter((p) => p.status === 'Onboarding' || p.status === 'Under Review')
    .map((p) => ({
      id: p.id,
      partnerName: p.name,
      partnerRoleIds: normalizePartnerRoleIds(p.roleIds),
      submittedDate: p.partnershipStartDate || new Date().toISOString(),
      currentStage: 'Internal Review',
      status: p.status === 'Under Review' ? 'Under Review' : 'Submitted',
      assignedManager: p.accountManager || '—',
      reviewer: p.accountManager || '—',
      missingDocuments: [],
      lastUpdated: p.partnershipStartDate || new Date().toISOString(),
      primaryContactName: p.primaryContact?.name || '—',
      primaryContactEmail: p.primaryContact?.email || '—',
      country: '—',
      industry: '—',
      requestedTier: p.tier,
      approvalHistory: [],
    }));
  const [selectedAppId, setSelectedAppId] = useState('');
  const pendingApps = apps;

  const handleApproveOnboarding = async (appId: string) => {
    setApprovingAppId(appId);
    try {
      await updatePartner.mutateAsync({
        id: appId,
        payload: { status: 'Active' },
      });
      toast.success('Partner activated');
    } catch {
      toast.error('Failed to activate partner');
    } finally {
      setApprovingAppId(null);
    }
  };

  const roleKpis = useMemo(() => {
    return [...activeRoles]
      .map((role) => ({
        id: role.id,
        title: role.name,
        value: partners.filter((p) =>
          normalizePartnerRoleIds(p.roleIds).includes(role.id),
        ).length,
      }))
      .sort((a, b) => b.value - a.value || a.title.localeCompare(b.title));
  }, [activeRoles, partners]);

  const filteredPartners = partners.filter((p) => {
    let matchesRole = true;
    if (subTab !== 'all' && subTab !== 'onboarding') {
      matchesRole = normalizePartnerRoleIds(p.roleIds).includes(subTab);
    }

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.accountManager.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primaryContact.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = tierFilter === 'all' || p.tier === tierFilter;

    return matchesRole && matchesSearch && matchesTier;
  });

  const selectedApp = apps.find((a) => a.id === selectedAppId) || apps[0];

  const getTierBadge = (tierName: string) => {
    const tier = getTierByName(tierName);
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground"
        style={{
          backgroundColor: tier?.color || undefined,
          borderColor: tier?.borderColor || undefined,
        }}
      >
        {tierName}
      </Badge>
    );
  };

  const stagesList = [
    'Partner Application',
    'Company Information',
    'Partner Role Selection',
    'Documents Upload',
    'Products & Capabilities',
    'Internal Review',
    'Approval',
    'Agreement Signing',
    'Certification & Enablement',
    'Active Partner',
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-surface-card p-[10.5px] sm:p-[17.5px]">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <PRMKpiCard
          title="Total Partners"
          value={partners.length}
          subtitle="All ecosystem entities"
          icon={<Building2 size={14} />}
          iconBgColor="bg-brand-muted text-brand"
          accentColor="text-brand"
        />
        {roleKpis.slice(0, 3).map((role) => (
          <PRMKpiCard
            key={role.id}
            title={role.title}
            value={role.value}
            subtitle="Assigned partners"
            icon={<Layers size={14} />}
            iconBgColor="bg-surface-elevated text-muted-foreground"
            accentColor="text-foreground"
          />
        ))}
        <PRMKpiCard
          title="In Onboarding"
          value={pendingApps.length}
          subtitle="Under qualification"
          icon={<Clock size={14} />}
          iconBgColor="bg-brand-muted text-orange-600"
          accentColor="text-orange-600"
        />
      </div>

      {/* Directory Content & Toolbar */}
      {subTab !== 'onboarding' && (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
          {/* Directory Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="m-0 text-[12px] font-semibold text-foreground">
              Partners
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[180px] sm:w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search partners..."
                  className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] dark:bg-surface-card"
                />
              </div>
              <Select
                value={subTab}
                onValueChange={(value) =>
                  setSubTab(value as PartnerManagementSubTab)
                }
              >
                <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[200px]">
                  <SelectValue placeholder="Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {activeRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="onboarding">In onboarding</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[140px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  {activeTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.name}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="h-[31.5px] shrink-0 bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover shadow-sm"
                onClick={onOpenAddWizard}
              >
                <Plus size={14} className="mr-1.5" />
                Add Partner
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <DataTableSkeleton rows={8} columns={8} />
            </div>
          ) : filteredPartners.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 />
                </EmptyMedia>
                <EmptyTitle>No partners</EmptyTitle>
                <EmptyDescription>
                  No partners match your search and filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'min-w-[220px]')}
                    >
                      Partner
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[180px]')}>
                      Roles
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[110px]')}>
                      Tier
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'hidden lg:table-cell')}
                    >
                      Primary contact
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'hidden xl:table-cell')}
                    >
                      Account manager
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'w-[110px] text-right')}
                    >
                      Pipeline
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'w-[120px] text-right')}
                    >
                      Revenue (TTM)
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[160px]')}>
                      Target achieved
                    </TableHead>
                    <TableHead
                      className={cn(
                        TABLE_HEAD_CLASS,
                        'hidden w-[110px] sm:table-cell',
                      )}
                    >
                      Next QBR
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-12')} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner) => {
                    const achievement = getTargetAchievement(partner);
                    return (
                      <TableRow
                        key={partner.id}
                        className="cursor-pointer"
                        onClick={() => onSelectPartner(partner.id)}
                      >
                        <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
                          <p
                            className="truncate font-medium text-foreground"
                            title={partner.name}
                          >
                            {partner.name}
                          </p>
                        </TableCell>
                        <TableCell className={TABLE_CELL_CLASS}>
                          <PartnerRoleBadges
                            roleIds={partner.roleIds}
                            compact
                          />
                        </TableCell>
                        <TableCell className={TABLE_CELL_CLASS}>
                          {getTierBadge(partner.tier)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'hidden max-w-0 lg:table-cell',
                          )}
                        >
                          <p className="truncate text-foreground">
                            {partner.primaryContact.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {partner.primaryContact.email}
                          </p>
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'hidden max-w-0 truncate xl:table-cell',
                          )}
                        >
                          {partner.accountManager}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'text-right tabular-nums',
                          )}
                        >
                          {formatDealMoney(partner.pipelineValue)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'text-right font-medium tabular-nums',
                          )}
                        >
                          {formatDealMoney(partner.revenue)}
                        </TableCell>
                        <TableCell className={TABLE_CELL_CLASS}>
                          {achievement === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-subtle">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    achievementBarClass(achievement),
                                  )}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, achievement))}%`,
                                  }}
                                />
                              </div>
                              <span className="tabular-nums text-foreground">
                                {Math.round(achievement)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'hidden text-muted-foreground sm:table-cell',
                          )}
                        >
                          {partner.nextQBRDate || '—'}
                        </TableCell>
                        <TableCell
                          className={cn(TABLE_CELL_CLASS, 'text-right')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-7"
                              >
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => onEditPartner?.(partner.id)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onScheduleQBRForPartner?.(partner.id)
                                }
                              >
                                Schedule QBR
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingPartner(partner)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Onboarding Applications View */}
      {subTab === 'onboarding' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] lg:col-span-7">
            <div className="border-b border-border bg-surface-elevated p-3 px-4 flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">
                Applications ({apps.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Partner</th>
                    <th className="py-2.5 px-3">Roles</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apps.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`hover:bg-surface-hover/60 cursor-pointer ${selectedAppId === app.id ? 'bg-brand-muted/50 font-medium' : ''}`}
                    >
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {app.partnerName}
                      </td>
                      <td className="py-3 px-3">
                        <PartnerRoleBadges
                          roleIds={app.partnerRoleIds}
                          compact
                        />
                      </td>
                      <td className="py-3 px-3">
                        {getTierBadge(app.requestedTier)}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {app.currentStage}
                      </td>
                      <td className="py-3 px-3">
                        {app.status === 'Approved' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            {app.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                        >
                          <Eye size={11} /> Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] lg:col-span-5">
            {selectedApp ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="border-b border-border bg-surface-elevated p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {selectedApp.partnerName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Requested Tier: {selectedApp.requestedTier}
                      </p>
                    </div>
                    <Badge className="bg-brand text-white text-[10px]">
                      {selectedApp.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="rounded-xl border border-border bg-surface-elevated p-3.5 space-y-2">
                    <span className="font-semibold text-[11px] font-semibold text-muted-foreground block">
                      Progress Tracker:
                    </span>
                    <div className="space-y-1">
                      {stagesList.map((stage, idx) => {
                        const isCompleted =
                          stagesList.indexOf(selectedApp.currentStage) > idx ||
                          selectedApp.status === 'Active';
                        const isCurrent =
                          stagesList.indexOf(selectedApp.currentStage) ===
                            idx && selectedApp.status !== 'Active';

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 py-0.5"
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-brand text-white ring-2 ring-orange-200' : 'bg-surface-subtle border border-border text-muted-foreground'}`}
                            >
                              {isCompleted ? <Check size={10} /> : idx + 1}
                            </div>
                            <span
                              className={`text-xs ${isCompleted ? 'text-foreground font-medium' : isCurrent ? 'text-brand font-semibold' : 'text-muted-foreground'}`}
                            >
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-surface-elevated p-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                    disabled={approvingAppId === selectedApp.id}
                    onClick={() => handleApproveOnboarding(selectedApp.id)}
                  >
                    {approvingAppId === selectedApp.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Approve Partner
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(deletingPartner)}
        onOpenChange={(open) => {
          if (!deletePartner.isLoading && !open) setDeletingPartner(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete partner</DialogTitle>
            <DialogDescription>
              Delete &quot;{deletingPartner?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-border text-xs"
              disabled={deletePartner.isLoading}
              onClick={() => setDeletingPartner(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-8 text-xs"
              disabled={deletePartner.isLoading || !deletingPartner}
              onClick={async () => {
                if (!deletingPartner) return;
                try {
                  await deletePartner.mutateAsync(deletingPartner.id);
                  toast.success(`Deleted ${deletingPartner.name}`);
                  setDeletingPartner(null);
                } catch {
                  toast.error('Failed to delete partner');
                }
              }}
            >
              {deletePartner.isLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
