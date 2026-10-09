'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
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
import { useCreateCatalogProduct } from '@/store/server/features/product-catalog/mutations';
import type { CatalogProduct } from '@/modules/product-catalog/types';
import { catalogErrorMessage } from '@/modules/product-catalog/utils';

export function QuickCreateProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: CatalogProduct) => void;
}) {
  const createProduct = useCreateCatalogProduct();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setNameError(null);
    setSaving(false);
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      const created = await createProduct.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        status: 'active',
        vendorIds: [],
        implementationPartnerIds: [],
      });
      toast.success('Product created');
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      const msg = catalogErrorMessage(error, 'Could not create product');
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
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                Add product
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create a catalog product to select for this solution.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <CatalogFormField label="Product name" required error={nameError}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              className={catalogControlClass}
              placeholder="e.g. Cloud Firewall"
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
            {saving ? 'Creating…' : 'Create product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
