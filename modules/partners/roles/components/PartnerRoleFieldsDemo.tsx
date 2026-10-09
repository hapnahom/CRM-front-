'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PartnerRole } from '../types';
import { usePartnerRoleFields } from '../hooks/usePartnerRoles';
import {
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
} from '../../components/profile/shared';

type RoleFieldRow = {
  id?: string;
  label?: string;
  internalName?: string;
  fieldType?: string;
  required?: boolean;
  isActive?: boolean;
};

/** Live role-scoped custom fields for a partner role (from entity-fields API). */
export function PartnerRoleFieldsDemo({ role }: { role: PartnerRole }) {
  const { fields: roleFields, isLoading: fieldsLoading } = usePartnerRoleFields(
    role.id,
  );
  const fields = (roleFields ?? []) as unknown as RoleFieldRow[];
  const fieldsQuery = { isLoading: fieldsLoading };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Role-scoped custom fields
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fields defined for the “{role.name}” role. Manage them from the
            field configuration dialog.
          </p>
        </div>
      </div>

      {fieldsQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading fields…
        </div>
      ) : fields.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-xs text-muted-foreground">
          No custom fields configured for this role yet.
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_HEAD_CLASS}>Field label</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Type</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id ?? `${field.internalName}-${index}`}>
                  <TableCell className={TABLE_CELL_CLASS}>
                    {field.label || field.internalName}
                  </TableCell>
                  <TableCell className={TABLE_CELL_CLASS}>
                    <Badge variant="outline" className="text-[10px]">
                      {field.fieldType ?? 'text'}
                    </Badge>
                  </TableCell>
                  <TableCell className={TABLE_CELL_CLASS}>
                    {field.required ? 'Yes' : 'No'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** Kept for layout compatibility — custom-field counts now come from the API. */
export function demoFieldCountForRole(role: PartnerRole): number {
  void role;
  return 0;
}
