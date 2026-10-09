'use client';

import { useState } from 'react';
import {
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { Panel } from '@/modules/customers/components/detail/shared';
import type { CustomerContactDetail } from '@/store/server/features/customers/types';
import {
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from '@/store/server/features/contacts/mutations';

const EMPTY_CONTACT_DRAFT = {
  name: '',
  role: '',
  email: '',
  phone: '',
  isPrimary: false,
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function combineFullName(contact: { firstName: string; lastName: string }) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export function ContactsTab({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: CustomerContactDetail[];
}) {
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState(EMPTY_CONTACT_DRAFT);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const canEdit = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.EDIT_CONTACTS],
  });
  const canDelete = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.DELETE_CONTACTS],
  });

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Contacts & Key Stakeholders
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Decision makers and account champions ({contacts.length})
            </p>
          </div>
          <AccessGuard permissions={[PERMISSIONS.CREATE_CONTACTS]}>
            <Button
              type="button"
              size="sm"
              className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => {
                setEditingContactId(null);
                setContactDraft(EMPTY_CONTACT_DRAFT);
                setContactFormOpen(true);
              }}
            >
              <Plus size={14} className="mr-1.5" />
              Add Contact
            </Button>
          </AccessGuard>
        </div>

        {contacts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No contacts yet. Add the first contact for this account.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-lg border border-border bg-surface-elevated/40 p-4 transition-colors hover:bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      {contact.isPrimaryContact ? (
                        <Badge className="rounded-md bg-brand px-1.5 py-0 text-[10px] font-semibold text-brand-foreground">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {contact.role || '—'}
                    </p>
                  </div>
                  {canEdit || canDelete ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Contact actions"
                      >
                        <MoreHorizontal size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {canEdit ? (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingContactId(contact.id);
                              setContactDraft({
                                name: combineFullName(contact),
                                role: contact.role ?? '',
                                email: contact.email ?? '',
                                phone: contact.phoneNumber ?? '',
                                isPrimary: contact.isPrimaryContact,
                              });
                              setContactFormOpen(true);
                            }}
                          >
                            <Pencil size={13} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                        ) : null}
                        {canEdit && canDelete ? (
                          <DropdownMenuSeparator />
                        ) : null}
                        {canDelete ? (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleteContactId(contact.id)}
                          >
                            <Trash2 size={13} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="shrink-0" />
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="truncate text-brand hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="shrink-0" />
                    <span>{contact.phoneNumber || '—'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={contactFormOpen} onOpenChange={setContactFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContactId ? 'Edit contact' : 'Add contact'}
            </DialogTitle>
            <DialogDescription>
              Add this person to the customer account. No invitation is sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={contactDraft.name}
                onChange={(e) =>
                  setContactDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input
                value={contactDraft.role}
                onChange={(e) =>
                  setContactDraft((prev) => ({ ...prev, role: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={contactDraft.email}
                onChange={(e) =>
                  setContactDraft((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="h-9 border-border"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={contactDraft.phone}
                onChange={(e) =>
                  setContactDraft((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="h-9 border-border"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={contactDraft.isPrimary}
                onCheckedChange={(checked) =>
                  setContactDraft((prev) => ({
                    ...prev,
                    isPrimary: checked === true,
                  }))
                }
              />
              Primary contact
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setContactFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={createContact.isLoading || updateContact.isLoading}
              onClick={() => {
                const name = contactDraft.name.trim();
                const email = contactDraft.email.trim();
                if (!name) {
                  toast.error('Full name is required.');
                  return;
                }
                const { firstName, lastName } = splitFullName(name);
                const payload = {
                  firstName,
                  lastName,
                  ...(email ? { email } : {}),
                  phoneNumber: contactDraft.phone.trim() || undefined,
                  role: contactDraft.role.trim() || undefined,
                  isPrimaryContact: contactDraft.isPrimary,
                  customerId,
                };
                if (editingContactId) {
                  updateContact.mutate(
                    { id: editingContactId, payload },
                    {
                      onSuccess: () => {
                        toast.success('Contact updated.');
                        setContactFormOpen(false);
                      },
                      onError: () => toast.error('Could not update contact.'),
                    },
                  );
                  return;
                }
                createContact.mutate(payload, {
                  onSuccess: () => {
                    toast.success('Contact added to this customer.');
                    setContactFormOpen(false);
                  },
                  onError: (error: unknown) => {
                    const message =
                      (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? 'Could not add contact.';
                    toast.error(
                      typeof message === 'string'
                        ? message
                        : 'Could not add contact.',
                    );
                  },
                });
              }}
            >
              {editingContactId ? 'Save changes' : 'Create contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteContactId)}
        onOpenChange={(open) => !open && setDeleteContactId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              Remove this contact from the customer account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDeleteContactId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={deleteContact.isLoading}
              onClick={() => {
                if (!deleteContactId) return;
                deleteContact.mutate(deleteContactId, {
                  onSuccess: () => {
                    toast.success('Contact deleted.');
                    setDeleteContactId(null);
                  },
                  onError: () => toast.error('Could not delete contact.'),
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
