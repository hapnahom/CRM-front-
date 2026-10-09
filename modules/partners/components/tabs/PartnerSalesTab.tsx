'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Handshake,
  Layers,
  MoreVertical,
  Package,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { DealRegistration } from '../../types';
import { PRMKpiCard } from '../common/PRMKpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableSkeleton } from '@/components/loading/skeleton-screens';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { usePartners } from '@/store/server/features/partners/queries';
import { useDealRegistrations } from '@/store/server/features/partners/dealRegistrations';
import {
  formatDealMoney,
  isApprovedRegistrationStatus,
  isPendingRegistrationStatus,
  opportunityHref,
} from '../../utils/deal-registrations';

const TABLE_HEAD_CLASS =
  'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground';
const TABLE_CELL_CLASS = 'px-4 py-3 text-sm text-foreground';

function selectedRowClass(selected: boolean) {
  return cn(
    'cursor-pointer transition-colors',
    selected
      ? 'border-l-2 border-l-brand bg-brand-muted/40 hover:bg-brand-muted/40'
      : 'border-l-2 border-l-transparent hover:bg-muted/40',
  );
}

interface OpportunityGroup {
  key: string;
  opportunityName: string;
  customerName: string;
  products: DealRegistration[];
  registrationNumber: string;
  registrationDate: string;
  expirationDate: string;
  totalValue: number;
  status: string;
  /** Primary partner label for the table column. */
  partnerLabel: string;
  href: string | null;
}

function groupKey(reg: DealRegistration) {
  return reg.crmDealId || `${reg.opportunityName}::${reg.customerName}`;
}

function buildGroups(regs: DealRegistration[]): OpportunityGroup[] {
  const map = new Map<string, DealRegistration[]>();
  for (const reg of regs) {
    const key = groupKey(reg);
    const list = map.get(key) ?? [];
    list.push(reg);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([key, products]) => {
    const first = products[0];
    const partners = [
      ...new Set(products.map((p) => p.partnerName).filter(Boolean)),
    ];
    return {
      key,
      opportunityName: first.opportunityName,
      customerName: first.customerName,
      products,
      registrationNumber: first.registrationNumber,
      registrationDate: products.map((p) => p.registrationDate).sort()[0] ?? '',
      expirationDate:
        products
          .map((p) => p.expectedCloseDate)
          .filter(Boolean)
          .sort()
          .at(-1) ?? '',
      totalValue: products.reduce((sum, p) => sum + p.estimatedDealValue, 0),
      status: first.status,
      partnerLabel:
        partners.length === 1
          ? partners[0]
          : partners.length > 1
            ? `${partners[0]} +${partners.length - 1}`
            : '—',
      href: opportunityHref(first),
    };
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Pending':
    case 'Under Review':
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800"
        >
          {status}
        </Badge>
      );
    case 'Approved':
    case 'Active':
    case 'Converted to Deal':
    case 'Qualified Lead':
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          {status}
        </Badge>
      );
    case 'Rejected':
    case 'Declined':
      return (
        <Badge
          variant="outline"
          className="border-rose-200 bg-rose-50 text-rose-700"
        >
          {status}
        </Badge>
      );
    case 'Expiring':
    case 'Expired':
      return (
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-50 text-orange-800"
        >
          {status}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {status}
        </Badge>
      );
  }
}

export function PartnerSalesTab() {
  // Load all partners (no pageSize) so migrated vendor lines can resolve by id/name.
  const partnersQuery = usePartners();
  const partners = partnersQuery.data?.partners ?? [];
  const { registrations, isLoading } = useDealRegistrations(partners);

  const groups = useMemo(() => buildGroups(registrations), [registrations]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const partnerNames = useMemo(() => {
    const list = registrations.map((r) => r.partnerName).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [registrations]);

  const statusOptions = useMemo(() => {
    const list = registrations.map((r) => r.status).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [registrations]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        g.opportunityName.toLowerCase().includes(q) ||
        g.customerName.toLowerCase().includes(q) ||
        g.registrationNumber.toLowerCase().includes(q) ||
        g.partnerLabel.toLowerCase().includes(q) ||
        g.products.some(
          (p) =>
            p.productOrSolution?.toLowerCase().includes(q) ||
            p.partnerName?.toLowerCase().includes(q),
        );

      const matchPartner =
        partnerFilter === 'all' ||
        g.products.some(
          (p) => p.partnerName?.toLowerCase() === partnerFilter.toLowerCase(),
        ) ||
        g.partnerLabel.toLowerCase() === partnerFilter.toLowerCase();

      const matchStatus =
        statusFilter === 'all' ||
        g.products.some(
          (p) => p.status.toLowerCase() === statusFilter.toLowerCase(),
        ) ||
        g.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchPartner && matchStatus;
    });
  }, [groups, searchTerm, partnerFilter, statusFilter]);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedKey('');
      return;
    }
    if (!filteredGroups.some((g) => g.key === selectedKey)) {
      setSelectedKey(filteredGroups[0].key);
    }
  }, [filteredGroups, selectedKey]);

  const selectedGroup =
    filteredGroups.find((g) => g.key === selectedKey) ??
    filteredGroups[0] ??
    null;

  const totalRegisteredPipeline = registrations.reduce(
    (acc, d) => acc + d.estimatedDealValue,
    0,
  );
  const pendingCount = registrations.filter((d) =>
    isPendingRegistrationStatus(d.status),
  ).length;
  const approvedCount = registrations.filter((d) =>
    isApprovedRegistrationStatus(d.status),
  ).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-surface-card p-[10.5px] sm:p-[17.5px]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PRMKpiCard
          title="Registered Pipeline"
          value={formatDealMoney(totalRegisteredPipeline)}
          subtitle={`${groups.length} opportunities`}
          icon={<Handshake size={14} />}
          iconBgColor="bg-brand-muted text-brand"
          accentColor="text-brand"
        />
        <PRMKpiCard
          title="Pending Review"
          value={pendingCount}
          subtitle="Awaiting approval"
          icon={<Clock size={14} />}
          iconBgColor="bg-amber-50 text-amber-600"
          accentColor="text-amber-600"
        />
        <PRMKpiCard
          title="Approved Deals"
          value={approvedCount}
          subtitle="Price protection active"
          icon={<CheckCircle2 size={14} />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          accentColor="text-emerald-600"
        />
        <PRMKpiCard
          title="Product Lines"
          value={registrations.length}
          subtitle="Registered solutions"
          icon={<Layers size={14} />}
          iconBgColor="bg-brand-muted text-brand"
          accentColor="text-brand"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-12">
        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-card lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="m-0 text-[12px] font-semibold text-foreground">
              Registered Opportunities ({filteredGroups.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[180px] sm:w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search deals..."
                  className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] dark:bg-surface-card"
                />
              </div>
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[140px]">
                  <SelectValue placeholder="All partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All partners</SelectItem>
                  {partnerNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading || partnersQuery.isLoading ? (
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <DataTableSkeleton rows={8} columns={8} />
            </div>
          ) : filteredGroups.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Handshake />
                </EmptyMedia>
                <EmptyTitle>No deal registrations</EmptyTitle>
                <EmptyDescription>
                  {searchTerm ||
                  partnerFilter !== 'all' ||
                  statusFilter !== 'all'
                    ? 'No deal registrations match your search or filter criteria.'
                    : 'Registrations added on leads and deals will appear here.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'min-w-[200px]')}
                    >
                      Opportunity
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[130px]')}>
                      Reg. No.
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[130px]')}>
                      Partner
                    </TableHead>
                    <TableHead
                      className={cn(
                        TABLE_HEAD_CLASS,
                        'hidden w-[110px] sm:table-cell',
                      )}
                    >
                      Reg. Date
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[110px]')}>
                      Exp. Date
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'w-[100px] text-right')}
                    >
                      Value
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[130px]')}>
                      Status
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-10')} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => {
                    const selected = selectedGroup?.key === group.key;
                    return (
                      <TableRow
                        key={group.key}
                        className={selectedRowClass(selected)}
                        data-state={selected ? 'selected' : undefined}
                        onClick={() => setSelectedKey(group.key)}
                      >
                        <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
                          <p
                            className="truncate font-medium text-foreground"
                            title={group.opportunityName}
                          >
                            {group.opportunityName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {group.customerName}
                          </p>
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'tabular-nums text-muted-foreground',
                          )}
                        >
                          <span
                            className="block truncate"
                            title={group.registrationNumber}
                          >
                            {group.registrationNumber}
                          </span>
                          {group.products.length > 1 ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              +{group.products.length - 1} more
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'max-w-0 truncate text-muted-foreground',
                          )}
                          title={group.products
                            .map((p) => p.partnerName)
                            .filter(Boolean)
                            .join(', ')}
                        >
                          {group.partnerLabel}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'hidden text-muted-foreground sm:table-cell',
                          )}
                        >
                          {group.registrationDate || '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'text-muted-foreground',
                          )}
                        >
                          {group.expirationDate || '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            TABLE_CELL_CLASS,
                            'text-right font-medium tabular-nums',
                          )}
                        >
                          {formatDealMoney(group.totalValue)}
                        </TableCell>
                        <TableCell className={TABLE_CELL_CLASS}>
                          {getStatusBadge(group.status)}
                        </TableCell>
                        <TableCell
                          className={cn(TABLE_CELL_CLASS, 'text-right')}
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
                                <MoreVertical size={13} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() => setSelectedKey(group.key)}
                              >
                                <Eye size={12} className="mr-2" />
                                View details
                              </DropdownMenuItem>
                              {group.href ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      group.href!,
                                      '_blank',
                                      'noopener',
                                    )
                                  }
                                >
                                  <ExternalLink size={12} className="mr-2" />
                                  Open opportunity
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div
          className={cn(
            'relative flex min-h-0 flex-col overflow-hidden rounded-lg border bg-surface-card lg:col-span-5',
            selectedGroup ? 'border-brand bg-brand-muted/20' : 'border-border',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-elevated/40 px-4 py-3">
            <div className="min-w-0">
              <h2 className="m-0 truncate text-[12px] font-semibold text-foreground">
                {selectedGroup?.opportunityName ?? 'Registration detail'}
              </h2>
              {selectedGroup ? (
                <p className="m-0 mt-0.5 truncate text-[11px] text-muted-foreground">
                  {selectedGroup.registrationNumber} ·{' '}
                  {selectedGroup.customerName || 'No customer'}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedGroup ? getStatusBadge(selectedGroup.status) : null}
              {selectedGroup?.href ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-[31.5px] shrink-0 border-border text-[12px]"
                >
                  <Link href={selectedGroup.href}>
                    <ExternalLink size={13} className="mr-1.5" />
                    Open
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {selectedGroup ? (
            <>
              <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Boxes size={12} />
                    {selectedGroup.customerName || 'No customer'}
                  </span>
                  <span>
                    Reg. {selectedGroup.registrationDate || '—'} · Exp.{' '}
                    {selectedGroup.expirationDate || '—'}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatDealMoney(selectedGroup.totalValue)}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <ul className="m-0 list-none divide-y divide-border p-0">
                  {selectedGroup.products.map((product) => {
                    const href = opportunityHref(product);
                    return (
                      <li key={product.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-medium text-foreground">
                              {product.productOrSolution}
                            </p>
                            <p className="m-0 mt-1 truncate text-xs text-muted-foreground">
                              {product.partnerName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-[11px] tabular-nums"
                              >
                                {product.registrationNumber}
                              </Badge>
                              {getStatusBadge(product.status)}
                            </div>
                            <p className="m-0 mt-2 text-xs text-muted-foreground">
                              Reg. {product.registrationDate || '—'} · Exp.{' '}
                              {product.expectedCloseDate || '—'}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <p className="m-0 text-sm font-medium tabular-nums text-foreground">
                              {formatDealMoney(product.estimatedDealValue)}
                            </p>
                            {href ? (
                              <Button
                                asChild
                                variant="outline"
                                className="h-[31.5px] border-border"
                              >
                                <Link href={href}>
                                  <ExternalLink size={13} className="mr-1.5" />
                                  Open
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {selectedGroup.products.length} line
                  {selectedGroup.products.length === 1 ? '' : 's'}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatDealMoney(selectedGroup.totalValue)}
                </span>
              </div>
            </>
          ) : (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>Select a registration</EmptyTitle>
                <EmptyDescription>
                  Choose an opportunity to see its registered products.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}
