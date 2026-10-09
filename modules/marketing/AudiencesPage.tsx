'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  List,
  LayoutGrid,
  ArrowRight,
  Users,
  Building2,
  MapPin,
  Search,
  UserPlus,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useMarketingAudience,
  useMarketingAudiences,
} from '@/store/server/features/marketing/queries';
import {
  useDeleteAudience,
  useUpdateAudience,
} from '@/store/server/features/marketing/mutations';
import { useGetCustomers } from '@/store/server/features/customers/queries';
import type { CustomerListItem } from '@/store/server/features/customers/types';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { AudienceMemberRow } from '@/store/server/features/marketing/types';
import { formatUserName } from '@/lib/format-user-name';
import { cn } from '@/lib/utils';
import {
  DataTableSkeleton,
  MarketingDetailSkeleton,
} from '@/components/loading/skeleton-screens';
import { CreateAudienceModal } from './CampaignModals';
import {
  DashboardCard,
  EmptyHint,
  MarketingDetailHeader,
  MarketingFilterSelect,
  MarketingSearchField,
  StatusBadge,
  formatMarketingDate,
  formatNumber,
} from './ui-kit';

type MemberRow = AudienceMemberRow;

function customerToMemberRow(c: CustomerListItem): MemberRow {
  const contact = c.primaryContact;
  const primaryContact = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
      contact.email ||
      '—'
    : '—';
  return {
    id: c.id,
    accountName: c.accountName,
    vector: c.vector?.name ?? '—',
    city: c.city ?? '—',
    country: c.country || '—',
    orgSize: c.organizationSize ?? '—',
    primaryContact,
    contactId: contact?.id ?? null,
    email: contact?.email ?? null,
  };
}

export function AudiencesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: audiences = [], isLoading } = useMarketingAudiences();
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of platformUsersData?.data ?? []) {
      map.set(user.id, formatUserName(user, user.email || '—'));
    }
    return map;
  }, [platformUsersData]);

  const filtered = useMemo(() => {
    return audiences.filter((a) => {
      if (statusFilter === 'Active' && !a.isActive) return false;
      if (statusFilter === 'Inactive' && a.isActive) return false;
      if (entityFilter !== 'All' && a.targetEntity !== entityFilter)
        return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.conditions.some((c) => c.label.toLowerCase().includes(q))
      );
    });
  }, [audiences, query, statusFilter, entityFilter]);

  return (
    <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <DashboardCard className="overflow-hidden bg-white shadow-xs border border-border">
        <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[15px] font-semibold text-foreground">
                Audience Segments
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-xs transition-all',
                    viewMode === 'table'
                      ? 'bg-white font-bold text-brand shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Table view"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-xs transition-all',
                    viewMode === 'grid'
                      ? 'bg-white font-bold text-brand shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <Button
                size="sm"
                className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={14} />
                New Audience
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <MarketingSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search audiences, criteria…"
            />
            <MarketingFilterSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Status"
              options={[
                { value: 'All', label: 'All statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
            <MarketingFilterSelect
              value={entityFilter}
              onValueChange={setEntityFilter}
              placeholder="Target Entity"
              options={[
                { value: 'All', label: 'All entities' },
                { value: 'Customer', label: 'Customers / Accounts' },
                { value: 'Contact', label: 'Contacts' },
                { value: 'Lead', label: 'Leads' },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-hidden">
            <DataTableSkeleton columns={8} className="rounded-none border-0" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyHint>No audiences found matching your criteria.</EmptyHint>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
                  <th className="px-4 py-3 font-semibold sm:px-5">
                    Segment Name
                  </th>
                  <th className="px-3 py-3 font-semibold">Target Entity</th>
                  <th className="px-3 py-3 font-semibold">Filter Criteria</th>
                  <th className="px-3 py-3 font-semibold">Matched Accounts</th>
                  <th className="px-3 py-3 font-semibold">Matched Contacts</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold text-right sm:px-5">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((aud) => (
                  <tr
                    key={aud.id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <Link
                        href={`/marketing/audiences/${aud.id}`}
                        className="font-semibold text-[13px] text-foreground group-hover:text-brand transition-colors block"
                      >
                        {aud.name}
                      </Link>
                      <p className="m-0 mt-0.5 text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
                        {aud.description}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <Users size={11} className="text-muted-foreground" />
                        {aud.targetEntity}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[320px]">
                        {aud.conditions.map((c, i) => (
                          <span
                            key={`${c.label}-${i}`}
                            className="inline-flex items-center rounded-md bg-slate-50 border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium truncate max-w-[150px]"
                            title={c.label}
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] font-semibold text-foreground tabular-nums">
                      {formatNumber(aud.matchedCustomers)}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-semibold text-muted-foreground tabular-nums">
                      {formatNumber(aud.matchedContacts)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={aud.isActive ? 'Active' : 'Draft'} />
                    </td>
                    <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      <span>{formatMarketingDate(aud.updatedAt)}</span>
                      <span className="block text-[10px] text-muted-foreground/80">
                        {usersById.get(aud.createdBy) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Link
                        href={`/marketing/audiences/${aud.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand/80 transition-colors"
                      >
                        Manage
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((aud) => (
              <div
                key={aud.id}
                className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all hover:border-brand/40 hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        <Users size={10} className="text-muted-foreground" />
                        {aud.targetEntity}
                      </span>
                      <StatusBadge status={aud.isActive ? 'Active' : 'Draft'} />
                    </div>

                    <span className="text-[11px] font-bold text-brand bg-orange-50 px-2 py-0.5 rounded-full tabular-nums border border-orange-200/60">
                      {formatNumber(aud.matchedCustomers)} accounts
                    </span>
                  </div>

                  <Link
                    href={`/marketing/audiences/${aud.id}`}
                    className="block mt-2.5 font-bold text-[14px] text-foreground group-hover:text-brand transition-colors line-clamp-1"
                  >
                    {aud.name}
                  </Link>

                  <p className="m-0 mt-1 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {aud.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {aud.conditions.map((c, i) => (
                      <span
                        key={`${c.label}-${i}`}
                        className="rounded-md bg-slate-50 border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    <span>Updated {formatMarketingDate(aud.updatedAt)}</span>
                  </div>

                  <Link
                    href={`/marketing/audiences/${aud.id}`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                  >
                    Manage Segment
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      <CreateAudienceModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SelectCustomersModal({
  open,
  onOpenChange,
  currentMemberIds,
  currentMemberNames,
  onAddCustomers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMemberIds: string[];
  currentMemberNames: string[];
  onAddCustomers: (customers: CustomerListItem[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vectorFilter, setVectorFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      200,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch('');
      setDebouncedSearch('');
      setVectorFilter('All');
    }
  }, [open]);

  const {
    data: customersData,
    isLoading,
    isFetching,
  } = useGetCustomers(
    {
      page: 1,
      pageSize: 100,
      searchTerm: debouncedSearch || undefined,
    },
    open,
  );
  const { data: vectorsData } = useGetVectors();
  const vectors = vectorsData?.data ?? [];
  const customers = customersData?.data ?? [];

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (vectorFilter !== 'All' && (c.vector?.name ?? '') !== vectorFilter) {
        return false;
      }
      return true;
    });
  }, [customers, vectorFilter]);

  const availableToAdd = useMemo(() => {
    return filtered.filter(
      (c) =>
        !currentMemberIds.includes(c.id) &&
        !currentMemberNames.includes(c.accountName),
    );
  }, [filtered, currentMemberIds, currentMemberNames]);

  function isAlreadyAdded(c: CustomerListItem) {
    return (
      currentMemberIds.includes(c.id) ||
      currentMemberNames.includes(c.accountName)
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (
      selectedIds.size === availableToAdd.length &&
      availableToAdd.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableToAdd.map((c) => c.id)));
    }
  }

  function handleConfirm() {
    const toAdd = customers.filter((c) => selectedIds.has(c.id));
    if (toAdd.length > 0) {
      onAddCustomers(toAdd);
    }
    setSelectedIds(new Set());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white shadow-xl rounded-xl border border-border">
        <DialogHeader className="p-5 pb-3.5 border-b border-border">
          <DialogTitle className="text-[17px] font-bold text-foreground">
            Select Customers from CRM Directory
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
            Choose multiple customer accounts to add to this audience segment.
          </DialogDescription>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer name, vector, city…"
                  className="h-8 pl-8 text-[12px] bg-slate-50 border-border"
                />
              </div>
              <select
                value={vectorFilter}
                onChange={(e) => setVectorFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-slate-50 px-2.5 text-[12px] outline-none text-foreground font-medium"
              >
                <option value="All">All Sectors</option>
                {vectors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[12px] font-semibold text-brand tabular-nums">
              {selectedIds.size} customer(s) selected
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={
                      availableToAdd.length > 0 &&
                      selectedIds.size === availableToAdd.length
                    }
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-border text-brand focus:ring-brand accent-[#ed6925] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5 whitespace-nowrap">
                  Customer / Account Name
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">
                  Vector / Sector
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">Location</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Org Size</th>
                <th className="px-4 py-2.5 whitespace-nowrap">
                  Primary Contact
                </th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading || isFetching ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Loading customers…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No matching customers found in the CRM directory.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const alreadyAdded = isAlreadyAdded(c);
                  const isSelected = selectedIds.has(c.id);
                  const contact = c.primaryContact;
                  const primaryContact = contact
                    ? [contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim() ||
                      contact.email ||
                      '—'
                    : '—';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        if (!alreadyAdded) toggleSelect(c.id);
                      }}
                      className={cn(
                        'transition-colors select-none',
                        alreadyAdded
                          ? 'bg-slate-50/60 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'bg-orange-50/60 hover:bg-orange-50/80 cursor-pointer'
                            : 'hover:bg-slate-50/80 cursor-pointer',
                      )}
                    >
                      <td
                        className="px-4 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || alreadyAdded}
                          disabled={alreadyAdded}
                          onChange={() => {
                            if (!alreadyAdded) toggleSelect(c.id);
                          }}
                          className="size-4 rounded border-border text-brand focus:ring-brand accent-[#ed6925] cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={13}
                            className="text-muted-foreground shrink-0"
                          />
                          <span className="font-semibold text-foreground">
                            {c.accountName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {c.vector?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} className="text-muted-foreground" />
                          {c.city ?? '—'}, {c.country || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground font-medium whitespace-nowrap">
                        {c.organizationSize ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {primaryContact}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {alreadyAdded ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Already Added
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center rounded-full bg-orange-100 text-brand px-2 py-0.5 text-[10px] font-semibold">
                            Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                            Available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">
            {selectedIds.size} customer(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-[12px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
              className="bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
            >
              Add Selected ({selectedIds.size}) Customers
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AudienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');
  const { data: audience, isLoading } = useMarketingAudience(id);
  const updateAudience = useUpdateAudience();
  const deleteAudience = useDeleteAudience();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const membersSeededFor = useRef<string | null>(null);

  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });

  const createdByLabel = useMemo(() => {
    if (!audience?.createdBy) return '—';
    const user = (platformUsersData?.data ?? []).find(
      (u) => u.id === audience.createdBy,
    );
    return user ? formatUserName(user, user.email || '—') : audience.createdBy;
  }, [audience?.createdBy, platformUsersData]);

  useEffect(() => {
    if (!audience) return;
    if (membersSeededFor.current !== audience.id) {
      membersSeededFor.current = audience.id;
      setMembers(audience.members ?? []);
    } else if (audience.members) {
      setMembers(audience.members);
    }
  }, [audience]);

  if (isLoading) {
    return <MarketingDetailSkeleton />;
  }

  if (!audience) {
    return (
      <div className="p-6 bg-white min-h-full">
        <EmptyHint>
          Audience not found.{' '}
          <Link href="/marketing/audiences" className="text-brand underline">
            Back to Audiences
          </Link>
        </EmptyHint>
      </div>
    );
  }

  function persistMembers(next: MemberRow[]) {
    if (!audience) return;
    setMembers(next);
    updateAudience.mutate({
      id: audience.id,
      body: {
        members: next.map((m) => ({
          customerId: m.id,
          kind: 'include',
        })),
      },
    });
  }

  function handleAddMultipleCustomers(selected: CustomerListItem[]) {
    const existingIds = new Set(members.map((m) => m.id));
    const newItems = selected
      .filter((c) => !existingIds.has(c.id))
      .map(customerToMemberRow);
    if (newItems.length === 0) {
      toast.error('Selected customers are already in this audience.');
      return;
    }
    persistMembers([...members, ...newItems]);
  }

  function removeMember(customerId: string) {
    persistMembers(members.filter((m) => m.id !== customerId));
  }

  const currentMemberNames = members.map((m) => m.accountName);
  const currentMemberIds = members.map((m) => m.id);
  const conditions = audience.conditions ?? [];

  return (
    <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6 bg-white min-h-full">
      <MarketingDetailHeader
        backHref="/marketing/audiences"
        backLabel="Audiences"
        title={audience.name}
        badges={
          <>
            <StatusBadge status={audience.isActive ? 'Active' : 'Draft'} />
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              <Users size={11} className="text-muted-foreground" />
              {audience.targetEntity}
            </span>
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[12px] font-medium"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={13} />
              Delete
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={13} />
              Edit audience
            </Button>
          </>
        }
      />

      <DashboardCard className="p-5 bg-white border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-3">
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-[15px] font-semibold text-foreground">
              Segment summary
            </h3>
            <p className="m-0 mt-1 text-[13px] text-muted-foreground leading-relaxed">
              {audience.description?.trim()
                ? audience.description
                : 'No description provided.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              Created by:{' '}
              <strong className="text-foreground">{createdByLabel}</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              Updated:{' '}
              <strong className="text-foreground">
                {formatMarketingDate(audience.updatedAt)}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Matched accounts
            </p>
            <p className="m-0 mt-1 text-[20px] font-bold tabular-nums text-foreground">
              {formatNumber(audience.matchedCustomers)}
            </p>
          </div>
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Matched contacts
            </p>
            <p className="m-0 mt-1 text-[20px] font-bold tabular-nums text-foreground">
              {formatNumber(audience.matchedContacts)}
            </p>
          </div>
        </div>

        <div>
          <p className="m-0 mb-2 text-[12px] font-medium text-foreground">
            Filter criteria
          </p>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c, i) => (
                <span
                  key={`${c.label}-${i}`}
                  className="inline-flex items-center rounded-md border border-border/70 bg-slate-50 px-2 py-1 text-[12px] font-medium text-muted-foreground"
                  title={c.label}
                >
                  {c.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-muted-foreground">
              No filters set — edit this audience to add CRM criteria.
            </p>
          )}
        </div>
      </DashboardCard>

      <DashboardCard className="overflow-hidden bg-white shadow-xs border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-[15px] font-semibold text-foreground">
              Matched Member Accounts
            </h3>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {members.length}
            </span>
          </div>

          <div>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover text-[12px] font-medium shadow-xs"
              onClick={() => setCustomerModalOpen(true)}
              disabled={updateAudience.isLoading}
            >
              <UserPlus size={14} />
              Add from Customers
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-left">
            <thead>
              <tr className="bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
                <th className="px-4 py-3 font-semibold sm:px-5">
                  Account Name
                </th>
                <th className="px-3 py-3 font-semibold">Vector / Industry</th>
                <th className="px-3 py-3 font-semibold">Location</th>
                <th className="px-3 py-3 font-semibold">Org Size</th>
                <th className="px-4 py-3 font-semibold">Primary Contact</th>
                <th className="px-4 py-3 font-semibold text-right sm:px-5">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="group transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3 font-semibold text-[13px] text-foreground sm:px-5">
                    <span className="flex items-center gap-2">
                      <Building2 size={13} className="text-muted-foreground" />
                      {m.accountName}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {m.vector}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-muted-foreground/80" />
                      {m.city}, {m.country}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] font-medium tabular-nums text-foreground">
                    {m.orgSize}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {m.primaryContact}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      disabled={updateAudience.isLoading}
                      onClick={() => removeMember(m.id)}
                      title="Remove from audience"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-[13px] text-muted-foreground"
                  >
                    No accounts added to this segment yet. Use &ldquo;Add from
                    Customers&rdquo; to add accounts from the directory.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <SelectCustomersModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        currentMemberIds={currentMemberIds}
        currentMemberNames={currentMemberNames}
        onAddCustomers={handleAddMultipleCustomers}
      />

      <CreateAudienceModal
        open={editOpen}
        onOpenChange={setEditOpen}
        audience={audience}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete audience?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{audience.name}” and its member links.
              Campaigns that referenced this segment will no longer include it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAudience.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAudience.isLoading}
              onClick={(e) => {
                e.preventDefault();
                deleteAudience.mutate(audience.id, {
                  onSuccess: () => {
                    setDeleteOpen(false);
                    router.push('/marketing/audiences');
                  },
                });
              }}
            >
              {deleteAudience.isLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
