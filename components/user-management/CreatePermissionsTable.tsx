'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  getVisiblePermissionModules,
  permissionModuleDisplayName,
} from '@/config/salesWorkflow';
import {
  getActionsForModule,
  moduleActionToSlug,
} from '@/utils/rolePermissions';
import { cn } from '@/lib/utils';

interface CreatePermissionsTableProps {
  permissions: Record<string, Record<string, boolean>>;
  onChange: (module: string, action: string, value: boolean) => void;
  onToggleModule: (module: string, value: boolean) => void;
  className?: string;
}

export function CreatePermissionsTable({
  permissions,
  onChange,
  onToggleModule,
  className,
}: CreatePermissionsTableProps) {
  return (
    <div
      className={cn(
        'flex max-h-[min(56vh,520px)] flex-col overflow-hidden rounded-lg border border-border bg-surface-card',
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              const moduleChecked = getActionsForModule(module).every(
                (action) =>
                  !moduleActionToSlug(module, action) ||
                  (permissions[module]?.[action] ?? false),
              );

              return (
                <tr
                  key={module}
                  className={cn(
                    'border-b border-border last:border-0',
                    index % 2 === 0 ? 'bg-surface-card' : 'bg-muted/15',
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <Checkbox
                        checked={moduleChecked}
                        onCheckedChange={(v) => onToggleModule(module, !!v)}
                        className="mt-0.5 h-4 w-4 shrink-0 border-brand/60 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground"
                      />
                      <span className="text-sm font-medium leading-snug text-foreground">
                        {displayName}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                      {actions.map(({ action }) => {
                        const slug = moduleActionToSlug(module, action);
                        if (!slug) return null;
                        const isChecked =
                          permissions[module]?.[action] ?? false;
                        return (
                          <label
                            key={action}
                            className={cn(
                              'flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] font-medium transition-colors',
                              isChecked
                                ? 'border-brand/35 bg-brand/8 text-foreground'
                                : 'border-border bg-surface-elevated text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(v) =>
                                onChange(module, action, !!v)
                              }
                              className="h-4 w-4 shrink-0 border-brand/60 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground"
                            />
                            <span className="truncate" title={action}>
                              {action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
