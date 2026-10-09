'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  KeyRound,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { MoneyAmount } from '@/modules/customers/components/DualCurrency';
import { KpiCard, Panel } from '@/modules/customers/components/detail/shared';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  DeliveryLicense,
  DeliveryProductAssignment,
  DeliveryProject,
  LicenseStatus,
  ProjectHealth,
} from '@/store/server/features/customers/types';
import {
  useCreateProjectLicense,
  useCreateProjectProduct,
  useDeleteCustomerProject,
  useDeleteProjectProduct,
  useGetCustomerDeliverySummary,
  useGetCustomerProjects,
  useUpdateCustomerProject,
  useUpdateProjectLicense,
  useUpdateProjectProduct,
} from '@/store/server/features/customers/delivery';
import {
  useCatalogVendors,
  useImplementationPartners,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { MultiEntitySelector } from '@/modules/product-catalog/components/MultiEntitySelector';

type ProjectDraft = {
  name: string;
  health: ProjectHealth;
  managerUserId: string;
  startDate: string;
  targetEndDate: string;
  budget: string;
  completion: string;
};

type ProductDraft = {
  name: string;
  category: string;
  vendorIds: string[];
  familyIds: string[];
  partnerIds: string[];
  quantity: string;
  status: string;
  hasLicense: boolean;
  licenseName: string;
  seats: string;
  expiryDate: string;
  renewalCost: string;
};

const HEALTH_OPTIONS: { value: ProjectHealth; label: string }[] = [
  { value: 'OnTrack', label: 'On Track' },
  { value: 'AtRisk', label: 'At Risk' },
  { value: 'Delayed', label: 'Delayed' },
  { value: 'Completed', label: 'Completed' },
];

const EMPTY_PROJECT: ProjectDraft = {
  name: '',
  health: 'OnTrack',
  managerUserId: '',
  startDate: '',
  targetEndDate: '',
  budget: '',
  completion: '0',
};

const EMPTY_PRODUCT: ProductDraft = {
  name: '',
  category: 'Software',
  vendorIds: [],
  familyIds: [],
  partnerIds: [],
  quantity: '1',
  status: 'Active',
  hasLicense: false,
  licenseName: '',
  seats: '',
  expiryDate: '',
  renewalCost: '',
};

const PRODUCT_STATUS_OPTIONS = ['Active', 'Inactive'];

function sanitizeNumericInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...fraction] = cleaned.split('.');
  if (fraction.length === 0) return whole;
  return `${whole}.${fraction.join('').slice(0, 2)}`;
}

function licenseStyles(status: LicenseStatus) {
  if (status === 'Active') {
    return {
      border: 'border-border',
      bg: 'bg-surface-elevated/40',
      badge: 'border-success/20 bg-success/10 text-success',
    };
  }
  if (status === 'Expiring Soon') {
    return {
      border: 'border-amber-200',
      bg: 'bg-amber-50/50',
      badge: 'border-amber-200 bg-amber-100 text-amber-800',
    };
  }
  return {
    border: 'border-rose-200',
    bg: 'bg-rose-50/40',
    badge: 'border-rose-200 bg-rose-100 text-rose-800',
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function collectAttentionLicenses(projects: DeliveryProject[]) {
  return projects.flatMap((project) =>
    project.products.flatMap((product) =>
      product.licenses
        .filter(
          (license) =>
            license.status === 'Expiring Soon' || license.status === 'Expired',
        )
        .map((license) => ({
          ...license,
          projectId: project.id,
          productName: product.name,
        })),
    ),
  );
}

function projectLicenseCount(project: DeliveryProject) {
  return project.products.reduce(
    (sum, product) => sum + product.licenses.length,
    0,
  );
}

function productStatusBadge(status: string) {
  if (status === 'Active') {
    return 'border-success/20 bg-success/10 text-success';
  }
  return 'border-border bg-surface-elevated text-muted-foreground';
}

function LicenseCard({ license }: { license: DeliveryLicense }) {
  const styles = licenseStyles(license.status);
  const meta = [license.seats, `Expires ${formatDate(license.expiryDate)}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2',
        styles.border,
        styles.bg,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <KeyRound size={13} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {license.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn('rounded-md text-[10px] font-medium', styles.badge)}
        >
          {license.status}
        </Badge>
        <MoneyAmount value={license.renewalCost} currency={license.currency} />
      </div>
    </div>
  );
}

export function DeliveryTab({ customerId }: { customerId: string }) {
  const canEdit = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.EDIT_CUSTOMERS],
  });

  const projectsQuery = useGetCustomerProjects(customerId);
  const summaryQuery = useGetCustomerDeliverySummary(customerId);
  const usersQuery = useGetPlatformUsers({ page: 1, pageSize: 1000 });
  const vendorsQuery = useCatalogVendors();
  const familiesQuery = useProductFamilies();
  const partnersQuery = useImplementationPartners();
  const updateProject = useUpdateCustomerProject(customerId);
  const deleteProject = useDeleteCustomerProject(customerId);
  const createAssignment = useCreateProjectProduct(customerId);
  const updateAssignment = useUpdateProjectProduct(customerId);
  const deleteAssignment = useDeleteProjectProduct(customerId);
  const createLicense = useCreateProjectLicense(customerId);
  const updateLicense = useUpdateProjectLicense(customerId);

  const projects = projectsQuery.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const families = familiesQuery.data ?? [];
  const partners = partnersQuery.data ?? [];
  const summary = summaryQuery.data;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(EMPTY_PROJECT);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id);
    if (selectedId && !projects.some((project) => project.id === selectedId)) {
      setSelectedId(projects[0]?.id ?? null);
    }
  }, [projects, selectedId]);

  const selected =
    projects.find((project) => project.id === selectedId) ?? null;
  const attention = useMemo(
    () => collectAttentionLicenses(projects),
    [projects],
  );
  const selectedAttention =
    selected?.products.flatMap((product) =>
      product.licenses.filter(
        (license) =>
          license.status === 'Expiring Soon' || license.status === 'Expired',
      ),
    ) ?? [];

  const openEditProject = (project: DeliveryProject) => {
    setEditingProjectId(project.id);
    setProjectDraft({
      name: project.name,
      health: project.health,
      managerUserId: project.managerUserId ?? '',
      startDate: project.startDate ?? '',
      targetEndDate: project.targetEndDate ?? '',
      budget: String(project.budget ?? ''),
      completion: String(project.completionPercent ?? 0),
    });
    setProjectOpen(true);
  };

  const saveProject = () => {
    if (!projectDraft.name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    const payload = {
      name: projectDraft.name.trim(),
      health: projectDraft.health,
      managerUserId: projectDraft.managerUserId || null,
      startDate: projectDraft.startDate || null,
      targetEndDate: projectDraft.targetEndDate || null,
      budget: Number(projectDraft.budget) || 0,
      completionPercent: Math.min(
        100,
        Math.max(0, Number(projectDraft.completion) || 0),
      ),
    };
    const onSuccess = (project: DeliveryProject) => {
      toast.success('Project updated.');
      setSelectedId(project.id);
      setProjectOpen(false);
    };
    const onError = () => toast.error('Could not save project.');
    if (!editingProjectId) return;
    updateProject.mutate(
      { projectId: editingProjectId, payload },
      { onSuccess, onError },
    );
  };

  const openCreateProduct = () => {
    if (!selected) {
      toast.error('Select a project first.');
      return;
    }
    setEditingProductId(null);
    setProductDraft(EMPTY_PRODUCT);
    setProductOpen(true);
  };

  const openEditProduct = (product: DeliveryProductAssignment) => {
    const license = product.licenses[0];
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      category: product.category || 'Software',
      vendorIds: (product.vendors ?? []).map((row) => row.id),
      familyIds: (product.families ?? []).map((row) => row.id),
      partnerIds: (product.partners ?? []).map((row) => row.id),
      quantity: String(product.quantity),
      status: product.status,
      hasLicense: product.licenses.length > 0,
      licenseName: license?.name ?? '',
      seats: license?.seats ?? '',
      expiryDate: license?.expiryDate ?? '',
      renewalCost: license ? String(license.renewalCost) : '',
    });
    setProductOpen(true);
  };

  const saveProduct = async () => {
    if (!selected) return;
    if (!productDraft.name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    const assignmentPayload = {
      name: productDraft.name.trim(),
      category: productDraft.category.trim() || 'Software',
      quantity: Number(productDraft.quantity) || 1,
      status: productDraft.status.trim() || 'Active',
      vendorIds: productDraft.vendorIds,
      familyIds: productDraft.familyIds,
      partnerIds: productDraft.partnerIds,
    };
    const licensePayload = productDraft.hasLicense
      ? {
          name: productDraft.licenseName.trim(),
          seats: productDraft.seats.trim() || null,
          expiryDate: productDraft.expiryDate || null,
          renewalCost: Number(productDraft.renewalCost) || 0,
        }
      : null;
    if (licensePayload && !licensePayload.name) {
      toast.error('License name is required when attaching a license.');
      return;
    }
    setSaving(true);
    try {
      let assignmentId = editingProductId;
      if (editingProductId) {
        await updateAssignment.mutateAsync({
          projectId: selected.id,
          assignmentId: editingProductId,
          payload: assignmentPayload,
        });
      } else {
        const created = await createAssignment.mutateAsync({
          projectId: selected.id,
          payload: assignmentPayload,
        });
        assignmentId = created.id;
      }
      if (licensePayload && assignmentId) {
        const existing = selected.products.find(
          (row) => row.id === editingProductId,
        )?.licenses[0];
        if (existing) {
          await updateLicense.mutateAsync({
            projectId: selected.id,
            assignmentId,
            licenseId: existing.id,
            payload: licensePayload,
          });
        } else {
          await createLicense.mutateAsync({
            projectId: selected.id,
            assignmentId,
            payload: licensePayload,
          });
        }
      }
      toast.success(editingProductId ? 'Product updated.' : 'Product added.');
      setProductOpen(false);
    } catch {
      toast.error('Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const managerLabel = (project: DeliveryProject) => {
    if (!project.managerUserId) return 'Unassigned';
    return formatUserName(
      users.find((user) => user.id === project.managerUserId),
    );
  };

  if (projectsQuery.isError || summaryQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
        <p className="text-sm text-destructive">
          Could not load delivery data.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-8"
          onClick={() => {
            void projectsQuery.refetch();
            void summaryQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const projectCount = projectsQuery.isLoading
    ? (summary?.projectCount ?? 0)
    : projects.length;
  const productCount = projectsQuery.isLoading
    ? (summary?.productCount ?? 0)
    : projects.reduce((sum, project) => sum + project.products.length, 0);
  const licenseCount = projectsQuery.isLoading
    ? (summary?.licenseCount ?? 0)
    : projects.reduce((sum, project) => sum + projectLicenseCount(project), 0);
  const expiringCount = projectsQuery.isLoading
    ? (summary?.expiringSoonCount ?? 0)
    : attention.filter((row) => row.status === 'Expiring Soon').length;
  const totalBudget = projectsQuery.isLoading
    ? (summary?.totalBudget ?? 0)
    : projects.reduce((sum, project) => sum + Number(project.budget ?? 0), 0);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Projects"
          value={projectsQuery.isLoading ? '…' : String(projectCount)}
          hint={<MoneyAmount value={totalBudget} size="sm" align="start" />}
          icon={<Briefcase size={15} />}
          tone="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Products"
          value={projectsQuery.isLoading ? '…' : String(productCount)}
          hint="Across all projects"
          icon={<Package size={15} />}
          tone="bg-light_purple text-purple"
        />
        <KpiCard
          label="Licenses"
          value={projectsQuery.isLoading ? '…' : String(licenseCount)}
          hint="Software entitlements"
          icon={<KeyRound size={15} />}
          tone="bg-success/15 text-success"
        />
        <KpiCard
          label="Expiring Soon"
          value={projectsQuery.isLoading ? '…' : String(expiringCount)}
          hint="Needs renewal attention"
          icon={<AlertTriangle size={15} />}
          tone="bg-amber-50 text-amber-600"
        />
      </section>

      {attention.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {attention.length} license
                {attention.length === 1 ? '' : 's'} expiring soon
              </p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                Next: <strong>{attention[0].name}</strong> ·{' '}
                {formatDate(attention[0].expiryDate)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
            onClick={() => setSelectedId(attention[0].projectId)}
          >
            View project
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
        {projectsQuery.isLoading ? (
          <>
            <Panel className="overflow-hidden">
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="max-h-[560px] space-y-0 overflow-hidden">
                {Array.from({ length: 5 }).map((unused, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:px-5"
                  >
                    <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-32" />
                      <div className="flex gap-2 pt-0.5">
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-5 w-20 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="mt-1.5 h-3 w-28" />
              </div>
              <div className="max-h-[560px] space-y-3 overflow-hidden p-4 sm:p-5">
                {Array.from({ length: 3 }).map((unused, index) => (
                  <div
                    key={index}
                    className="space-y-3 overflow-hidden rounded-lg border border-border p-3.5"
                  >
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <>
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-foreground">
                  Projects ({projectCount})
                </h3>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No project
                  </p>
                ) : (
                  <ul className="m-0 list-none divide-y divide-border p-0">
                    {projects.map((project) => {
                      const isSelected = project.id === selectedId;
                      return (
                        <li key={project.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedId(project.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedId(project.id);
                              }
                            }}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors sm:px-5',
                              isSelected
                                ? 'bg-brand-muted/40'
                                : 'hover:bg-surface-elevated/60',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
                                isSelected
                                  ? 'bg-brand text-brand-foreground'
                                  : 'bg-blue-50 text-blue-600',
                              )}
                            >
                              <Briefcase size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {project.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {managerLabel(project)} · Ends{' '}
                                    {formatDate(project.targetEndDate)}
                                  </p>
                                </div>
                                {canEdit ? (
                                  <div
                                    className="flex shrink-0 gap-0.5"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground"
                                      onClick={() => openEditProject(project)}
                                      aria-label="Edit project"
                                    >
                                      <Pencil size={12} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() =>
                                        setDeleteProjectId(project.id)
                                      }
                                      aria-label="Delete project"
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="rounded-md text-[10px] font-medium"
                                >
                                  {project.healthLabel}
                                </Badge>
                                <MoneyAmount
                                  value={project.budget}
                                  currency={project.currency}
                                  align="start"
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {selected
                      ? `Products & Licenses · ${selected.name}`
                      : 'Products & Licenses'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selected
                      ? `${selected.products.length} product${selected.products.length === 1 ? '' : 's'}`
                      : 'Select a project to view details'}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover"
                    disabled={!selected}
                    onClick={openCreateProduct}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add product
                  </Button>
                ) : null}
              </div>
              <div className="max-h-[560px] space-y-3 overflow-y-auto p-4 sm:p-5">
                {!selected ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                    <span className="grid size-10 place-items-center rounded-lg bg-surface-elevated text-muted-foreground">
                      <Layers size={18} />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Select a project to see its products and licenses.
                    </p>
                  </div>
                ) : selected.products.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No products on this project yet.
                  </p>
                ) : (
                  <>
                    {selectedAttention.length > 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
                        <AlertTriangle
                          size={13}
                          className="shrink-0 text-amber-600"
                        />
                        <span>
                          <strong>{selectedAttention.length}</strong> license
                          {selectedAttention.length === 1 ? '' : 's'} need
                          attention
                        </span>
                      </div>
                    ) : null}
                    {selected.products.map((product) => (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between gap-2 px-3.5 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[
                                product.vendor,
                                product.category,
                                `Qty ${product.quantity}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                'rounded-md text-[10px] font-medium',
                                productStatusBadge(product.status),
                              )}
                            >
                              {product.status}
                            </Badge>
                            {canEdit ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={() => openEditProduct(product)}
                                  aria-label="Edit product"
                                >
                                  <Pencil size={12} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteProductId(product.id)}
                                  aria-label="Delete product"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {product.licenses.length > 0 ? (
                          <ul className="m-0 list-none space-y-2 border-t border-border px-3.5 py-3">
                            {product.licenses.map((license) => (
                              <li key={license.id}>
                                <LicenseCard license={license} />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="border-t border-border px-3.5 py-2.5 text-[11px] text-muted-foreground">
                            No licenses attached
                          </p>
                        )}
                      </article>
                    ))}
                  </>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>

      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Delivery project for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={projectDraft.name}
                onChange={(event) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Health</Label>
              <Select
                value={projectDraft.health}
                onValueChange={(value) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    health: value as ProjectHealth,
                  }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Select
                value={projectDraft.managerUserId || undefined}
                onValueChange={(value) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    managerUserId: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={projectDraft.startDate}
                  onChange={(event) =>
                    setProjectDraft((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                  className="h-9 border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target end</Label>
                <Input
                  type="date"
                  value={projectDraft.targetEndDate}
                  onChange={(event) =>
                    setProjectDraft((prev) => ({
                      ...prev,
                      targetEndDate: event.target.value,
                    }))
                  }
                  className="h-9 border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Input
                  value={projectDraft.budget}
                  onChange={(event) =>
                    setProjectDraft((prev) => ({
                      ...prev,
                      budget: event.target.value,
                    }))
                  }
                  className="h-9 border-border"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Completion %</Label>
                <Input
                  value={projectDraft.completion}
                  onChange={(event) =>
                    setProjectDraft((prev) => ({
                      ...prev,
                      completion: event.target.value,
                    }))
                  }
                  className="h-9 border-border"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={updateProject.isLoading}
              onClick={saveProject}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteProjectId}
        onOpenChange={(open) => !open && setDeleteProjectId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This also removes the project&apos;s products and licenses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDeleteProjectId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={deleteProject.isLoading}
              onClick={() => {
                if (!deleteProjectId) return;
                deleteProject.mutate(deleteProjectId, {
                  onSuccess: () => {
                    toast.success('Project deleted.');
                    setDeleteProjectId(null);
                  },
                  onError: () => toast.error('Could not delete project.'),
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? 'Edit product' : 'Add product'}
            </DialogTitle>
            <DialogDescription>
              Products may include a license.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-auto py-1">
            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input
                value={productDraft.name}
                onChange={(event) =>
                  setProductDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="h-9 border-border"
                placeholder="Product name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={productDraft.category}
                onChange={(event) =>
                  setProductDraft((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
                className="h-9 border-border"
                placeholder="Software"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vendors</Label>
              <MultiEntitySelector
                items={vendors}
                value={productDraft.vendorIds}
                onChange={(vendorIds) =>
                  setProductDraft((prev) => ({ ...prev, vendorIds }))
                }
                placeholder="Select one or more vendors"
                searchPlaceholder="Search vendors"
                emptyLabel={
                  vendorsQuery.isLoading
                    ? 'Loading vendors…'
                    : vendorsQuery.isError
                      ? 'Could not load vendors'
                      : 'No vendors in product catalog'
                }
                hint="Check all that apply. You can select more than one."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Product families</Label>
              <MultiEntitySelector
                items={families}
                value={productDraft.familyIds}
                onChange={(familyIds) =>
                  setProductDraft((prev) => ({ ...prev, familyIds }))
                }
                placeholder="Select one or more families"
                searchPlaceholder="Search families"
                emptyLabel={
                  familiesQuery.isLoading
                    ? 'Loading families…'
                    : familiesQuery.isError
                      ? 'Could not load product families'
                      : 'No product families in product catalog'
                }
                hint="Check all that apply. You can select more than one."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Implementation partners</Label>
              <MultiEntitySelector
                items={partners}
                value={productDraft.partnerIds}
                onChange={(partnerIds) =>
                  setProductDraft((prev) => ({ ...prev, partnerIds }))
                }
                placeholder="Select one or more partners"
                searchPlaceholder="Search partners"
                emptyLabel={
                  partnersQuery.isLoading
                    ? 'Loading partners…'
                    : partnersQuery.isError
                      ? 'Could not load implementation partners'
                      : 'No implementation partners in product catalog'
                }
                hint="Check all that apply. You can select more than one."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  value={productDraft.quantity}
                  onChange={(event) =>
                    setProductDraft((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                  className="h-9 border-border"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={productDraft.status || undefined}
                  onValueChange={(status) =>
                    setProductDraft((prev) => ({ ...prev, status }))
                  }
                >
                  <SelectTrigger className="h-9 border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set(
                        [...PRODUCT_STATUS_OPTIONS, productDraft.status].filter(
                          Boolean,
                        ),
                      ),
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={productDraft.hasLicense}
                onChange={(event) =>
                  setProductDraft((prev) => ({
                    ...prev,
                    hasLicense: event.target.checked,
                  }))
                }
              />
              Attach a license
            </label>
            {productDraft.hasLicense ? (
              <>
                <div className="space-y-1.5">
                  <Label>License name</Label>
                  <Input
                    value={productDraft.licenseName}
                    onChange={(event) =>
                      setProductDraft((prev) => ({
                        ...prev,
                        licenseName: event.target.value,
                      }))
                    }
                    className="h-9 border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Seats / capacity</Label>
                  <Input
                    value={productDraft.seats}
                    onChange={(event) =>
                      setProductDraft((prev) => ({
                        ...prev,
                        seats: event.target.value,
                      }))
                    }
                    className="h-9 border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={productDraft.expiryDate}
                      onChange={(event) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          expiryDate: event.target.value,
                        }))
                      }
                      className="h-9 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Renewal cost</Label>
                    <Input
                      value={productDraft.renewalCost}
                      onChange={(event) =>
                        setProductDraft((prev) => ({
                          ...prev,
                          renewalCost: sanitizeNumericInput(event.target.value),
                        }))
                      }
                      className="h-9 border-border"
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setProductOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={saving}
              onClick={() => void saveProduct()}
            >
              {editingProductId ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteProductId}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove product</DialogTitle>
            <DialogDescription>
              This also removes licenses on this product.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDeleteProductId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={deleteAssignment.isLoading || !selected}
              onClick={() => {
                if (!deleteProductId || !selected) return;
                deleteAssignment.mutate(
                  { projectId: selected.id, assignmentId: deleteProductId },
                  {
                    onSuccess: () => {
                      toast.success('Product removed.');
                      setDeleteProductId(null);
                    },
                    onError: () => toast.error('Could not remove product.'),
                  },
                );
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
