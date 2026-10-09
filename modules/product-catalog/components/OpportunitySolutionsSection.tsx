'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SolutionDialog } from '@/modules/product-catalog/components/SolutionDialog';
import { SolutionPartnerDialog } from '@/modules/product-catalog/components/SolutionPartnerDialog';
import { SolutionProductDialog } from '@/modules/product-catalog/components/SolutionProductDialog';
import type {
  CatalogProduct,
  ImplementationPartner,
  OpportunitySolution,
  OpportunitySolutionProduct,
  OpportunitySolutionVendor,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  allSolutionProductIds,
  computeSolutionsTotal,
  computeValueDifference,
  equalSplitAmounts,
  formatCatalogMoney,
  formatSignedMoney,
  groupSolutionPartnersByBeforeProductRoles,
  resolveFamily,
  resolveLineCurrency,
  resolvePartner,
  resolveProduct,
  resolveVendor,
} from '@/modules/product-catalog/utils';
import { cn } from '@/lib/utils';
import { usePipelineCurrencies } from '@/hooks/usePipelineCurrencies';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import { formatUserName } from '@/lib/format-user-name';
import { useActiveSolutionRoles } from '@/store/server/features/solution-roles/queries';
import { useSolutionWorkflow } from '@/modules/product-catalog/hooks/useSolutionWorkflow';
import type { PartnerRole } from '@/modules/partners/roles/types';

export type OpportunitySolutionsChangeMeta = {
  successMessage?: string;
};

export interface OpportunitySolutionsSectionProps {
  solutions: OpportunitySolution[];
  onChange: (
    solutions: OpportunitySolution[],
    meta?: OpportunitySolutionsChangeMeta,
  ) => void | Promise<void>;
  products: CatalogProduct[];
  families: ProductFamily[];
  vendors: Vendor[];
  partners: ImplementationPartner[];
  users?: PlatformUser[];
  opportunityValue: number;
  currency?: string;
  readOnly?: boolean;
  /** When true, success toasts are passed via onChange meta for the caller to show after save. */
  deferSuccessToast?: boolean;
  title?: string;
  hideHeader?: boolean;
  /** Hide opportunity vs solutions totals (e.g. create modal with mixed currencies). */
  hideValueSummary?: boolean;
  footerNote?: string;
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'add-solution' }
  | { mode: 'edit-solution'; solutionId: string }
  | { mode: 'add-partner'; solutionId: string; roleSlotId: string }
  | {
      mode: 'edit-partner';
      solutionId: string;
      partnerLineId: string;
      roleSlotId?: string;
    }
  | {
      mode: 'add-product';
      solutionId: string;
      partnerLineId: string;
    }
  | {
      mode: 'edit-product';
      solutionId: string;
      partnerLineId: string;
      productLineId: string;
    };

export function OpportunitySolutionsSection({
  solutions,
  onChange,
  products,
  families,
  vendors,
  partners,
  users = [],
  opportunityValue,
  currency = 'USD',
  readOnly,
  deferSuccessToast = false,
  title = 'Solutions',
  hideHeader,
  hideValueSummary,
  footerNote,
}: OpportunitySolutionsSectionProps) {
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isEmpty = solutions.length === 0;
  const hasRoleAssignments = solutions.some(
    (solution) => (solution.roleAssignments?.length ?? 0) > 0,
  );
  const { data: solutionRoles = [] } = useActiveSolutionRoles({
    enabled: hasRoleAssignments,
  });
  const {
    effectiveBeforeProductSlots,
    afterProductSlots,
    afterProductRoleCodes,
  } = useSolutionWorkflow();
  const solutionRoleNameById = useMemo(
    () => new Map(solutionRoles.map((role) => [role.id, role.name])),
    [solutionRoles],
  );
  const { currencyOptions } = usePipelineCurrencies();

  const resolveRoleSlot = (
    roleSlotId: string | undefined,
  ): PartnerRole | undefined => {
    if (!roleSlotId) return undefined;
    return effectiveBeforeProductSlots.find((slot) => slot.id === roleSlotId);
  };

  const activePartnerRoleSlot =
    dialog.mode === 'add-partner' || dialog.mode === 'edit-partner'
      ? (resolveRoleSlot(dialog.roleSlotId) ?? effectiveBeforeProductSlots[0])
      : undefined;

  const usedFamilyIds = useMemo(
    () => solutions.map((s) => s.productFamilyId),
    [solutions],
  );
  const usedProductIds = useMemo(
    () => allSolutionProductIds(solutions),
    [solutions],
  );

  const notifyChange = (
    next: OpportunitySolution[],
    successMessage?: string,
  ): void | Promise<void> => {
    if (deferSuccessToast && successMessage) {
      return onChange(next, { successMessage });
    }
    const result = onChange(next);
    if (successMessage) toast.success(successMessage);
    return result;
  };

  const updateSolution = (
    solutionId: string,
    updater: (s: OpportunitySolution) => OpportunitySolution,
    successMessage?: string,
  ): void | Promise<void> => {
    return notifyChange(
      solutions.map((s) => (s.id === solutionId ? updater(s) : s)),
      successMessage,
    );
  };

  const closeDialog = () => setDialog({ mode: 'closed' });

  const editingSolution =
    dialog.mode === 'edit-solution'
      ? (solutions.find((s) => s.id === dialog.solutionId) ?? null)
      : null;

  const solutionForNested =
    dialog.mode === 'add-partner' ||
    dialog.mode === 'edit-partner' ||
    dialog.mode === 'add-product' ||
    dialog.mode === 'edit-product'
      ? (solutions.find((s) => s.id === dialog.solutionId) ?? null)
      : null;

  const editingPartnerLine =
    dialog.mode === 'edit-partner' && solutionForNested
      ? (solutionForNested.vendors.find(
          (line) => line.id === dialog.partnerLineId,
        ) ?? null)
      : null;

  const editingProductParentPartnerLineId =
    dialog.mode === 'add-product' || dialog.mode === 'edit-product'
      ? dialog.partnerLineId
      : null;

  const editingProduct = useMemo(() => {
    if (dialog.mode !== 'edit-product' || !solutionForNested) return null;
    const partnerLine = solutionForNested.vendors.find(
      (line) => line.id === dialog.partnerLineId,
    );
    return (
      partnerLine?.products.find((p) => p.id === dialog.productLineId) ?? null
    );
  }, [dialog, solutionForNested]);

  const isExpanded = (id: string) => expanded[id] !== false;

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !(prev[id] !== false),
    }));
  };

  return (
    <section className="space-y-3">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {title}
          </h3>
          {!readOnly && !isEmpty ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => setDialog({ mode: 'add-solution' })}
            >
              <Plus size={14} className="mr-1.5" />
              Add solution
            </Button>
          ) : null}
        </div>
      ) : !readOnly && !isEmpty ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setDialog({ mode: 'add-solution' })}
          >
            <Plus size={14} className="mr-1.5" />
            Add solution
          </Button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-dashed border-border bg-surface-elevated/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
              <Layers size={16} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {readOnly ? 'No solutions linked' : 'No solutions added'}
            </p>
          </div>
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-brand text-brand-foreground hover:bg-brand-hover sm:self-center"
              onClick={() => setDialog({ mode: 'add-solution' })}
            >
              <Plus size={14} className="mr-1.5" />
              Add solution
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {solutions.map((solution) => {
            const family = resolveFamily(families, solution.productFamilyId);
            const open = isExpanded(solution.id);
            const partnerCount = solution.vendors.length;
            const partnerGroups = groupSolutionPartnersByBeforeProductRoles(
              solution.vendors,
              effectiveBeforeProductSlots,
              family,
            );
            const primaryBeforeRole = effectiveBeforeProductSlots[0];
            const partnerCountLabel =
              partnerCount === 0
                ? null
                : effectiveBeforeProductSlots.length === 1 && primaryBeforeRole
                  ? `${partnerCount} ${partnerCount === 1 ? primaryBeforeRole.name : `${primaryBeforeRole.name}s`}`
                  : `${partnerCount} partner${partnerCount === 1 ? '' : 's'}`;
            const productCount = solution.vendors.reduce(
              (n, v) => n + v.products.length,
              0,
            );
            const summaryParts: string[] = [];
            if (partnerCountLabel) summaryParts.push(partnerCountLabel);
            if (productCount > 0) {
              summaryParts.push(
                `${productCount} product${productCount === 1 ? '' : 's'}`,
              );
            }
            if ((solution.assigneeUserIds?.length ?? 0) > 0) {
              summaryParts.push(`${solution.assigneeUserIds.length} assigned`);
            }
            const solutionSummary =
              summaryParts.length > 0
                ? summaryParts.join(' · ')
                : 'No partners added';

            return (
              <article
                key={solution.id}
                className="overflow-hidden rounded-xl border border-border bg-white dark:bg-surface-card"
              >
                <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => toggleExpanded(solution.id)}
                    aria-expanded={open}
                    aria-label={open ? 'Collapse solution' : 'Expand solution'}
                  >
                    {open ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {family?.name ?? 'Unknown family'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {solutionSummary}
                        </p>
                        {(solution.roleAssignments?.length ?? 0) > 0 ? (
                          <div className="mt-1.5 space-y-1">
                            {(solution.roleAssignments ?? []).map((entry) =>
                              (entry.userIds?.length ?? 0) > 0 ? (
                                <div
                                  key={entry.roleId}
                                  className="flex flex-wrap items-center gap-1.5"
                                >
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {entry.roleName ??
                                      solutionRoleNameById.get(entry.roleId) ??
                                      'Role'}
                                  </span>
                                  <AssigneeAvatars
                                    userIds={entry.userIds}
                                    users={users}
                                  />
                                </div>
                              ) : null,
                            )}
                          </div>
                        ) : (solution.assigneeUserIds?.length ?? 0) > 0 ? (
                          <div className="mt-1.5">
                            <AssigneeAvatars
                              userIds={solution.assigneeUserIds}
                              users={users}
                            />
                          </div>
                        ) : null}
                      </div>
                      <AmountValue
                        amount={solution.amount}
                        currency={resolveLineCurrency(
                          solution.currency,
                          currency,
                        )}
                        emphasize
                      />
                    </div>
                  </div>

                  {!readOnly ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconAction
                        label="Edit solution"
                        onClick={() =>
                          setDialog({
                            mode: 'edit-solution',
                            solutionId: solution.id,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </IconAction>
                      <IconAction
                        label="Remove solution"
                        onClick={() => {
                          notifyChange(
                            solutions.filter((s) => s.id !== solution.id),
                            'Solution removed',
                          );
                        }}
                      >
                        <Trash2 size={14} />
                      </IconAction>
                    </div>
                  ) : null}
                </div>

                {open ? (
                  <div className="space-y-3 border-t border-border px-3 py-3 sm:px-4">
                    {effectiveBeforeProductSlots.map((roleSlot) => {
                      const rolePartnerLines =
                        partnerGroups.get(roleSlot.id) ?? [];
                      const canAddRole =
                        roleSlot.solutionCardinality === 'many' ||
                        rolePartnerLines.length === 0;

                      return (
                        <div key={roleSlot.id} className="space-y-3">
                          {effectiveBeforeProductSlots.length > 1 ? (
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {roleSlot.name}
                            </p>
                          ) : null}

                          {rolePartnerLines.map((partnerLine) => (
                            <PartnerBlock
                              key={partnerLine.id}
                              partnerLine={partnerLine}
                              roleLabel={roleSlot.name}
                              catalogPartners={vendors}
                              products={products}
                              partners={partners}
                              currency={currency}
                              readOnly={readOnly}
                              onEdit={() =>
                                setDialog({
                                  mode: 'edit-partner',
                                  solutionId: solution.id,
                                  partnerLineId: partnerLine.id,
                                  roleSlotId: roleSlot.id,
                                })
                              }
                              onRemove={() => {
                                updateSolution(
                                  solution.id,
                                  (s) => ({
                                    ...s,
                                    vendors: s.vendors.filter(
                                      (line) => line.id !== partnerLine.id,
                                    ),
                                  }),
                                  `${roleSlot.name} removed`,
                                );
                              }}
                              onAddProduct={() =>
                                setDialog({
                                  mode: 'add-product',
                                  solutionId: solution.id,
                                  partnerLineId: partnerLine.id,
                                })
                              }
                              onEditProduct={(productLineId) =>
                                setDialog({
                                  mode: 'edit-product',
                                  solutionId: solution.id,
                                  partnerLineId: partnerLine.id,
                                  productLineId,
                                })
                              }
                              onRemoveProduct={(productLineId) => {
                                updateSolution(
                                  solution.id,
                                  (s) => ({
                                    ...s,
                                    vendors: s.vendors.map((line) =>
                                      line.id === partnerLine.id
                                        ? {
                                            ...line,
                                            products: line.products.filter(
                                              (p) => p.id !== productLineId,
                                            ),
                                          }
                                        : line,
                                    ),
                                  }),
                                  'Product removed',
                                );
                              }}
                            />
                          ))}

                          {!readOnly && canAddRole ? (
                            <AddLevelButton
                              label={`Add ${roleSlot.name}`}
                              onClick={() =>
                                setDialog({
                                  mode: 'add-partner',
                                  solutionId: solution.id,
                                  roleSlotId: roleSlot.id,
                                })
                              }
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    {!readOnly ? null : solution.vendors.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No partners added
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {!isEmpty && !hideValueSummary ? (
        <SolutionsValueSummary
          solutions={solutions}
          opportunityValue={opportunityValue}
          currency={currency}
        />
      ) : null}

      {footerNote ? (
        <p className="text-[11px] text-muted-foreground">{footerNote}</p>
      ) : null}

      <SolutionDialog
        open={dialog.mode === 'add-solution' || dialog.mode === 'edit-solution'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        mode={dialog.mode === 'edit-solution' ? 'edit' : 'add'}
        solution={editingSolution}
        families={families}
        users={users}
        excludedFamilyIds={usedFamilyIds}
        opportunityValue={opportunityValue}
        currency={currency}
        currencyOptions={currencyOptions}
        onSave={(next) => {
          if (dialog.mode === 'add-solution') {
            if (
              solutions.some((s) => s.productFamilyId === next.productFamilyId)
            ) {
              toast.error('This product family is already on this opportunity');
              return;
            }
            setExpanded((prev) => ({ ...prev, [next.id]: true }));
            const withNext = [...solutions, next];
            // Default: equal-split deal value across solutions when new amount is unset.
            if ((next.amount ?? 0) <= 0 && opportunityValue > 0) {
              const shares = equalSplitAmounts(
                opportunityValue,
                withNext.length,
              );
              return notifyChange(
                withNext.map((solution, index) => ({
                  ...solution,
                  amount: shares[index] ?? 0,
                })),
                'Solution added',
              );
            }
            return notifyChange(withNext, 'Solution added');
          }
          const original = solutions.find((s) => s.id === next.id);
          if (
            original &&
            next.productFamilyId !== original.productFamilyId &&
            solutions.some(
              (s) =>
                s.id !== next.id && s.productFamilyId === next.productFamilyId,
            )
          ) {
            toast.error('This product family is already on this opportunity');
            return;
          }
          return notifyChange(
            solutions.map((s) => (s.id === next.id ? { ...s, ...next } : s)),
            'Solution updated',
          );
        }}
      />

      <SolutionPartnerDialog
        open={dialog.mode === 'add-partner' || dialog.mode === 'edit-partner'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        mode={dialog.mode === 'edit-partner' ? 'edit' : 'add'}
        partnerLine={editingPartnerLine}
        family={
          solutionForNested
            ? resolveFamily(families, solutionForNested.productFamilyId)
            : null
        }
        familyId={solutionForNested?.productFamilyId ?? ''}
        roleSlot={activePartnerRoleSlot}
        catalogPartners={vendors}
        excludedPartnerIds={
          solutionForNested?.vendors.map((line) => line.vendorId) ?? []
        }
        currency={currency}
        currencyOptions={currencyOptions}
        onSave={(next) => {
          if (!solutionForNested) return;
          const roleName = activePartnerRoleSlot?.name ?? 'Partner';
          if (dialog.mode === 'add-partner') {
            if (
              solutionForNested.vendors.some(
                (line) =>
                  line.vendorId === next.vendorId &&
                  line.partnerRoleId === next.partnerRoleId,
              )
            ) {
              toast.error(
                `This ${roleName.toLowerCase()} is already on this solution`,
              );
              return;
            }
            return updateSolution(
              solutionForNested.id,
              (s) => {
                const withNext = [...s.vendors, next];
                // Default: equal-split solution value across partners when new amount is unset.
                if ((next.amount ?? 0) <= 0 && (s.amount ?? 0) > 0) {
                  const shares = equalSplitAmounts(s.amount, withNext.length);
                  return {
                    ...s,
                    vendors: withNext.map((line, index) => ({
                      ...line,
                      amount: shares[index] ?? 0,
                    })),
                  };
                }
                return { ...s, vendors: withNext };
              },
              `${roleName} added`,
            );
          }
          return updateSolution(
            solutionForNested.id,
            (s) => ({
              ...s,
              vendors: s.vendors.map((line) =>
                line.id === next.id
                  ? { ...line, ...next, products: line.products }
                  : line,
              ),
            }),
            `${roleName} updated`,
          );
        }}
      />

      <SolutionProductDialog
        open={dialog.mode === 'add-product' || dialog.mode === 'edit-product'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        mode={dialog.mode === 'edit-product' ? 'edit' : 'add'}
        productLine={editingProduct}
        products={products}
        partners={partners}
        afterProductSlots={afterProductSlots}
        afterProductRoleCodes={afterProductRoleCodes}
        vendorId={
          editingProductParentPartnerLineId
            ? (solutionForNested?.vendors.find(
                (line) => line.id === editingProductParentPartnerLineId,
              )?.vendorId ?? null)
            : null
        }
        excludedProductIds={usedProductIds}
        currency={currency}
        currencyOptions={currencyOptions}
        onSave={(next) => {
          if (!solutionForNested) return;
          if (dialog.mode === 'add-product') {
            if (usedProductIds.includes(next.productId)) {
              toast.error('This product is already on this opportunity');
              return;
            }
            const partnerLineId = dialog.partnerLineId;
            return updateSolution(
              solutionForNested.id,
              (s) => ({
                ...s,
                products: [],
                vendors: s.vendors.map((line) =>
                  line.id === partnerLineId
                    ? { ...line, products: [...line.products, next] }
                    : line,
                ),
              }),
              'Product added',
            );
          }
          if (dialog.mode === 'edit-product') {
            const partnerLineId = dialog.partnerLineId;
            return updateSolution(
              solutionForNested.id,
              (s) => ({
                ...s,
                products: [],
                vendors: s.vendors.map((line) =>
                  line.id === partnerLineId
                    ? {
                        ...line,
                        products: line.products.map((p) =>
                          p.id === next.id ? next : p,
                        ),
                      }
                    : line,
                ),
              }),
              'Product updated',
            );
          }
        }}
      />
    </section>
  );
}

function PartnerBlock({
  partnerLine,
  roleLabel,
  catalogPartners,
  products,
  partners,
  currency,
  readOnly,
  onEdit,
  onRemove,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
}: {
  partnerLine: OpportunitySolutionVendor;
  roleLabel: string;
  catalogPartners: Vendor[];
  products: CatalogProduct[];
  partners: ImplementationPartner[];
  currency: string;
  readOnly?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onAddProduct: () => void;
  onEditProduct: (productLineId: string) => void;
  onRemoveProduct: (productLineId: string) => void;
}) {
  const partner = resolveVendor(catalogPartners, partnerLine.vendorId);
  const regLabel =
    partnerLine.registration.status === 'not_registered'
      ? null
      : partnerLine.registration.status.replace(/_/g, ' ');

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Building2 size={14} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {partner?.name ?? 'Unknown partner'}
              </p>
              {regLabel ? (
                <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                  {regLabel}
                </p>
              ) : null}
            </div>
            <AmountValue
              amount={partnerLine.amount}
              currency={resolveLineCurrency(partnerLine.currency, currency)}
            />
          </div>
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <IconAction label={`Edit ${roleLabel}`} onClick={onEdit}>
              <Pencil size={14} />
            </IconAction>
            <IconAction label={`Remove ${roleLabel}`} onClick={onRemove}>
              <Trash2 size={14} />
            </IconAction>
          </div>
        ) : null}
      </div>

      <div className="space-y-0 border-t border-border">
        {partnerLine.products.map((productLine) => (
          <ProductRow
            key={productLine.id}
            productLine={productLine}
            products={products}
            partners={partners}
            currency={currency}
            readOnly={readOnly}
            onEdit={() => onEditProduct(productLine.id)}
            onRemove={() => onRemoveProduct(productLine.id)}
          />
        ))}

        {!readOnly ? (
          <div className="px-3 py-2">
            <AddLevelButton
              label="Add product"
              onClick={onAddProduct}
              compact
            />
          </div>
        ) : partnerLine.products.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">
            No products
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProductRow({
  productLine,
  products,
  partners,
  currency,
  readOnly,
  onEdit,
  onRemove,
}: {
  productLine: OpportunitySolutionProduct;
  products: CatalogProduct[];
  partners: ImplementationPartner[];
  currency: string;
  readOnly?: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const product = resolveProduct(products, productLine.productId);
  const partner = productLine.implementationPartnerId
    ? resolvePartner(partners, productLine.implementationPartnerId)
    : null;

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 sm:pl-8">
      <Package size={13} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              {product?.name ?? productLine.productName ?? 'Unknown product'}
            </p>
            {partner ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {partner.name}
              </p>
            ) : null}
          </div>
          <AmountValue
            amount={productLine.amount}
            currency={resolveLineCurrency(productLine.currency, currency)}
          />
        </div>
      </div>
      {!readOnly ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label="Edit product" onClick={onEdit}>
            <Pencil size={14} />
          </IconAction>
          <IconAction label="Remove product" onClick={onRemove}>
            <Trash2 size={14} />
          </IconAction>
        </div>
      ) : null}
    </div>
  );
}

function AssigneeAvatars({
  userIds,
  users,
  className,
}: {
  userIds: string[];
  users: PlatformUser[];
  className?: string;
}) {
  const byId = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    return map;
  }, [users]);

  const shown = userIds.slice(0, 5);
  const extra = userIds.length - shown.length;

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-1.5">
        {shown.map((id) => {
          const user = byId.get(id);
          const name = user ? formatUserName(user, 'User') : 'User';
          const parts = name.split(/\s+/).filter(Boolean);
          const initials =
            parts.length >= 2
              ? `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
              : name.slice(0, 2).toUpperCase();
          return (
            <Avatar
              key={id}
              className="size-5 border border-white dark:border-surface-card"
              title={user?.email ? `${name} · ${user.email}` : name}
            >
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="bg-brand-muted text-[8px] font-semibold text-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      {extra > 0 ? (
        <span className="ml-1.5 text-[10px] text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function AmountValue({
  amount,
  currency,
  emphasize,
}: {
  amount: number;
  currency: string;
  emphasize?: boolean;
}) {
  return (
    <p
      className={cn(
        'shrink-0 tabular-nums',
        emphasize ? 'text-sm font-semibold' : 'text-sm font-medium',
        amount > 0 ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {amount > 0 ? formatCatalogMoney(amount, currency) : 'No amount'}
    </p>
  );
}

function AddLevelButton({
  label,
  onClick,
  compact,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-white text-sm font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand-muted/25 hover:text-foreground dark:bg-surface-card',
        compact ? 'h-8 text-xs' : 'h-9',
      )}
    >
      <Plus size={compact ? 13 : 14} strokeWidth={2} />
      {label}
    </button>
  );
}

function SolutionsValueSummary({
  solutions,
  opportunityValue,
  currency,
}: {
  solutions: OpportunitySolution[];
  opportunityValue: number;
  currency: string;
}) {
  const total = computeSolutionsTotal(solutions, currency);
  const difference = computeValueDifference(total, opportunityValue);
  const diffTone =
    difference === 0
      ? 'text-foreground'
      : difference > 0
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-sky-700 dark:text-sky-400';

  return (
    <div className="grid overflow-hidden rounded-xl border border-border bg-white sm:grid-cols-3 dark:bg-surface-card">
      <SummaryCell
        label="Opportunity value"
        value={formatCatalogMoney(opportunityValue, currency)}
      />
      <SummaryCell
        label="Solutions total"
        value={formatCatalogMoney(total, currency)}
        emphasize
        className="border-t border-border sm:border-l sm:border-t-0"
      />
      <SummaryCell
        label="Difference"
        value={formatSignedMoney(difference, currency)}
        valueClassName={diffTone}
        className="border-t border-border sm:border-l sm:border-t-0"
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  emphasize,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('bg-white px-4 py-3 dark:bg-surface-card', className)}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 tabular-nums tracking-tight',
          emphasize
            ? 'text-base font-semibold text-foreground'
            : 'text-base font-medium text-foreground',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-foreground"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
