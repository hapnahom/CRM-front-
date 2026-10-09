'use client';

import type { ElementType } from 'react';
import { Target } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CUSTOM_PERMISSION_MODULES } from '@/data/userManagementData';

interface CustomPermissionsTableProps {
  permissions: Record<string, Record<string, boolean>>;
  onChange?: (module: string, action: string, value: boolean) => void;
  readOnly?: boolean;
}

const MODULE_ICONS: Record<string, ElementType> = {
  Targets: Target,
};

export function CustomPermissionsTable({
  permissions,
  onChange,
  readOnly = false,
}: CustomPermissionsTableProps) {
  const modules = Object.keys(CUSTOM_PERMISSION_MODULES);
  if (!modules.length) {
    return null;
  }

  return (
    <div className="border-t border-border">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="w-40 px-0 pb-2 pt-4 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Module
            </th>
            <th
              colSpan={4}
              className="pb-2 pt-4 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Permissions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {modules.map((module) => {
            const Icon = MODULE_ICONS[module] ?? Target;
            const actions = CUSTOM_PERMISSION_MODULES[module];
            const perms = permissions[module] ?? {};

            return (
              <tr key={module} className="group">
                <td className="py-2.5 pr-4 align-top">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {module}
                    </span>
                  </div>
                </td>
                <td colSpan={4} className="py-2.5">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {actions.map(({ action }) => {
                      const isChecked = perms[action] ?? false;
                      return (
                        <label
                          key={action}
                          className="flex items-center gap-2 text-foreground"
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={readOnly}
                            onCheckedChange={(value) =>
                              onChange?.(module, action, !!value)
                            }
                            className="h-4 w-4 data-[state=checked]:border-blue data-[state=checked]:bg-blue"
                          />
                          <span>{action}</span>
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
  );
}
