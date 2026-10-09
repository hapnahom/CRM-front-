'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCustomer } from '@/store/server/features/customers/mutations';
import { useGetCustomerOrganizationSizes } from '@/store/server/features/customers/queries';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import { mapAccountFormToCreateDto } from '@/store/server/features/customers/mappers';
import { userManagementErrorToast } from '@/components/user-management/UserManagementQueryError';
import { validateWebsite } from '@/utils/validation';
import type { CustomerResponse } from '@/store/server/features/customers/types';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: CustomerResponse) => void;
}

function FormField({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function AddCustomerModal({
  open,
  onOpenChange,
  onSuccess,
}: AddCustomerModalProps) {
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    vectorId: '',
    size: '',
    city: '',
    country: 'Ethiopia',
    website: '',
  });

  const { data: vectorsData, isLoading: vectorsLoading } = useGetVectors();
  const { data: sizesData, isLoading: sizesLoading } =
    useGetCustomerOrganizationSizes();
  const { mutate: createCustomer, isLoading: isCreating } = useCreateCustomer();

  const vectors = vectorsData?.data ?? [];
  const organizationSizes = sizesData?.organizationSizes ?? [];

  useEffect(() => {
    if (open) {
      setWebsiteError(null);
      setForm({
        name: '',
        vectorId: '',
        size: '',
        city: '',
        country: 'Ethiopia',
        website: '',
      });
    }
  }, [open]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Customer name is required.');
      return;
    }

    if (!form.vectorId.trim()) {
      toast.error('Select a vector assigned to your team.');
      return;
    }

    const website = form.website.trim();
    if (website && !validateWebsite(website)) {
      const errorMessage =
        'Enter a valid website URL starting with http://, https://, or www.';
      setWebsiteError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setWebsiteError(null);

    createCustomer(mapAccountFormToCreateDto(form), {
      onSuccess: (customer) => {
        toast.success('Customer created.');
        onOpenChange(false);
        onSuccess?.(customer);
      },
      onError: (err) => {
        const msg = userManagementErrorToast(err);
        if (msg) toast.error(msg);
      },
    });
  };

  const metadataLoading = vectorsLoading || sizesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
          <DialogDescription>
            Add a customer account and optionally assign a vector.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-1 scrollbar-hide">
          <FormField label="Customer Name" required>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="h-9 border-border bg-white"
              placeholder="Customer or company name"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Vector" required>
              <Select
                value={form.vectorId || ''}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    vectorId: value,
                  }))
                }
                disabled={metadataLoading}
              >
                <SelectTrigger className="h-9 border-border bg-white">
                  <SelectValue
                    placeholder={metadataLoading ? 'Loading…' : 'Select vector'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {vectors.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No vectors for your team — ask an admin
                    </SelectItem>
                  ) : null}
                  {vectors.map((vector) => (
                    <SelectItem key={vector.id} value={vector.id}>
                      {vector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Organization Size">
              <Select
                value={form.size}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, size: value }))
                }
                disabled={metadataLoading}
              >
                <SelectTrigger className="h-9 border-border bg-white">
                  <SelectValue
                    placeholder={metadataLoading ? 'Loading…' : 'Select size'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizationSizes.map((sz) => (
                    <SelectItem key={sz.value} value={sz.value}>
                      {sz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="City">
              <Input
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className="h-9 border-border bg-white"
                placeholder="City"
              />
            </FormField>

            <FormField label="Country">
              <Input
                value={form.country}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, country: e.target.value }))
                }
                className="h-9 border-border bg-white"
                placeholder="Country"
              />
            </FormField>
          </div>

          <FormField label="Website">
            <Input
              value={form.website}
              onChange={(e) => {
                setWebsiteError(null);
                setForm((prev) => ({ ...prev, website: e.target.value }));
              }}
              onBlur={() => {
                const website = form.website.trim();
                if (website && !validateWebsite(website)) {
                  setWebsiteError(
                    'Enter a valid website URL starting with http://, https://, or www.',
                  );
                }
              }}
              className={cn(
                'h-9 border-border bg-white',
                websiteError && 'border-destructive',
              )}
              placeholder="https://example.com"
              aria-invalid={Boolean(websiteError)}
            />
            {websiteError ? (
              <p className="text-xs text-destructive">{websiteError}</p>
            ) : null}
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={handleSave}
            disabled={isCreating || metadataLoading || !form.name.trim()}
          >
            {isCreating ? 'Creating…' : 'Create Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
