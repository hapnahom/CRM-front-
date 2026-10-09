'use client';

import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useCreateContact } from '@/store/server/features/contacts/mutations';
import { userManagementErrorToast } from '@/components/user-management/UserManagementQueryError';
import type { ContactResponse } from '@/store/server/features/contacts/types';

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  onSuccess?: (contact: ContactResponse) => void;
}

function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
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

export function AddContactModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: AddContactModalProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: '',
    isPrimaryContact: true,
  });

  const { mutate: createContact, isLoading: isCreating } = useCreateContact();

  useEffect(() => {
    if (open) {
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        role: '',
        isPrimaryContact: true,
      });
    }
  }, [open, customerId]);

  const handleSave = () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();

    if (!firstName) {
      toast.error('Name is required.');
      return;
    }

    createContact(
      {
        firstName,
        lastName,
        email,
        phoneNumber,
        role: form.role.trim() || undefined,
        isPrimaryContact: form.isPrimaryContact,
        customerId,
      },
      {
        onSuccess: (contact) => {
          toast.success('Contact created.');
          onOpenChange(false);
          onSuccess?.(contact);
        },
        onError: (err) => {
          const msg = userManagementErrorToast(err);
          if (msg) toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[70] max-w-[calc(100%-2rem)] sm:max-w-lg"
        overlayClassName="z-[70]"
      >
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Add a contact person for ${customerName}.`
              : 'Add a contact person for this customer.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2">
          <FormField label="First name" required>
            <Input
              value={form.firstName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
              className="h-9 border-border"
              placeholder="First name"
              autoFocus
            />
          </FormField>

          <FormField label="Last name">
            <Input
              value={form.lastName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lastName: e.target.value }))
              }
              className="h-9 border-border"
              placeholder="Last name"
            />
          </FormField>

          <FormField label="Email" className="sm:col-span-2">
            <Input
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="h-9 border-border"
              placeholder="email@company.com"
              type="email"
            />
          </FormField>

          <FormField label="Phone" className="sm:col-span-2">
            <Input
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
              className="h-9 border-border"
              placeholder="Phone number"
            />
          </FormField>

          <FormField label="Role / title" className="sm:col-span-2">
            <Input
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="h-9 border-border"
              placeholder="e.g. Procurement Manager"
            />
          </FormField>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="add-contact-primary"
              checked={form.isPrimaryContact}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  isPrimaryContact: checked === true,
                }))
              }
            />
            <Label
              htmlFor="add-contact-primary"
              className="cursor-pointer text-sm font-normal text-foreground"
            >
              Set as primary contact
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={handleSave}
            disabled={isCreating || !form.firstName.trim()}
          >
            {isCreating ? 'Creating…' : 'Create contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
