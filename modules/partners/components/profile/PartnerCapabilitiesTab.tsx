'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Boxes,
  Download,
  FileText,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { CertificationRecord, Partner } from '../../types';
import { usePartnerCertifications } from '@/store/server/features/partners/queries';
import {
  useCreatePartnerCertification,
  useDeletePartnerCertification,
  useUpdatePartnerCertification,
} from '@/store/server/features/partners/mutations';
import { useCreateCatalogProduct } from '@/store/server/features/product-catalog/mutations';
import {
  useCatalogProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import {
  CatalogFormField,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { usePartnerRoles } from '../../roles';
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
import {
  Panel,
  PanelHeader,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
} from './shared';
import { fileUpload } from '@/utils/fileUpload';
import { FILE_URL } from '@/utils/constants';

const CERT_LEVELS = [
  'Associate',
  'Professional',
  'Expert',
  'Architect',
  'Specialist',
] as const;

function toDateString(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function certStatusBadgeClass(status: CertificationRecord['status']): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Expiring Soon':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Expired':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

interface CertificationFormState {
  id?: string;
  certificationName: string;
  productOrSolution: string;
  certifiedIndividual: string;
  certificationLevel: string;
  issueDate: string;
  expiryDate: string;
  certificateUrl: string;
}

const EMPTY_FORM: CertificationFormState = {
  certificationName: '',
  productOrSolution: '',
  certifiedIndividual: '',
  certificationLevel: 'Professional',
  issueDate: '',
  expiryDate: '',
  certificateUrl: '',
};

const PRODUCT_NONE = '__none__';
const SELECT_MENU_CLASS =
  'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]';

function resolveUploadedFileUrl(data: unknown): string | null {
  const body = (data ?? {}) as Record<string, unknown>;
  const nested =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : {};
  const candidates = [
    nested.viewImage,
    nested.image,
    body.viewImage,
    body.image,
  ];
  const raw = candidates.find(
    (value): value is string =>
      typeof value === 'string' && Boolean(value.trim()),
  );
  return raw?.trim() || null;
}

function certificateFileLabel(url: string): string {
  try {
    const path = new URL(url).pathname;
    const name = path.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'Certificate file';
  } catch {
    return 'Certificate file';
  }
}

/** Certificate docs: PDF or common image scans (not arbitrary uploads). */
const CERTIFICATE_FILE_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';
const CERTIFICATE_FILE_EXTENSIONS = /\.(pdf|png|jpe?g|webp)$/i;

function isCertificateFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (
    mime === 'application/pdf' ||
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/webp'
  ) {
    return true;
  }
  // Some browsers leave type empty for local files — fall back to extension.
  return CERTIFICATE_FILE_EXTENSIONS.test(file.name);
}

function CertificationFormDialog({
  isOpen,
  onClose,
  partnerId,
  partnerName,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  initial: CertificationFormState;
}) {
  const isEdit = Boolean(initial.id);
  const createCert = useCreatePartnerCertification();
  const updateCert = useUpdatePartnerCertification();
  const productsQuery = useCatalogProducts(isOpen);
  const familiesQuery = useProductFamilies();

  const [form, setForm] = useState(initial);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [individualError, setIndividualError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerProductOptions = useMemo(() => {
    const products = (productsQuery.data ?? [])
      .filter((product) =>
        (product.productPartners ?? []).some(
          (link) => link.partnerId === partnerId,
        ),
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
      }));

    const families = (familiesQuery.data ?? [])
      .filter((family) =>
        (family.familyPartners ?? []).some(
          (link) => link.partnerId === partnerId,
        ),
      )
      .map((family) => ({
        id: `family-${family.id}`,
        name: family.name,
      }));

    const byName = new Map<string, { id: string; name: string }>();
    for (const entry of [...families, ...products]) {
      if (!byName.has(entry.name)) byName.set(entry.name, entry);
    }

    // Keep an edit-time value selectable even if no longer linked.
    if (initial.productOrSolution && !byName.has(initial.productOrSolution)) {
      byName.set(initial.productOrSolution, {
        id: `legacy-${initial.productOrSolution}`,
        name: initial.productOrSolution,
      });
    }

    return Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    familiesQuery.data,
    initial.productOrSolution,
    partnerId,
    productsQuery.data,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(initial);
    setPendingFile(null);
    setUploading(false);
    setNameError(null);
    setIndividualError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isOpen, initial]);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!isCertificateFile(file)) {
      toast.error('Upload a PDF, PNG, JPG, or WEBP certificate file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingFile(file);
    // Clear prior remote URL so submit uploads the new file.
    setForm((f) => ({ ...f, certificateUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearCertificateFile = () => {
    setPendingFile(null);
    setForm((f) => ({ ...f, certificateUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitting = createCert.isLoading || updateCert.isLoading || uploading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextNameError = form.certificationName.trim()
      ? null
      : 'Certification name is required';
    const nextIndividualError = form.certifiedIndividual.trim()
      ? null
      : 'Certified individual is required';
    setNameError(nextNameError);
    setIndividualError(nextIndividualError);
    if (nextNameError || nextIndividualError) return;

    if (form.issueDate && form.expiryDate && form.expiryDate < form.issueDate) {
      toast.error('Expiry date must be after issue date');
      return;
    }

    let certificateUrl = form.certificateUrl.trim() || null;

    if (pendingFile) {
      if (!FILE_URL) {
        toast.error('File upload is not configured.');
        return;
      }
      setUploading(true);
      try {
        const response = await fileUpload(pendingFile);
        const url = resolveUploadedFileUrl(response?.data);
        if (!url) {
          toast.error('Could not attach certificate file.');
          return;
        }
        certificateUrl = url;
      } catch {
        toast.error('Could not attach certificate file.');
        return;
      } finally {
        setUploading(false);
      }
    }

    // Backend column is still named `vendor`; store the partner display name.
    const vendor = partnerName;
    const productOrSolution = form.productOrSolution.trim() || null;

    try {
      if (isEdit && initial.id) {
        await updateCert.mutateAsync({
          id: initial.id,
          payload: {
            certificationName: form.certificationName.trim(),
            vendor,
            productOrSolution,
            certifiedIndividual: form.certifiedIndividual.trim(),
            certificationLevel: form.certificationLevel,
            issueDate: form.issueDate || null,
            expiryDate: form.expiryDate || null,
            certificateUrl,
          },
        });
        toast.success('Certification updated');
      } else {
        await createCert.mutateAsync({
          partnerId,
          certificationName: form.certificationName.trim(),
          vendor,
          productOrSolution,
          certifiedIndividual: form.certifiedIndividual.trim(),
          certificationLevel: form.certificationLevel,
          issueDate: form.issueDate || null,
          expiryDate: form.expiryDate || null,
          certificateUrl,
        });
        toast.success(`Certification added to ${partnerName}`);
      }
      onClose();
    } catch {
      toast.error(
        isEdit
          ? 'Failed to update certification'
          : 'Failed to add certification',
      );
    }
  };

  const attachedLabel = pendingFile
    ? pendingFile.name
    : form.certificateUrl
      ? certificateFileLabel(form.certificateUrl)
      : null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (submitting && !open) return;
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-visible p-0 sm:max-w-[480px]">
        <DialogHeader className="space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Award size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {isEdit ? 'Edit certification' : 'Add certification'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Technical credential for {partnerName}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[min(65vh,520px)] space-y-4 overflow-y-auto px-6 py-5">
            <CatalogFormField
              label="Certification name"
              required
              error={nameError ?? undefined}
            >
              <Input
                value={form.certificationName}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    certificationName: e.target.value,
                  }));
                  if (nameError) setNameError(null);
                }}
                className={catalogControlClass}
                placeholder="e.g. Cisco Certified Internetwork Expert"
                autoFocus
              />
            </CatalogFormField>

            <CatalogFormField label="Product / solution">
              <Select
                value={form.productOrSolution || PRODUCT_NONE}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    productOrSolution: value === PRODUCT_NONE ? '' : value,
                  }))
                }
              >
                <SelectTrigger className={catalogControlClass}>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className={SELECT_MENU_CLASS}>
                  <SelectItem value={PRODUCT_NONE}>None</SelectItem>
                  {partnerProductOptions.map((entry) => (
                    <SelectItem key={entry.id} value={entry.name}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {partnerProductOptions.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No products linked to this partner yet.
                </p>
              ) : null}
            </CatalogFormField>

            <CatalogFormField
              label="Certified individual"
              required
              error={individualError ?? undefined}
            >
              <Input
                value={form.certifiedIndividual}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    certifiedIndividual: e.target.value,
                  }));
                  if (individualError) setIndividualError(null);
                }}
                className={catalogControlClass}
                placeholder="Full name"
              />
            </CatalogFormField>

            <CatalogFormField label="Level">
              <Select
                value={form.certificationLevel}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, certificationLevel: value }))
                }
              >
                <SelectTrigger className={catalogControlClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_MENU_CLASS}>
                  {CERT_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CatalogFormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CatalogFormField label="Issue date">
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issueDate: e.target.value }))
                  }
                  className={catalogControlClass}
                />
              </CatalogFormField>

              <CatalogFormField label="Expiry date">
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiryDate: e.target.value }))
                  }
                  className={catalogControlClass}
                />
              </CatalogFormField>
            </div>

            <CatalogFormField
              label="Certificate file"
              hint="PDF, PNG, JPG, or WEBP"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={CERTIFICATE_FILE_ACCEPT}
                className="hidden"
                onChange={(event) => handleFileSelect(event.target.files?.[0])}
              />
              {attachedLabel ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 dark:bg-surface-card">
                  <FileText
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                  {form.certificateUrl && !pendingFile ? (
                    <a
                      href={form.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-sm text-brand hover:underline"
                      title={attachedLabel}
                    >
                      {attachedLabel}
                    </a>
                  ) : (
                    <span
                      className="min-w-0 flex-1 truncate text-sm text-foreground"
                      title={attachedLabel}
                    >
                      {attachedLabel}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={submitting}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Replace certificate file"
                  >
                    <Upload size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={submitting}
                    onClick={clearCertificateFile}
                    aria-label="Remove certificate file"
                  >
                    <X size={13} />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full justify-start border-dashed border-border text-sm"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  Choose certificate file
                </Button>
              )}
            </CatalogFormField>
          </div>

          <DialogFooter className="rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={submitting}
            >
              {uploading
                ? 'Attaching…'
                : createCert.isLoading || updateCert.isLoading
                  ? isEdit
                    ? 'Saving…'
                    : 'Adding…'
                  : isEdit
                    ? 'Save changes'
                    : 'Add certification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
    if (Array.isArray(body.message) && body.message.length) {
      return body.message.map(String).join(', ');
    }
  }
  return fallback;
}

function ProductFormDialog({
  isOpen,
  onClose,
  partner,
}: {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner;
}) {
  const createProduct = useCreateCatalogProduct();
  const { roles } = usePartnerRoles();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleId, setRoleId] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const partnerRoles = useMemo(() => {
    const assigned = new Set(partner.roleIds ?? []);
    return roles.filter((role) => role.isActive && assigned.has(role.id));
  }, [partner.roleIds, roles]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDescription('');
    setRoleId(partnerRoles[0]?.id ?? partner.roleIds?.[0] ?? '');
    setNameError(null);
    setRoleError(null);
    setSaving(false);
  }, [isOpen, partner.roleIds, partnerRoles]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const nextNameError = name.trim() ? null : 'Name is required';
    const nextRoleError = roleId
      ? null
      : 'Assign at least one partner role before adding products.';
    setNameError(nextNameError);
    setRoleError(nextRoleError);
    if (nextNameError || nextRoleError) {
      if (nextRoleError && !roleId) toast.error(nextRoleError);
      return;
    }

    setSaving(true);
    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        status: 'active',
        productPartners: [{ partnerId: partner.id, partnerRoleId: roleId }],
      });
      toast.success(`“${name.trim()}” added for ${partner.name}`);
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to add product'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (saving && !open) return;
        if (!open) onClose();
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
                Create a catalog product and link it to {partner.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <CatalogFormField
              label="Product name"
              required
              error={nameError ?? undefined}
            >
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={catalogControlClass}
                placeholder="e.g. Cloud Backup Suite"
                autoFocus
                maxLength={200}
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
              label="Partner role"
              required
              error={roleError ?? undefined}
            >
              {partnerRoles.length === 0 ? (
                <div className="flex h-9 items-center rounded-md border border-amber-200/80 bg-amber-50 px-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  Assign a role on this partner first
                </div>
              ) : partnerRoles.length === 1 ? (
                <div className="flex h-9 items-center rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground dark:bg-surface-card">
                  {partnerRoles[0].name}
                </div>
              ) : (
                <Select
                  value={roleId || undefined}
                  onValueChange={(value) => {
                    setRoleId(value);
                    if (roleError) setRoleError(null);
                  }}
                >
                  <SelectTrigger className={catalogControlClass}>
                    <SelectValue placeholder="Select role for this link" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CatalogFormField>
          </div>

          <DialogFooter className="rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={saving || partnerRoles.length === 0}
            >
              {saving ? 'Creating…' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerCapabilitiesTab({ partner }: { partner: Partner }) {
  const [formOpen, setFormOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificationRecord | null>(
    null,
  );
  const [deletingCert, setDeletingCert] = useState<CertificationRecord | null>(
    null,
  );

  const certificationsQuery = usePartnerCertifications(partner.id);
  const certifications = useMemo(
    () => certificationsQuery.data ?? [],
    [certificationsQuery.data],
  );
  const deleteCert = useDeletePartnerCertification();
  const productsQuery = useCatalogProducts();
  const familiesQuery = useProductFamilies();
  const { roles } = usePartnerRoles();

  const documents = useMemo(() => partner.documents ?? [], [partner.documents]);

  const roleNameById = useMemo(() => {
    return new Map(roles.map((role) => [role.id, role.name]));
  }, [roles]);

  const productActions = (
    <Button
      type="button"
      size="sm"
      className="h-[30px] bg-brand px-2.5 text-xs text-brand-foreground shadow-sm hover:bg-brand-hover"
      onClick={() => setProductFormOpen(true)}
    >
      <Plus size={12} className="mr-1" />
      Add
    </Button>
  );

  const authorizedProducts = useMemo(() => {
    const products = (productsQuery.data ?? [])
      .filter((product) =>
        (product.productPartners ?? []).some(
          (link) => link.partnerId === partner.id,
        ),
      )
      .map((product) => {
        const links = (product.productPartners ?? []).filter(
          (link) => link.partnerId === partner.id,
        );
        const roleNames = links
          .map(
            (link) =>
              link.partnerRoleName ||
              roleNameById.get(link.partnerRoleId) ||
              '',
          )
          .filter(Boolean);
        return {
          id: product.id,
          kind: 'product' as const,
          name: product.name,
          subtitle: product.description || 'Catalog product',
          roleLabel: roleNames.join(', ') || '—',
          statusLabel: product.status === 'active' ? 'Active' : product.status,
          statusTone: product.status === 'active' ? 'ok' : 'muted',
        };
      });

    const families = (familiesQuery.data ?? [])
      .filter((family) =>
        (family.familyPartners ?? []).some(
          (link) => link.partnerId === partner.id,
        ),
      )
      .map((family) => {
        const links = (family.familyPartners ?? []).filter(
          (link) => link.partnerId === partner.id,
        );
        const roleNames = links
          .map(
            (link) =>
              link.partnerRoleName ||
              roleNameById.get(link.partnerRoleId) ||
              '',
          )
          .filter(Boolean);
        return {
          id: `family-${family.id}`,
          kind: 'family' as const,
          name: family.name,
          subtitle: 'Product family',
          roleLabel: roleNames.join(', ') || '—',
          statusLabel: family.status === 'active' ? 'Active' : family.status,
          statusTone: family.status === 'active' ? 'ok' : 'muted',
        };
      });

    return [...families, ...products].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [familiesQuery.data, partner.id, productsQuery.data, roleNameById]);

  const productCount = authorizedProducts.length;
  const activeCertCount = certifications.filter(
    (c) => c.status === 'Active',
  ).length;
  const certifiedIndividuals = new Set(
    certifications.map((c) => c.certifiedIndividual),
  );

  const openAddCert = () => {
    setEditingCert(null);
    setFormOpen(true);
  };

  const openEditCert = (cert: CertificationRecord) => {
    setEditingCert(cert);
    setFormOpen(true);
  };

  const handleDeleteCert = async () => {
    if (!deletingCert) return;
    try {
      await deleteCert.mutateAsync(deletingCert.id);
      toast.success('Certification removed');
    } catch {
      toast.error('Failed to remove certification');
    } finally {
      setDeletingCert(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileKpiCard
          label="Products"
          value={String(productCount)}
          hint="Solutions & product lines"
          icon={<Boxes size={18} />}
        />
        <ProfileKpiCard
          label="Certifications"
          value={String(certifications.length)}
          hint={`${activeCertCount} active credentials`}
          icon={<Award size={18} />}
        />
        <ProfileKpiCard
          label="Certified engineers"
          value={String(certifiedIndividuals.size)}
          hint="Delivery capacity"
          icon={<UserCheck size={18} />}
        />
        <ProfileKpiCard
          label="Compliance Documents"
          value={String(documents.length)}
          hint="Agreements & certifications"
          icon={<FileText size={18} />}
        />
      </div>

      {/* PROFESSIONAL TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {/* Left Column: Solutions & Products */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Solutions & Products"
            description={`Approved technical product lines for ${partner.name}.`}
            action={productActions}
          />

          {productsQuery.isLoading || familiesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading products…
            </div>
          ) : authorizedProducts.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Boxes />
                </EmptyMedia>
                <EmptyTitle>No products yet</EmptyTitle>
                <EmptyDescription>
                  Add a catalog product for this partner. Families chosen at
                  partner creation also appear here.
                </EmptyDescription>
              </EmptyHeader>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {productActions}
              </div>
            </Empty>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'py-2')}>
                      Solution / Product
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[110px]')}
                    >
                      Type
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[110px]')}
                    >
                      Role
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[100px]')}
                    >
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authorizedProducts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 text-xs font-medium',
                        )}
                      >
                        <p className="max-w-[220px] truncate font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="max-w-[220px] truncate text-[10px] text-muted-foreground">
                          {item.subtitle}
                        </p>
                      </TableCell>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 text-xs text-muted-foreground',
                        )}
                      >
                        {item.kind === 'family' ? 'Family' : 'Product'}
                      </TableCell>
                      <TableCell className={cn(TABLE_CELL_CLASS, 'py-2.5')}>
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {item.roleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(TABLE_CELL_CLASS, 'py-2.5')}>
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-1.5 py-0 text-[10px] font-medium',
                            item.statusTone === 'ok'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700',
                          )}
                        >
                          {item.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        {/* Right Column: Certifications & Compliance Documents */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Certifications"
            description="Technical credentials held by partner staff."
            action={
              <Button
                type="button"
                size="sm"
                className="h-[30px] bg-brand text-brand-foreground hover:bg-brand-hover text-xs px-2.5 shadow-sm"
                onClick={openAddCert}
              >
                <Plus size={12} className="mr-1" />
                Add
              </Button>
            }
          />

          {certificationsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading certifications…
            </div>
          ) : certificationsQuery.isError ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Award />
                </EmptyMedia>
                <EmptyTitle>Couldn’t load certifications</EmptyTitle>
                <EmptyDescription>
                  The list failed to load. Try again, or re-add if the
                  certification was just created.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 h-[30px] text-xs"
                onClick={() => void certificationsQuery.refetch()}
              >
                Retry
              </Button>
            </Empty>
          ) : certifications.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Award />
                </EmptyMedia>
                <EmptyTitle>No certifications</EmptyTitle>
                <EmptyDescription>
                  No certifications recorded for this partner yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'py-2')}>
                      Certification
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[110px]')}
                    >
                      Individual
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[100px]')}
                    >
                      Expires
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'py-2 w-[100px]')}
                    >
                      Status
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'py-2 w-10')} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certifications.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 font-medium text-xs',
                        )}
                      >
                        <p className="font-semibold text-foreground truncate max-w-[200px]">
                          {cert.certificationName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {cert.partnerName} · {cert.certificationLevel}
                        </p>
                      </TableCell>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 text-xs text-muted-foreground',
                        )}
                      >
                        {cert.certifiedIndividual}
                      </TableCell>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 text-xs text-muted-foreground',
                        )}
                      >
                        {cert.expiryDate || '—'}
                      </TableCell>
                      <TableCell className={cn(TABLE_CELL_CLASS, 'py-2.5')}>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 font-medium',
                            certStatusBadgeClass(cert.status),
                          )}
                        >
                          {cert.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(TABLE_CELL_CLASS, 'py-2.5 text-right')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => openEditCert(cert)}
                            >
                              <Pencil size={12} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {cert.certificateUrl ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    cert.certificateUrl,
                                    '_blank',
                                    'noopener',
                                  )
                                }
                              >
                                <Download size={12} className="mr-2" />
                                Open certificate
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingCert(cert)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 size={12} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>

      <CertificationFormDialog
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        partnerId={partner.id}
        partnerName={partner.name}
        initial={
          editingCert
            ? {
                id: editingCert.id,
                certificationName: editingCert.certificationName,
                productOrSolution: editingCert.productOrSolution ?? '',
                certifiedIndividual: editingCert.certifiedIndividual,
                certificationLevel: editingCert.certificationLevel,
                issueDate: toDateString(editingCert.issueDate),
                expiryDate: toDateString(editingCert.expiryDate),
                certificateUrl: editingCert.certificateUrl ?? '',
              }
            : { ...EMPTY_FORM }
        }
      />

      <ProductFormDialog
        isOpen={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        partner={partner}
      />

      <Dialog
        open={Boolean(deletingCert)}
        onOpenChange={(open) => !open && setDeletingCert(null)}
      >
        <DialogContent className="max-w-[420px] p-0">
          <DialogHeader className="space-y-1 border-b border-border px-5 py-4 pr-10">
            <DialogTitle className="text-[15px] font-semibold">
              Delete certification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Remove “{deletingCert?.certificationName}” from{' '}
              {deletingCert?.certifiedIndividual}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setDeletingCert(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
              disabled={deleteCert.isLoading}
              onClick={handleDeleteCert}
            >
              {deleteCert.isLoading ? (
                <Loader2 size={13} className="mr-1.5 animate-spin" />
              ) : (
                <Trash2 size={13} className="mr-1.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
