'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CatalogFormField } from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { AmountCurrencyFields } from '@/modules/product-catalog/components/AmountCurrencyFields';
import { ProductFamilySelector } from '@/modules/product-catalog/components/ProductFamilySelector';
import { ObserversMultiSelect } from '@/components/pipeline/ObserversMultiSelect';
import {
  SolutionSolutionRolesFields,
  type SolutionRoleAssignmentValue,
} from '@/components/pipeline/SolutionSolutionRolesFields';
import { useActiveSolutionRoles } from '@/store/server/features/solution-roles/queries';
import type {
  OpportunitySolution,
  ProductFamily,
} from '@/modules/product-catalog/types';
import {
  createEmptySolution,
  parseMoneyInput,
  resolveFamily,
} from '@/modules/product-catalog/utils';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import type { CrmTeam } from '@/store/server/features/teams/types';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { expandResponsibleUserIds } from '@/modules/product-catalog/responsibility-utils';
import { formatUserName } from '@/lib/format-user-name';
import { cn } from '@/lib/utils';

function familyResponsibleUsers(
  family: ProductFamily | null,
  users: PlatformUser[],
  teams: CrmTeam[],
): PlatformUser[] {
  if (!family) return [];
  const allowed = new Set(expandResponsibleUserIds(family, teams, users));
  return users
    .filter((user) => allowed.has(user.id))
    .sort((a, b) =>
      formatUserName(a, 'User').localeCompare(formatUserName(b, 'User')),
    );
}

function allAssigneeIds(
  roleAssignments: SolutionRoleAssignmentValue[],
  assigneeUserIds: string[],
): string[] {
  const fromRoles = roleAssignments.flatMap((entry) => entry.userIds ?? []);
  return [...new Set([...fromRoles, ...assigneeUserIds].filter(Boolean))];
}

export function SolutionDialog({
  open,
  onOpenChange,
  mode,
  solution,
  families,
  users,
  excludedFamilyIds = [],
  currency = 'USD',
  currencyOptions = [],
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  solution: OpportunitySolution | null;
  families: ProductFamily[];
  users: PlatformUser[];
  excludedFamilyIds?: string[];
  opportunityValue: number;
  currency?: string;
  currencyOptions?: string[];
  onSave: (next: OpportunitySolution) => void | Promise<void>;
}) {
  const isAdd = mode === 'add';
  const [saving, setSaving] = useState(false);
  const solutionRolesQuery = useActiveSolutionRoles({ enabled: open });
  const solutionRoles = useMemo(
    () => solutionRolesQuery.data ?? [],
    [solutionRolesQuery.data],
  );
  const usesRoleMode = solutionRoles.length > 0;
  const roleNameById = useMemo(
    () => new Map(solutionRoles.map((role) => [role.id, role.name])),
    [solutionRoles],
  );
  const { data: teamsResponse } = useGetCrmTeams({ enabled: open });
  const teams = useMemo(() => teamsResponse?.data ?? [], [teamsResponse?.data]);

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [lineCurrency, setLineCurrency] = useState(currency);
  const [roleAssignments, setRoleAssignments] = useState<
    SolutionRoleAssignmentValue[]
  >([]);
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [contributionByUserId, setContributionByUserId] = useState<
    Record<string, string>
  >({});
  const [customizeAmounts, setCustomizeAmounts] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      return;
    }
    if (!isAdd) return;
    setFamilyId(null);
    setAmount('');
    setLineCurrency(currency);
    setRoleAssignments([]);
    setAssigneeUserIds([]);
    setContributionByUserId({});
    setCustomizeAmounts(false);
  }, [open, isAdd, currency]);

  useEffect(() => {
    if (!open || isAdd || !solution) return;
    setFamilyId(solution.productFamilyId);
    setAmount(solution.amount > 0 ? String(solution.amount) : '');
    setLineCurrency(solution.currency || currency);
    const family = families.find((f) => f.id === solution.productFamilyId);
    const allowed = new Set(
      familyResponsibleUsers(family ?? null, users, teams).map(
        (user) => user.id,
      ),
    );
    const nextRoleAssignments = (solution.roleAssignments ?? []).map(
      (entry) => ({
        roleId: entry.roleId,
        userIds: (entry.userIds ?? []).filter((id) => allowed.has(id)),
      }),
    );
    const nextAssignees = (solution.assigneeUserIds ?? []).filter((id) =>
      allowed.has(id),
    );
    setRoleAssignments(nextRoleAssignments);
    setAssigneeUserIds(nextAssignees);
    const allAssignees = allAssigneeIds(nextRoleAssignments, nextAssignees);
    const nextContributions: Record<string, string> = {};
    for (const entry of solution.assigneeContributions ?? []) {
      if (!allAssignees.includes(entry.userId)) continue;
      if (entry.amount == null) continue;
      nextContributions[entry.userId] = String(entry.amount);
    }
    setContributionByUserId(nextContributions);
    setCustomizeAmounts(
      allAssignees.length > 1 && Object.keys(nextContributions).length > 0,
    );
  }, [open, isAdd, solution, currency, families, users, teams]);

  const availableFamilies = useMemo(() => {
    const excluded = new Set(excludedFamilyIds);
    if (!isAdd && solution) excluded.delete(solution.productFamilyId);
    return families.filter(
      (f) =>
        (f.status === 'active' || f.id === familyId) &&
        (!excluded.has(f.id) || f.id === familyId),
    );
  }, [families, excludedFamilyIds, isAdd, solution, familyId]);

  const selectedFamily = useMemo(
    () => resolveFamily(families, familyId ?? '') ?? null,
    [families, familyId],
  );

  const responsibleUsers = useMemo(
    () => familyResponsibleUsers(selectedFamily, users, teams),
    [selectedFamily, users, teams],
  );

  const selectedAssigneeIds = useMemo(
    () => allAssigneeIds(roleAssignments, assigneeUserIds),
    [roleAssignments, assigneeUserIds],
  );

  const selectedAssignees = useMemo(
    () =>
      responsibleUsers.filter((user) => selectedAssigneeIds.includes(user.id)),
    [responsibleUsers, selectedAssigneeIds],
  );

  const solutionAmountValue = parseMoneyInput(amount);
  const defaultLabel =
    solutionAmountValue > 0
      ? `${solutionAmountValue} ${lineCurrency || ''}`.trim()
      : 'full solution value';

  const handleFamilyChange = (nextId: string | null) => {
    setFamilyId(nextId);
    setRoleAssignments([]);
    setAssigneeUserIds([]);
    setContributionByUserId({});
    setCustomizeAmounts(false);
  };

  const syncContributions = (nextAssignees: string[]) => {
    if (nextAssignees.length <= 1) {
      setContributionByUserId({});
      setCustomizeAmounts(false);
      return;
    }
    setContributionByUserId((prev) => {
      const next: Record<string, string> = {};
      for (const id of nextAssignees) {
        if (prev[id] != null) next[id] = prev[id];
      }
      return next;
    });
  };

  const handleRoleAssignmentsChange = (next: SolutionRoleAssignmentValue[]) => {
    setRoleAssignments(next);
    syncContributions(allAssigneeIds(next, assigneeUserIds));
  };

  const handleAssigneesChange = (ids: string[]) => {
    setAssigneeUserIds(ids);
    syncContributions(allAssigneeIds(roleAssignments, ids));
  };

  const enableCustomize = () => {
    setCustomizeAmounts(true);
  };

  const clearCustomize = () => {
    setContributionByUserId({});
    setCustomizeAmounts(false);
  };

  const addValueForUser = (userId: string) => {
    setCustomizeAmounts(true);
    setContributionByUserId((prev) => ({
      ...prev,
      [userId]: prev[userId] ?? '',
    }));
  };

  const removeValueForUser = (userId: string) => {
    setContributionByUserId((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleSave = async () => {
    if (!familyId) {
      toast.error('Select a product family');
      return;
    }
    if (!lineCurrency) {
      toast.error('Select a currency');
      return;
    }
    const allowed = new Set(responsibleUsers.map((user) => user.id));
    const nextRoleAssignments = roleAssignments
      .map((entry) => ({
        roleId: entry.roleId,
        roleName: roleNameById.get(entry.roleId),
        userIds: (entry.userIds ?? []).filter((id) => allowed.has(id)),
      }))
      .filter((entry) => entry.userIds.length > 0);
    const nextAssignees = assigneeUserIds.filter((id) => allowed.has(id));
    const nextAllAssignees = usesRoleMode
      ? allAssigneeIds(nextRoleAssignments, [])
      : nextAssignees;

    if (!nextAllAssignees.length) {
      toast.error(
        usesRoleMode
          ? 'Select at least one solution assignee'
          : 'Select at least one assignee',
      );
      return;
    }

    const assigneeContributions =
      nextAllAssignees.length > 1 && customizeAmounts
        ? nextAllAssignees
            .map((userId) => {
              const raw = contributionByUserId[userId]?.trim() ?? '';
              if (!raw) return null;
              return { userId, amount: parseMoneyInput(raw) };
            })
            .filter(
              (entry): entry is { userId: string; amount: number } =>
                entry != null,
            )
        : [];

    const base = solution ?? createEmptySolution(familyId, lineCurrency);
    setSaving(true);
    try {
      await onSave({
        ...base,
        productFamilyId: familyId,
        amount: solutionAmountValue,
        currency: lineCurrency,
        roleAssignments: usesRoleMode ? nextRoleAssignments : [],
        assigneeUserIds: usesRoleMode ? nextAllAssignees : nextAssignees,
        assigneeContributions,
      });
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep dialog open for retry.
    } finally {
      setSaving(false);
    }
  };

  const roleHint = !familyId
    ? 'Select a product family first'
    : responsibleUsers.length === 0
      ? 'No responsible users on this product family'
      : undefined;

  const roleDisabled = !familyId || responsibleUsers.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,720px)] max-w-lg flex-col gap-0 overflow-visible p-0">
        <DialogHeader className="shrink-0 space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {isAdd ? 'Add solution' : 'Edit solution'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isAdd
                  ? 'Select a product family, assignees, and optional solution value'
                  : 'Update solution details'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <CatalogFormField label="Product family" required>
            <ProductFamilySelector
              families={availableFamilies}
              value={familyId}
              onChange={handleFamilyChange}
              placeholder="Select product family"
            />
          </CatalogFormField>

          {usesRoleMode ? (
            <SolutionSolutionRolesFields
              roles={solutionRoles}
              users={responsibleUsers}
              value={roleAssignments}
              onChange={handleRoleAssignmentsChange}
              disabled={roleDisabled}
              hint={roleHint}
            />
          ) : (
            <CatalogFormField label="Assignees" required hint={roleHint}>
              <div
                className={
                  roleDisabled ? 'pointer-events-none opacity-60' : undefined
                }
              >
                <ObserversMultiSelect
                  users={responsibleUsers}
                  value={assigneeUserIds}
                  onChange={handleAssigneesChange}
                  placeholder={
                    !familyId
                      ? 'Select a product family first'
                      : responsibleUsers.length === 0
                        ? 'No responsible users available'
                        : 'Select assignees'
                  }
                  entityLabel="assignee"
                />
              </div>
            </CatalogFormField>
          )}

          <AmountCurrencyFields
            amountLabel="Solution value"
            amount={amount}
            onAmountChange={setAmount}
            currency={lineCurrency}
            onCurrencyChange={setLineCurrency}
            currencyOptions={currencyOptions}
          />

          {selectedAssignees.length > 1 ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Assignee achievement
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {customizeAmounts
                      ? 'Enter a custom amount per person. Anyone without a value still gets the full solution amount.'
                      : `Each assignee gets ${defaultLabel} by default.`}
                  </p>
                </div>
                {customizeAmounts ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearCustomize}
                  >
                    Use default
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 border-border bg-white px-2.5 text-xs font-medium"
                    onClick={enableCustomize}
                  >
                    <Plus className="size-3.5" />
                    Customize
                  </Button>
                )}
              </div>

              {customizeAmounts ? (
                <div className="overflow-hidden rounded-lg border border-border bg-surface-elevated/30">
                  {selectedAssignees.map((user, index) => {
                    const hasCustom = Object.prototype.hasOwnProperty.call(
                      contributionByUserId,
                      user.id,
                    );
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5',
                          index > 0 && 'border-t border-border',
                        )}
                      >
                        <div className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {formatUserName(user, 'User')}
                        </div>
                        {hasCustom ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              autoFocus
                              className="h-8 w-24 bg-white text-sm"
                              placeholder="Amount"
                              value={contributionByUserId[user.id] ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setContributionByUserId((prev) => ({
                                  ...prev,
                                  [user.id]: value,
                                }));
                              }}
                              aria-label={`Custom achievement for ${formatUserName(user, 'User')}`}
                            />
                            <span className="w-8 shrink-0 text-xs text-muted-foreground">
                              {lineCurrency || '—'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => removeValueForUser(user.id)}
                              aria-label={`Remove custom amount for ${formatUserName(user, 'User')}`}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 border-dashed bg-white px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                            onClick={() => addValueForUser(user.id)}
                          >
                            <Plus className="size-3.5" />
                            Add value
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={() => void handleSave()}
            disabled={!familyId || saving}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {isAdd ? 'Adding…' : 'Saving…'}
              </>
            ) : isAdd ? (
              'Add solution'
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
