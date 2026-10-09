'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Partner } from '../../types';
import type { PartnerRole } from '../../roles/types';
import { normalizePartnerRoleIds } from '../../roles/services/roleMapping';
import type { ProductPartnerLink } from '@/modules/product-catalog/types';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { cn } from '@/lib/utils';

export type ProductPartnerDraft = {
  partnerId: string;
  partnerRoleId: string;
};

interface ProductPartnerLinksEditorProps {
  partners: Partner[];
  roles: PartnerRole[];
  value: ProductPartnerDraft[];
  onChange: (next: ProductPartnerDraft[]) => void;
  disabled?: boolean;
  error?: string;
}

function partnerOptions(partners: Partner[]) {
  return partners
    .filter((p) => p.status === 'Active' || p.status === 'Onboarding')
    .map((p) => ({ id: p.id, name: p.name }));
}

function rolesForPartner(
  partnerId: string,
  partners: Partner[],
  activeRoles: PartnerRole[],
): PartnerRole[] {
  const partner = partners.find((p) => p.id === partnerId);
  if (!partner) return [];
  const assigned = new Set(normalizePartnerRoleIds(partner.roleIds));
  return activeRoles.filter((role) => assigned.has(role.id));
}

function linkKey(link: ProductPartnerDraft) {
  return `${link.partnerId}:${link.partnerRoleId}`;
}

export function ProductPartnerLinksEditor({
  partners,
  roles,
  value,
  onChange,
  disabled,
  error,
}: ProductPartnerLinksEditorProps) {
  const activeRoles = roles.filter((r) => r.isActive);
  const partnerItems = partnerOptions(partners);
  const partnersWithRoles = partnerItems.filter(
    (p) => rolesForPartner(p.id, partners, activeRoles).length > 0,
  );

  const usedKeys = new Set(
    value.filter((l) => l.partnerId && l.partnerRoleId).map(linkKey),
  );

  const addLink = () => {
    const firstPartner = partnersWithRoles[0];
    if (!firstPartner) return;
    const availableRoles = rolesForPartner(
      firstPartner.id,
      partners,
      activeRoles,
    );
    const firstRole =
      availableRoles.find(
        (role) => !usedKeys.has(`${firstPartner.id}:${role.id}`),
      ) ?? availableRoles[0];
    if (!firstRole) return;
    onChange([
      ...value,
      { partnerId: firstPartner.id, partnerRoleId: firstRole.id },
    ]);
  };

  const updateLink = (index: number, patch: Partial<ProductPartnerDraft>) => {
    onChange(
      value.map((link, i) => {
        if (i !== index) return link;
        const next = { ...link, ...patch };
        if (patch.partnerId && patch.partnerId !== link.partnerId) {
          const available = rolesForPartner(
            patch.partnerId,
            partners,
            activeRoles,
          );
          const preferred =
            available.find(
              (r) =>
                r.id === next.partnerRoleId ||
                !usedKeys.has(`${patch.partnerId}:${r.id}`),
            ) ?? available[0];
          next.partnerRoleId = preferred?.id ?? '';
        }
        return next;
      }),
    );
  };

  const removeLink = (index: number) => {
    onChange([...value.slice(0, index), ...value.slice(index + 1)]);
  };

  if (partnersWithRoles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-elevated/30 px-3 py-4">
        <p className="m-0 text-[12px] text-muted-foreground">
          No eligible partners yet. Assign at least one role to an Active or
          Onboarding partner in Partner Management, then link them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((link, index) => {
            const availableRoles = rolesForPartner(
              link.partnerId,
              partners,
              activeRoles,
            );
            const duplicate =
              Boolean(link.partnerId && link.partnerRoleId) &&
              value.some(
                (other, otherIndex) =>
                  otherIndex !== index &&
                  other.partnerId === link.partnerId &&
                  other.partnerRoleId === link.partnerRoleId,
              );

            return (
              <div
                key={`partner-link-${index}`}
                className={cn(
                  'grid gap-2 rounded-lg border border-border bg-surface-card p-3 sm:grid-cols-[1fr_1fr_auto]',
                  duplicate && 'border-destructive/50',
                )}
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Partner
                  </p>
                  <Select
                    value={link.partnerId}
                    onValueChange={(partnerId) =>
                      updateLink(index, { partnerId })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className={catalogControlClass}>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerItems.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Role{link.partnerId ? ' *' : ''}
                  </p>
                  <Select
                    value={link.partnerRoleId || undefined}
                    onValueChange={(partnerRoleId) =>
                      updateLink(index, { partnerRoleId })
                    }
                    disabled={disabled || availableRoles.length === 0}
                  >
                    <SelectTrigger className={catalogControlClass}>
                      <SelectValue
                        placeholder={
                          availableRoles.length === 0
                            ? 'No roles assigned'
                            : 'Select role'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLink(index)}
                    disabled={disabled}
                    aria-label="Remove partner link"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                {duplicate ? (
                  <p className="m-0 text-[11px] text-destructive sm:col-span-3">
                    This partner and role combination is already linked.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-[12.25px]"
        onClick={addLink}
        disabled={disabled}
      >
        <Plus size={14} className="mr-1.5" />
        Add partner
      </Button>

      {error ? (
        <p className="m-0 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export function productPartnerLinksToDrafts(
  links: ProductPartnerLink[],
): ProductPartnerDraft[] {
  return links.map((link) => ({
    partnerId: link.partnerId,
    partnerRoleId: link.partnerRoleId,
  }));
}

export function draftsToProductPartnerPayload(drafts: ProductPartnerDraft[]) {
  return drafts.filter((d) => d.partnerId && d.partnerRoleId);
}

export function validateProductPartnerDrafts(
  drafts: ProductPartnerDraft[],
  partners: Partner[],
  roles: PartnerRole[],
): string | null {
  const activeRoles = roles.filter((r) => r.isActive);
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (!draft.partnerId && !draft.partnerRoleId) continue;
    if (!draft.partnerId || !draft.partnerRoleId) {
      if (draft.partnerId && !draft.partnerRoleId) {
        return 'Select a role for each partner you add.';
      }
      return 'Each partner link needs both a partner and a role.';
    }

    const available = rolesForPartner(draft.partnerId, partners, activeRoles);
    if (!available.some((r) => r.id === draft.partnerRoleId)) {
      return 'One or more partners do not have the selected role assigned.';
    }

    const key = linkKey(draft);
    if (seen.has(key)) {
      return 'Duplicate partner and role combinations are not allowed.';
    }
    seen.add(key);
  }

  return null;
}
