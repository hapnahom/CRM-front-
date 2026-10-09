'use client';

import type { ElementType } from 'react';
import {
  UserPlus,
  HandCoins,
  Building2,
  UsersRound,
  Clock,
  FileBarChart2,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Check,
  X,
  LayoutDashboard,
  Target,
  Package,
  Megaphone,
  TrendingUp,
  Zap,
  Handshake,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getVisiblePermissionModules,
  permissionModuleDisplayName,
} from '@/config/salesWorkflow';
import { moduleActionToSlug } from '@/utils/rolePermissions';
import { cn } from '@/lib/utils';

const MODULE_ICONS: Record<string, ElementType> = {
  Leads: UserPlus,
  Deals: HandCoins,
  Customers: UsersRound,
  Contacts: Building2,
  Activities: Clock,
  Reports: FileBarChart2,
  Dashboard: LayoutDashboard,
  Targets: Target,
  Forecast: TrendingUp,
  Settings: Settings,
  Users: Shield,
  Roles: ShieldCheck,
  Teams: Users,
  'Product Families': Package,
  Products: Package,
  Partners: Handshake,
  Campaigns: Megaphone,
  'Marketing Activities': Megaphone,
  'Marketing Events': Megaphone,
  Productivity: Zap,
};

interface PermissionsTableProps {
  permissions: Record<string, Record<string, boolean>>;
  onChange?: (module: string, action: string, value: boolean) => void;
  readOnly?: boolean;
  /** Wraps the matrix in a bordered, vertically scrollable panel. Default true. */
  scrollable?: boolean;
  /** Flush layout inside a parent card — no inner border or inset. */
  embedded?: boolean;
  className?: string;
}

function PermissionCell({
  action,
  isChecked,
  readOnly,
  onChange,
}: {
  action: string;
  isChecked: boolean;
  readOnly: boolean;
  onChange?: (value: boolean) => void;
}) {
  if (readOnly) {
    return (
      <div
        className={cn(
          'flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium',
          isChecked
            ? 'border-success/25 bg-success/8 text-foreground'
            : 'border-border/60 bg-muted/30 text-muted-foreground',
        )}
      >
        {isChecked ? (
          <Check
            size={14}
            className="shrink-0 text-success"
            strokeWidth={2.5}
          />
        ) : (
          <X size={13} className="shrink-0 opacity-50" strokeWidth={2.5} />
        )}
        <span className="truncate" title={action}>
          {action}
        </span>
      </div>
    );
  }

  return (
    <label
      className={cn(
        'flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] font-medium transition-colors',
        isChecked
          ? 'border-brand/35 bg-brand/8 text-foreground'
          : 'border-border bg-surface-elevated text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
      )}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={(v) => onChange?.(!!v)}
        className="h-4 w-4 shrink-0 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
      />
      <span className="truncate" title={action}>
        {action}
      </span>
    </label>
  );
}

export function PermissionsTable({
  permissions,
  onChange,
  readOnly = false,
  scrollable = true,
  embedded = false,
  className,
}: PermissionsTableProps) {
  const table = (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col className="w-[min(28%,220px)]" />
        <col />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-surface-elevated">
          <th className="sticky top-0 z-10 bg-surface-elevated px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Module
          </th>
          <th className="sticky top-0 z-10 bg-surface-elevated px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Permissions
          </th>
        </tr>
      </thead>
      <tbody>
        {getVisiblePermissionModules().map(({ module, actions }, index) => {
          const displayName = permissionModuleDisplayName(module);
          const Icon = MODULE_ICONS[module] ?? Settings;
          const perms = permissions[module] ?? {};

          return (
            <tr
              key={module}
              className={cn(
                'border-b border-border last:border-0',
                index % 2 === 0 ? 'bg-surface-card' : 'bg-muted/15',
              )}
            >
              <td className="px-4 py-3 align-top">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="pt-0.5 text-sm font-medium leading-snug text-foreground">
                    {displayName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                  {actions.map(({ action }) => {
                    const slug = moduleActionToSlug(module, action);
                    if (!slug) return null;
                    const isChecked = perms[action] ?? false;
                    return (
                      <PermissionCell
                        key={action}
                        action={action}
                        isChecked={isChecked}
                        readOnly={readOnly}
                        onChange={
                          onChange
                            ? (value) => onChange(module, action, value)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  if (!scrollable) {
    return <div className={className}>{table}</div>;
  }

  return (
    <div
      className={cn(
        embedded
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : 'flex max-h-[min(56vh,520px)] flex-col overflow-hidden rounded-lg border border-border bg-surface-card',
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {table}
      </div>
    </div>
  );
}
