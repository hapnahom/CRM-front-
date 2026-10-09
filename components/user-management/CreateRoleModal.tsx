'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';
import { CreatePermissionsTable } from './CreatePermissionsTable';
import {
  CRM_MODULES,
  MODULE_ACTIONS,
  type Role,
} from '@/data/userManagementData';
import {
  createEmptyPermissionMatrix,
  moduleActionToSlug,
} from '@/utils/rolePermissions';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    role: Omit<Role, 'id' | 'usersCount' | 'isSystem' | 'createdAt'>,
  ) => void | Promise<void>;
  isSaving?: boolean;
}

export function CreateRoleModal({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      setRoleName('');
      setDescription('');
      setPermissions(createEmptyPermissionMatrix());
    }
  }, [open]);

  const applyAllPermissions = (val: boolean) => {
    const all = Object.fromEntries(
      CRM_MODULES.map((mod) => [
        mod,
        Object.fromEntries(
          MODULE_ACTIONS.map((a) => [
            a,
            moduleActionToSlug(mod, a) ? val : false,
          ]),
        ),
      ]),
    );
    setPermissions(all);
  };

  const isAllSelected = CRM_MODULES.every((mod) =>
    MODULE_ACTIONS.every(
      (a) => !moduleActionToSlug(mod, a) || permissions[mod]?.[a] === true,
    ),
  );

  const handleSave = async () => {
    try {
      await onSave({
        name: roleName,
        description,
        permissions,
      });
      onOpenChange(false);
    } catch {
      // Parent surfaces API errors.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,880px)] w-[min(1040px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:max-w-none',
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground !m-0">
            <Shield size={18} className="text-brand" />
            Create New Role
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pt-5 pb-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">
                Role Name *
              </Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="h-9 border-border focus-visible:ring-[#ed6925] text-sm"
                placeholder="e.g. Regional Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 border-border focus-visible:ring-[#ed6925] text-sm"
                placeholder="Brief description of this role"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="text-sm text-muted-foreground">
                Permissions Matrix
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-sm normal-case text-brand hover:text-brand-hover hover:bg-brand-muted"
                onClick={() => applyAllPermissions(!isAllSelected)}
              >
                {isAllSelected ? 'Clear all' : 'Select all'}
              </Button>
            </div>
            <CreatePermissionsTable
              permissions={permissions}
              className="max-h-[min(52vh,480px)]"
              onChange={(module, action, value) => {
                setPermissions((prev) => ({
                  ...prev,
                  [module]: { ...(prev[module] || {}), [action]: value },
                }));
              }}
              onToggleModule={(module, value) => {
                setPermissions((prev) => ({
                  ...prev,
                  [module]: Object.fromEntries(
                    MODULE_ACTIONS.map((a) => [
                      a,
                      moduleActionToSlug(module, a) ? value : false,
                    ]),
                  ),
                }));
              }}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="border-border h-9 px-5 rounded-lg text-sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-hover text-brand-foreground h-9 px-5 rounded-lg text-sm"
            onClick={handleSave}
            disabled={!roleName || isSaving}
          >
            {isSaving ? 'Creating…' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
