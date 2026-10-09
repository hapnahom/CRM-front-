'use client';

import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  DollarSign,
  Handshake,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { Partner } from '../../types';
import {
  FILTER_TRIGGER_CLASS,
  Panel,
  PanelHeader,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
  formatMoney,
} from './shared';

type CommercialFilter =
  | 'all'
  | 'leads'
  | 'deals'
  | 'registrations'
  | 'customers';

interface CommercialRow {
  id: string;
  rowType: 'Lead' | 'Deal' | 'Deal Registration' | 'Customer';
  name: string;
  customer: string;
  solution: string;
  owner: string;
  value: number;
  stage: string;
  closeOrActivity: string;
  status: string;
}

export function PartnerCommercialTab({ partner }: { partner: Partner }) {
  const [filter, setFilter] = useState<CommercialFilter>('all');
  const [search, setSearch] = useState('');

  const deals = partner.deals ?? [];
  const hasCommercialData = deals.length > 0;

  const rows = useMemo<CommercialRow[]>(() => {
    const collected: CommercialRow[] = [];

    if (filter === 'all' || filter === 'deals' || filter === 'registrations') {
      deals
        .filter((deal) =>
          filter === 'registrations' ? deal.registrationId : true,
        )
        .forEach((deal) =>
          collected.push({
            id: deal.id,
            rowType: deal.registrationId ? 'Deal Registration' : 'Deal',
            name: deal.opportunityName,
            customer: deal.customerName,
            solution: deal.productOrSolution,
            owner: partner.accountManager,
            value: deal.dealValue,
            stage: deal.stage,
            closeOrActivity: deal.expectedCloseDate,
            status: deal.registrationId ?? deal.status,
          }),
        );
    }

    const query = search.trim().toLowerCase();
    if (!query) return collected;

    return collected.filter((row) =>
      [row.name, row.customer, row.solution, row.owner].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [filter, search, deals, partner.accountManager]);

  const registrationsCount = deals.filter((deal) => deal.registrationId).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileKpiCard
          label="Revenue delivered"
          value={formatMoney(partner.revenue)}
          hint="Trailing twelve months"
          icon={<DollarSign size={18} />}
        />
        <ProfileKpiCard
          label="Open pipeline"
          value={formatMoney(partner.pipelineValue)}
          hint="Active opportunities"
          icon={<TrendingUp size={18} />}
        />
        <ProfileKpiCard
          label="Deal registrations"
          value={String(registrationsCount)}
          hint={`${deals.length} total deals`}
          icon={<Handshake size={18} />}
        />
        <ProfileKpiCard
          label="Shared customers"
          value="0"
          hint="Accounts served jointly"
          icon={<Users size={18} />}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Commercial Activity"
          action={
            <>
              <div className="relative w-full min-w-[180px] sm:w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search opportunities..."
                  className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] dark:bg-surface-card"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as CommercialFilter)}
              >
                <SelectTrigger
                  className={cn(FILTER_TRIGGER_CLASS, 'w-[170px]')}
                >
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All commercial</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="registrations">
                    Deal registrations
                  </SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />

        {rows.length === 0 ? (
          <Empty className="m-4 border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase />
              </EmptyMedia>
              <EmptyTitle>No data yet</EmptyTitle>
              <EmptyDescription>
                {hasCommercialData
                  ? 'No commercial records match your search and filters.'
                  : 'Leads, deals, and customer records will appear here once added.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'min-w-[240px]')}>
                    Opportunity
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[140px]')}>
                    Record
                  </TableHead>
                  <TableHead
                    className={cn(TABLE_HEAD_CLASS, 'hidden lg:table-cell')}
                  >
                    Customer
                  </TableHead>
                  <TableHead
                    className={cn(TABLE_HEAD_CLASS, 'hidden xl:table-cell')}
                  >
                    Solution
                  </TableHead>
                  <TableHead
                    className={cn(TABLE_HEAD_CLASS, 'w-[120px] text-right')}
                  >
                    Value
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[130px]')}>
                    Stage
                  </TableHead>
                  <TableHead
                    className={cn(
                      TABLE_HEAD_CLASS,
                      'hidden w-[140px] sm:table-cell',
                    )}
                  >
                    Close / activity
                  </TableHead>
                  <TableHead
                    className={cn(TABLE_HEAD_CLASS, 'hidden xl:table-cell')}
                  >
                    Owner
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.rowType}-${row.id}`}>
                    <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
                      <p
                        className="truncate font-medium text-foreground"
                        title={row.name}
                      >
                        {row.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.status}
                      </p>
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      <Badge variant="outline">{row.rowType}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden max-w-0 truncate lg:table-cell',
                      )}
                    >
                      {row.customer}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden max-w-0 truncate text-muted-foreground xl:table-cell',
                      )}
                    >
                      {row.solution}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'text-right font-medium tabular-nums',
                      )}
                    >
                      {formatMoney(row.value)}
                    </TableCell>
                    <TableCell className={TABLE_CELL_CLASS}>
                      {row.stage}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden text-muted-foreground sm:table-cell',
                      )}
                    >
                      {row.closeOrActivity}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL_CLASS,
                        'hidden text-muted-foreground xl:table-cell',
                      )}
                    >
                      {row.owner}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {rows.length} record{rows.length === 1 ? '' : 's'}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(rows.reduce((sum, row) => sum + row.value, 0))}
          </span>
        </div>
      </Panel>
    </div>
  );
}
