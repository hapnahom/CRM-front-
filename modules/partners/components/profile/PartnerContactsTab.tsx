'use client';

import React, { useState } from 'react';
import { Mail, MoreVertical, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Partner, PartnerContact } from '../../types';
import { Panel } from './shared';

interface PartnerContactsTabProps {
  partner: Partner;
  onUpdatePartner?: (updated: Partner) => void;
}

interface ContactDraft {
  name: string;
  position: string;
  role: 'Primary' | 'Technical' | 'Commercial' | 'Executive' | 'Operations';
  email: string;
  phone: string;
  isPrimary: boolean;
}

const EMPTY_CONTACT_DRAFT: ContactDraft = {
  name: '',
  position: '',
  role: 'Technical',
  email: '',
  phone: '',
  isPrimary: false,
};

export function PartnerContactsTab({
  partner,
  onUpdatePartner,
}: PartnerContactsTabProps) {
  const [contacts, setContacts] = useState<PartnerContact[]>(
    partner.contacts ?? [],
  );
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] =
    useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  // Sync when partner updates
  React.useEffect(() => {
    if (partner.contacts) {
      setContacts(partner.contacts);
    }
  }, [partner.contacts]);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactDraft.name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!contactDraft.email.trim() && !contactDraft.phone.trim()) {
      toast.error('Please provide at least an email or phone number');
      return;
    }

    let updatedContacts: PartnerContact[];

    if (editingContactId) {
      updatedContacts = contacts.map((c) => {
        if (c.id === editingContactId) {
          return {
            ...c,
            name: contactDraft.name.trim(),
            position: contactDraft.position.trim(),
            role: contactDraft.isPrimary ? 'Primary' : contactDraft.role,
            email: contactDraft.email.trim(),
            phone: contactDraft.phone.trim(),
            isPrimary: contactDraft.isPrimary,
          };
        }
        // If this contact is marked primary, unmark others
        return contactDraft.isPrimary ? { ...c, isPrimary: false } : c;
      });
      toast.success('Contact updated successfully');
    } else {
      const newContact: PartnerContact = {
        id: `c-${Date.now()}`,
        name: contactDraft.name.trim(),
        position: contactDraft.position.trim(),
        role: contactDraft.isPrimary ? 'Primary' : contactDraft.role,
        email: contactDraft.email.trim(),
        phone: contactDraft.phone.trim(),
        isPrimary: contactDraft.isPrimary,
      };
      const existing = contactDraft.isPrimary
        ? contacts.map((c) => ({ ...c, isPrimary: false }))
        : contacts;
      updatedContacts = [newContact, ...existing];
      toast.success('Contact added successfully');
    }

    setContacts(updatedContacts);
    const updatedPartner: Partner = {
      ...partner,
      contacts: updatedContacts,
      primaryContact: contactDraft.isPrimary
        ? {
            id: editingContactId || `c-${Date.now()}`,
            name: contactDraft.name.trim(),
            position: contactDraft.position.trim(),
            role: 'Primary',
            email: contactDraft.email.trim(),
            phone: contactDraft.phone.trim(),
            isPrimary: true,
          }
        : partner.primaryContact,
    };
    onUpdatePartner?.(updatedPartner);
    setContactFormOpen(false);
  };

  const handleDeleteContact = () => {
    if (!deleteContactId) return;
    const updatedContacts = contacts.filter((c) => c.id !== deleteContactId);
    setContacts(updatedContacts);
    const updatedPartner: Partner = {
      ...partner,
      contacts: updatedContacts,
    };
    onUpdatePartner?.(updatedPartner);
    setDeleteContactId(null);
    toast.success('Contact removed');
  };

  const openEdit = (contact: PartnerContact) => {
    setEditingContactId(contact.id);
    setContactDraft({
      name: contact.name,
      position: contact.position || '',
      role: contact.role,
      email: contact.email || '',
      phone: contact.phone || '',
      isPrimary: Boolean(contact.isPrimary || contact.role === 'Primary'),
    });
    setContactFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Contacts & Key Stakeholders Panel (Customer Module Layout) */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Contacts &amp; Key Stakeholders
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Decision makers and account champions ({contacts.length})
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm font-medium text-xs"
              onClick={() => {
                setEditingContactId(null);
                setContactDraft(EMPTY_CONTACT_DRAFT);
                setContactFormOpen(true);
              }}
            >
              <Plus size={14} className="mr-1.5" />
              Add Contact
            </Button>
          </div>
        </div>

        {contacts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No contacts yet. Add the first contact for {partner.name}.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-lg border border-border bg-surface-elevated/40 p-4 transition-colors hover:bg-white dark:hover:bg-surface-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {contact.name}
                      </h3>
                      {contact.isPrimary || contact.role === 'Primary' ? (
                        <Badge className="rounded-md bg-brand px-1.5 py-0 text-[10px] font-semibold text-brand-foreground">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {contact.position || contact.role || '—'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Contact options"
                      >
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEdit(contact)}>
                        <Pencil size={13} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteContactId(contact.id)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 size={13} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="truncate text-muted-foreground hover:text-brand"
                      >
                        {contact.phone}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {/* Add / Edit Contact Modal */}
      <Dialog open={contactFormOpen} onOpenChange={setContactFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContactId ? 'Edit contact' : 'Add contact'}
            </DialogTitle>
            <DialogDescription>
              Add or update stakeholder details for {partner.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveContact}>
            <div className="space-y-3 py-1 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Full name *</Label>
                <Input
                  value={contactDraft.name}
                  onChange={(e) =>
                    setContactDraft((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. John Doe"
                  className="h-9 border-border text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Job Title / Position</Label>
                  <Input
                    value={contactDraft.position}
                    onChange={(e) =>
                      setContactDraft((prev) => ({
                        ...prev,
                        position: e.target.value,
                      }))
                    }
                    placeholder="e.g. Partner Manager"
                    className="h-9 border-border text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={contactDraft.role}
                    onValueChange={(val) =>
                      setContactDraft((prev) => ({
                        ...prev,
                        role: val as ContactDraft['role'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 border-border text-xs">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={contactDraft.email}
                  onChange={(e) =>
                    setContactDraft((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="name@partner.com"
                  className="h-9 border-border text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone number</Label>
                <Input
                  value={contactDraft.phone}
                  onChange={(e) =>
                    setContactDraft((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="+251 ..."
                  className="h-9 border-border text-xs"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="is-primary"
                  checked={contactDraft.isPrimary}
                  onCheckedChange={(checked) =>
                    setContactDraft((prev) => ({
                      ...prev,
                      isPrimary: Boolean(checked),
                    }))
                  }
                />
                <Label
                  htmlFor="is-primary"
                  className="text-xs font-normal cursor-pointer text-muted-foreground"
                >
                  Designate as Primary Point of Contact
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="h-8 border-border text-xs"
                onClick={() => setContactFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover text-xs font-medium"
              >
                Save contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteContactId)}
        onOpenChange={(open) => !open && setDeleteContactId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this contact from {partner.name}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-border text-xs"
              onClick={() => setDeleteContactId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-8 text-xs font-medium"
              onClick={handleDeleteContact}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
