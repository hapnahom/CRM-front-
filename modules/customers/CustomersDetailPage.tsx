'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { CustomerAvatar } from '@/modules/customers/components/CustomerAvatar';
import { CountrySelect } from '@/modules/customers/components/CountrySelect';
import { LogoUploadField } from '@/modules/customers/components/LogoUploadField';
import { OrganizationSizeFields } from '@/modules/customers/components/OrganizationSizeFields';
import { ActivitiesTab } from '@/modules/customers/components/detail/ActivitiesTab';
import { ContactsTab } from '@/modules/customers/components/detail/ContactsTab';
import { DeliveryTab } from '@/modules/customers/components/detail/DeliveryTab';
import {
  formatEmployeesLabel,
  formatOwnerLabel,
  initialsFromName,
} from '@/modules/customers/lib/display';
import {
  useGetCustomerCountries,
  useGetCustomerDetail,
  useGetCustomerOrganizationSizes,
  useGetJourneyStages,
} from '@/store/server/features/customers/queries';
import {
  useChangeCustomerStage,
  useDeleteCustomer,
  useUpdateCustomer,
} from '@/store/server/features/customers/mutations';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { CustomerDetailSkeleton } from '@/components/loading/skeleton-screens';

const BASE_PATH = '/customers';
const DETAIL_TABS = ['Activities', 'Contacts', 'Delivery'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

export function CustomersDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>('Activities');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stageConfirm, setStageConfirm] = useState<{
    id: string;
    name: string;
    fromName: string;
  } | null>(null);

  const detailQuery = useGetCustomerDetail(customerId);
  const stagesQuery = useGetJourneyStages();
  const vectorsQuery = useGetVectors();
  const sizesQuery = useGetCustomerOrganizationSizes();
  const countriesQuery = useGetCustomerCountries();
  const usersQuery = useGetPlatformUsers({ page: 1, pageSize: 1000 });
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const changeStage = useChangeCustomerStage();

  const customer = detailQuery.data;
  const users = usersQuery.data?.data ?? [];
  const vectors = vectorsQuery.data?.data ?? [];
  const ownerName = formatOwnerLabel(
    customer?.ownerUserId,
    customer?.owner,
    users,
  );

  const [editDraft, setEditDraft] = useState({
    accountName: '',
    vectorId: '',
    organizationSize: '',
    city: '',
    country: '',
    website: '',
    ownerUserId: '',
    logoUrl: '',
  });

  const stageColor = customer?.journeyStage?.color ?? '#64748B';

  const location = useMemo(
    () => [customer?.city, customer?.country].filter(Boolean).join(', ') || '—',
    [customer?.city, customer?.country],
  );

  if (detailQuery.isLoading) {
    return <CustomerDetailSkeleton />;
  }

  if (detailQuery.isError || !customer) {
    const status = (
      detailQuery.error as { response?: { status?: number } } | undefined
    )?.response?.status;
    const notFound = status === 404 || !detailQuery.isError;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white p-6">
        <p className="text-sm text-muted-foreground">
          {notFound ? 'Customer not found.' : 'Could not load this customer.'}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-9 border-border"
          onClick={() => router.push(BASE_PATH)}
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex-shrink-0 border-b border-border bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-3 pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => router.push(BASE_PATH)}
              title="Back to Customers"
              aria-label="Back to Customers"
            >
              <ArrowLeft size={16} />
            </Button>
            <div className="flex min-w-0 items-start gap-3">
              <CustomerAvatar
                name={customer.accountName}
                initials={initialsFromName(customer.accountName)}
                logoUrl={
                  editOpen ? editDraft.logoUrl || null : customer.logoUrl
                }
                size="md"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                    {customer.accountName}
                  </h1>
                  {customer.journeyStage ? (
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: stageColor,
                        background: `${stageColor}18`,
                      }}
                    >
                      {customer.journeyStage.name}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{formatEmployeesLabel(customer.organizationSize)}</span>
                  <span aria-hidden>·</span>
                  <span>{location}</span>
                  <span aria-hidden>·</span>
                  <span>Owner: {ownerName}</span>
                  <span aria-hidden>·</span>
                  <span>{customer.vector?.name ?? 'Unassigned'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AccessGuard permissions={[PERMISSIONS.EDIT_CUSTOMERS]}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-border bg-white text-xs hover:bg-surface-elevated"
                onClick={() => {
                  setEditDraft({
                    accountName: customer.accountName,
                    vectorId: customer.vectorId ?? '',
                    organizationSize: customer.organizationSize ?? '',
                    city: customer.city ?? '',
                    country: customer.country ?? '',
                    website: customer.website ?? '',
                    ownerUserId: customer.ownerUserId ?? '',
                    logoUrl: customer.logoUrl ?? '',
                  });
                  setEditOpen(true);
                }}
              >
                <Pencil size={13} className="mr-1.5" />
                Edit
              </Button>
            </AccessGuard>
            <AccessGuard permissions={[PERMISSIONS.DELETE_CUSTOMERS]}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-border text-xs text-destructive hover:bg-error/5 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={13} className="mr-1.5" />
                Delete
              </Button>
            </AccessGuard>
          </div>
        </div>

        <div className="overflow-x-auto px-6">
          <div className="flex min-w-max items-center gap-1">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                  tab === activeTab
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto bg-white p-[10.5px] sm:p-[17.5px]">
        {activeTab === 'Activities' ? (
          <ActivitiesTab
            customerId={customer.id}
            customerName={customer.accountName}
            pipelineValueLabel={customer.openPipelineLabel}
            pipelineValueByCurrency={customer.openPipelineByCurrency}
            winRate={customer.winRate ?? null}
            dealsCount={customer.dealsCount ?? 0}
            leadsCount={customer.leadsCount ?? 0}
            wonRevenueLabel={customer.wonRevenueLabel}
            wonRevenueByCurrency={customer.wonRevenueByCurrency}
            stageId={customer.journeyStageId ?? null}
            stages={stagesQuery.data ?? []}
            deals={customer.deals ?? []}
            leads={customer.leads ?? []}
            onRequestStageChange={(stage) =>
              setStageConfirm({
                id: stage.id,
                name: stage.name,
                fromName: customer.journeyStage?.name ?? '',
              })
            }
          />
        ) : null}
        {activeTab === 'Contacts' ? (
          <ContactsTab
            customerId={customer.id}
            contacts={customer.contacts ?? []}
          />
        ) : null}
        {activeTab === 'Delivery' ? (
          <DeliveryTab customerId={customer.id} />
        ) : null}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>Update account details.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-auto py-1">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input
                value={editDraft.accountName}
                onChange={(e) =>
                  setEditDraft((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vector</Label>
              <Select
                value={editDraft.vectorId || undefined}
                onValueChange={(value) =>
                  setEditDraft((prev) => ({ ...prev, vectorId: value }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue placeholder="Select vector" />
                </SelectTrigger>
                <SelectContent>
                  {vectors.map((vector) => (
                    <SelectItem key={vector.id} value={vector.id}>
                      {vector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <OrganizationSizeFields
              value={editDraft.organizationSize}
              onChange={(organizationSize) =>
                setEditDraft((prev) => ({ ...prev, organizationSize }))
              }
              options={sizesQuery.data?.organizationSizes ?? []}
            />
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={editDraft.city}
                onChange={(e) =>
                  setEditDraft((prev) => ({ ...prev, city: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <CountrySelect
                value={editDraft.country}
                onChange={(country) =>
                  setEditDraft((prev) => ({ ...prev, country }))
                }
                countries={countriesQuery.data?.countries}
                fallback={
                  editDraft.country || countriesQuery.data?.defaultCountry
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={editDraft.website}
                onChange={(e) =>
                  setEditDraft((prev) => ({ ...prev, website: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select
                value={editDraft.ownerUserId || undefined}
                onValueChange={(value) =>
                  setEditDraft((prev) => ({ ...prev, ownerUserId: value }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LogoUploadField
              value={editDraft.logoUrl}
              onChange={(logoUrl) => {
                setEditDraft((prev) => ({ ...prev, logoUrl }));
                updateCustomer.mutate({
                  id: customer.id,
                  payload: { logoUrl: logoUrl.trim() || null },
                });
              }}
              accountName={editDraft.accountName}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={updateCustomer.isLoading}
              onClick={() => {
                updateCustomer.mutate(
                  {
                    id: customer.id,
                    payload: {
                      accountName: editDraft.accountName.trim(),
                      vectorId: editDraft.vectorId || null,
                      organizationSize: editDraft.organizationSize || undefined,
                      city: editDraft.city.trim() || undefined,
                      country: editDraft.country || undefined,
                      website: editDraft.website.trim() || undefined,
                      ownerUserId: editDraft.ownerUserId || null,
                      logoUrl: editDraft.logoUrl.trim() || null,
                    },
                  },
                  {
                    onSuccess: () => {
                      setEditOpen(false);
                      toast.success('Customer updated.');
                    },
                    onError: () => toast.error('Could not update customer.'),
                  },
                );
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete customer</DialogTitle>
            <DialogDescription>
              Delete “{customer.accountName}”? Linked contacts will be
              unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={deleteCustomer.isLoading}
              onClick={() => {
                deleteCustomer.mutate(customer.id, {
                  onSuccess: () => {
                    toast.success('Customer deleted.');
                    router.push(BASE_PATH);
                  },
                  onError: () => toast.error('Could not delete customer.'),
                });
              }}
            >
              Delete customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StageConfirmDialog
        open={Boolean(stageConfirm)}
        fromName={stageConfirm?.fromName ?? ''}
        toName={stageConfirm?.name ?? ''}
        loading={changeStage.isLoading}
        onCancel={() => setStageConfirm(null)}
        onConfirm={() => {
          if (!stageConfirm) return;
          changeStage.mutate(
            { customerId: customer.id, toStageId: stageConfirm.id },
            {
              onSuccess: () => {
                toast.success(`Stage updated to ${stageConfirm.name}.`);
                setStageConfirm(null);
              },
              onError: () => toast.error('Could not change stage.'),
            },
          );
        }}
      />
    </div>
  );
}

function StageConfirmDialog({
  open,
  fromName,
  toName,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  fromName: string;
  toName: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const description = fromName
    ? `Move from ${fromName} to ${toName}?`
    : `Move this customer to “${toName}”?`;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change journey stage</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-9 border-border"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Updating…' : 'Change stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
