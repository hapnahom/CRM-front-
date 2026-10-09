'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CatalogFormField,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { MultiEntitySelector } from '@/modules/product-catalog/components/MultiEntitySelector';
import { useCreateVendor } from '@/store/server/features/product-catalog/mutations';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';
import type { Vendor } from '@/modules/product-catalog/types';
import { catalogErrorMessage } from '@/modules/product-catalog/utils';

export function QuickCreateVendorDialog({
  open,
  onOpenChange,
  onCreated,
  defaultProductFamilyIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vendor: Vendor) => void;
  /** Prefill / lock families when opened from a solution with a family. */
  defaultProductFamilyIds?: string[];
}) {
  const createVendor = useCreateVendor();
  const { data: families = [] } = useProductFamilies();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productFamilyIds, setProductFamilyIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeFamilies = useMemo(
    () => families.filter((f) => f.status === 'active'),
    [families],
  );

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setProductFamilyIds([...defaultProductFamilyIds]);
    setErrors({});
    setSaving(false);
  }, [open, defaultProductFamilyIds]);

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required';
    if (!productFamilyIds.length) {
      nextErrors.families = 'Select at least one product family';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const created = await createVendor.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        status: 'active',
        productFamilyIds,
        targets: [],
      });
      toast.success('Vendor created');
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      const msg = catalogErrorMessage(error, 'Could not create vendor');
      if (msg) toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-visible p-0">
        <DialogHeader className="space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                Add vendor
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create a catalog vendor to select for this solution.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <CatalogFormField label="Name" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              className={catalogControlClass}
              placeholder="e.g. Acme Networks"
              autoFocus
            />
          </CatalogFormField>
          <CatalogFormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px] border-border bg-white text-sm dark:bg-surface-card"
              placeholder="Optional"
            />
          </CatalogFormField>
          <CatalogFormField
            label="Product families"
            required
            error={errors.families}
          >
            <MultiEntitySelector
              items={activeFamilies}
              value={productFamilyIds}
              onChange={(ids) => {
                setProductFamilyIds(ids);
                if (errors.families) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.families;
                    return next;
                  });
                }
              }}
              placeholder="Select product families"
              searchPlaceholder="Search families"
            />
          </CatalogFormField>
        </div>

        <DialogFooter className="rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Creating…' : 'Create vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
