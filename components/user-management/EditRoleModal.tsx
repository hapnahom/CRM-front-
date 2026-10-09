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
import { Edit, Lock } from 'lucide-react';
import { PermissionsTable } from './PermissionsTable';
import type { Role } from '@/data/userManagementData';

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSave: (role: Role) => void | Promise<void>;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function EditRoleModal({
  open,
  onOpenChange,
  role,
  onSave,
  isSaving = false,
  isLoading = false,
}: EditRoleModalProps) {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    if (role) {
      setRoleName(role.name);
      setDescription(role.description || '');
      setPermissions(role.permissions || {});
    }
  }, [role, open]);

  const handleSave = async () => {
    if (!role || isLoading) return;

    try {
      const isAdmin = role.name.trim().toLowerCase() === 'admin';
      await onSave({
        ...role,
        name: isAdmin || role.isSystem ? role.name : roleName,
        description,
        permissions: role.isSystem ? role.permissions : permissions,
      });
    } catch {
      // Parent surfaces API errors and closes the dialog on success.
    }
  };

  const isSystemRole = role?.isSystem || false;
  const isAdminRole = role?.name?.trim().toLowerCase() === 'admin';
  const permissionsLocked = isSystemRole;
  const nameLocked = isSystemRole || isAdminRole;

  const roleDialogClassName = cn(
    'flex max-h-[min(92vh,880px)] w-[min(1040px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:max-w-none',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={roleDialogClassName}>
        <DialogHeader className="shrink-0 border-b border-border px-6 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground !m-0">
            <Edit size={18} className="text-brand" />
            Edit Role: {role?.name ?? '…'}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !role ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Loading role…
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pt-5 pb-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Role Name
                </Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={nameLocked}
                  className="h-9 border-border focus-visible:ring-[#ed6925] text-sm"
                  placeholder="Enter role name"
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
                  placeholder="Enter description"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Permissions
              </Label>
              <PermissionsTable
                permissions={permissions}
                readOnly={permissionsLocked}
                className="max-h-[min(52vh,480px)]"
                onChange={(module, action, value) => {
                  setPermissions((prev) => ({
                    ...prev,
                    [module]: { ...(prev[module] || {}), [action]: value },
                  }));
                }}
              />
              {permissionsLocked && (
                <p className="text-[12px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Lock size={12} />
                  System roles have fixed permissions and cannot be modified.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="border-border h-9 px-5 rounded-lg text-sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!isSystemRole && (
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-hover text-brand-foreground h-9 px-5 rounded-lg text-sm"
              onClick={handleSave}
              disabled={isSaving || isLoading || !role}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
