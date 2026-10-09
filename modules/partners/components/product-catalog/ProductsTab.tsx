'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  CatalogFormField,
  CatalogFormSection,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import type {
  CatalogProduct,
  CatalogStatus,
} from '@/modules/product-catalog/types';
import {
  catalogErrorMessage,
  filterBySearch,
  formatCatalogDate,
} from '@/modules/product-catalog/utils';
import { cn } from '@/lib/utils';
import { useCatalogProducts } from '@/store/server/features/product-catalog/queries';
import {
  useCreateCatalogProduct,
  useDeleteCatalogProduct,
  useUpdateCatalogProduct,
} from '@/store/server/features/product-catalog/mutations';
import { usePartnerRoles } from '../../roles/hooks/usePartnerRoles';
import type { ProductsTabProps } from './types';
import {
  ProductPartnerLinksEditor,
  draftsToProductPartnerPayload,
  productPartnerLinksToDrafts,
  validateProductPartnerDrafts,
  type ProductPartnerDraft,
} from './ProductPartnerLinksEditor';
import {
  CatalogDetailNav,
  CatalogListShell,
  CatalogSection,
  CatalogStatusBadge,
  FILTER_TRIGGER_CLASS,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
} from './shared';

type ViewMode = 'list' | 'detail';

type ProductFormState = {
  name: string;
  description: string;
  status: CatalogStatus;
  productPartners: ProductPartnerDraft[];
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  status: 'active',
  productPartners: [],
};

/** Radix dropdown/dialog can leave body pointer-events:none; clear it explicitly. */
function unlockPointerEvents() {
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
}

export function ProductsTab({ partners, onViewChange }: ProductsTabProps) {
  const { data: products = [] } = useCatalogProducts();
  const createMutation = useCreateCatalogProduct();
  const updateMutation = useUpdateCatalogProduct();
  const deleteMutation = useDeleteCatalogProduct();
  const { activeRoles } = usePartnerRoles();

  const formSaving = createMutation.isLoading || updateMutation.isLoading;
  const deleting = deleteMutation.isLoading;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  const filtered = useMemo(() => {
    let list = filterBySearch(products, debounced);
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    return list;
  }, [products, debounced, statusFilter]);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  const filtersActive = Boolean(debounced) || statusFilter !== 'all';
  const isCatalogEmpty = products.length === 0 && !filtersActive;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (product: CatalogProduct, fromMenu = false) => {
    const run = () => {
      setEditing(product);
      setForm({
        name: product.name,
        description: product.description,
        status: product.status,
        productPartners: productPartnerLinksToDrafts(product.productPartners),
      });
      setFormErrors({});
      setFormOpen(true);
    };
    // Defer so the dropdown DismissableLayer unmounts before the dialog mounts.
    if (fromMenu) {
      window.setTimeout(run, 0);
    } else {
      run();
    }
  };

  const openDelete = (product: CatalogProduct) => {
    window.setTimeout(() => setDeleteTarget(product), 0);
  };

  const closeForm = () => {
    if (formSaving) return;
    setFormOpen(false);
    unlockPointerEvents();
    window.setTimeout(unlockPointerEvents, 0);
    window.setTimeout(unlockPointerEvents, 250);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
    unlockPointerEvents();
    window.setTimeout(unlockPointerEvents, 0);
    window.setTimeout(unlockPointerEvents, 250);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Product deleted');
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setView('list');
      }
      setDeleteTarget(null);
      unlockPointerEvents();
      window.setTimeout(unlockPointerEvents, 0);
    } catch (error) {
      const msg = catalogErrorMessage(error, 'Failed to delete product');
      if (msg) toast.error(msg);
    }
  };

  const patchForm = (patch: Partial<ProductFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormErrors((prev) => {
      const next = { ...prev };
      if (patch.name !== undefined) delete next.name;
      if (patch.productPartners !== undefined) delete next.partners;
      return next;
    });
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Product name is required';

    const partnerError = validateProductPartnerDrafts(
      form.productPartners,
      partners,
      activeRoles,
    );
    if (partnerError) errors.partners = partnerError;

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      productPartners: draftsToProductPartnerPayload(form.productPartners),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        toast.success('Product updated');
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Product created');
        setSelectedId(created.id);
        setView('detail');
      }
      setFormOpen(false);
      unlockPointerEvents();
      window.setTimeout(unlockPointerEvents, 0);
    } catch (error) {
      const msg = catalogErrorMessage(
        error,
        editing ? 'Failed to update product' : 'Failed to create product',
      );
      if (msg) toast.error(msg);
    }
  };

  const toggleProductStatus = async (product: CatalogProduct) => {
    const nextStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        payload: { status: nextStatus },
      });
      toast.success(
        product.status === 'active'
          ? 'Product deactivated'
          : 'Product activated',
      );
    } catch (error) {
      const msg = catalogErrorMessage(error, 'Failed to update product status');
      if (msg) toast.error(msg);
    }
  };

  const createButton = (
    <Button
      type="button"
      className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
      onClick={openCreate}
    >
      <Plus size={14} className="mr-1.5" />
      Create product
    </Button>
  );

  return (
    <>
      {view === 'detail' && selected ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
          <CatalogDetailNav
            backLabel="Products"
            onBack={() => {
              setView('list');
              setSelectedId(null);
            }}
            title={selected.name}
            status={selected.status}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-[31.5px] text-[12.25px]"
                  onClick={() => openEdit(selected)}
                >
                  <Pencil size={14} className="mr-1.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-[31.5px] text-[12.25px]"
                  disabled={updateMutation.isLoading}
                  onClick={() => toggleProductStatus(selected)}
                >
                  <Power size={14} className="mr-1.5" />
                  {selected.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            }
          />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {selected.description ? (
              <p className="m-0 text-[13px] text-muted-foreground">
                {selected.description}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileKpiCard
                label="Partners"
                value={String(selected.productPartners.length)}
                hint="Partner role associations"
                icon={<Package size={14} />}
                accentClassName="bg-brand-muted text-brand"
              />
              <ProfileKpiCard
                label="Status"
                value={selected.status === 'active' ? 'Active' : 'Inactive'}
                hint="Catalog availability"
                icon={<Users size={14} />}
                accentClassName="bg-surface-elevated text-muted-foreground"
              />
            </div>

            <CatalogSection
              title="Partners"
              description="Partners and their roles associated with this product."
            >
              {selected.productPartners.length === 0 ? (
                <p className="m-0 text-[12px] text-muted-foreground">
                  No partners linked yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selected.productPartners.map((link, index) => (
                    <Badge
                      key={`${link.partnerId}-${link.partnerRoleId}-${index}`}
                      variant="secondary"
                      className="rounded-full text-[11px]"
                    >
                      {link.partnerName} · {link.partnerRoleName}
                    </Badge>
                  ))}
                </div>
              )}
            </CatalogSection>
          </div>
        </div>
      ) : (
        <CatalogListShell
          title={`Products (${filtered.length})`}
          toolbar={
            <>
              <div className="relative w-full min-w-[180px] sm:w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] shadow-none dark:bg-surface-card"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className={cn(FILTER_TRIGGER_CLASS, 'w-full sm:w-[140px]')}
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {!isCatalogEmpty ? createButton : null}
            </>
          }
        >
          {filtered.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>
                  {filtersActive ? 'No matching products' : 'No products yet'}
                </EmptyTitle>
                <EmptyDescription>
                  {filtersActive
                    ? 'Try adjusting search or filters.'
                    : 'Create a product and optionally link partners with their roles.'}
                </EmptyDescription>
              </EmptyHeader>
              {isCatalogEmpty ? (
                <EmptyContent>{createButton}</EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'min-w-[220px]')}>
                    Product
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[100px]')}>
                    Partners
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[110px]')}>
                    Status
                  </TableHead>
                  <TableHead
                    className={cn(
                      TABLE_HEAD_CLASS,
                      'hidden w-[120px] sm:table-cell',
                    )}
                  >
                    Updated
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-12')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedId(product.id);
                      setView('detail');
                    }}
                  >
                    <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
                      <p className="truncate font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {product.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      <Badge
                        variant="secondary"
                        className="rounded-full tabular-nums"
                      >
                        {product.productPartners.length}
                      </Badge>
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      <CatalogStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden text-muted-foreground sm:table-cell',
                      )}
                    >
                      {formatCatalogDate(product.updatedAt)}
                    </TableCell>
                    <TableCell
                      className={TABLE_CELL_CLASS}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-7"
                            aria-label={`Actions for ${product.name}`}
                          >
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-36"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <DropdownMenuItem
                            onSelect={() => openEdit(product, true)}
                          >
                            <Pencil size={13} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => openDelete(product)}
                          >
                            <Trash2 size={13} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CatalogListShell>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setFormOpen(true);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-5 py-4 sm:px-6">
            <DialogTitle className="text-[16px] font-semibold">
              {editing ? 'Edit product' : 'Create product'}
            </DialogTitle>
            <DialogDescription>
              Define a catalog product. Link partners with a role when
              applicable.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
              <CatalogFormSection title="Product information">
                <div className="grid gap-3 sm:grid-cols-2">
                  <CatalogFormField
                    label="Product name"
                    required
                    error={formErrors.name}
                    className="sm:col-span-2"
                  >
                    <Input
                      value={form.name}
                      onChange={(e) => patchForm({ name: e.target.value })}
                      className={catalogControlClass}
                      placeholder="e.g. Azure Cloud"
                      autoFocus
                      disabled={formSaving}
                      maxLength={200}
                    />
                  </CatalogFormField>

                  <CatalogFormField
                    label="Description"
                    className="sm:col-span-2"
                  >
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        patchForm({ description: e.target.value })
                      }
                      className="min-h-[88px] resize-y border-border bg-white text-sm dark:bg-surface-card"
                      placeholder="Optional short description"
                      disabled={formSaving}
                    />
                  </CatalogFormField>

                  <CatalogFormField label="Status" required>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        patchForm({ status: v as CatalogStatus })
                      }
                      disabled={formSaving}
                    >
                      <SelectTrigger className={catalogControlClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </CatalogFormField>
                </div>
              </CatalogFormSection>

              <CatalogFormSection title="Partner links">
                <ProductPartnerLinksEditor
                  partners={partners}
                  roles={activeRoles}
                  value={form.productPartners}
                  onChange={(productPartners) => patchForm({ productPartners })}
                  disabled={formSaving}
                  error={formErrors.partners}
                />
              </CatalogFormSection>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="outline"
                disabled={formSaving}
                onClick={closeForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formSaving}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {formSaving
                  ? editing
                    ? 'Saving…'
                    : 'Creating…'
                  : editing
                    ? 'Save changes'
                    : 'Create product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={closeDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
