'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
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
  CatalogStatus,
  ProductFamily,
} from '@/modules/product-catalog/types';
import {
  filterBySearch,
  formatCatalogDate,
  productsLinkedToFamily,
} from '@/modules/product-catalog/utils';
import { cn } from '@/lib/utils';
import { ResponsibilitySelector } from './ResponsibilitySelector';
import {
  useCatalogProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import {
  useCreateProductFamily,
  useUpdateProductFamily,
} from '@/store/server/features/product-catalog/mutations';
import { useCatalogUsers } from '@/store/server/features/product-catalog/queries';
import type { ProductFamiliesTabProps } from './types';
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

type FamilyFormState = {
  name: string;
  description: string;
  status: CatalogStatus;
  responsibleUserIds: string[];
  responsibleTeamIds: string[];
};

export function ProductFamiliesTab({ onViewChange }: ProductFamiliesTabProps) {
  const familiesQuery = useProductFamilies();
  const productsQuery = useCatalogProducts();
  const createFamily = useCreateProductFamily();
  const updateFamily = useUpdateProductFamily();
  const { users: catalogUsers } = useCatalogUsers();

  const families = useMemo(
    () => familiesQuery.data ?? [],
    [familiesQuery.data],
  );
  const products = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductFamily | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FamilyFormState>({
    name: '',
    description: '',
    status: 'active',
    responsibleUserIds: [],
    responsibleTeamIds: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  const filtered = useMemo(() => {
    let list = filterBySearch(families, debounced);
    if (statusFilter !== 'all') {
      list = list.filter((f) => f.status === statusFilter);
    }
    return list;
  }, [families, debounced, statusFilter]);

  const selected = useMemo(
    () => families.find((f) => f.id === selectedId) ?? null,
    [families, selectedId],
  );

  const linkedProducts = useMemo(
    () => (selected ? productsLinkedToFamily(selected, products) : []),
    [selected, products],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      status: 'active',
      responsibleUserIds: [],
      responsibleTeamIds: [],
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (family: ProductFamily) => {
    setEditing(family);
    setForm({
      name: family.name,
      description: family.description,
      status: family.status,
      responsibleUserIds: [...family.responsibleUserIds],
      responsibleTeamIds: [...family.responsibleTeamIds],
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      responsibleUserIds: form.responsibleUserIds,
      responsibleTeamIds: form.responsibleTeamIds,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateFamily.mutateAsync({ id: editing.id, payload });
        toast.success('Product family updated');
      } else {
        const created = await createFamily.mutateAsync(payload);
        toast.success('Product family created');
        setSelectedId(created.id);
        setView('detail');
      }
      setFormOpen(false);
    } catch {
      toast.error('Failed to save product family');
    } finally {
      setSaving(false);
    }
  };

  const toggleFamilyStatus = async (family: ProductFamily) => {
    try {
      await updateFamily.mutateAsync({
        id: family.id,
        payload: {
          status: family.status === 'active' ? 'inactive' : 'active',
        },
      });
      toast.success(
        family.status === 'active'
          ? 'Product family deactivated'
          : 'Product family activated',
      );
    } catch {
      toast.error('Failed to update product family');
    }
  };

  if (view === 'detail' && selected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
        <CatalogDetailNav
          backLabel="Product Families"
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
                onClick={() => toggleFamilyStatus(selected)}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <ProfileKpiCard
              label="Linked products"
              value={String(linkedProducts.length)}
              hint="Products sharing family partners"
              icon={<Package size={14} />}
            />
            <ProfileKpiCard
              label="Family partners"
              value={String(selected.familyPartners?.length ?? 0)}
              hint="Linked from partner setup"
              icon={<Users size={14} />}
              accentClassName="bg-brand-muted text-brand"
            />
            <ProfileKpiCard
              label="Responsible"
              value={String(
                selected.responsibleTeamIds.length +
                  selected.responsibleUserIds.length,
              )}
              hint={`${selected.responsibleTeamIds.length} team${selected.responsibleTeamIds.length === 1 ? '' : 's'}, ${selected.responsibleUserIds.length} person${selected.responsibleUserIds.length === 1 ? '' : 's'}`}
              icon={<Users size={14} />}
              accentClassName="bg-surface-elevated text-muted-foreground"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CatalogSection
              title="Linked products"
              description={`${linkedProducts.length} product${linkedProducts.length === 1 ? '' : 's'} linked via shared partners`}
            >
              {linkedProducts.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-muted-foreground">
                  No products linked yet. Link partners on Add Partner, then
                  attach the same partners on catalog products.
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {linkedProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <span className="text-[13px] font-medium text-foreground">
                        {p.name}
                      </span>
                      <CatalogStatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CatalogSection>

            <CatalogSection
              title="Family partners"
              description="Partners linked to this family from partner setup."
            >
              {(selected.familyPartners ?? []).length === 0 ? (
                <p className="m-0 text-[12px] text-muted-foreground">
                  No partners linked yet. Choose product families when adding a
                  partner.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selected.familyPartners.map((link, index) => (
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

          <CatalogSection
            title="Responsible teams & people"
            description="Teams receive solution credit as a team. People receive credit as individuals."
          >
            <ResponsibilitySelector
              teamIds={selected.responsibleTeamIds}
              onTeamsChange={(ids) =>
                void updateFamily.mutateAsync({
                  id: selected.id,
                  payload: { responsibleTeamIds: ids },
                })
              }
              userIds={selected.responsibleUserIds}
              onUsersChange={(ids) =>
                void updateFamily.mutateAsync({
                  id: selected.id,
                  payload: { responsibleUserIds: ids },
                })
              }
            />
          </CatalogSection>
        </div>
      </div>
    );
  }

  return (
    <>
      <CatalogListShell
        title={`Product Families (${filtered.length})`}
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
                placeholder="Search families..."
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
            <Button
              type="button"
              className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
              onClick={openCreate}
            >
              <Plus size={14} className="mr-1.5" />
              Create family
            </Button>
          </>
        }
      >
        {filtered.length === 0 ? (
          <Empty className="m-4 border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Layers />
              </EmptyMedia>
              <EmptyTitle>No product families</EmptyTitle>
              <EmptyDescription>
                {debounced
                  ? 'No families match your search.'
                  : 'Create a product family and assign responsible people.'}
              </EmptyDescription>
            </EmptyHeader>
            {!debounced && statusFilter === 'all' ? (
              <Button
                type="button"
                className="mt-4 h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={openCreate}
              >
                <Plus size={14} className="mr-1.5" />
                Create family
              </Button>
            ) : null}
          </Empty>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                <TableHead className={cn(TABLE_HEAD_CLASS, 'min-w-[220px]')}>
                  Family
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[100px]')}>
                  Partners
                </TableHead>
                <TableHead
                  className={cn(
                    TABLE_HEAD_CLASS,
                    'hidden w-[180px] sm:table-cell',
                  )}
                >
                  Responsible
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[110px]')}>
                  Status
                </TableHead>
                <TableHead
                  className={cn(
                    TABLE_HEAD_CLASS,
                    'hidden w-[120px] md:table-cell',
                  )}
                >
                  Updated
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-12')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((family) => {
                const partnerCount = family.familyPartners?.length ?? 0;
                const ownerCount =
                  family.responsibleUserIds.length +
                  family.responsibleTeamIds.length;
                const ownerNames = catalogUsers
                  .filter((u) => family.responsibleUserIds.includes(u.id))
                  .map((u) => u.name);
                const teamSummary =
                  family.responsibleTeamIds.length > 0
                    ? `${family.responsibleTeamIds.length} team${family.responsibleTeamIds.length === 1 ? '' : 's'}`
                    : '';
                const responsibleSummary = [teamSummary, ...ownerNames]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <TableRow
                    key={family.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedId(family.id);
                      setView('detail');
                    }}
                  >
                    <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
                      <p className="truncate font-medium text-foreground">
                        {family.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {family.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      <Badge
                        variant="secondary"
                        className="rounded-full tabular-nums"
                      >
                        {partnerCount}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(TABLE_CELL_CLASS, 'hidden sm:table-cell')}
                    >
                      {ownerCount > 0 ? (
                        <span className="inline-flex max-w-[180px] items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Users size={13} className="shrink-0" />
                          <span className="truncate">{responsibleSummary}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      <CatalogStatusBadge status={family.status} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden text-muted-foreground md:table-cell',
                      )}
                    >
                      {formatCatalogDate(family.updatedAt)}
                    </TableCell>
                    <TableCell
                      className={TABLE_CELL_CLASS}
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedId(family.id);
                              setView('detail');
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(family)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedId(family.id);
                              setView('detail');
                            }}
                          >
                            Manage responsible people
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleFamilyStatus(family)}
                          >
                            {family.status === 'active'
                              ? 'Deactivate'
                              : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CatalogListShell>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-visible p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-5 py-4 sm:px-6">
            <DialogTitle>
              {editing ? 'Edit product family' : 'Create product family'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editing
                ? 'Edit product family details and responsible people.'
                : 'Create a product family and assign responsible people.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <CatalogFormSection title="Details">
              <CatalogFormField label="Name" required error={formErrors.name}>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={catalogControlClass}
                  placeholder="e.g. Software Solutions"
                />
              </CatalogFormField>
              <CatalogFormField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="min-h-[80px] border-border bg-surface-card text-sm"
                  placeholder="Optional description"
                />
              </CatalogFormField>
              <CatalogFormField label="Status" required>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as CatalogStatus }))
                  }
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
            </CatalogFormSection>

            <CatalogFormSection title="Responsible teams & people">
              <ResponsibilitySelector
                teamIds={form.responsibleTeamIds}
                onTeamsChange={(ids) =>
                  setForm((p) => ({ ...p, responsibleTeamIds: ids }))
                }
                userIds={form.responsibleUserIds}
                onUsersChange={(ids) =>
                  setForm((p) => ({ ...p, responsibleUserIds: ids }))
                }
              />
            </CatalogFormSection>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
