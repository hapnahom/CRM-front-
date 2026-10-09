'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dealUiLabel } from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { CustomerAvatar } from '@/modules/customers/components/CustomerAvatar';
import { LogoUploadField } from '@/modules/customers/components/LogoUploadField';
import { CountrySelect } from '@/modules/customers/components/CountrySelect';
import { OrganizationSizeFields } from '@/modules/customers/components/OrganizationSizeFields';
import {
  DualCurrencyPair,
  presentMoney,
} from '@/modules/customers/components/DualCurrency';
import {
  formatRelativeDay,
  formatOwnerLabel,
  initialsFromName,
} from '@/modules/customers/lib/display';
import {
  checkCustomerName,
  useGetCustomerCountries,
  useGetCustomerOrganizationSizes,
  useGetCustomers,
  useGetCustomersDashboard,
  useGetJourneyStages,
} from '@/store/server/features/customers/queries';
import { useCreateCustomer } from '@/store/server/features/customers/mutations';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { ImportButton } from '@/modules/imports/ImportWizard';
import { CurrencySelector } from '@/modules/sales-pipeline/pipeline-filters';
import {
  ALL_CURRENCIES,
  isAllCurrencies,
  type PipelineCurrency,
} from '@/modules/sales-pipeline/pipeline-filter';
import { DataTableSkeleton } from '@/components/loading/skeleton-screens';
import { Skeleton } from '@/components/ui/skeleton';

const BASE_PATH = '/customers';
const PAGE_SIZE = 25;
const VECTOR_LEGEND_GRID =
  'grid grid-cols-[minmax(0,1fr)_7.25rem_2.25rem_2.75rem] items-center gap-x-3';

const TONE_COLORS: Record<string, string> = {
  blue: '#3B82F6',
  green: '#0BA259',
  orange: '#ED6925',
  red: '#E03137',
  purple: '#8C62FF',
};

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function DonutChart({
  segments,
  total,
}: {
  segments: { percent: number; color: string; name: string }[];
  total: number;
}) {
  const size = 196;
  const center = size / 2;
  const radius = 74;
  const stroke = 24;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--color-border-default, #E5E7EB)"
        strokeWidth={stroke}
      />
      {segments.map((segment) => {
        const length = (segment.percent / 100) * circumference;
        const circle = (
          <circle
            key={segment.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
        offset += length;
        return circle;
      })}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="fill-foreground text-[28px] font-semibold"
      >
        {total}
      </text>
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        className="fill-muted-foreground text-[12px]"
      >
        Total
      </text>
    </svg>
  );
}

const EMPTY_DRAFT = {
  name: '',
  vectorId: '',
  organizationSize: '',
  city: '',
  country: '',
  website: '',
  ownerUserId: '',
  logoUrl: '',
};

export function CustomersDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [vectorFilter, setVectorFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(EMPTY_DRAFT);
  const [currency, setCurrency] = useState<PipelineCurrency>(ALL_CURRENCIES);

  const overviewQuery = useGetCustomersDashboard(true, ALL_CURRENCIES);
  const moneyQuery = useGetCustomersDashboard(true, currency);
  const stagesQuery = useGetJourneyStages();
  const vectorsQuery = useGetVectors();
  const sizesQuery = useGetCustomerOrganizationSizes();
  const countriesQuery = useGetCustomerCountries();
  const usersQuery = useGetPlatformUsers({ page: 1, pageSize: 1000 });
  const createCustomer = useCreateCustomer();

  const tableQuery = useGetCustomers({
    page,
    pageSize: PAGE_SIZE,
    searchTerm: search.trim() || undefined,
    journeyStageId: stageFilter === 'all' ? undefined : stageFilter,
    vectorId: vectorFilter === 'all' ? undefined : vectorFilter,
    currency: isAllCurrencies(currency) ? undefined : currency,
  });

  const kpis = overviewQuery.data?.kpis;
  const vectorSlices = useMemo(
    () =>
      (moneyQuery.data?.vectors ?? []).filter(
        (item) =>
          item.count > 0 ||
          Object.values(item.openPipelineByCurrency ?? {}).some(
            (amount) => Number(amount) > 0,
          ),
      ),
    [moneyQuery.data?.vectors],
  );
  const vectorDonutTotal = isAllCurrencies(currency)
    ? (kpis?.totalCustomers ?? 0)
    : vectorSlices.reduce((sum, item) => sum + item.count, 0);
  const showVectorEmpty =
    !moneyQuery.isLoading &&
    !moneyQuery.isFetching &&
    !moneyQuery.isPreviousData &&
    vectorSlices.length === 0;
  const topPipeline = useMemo(() => {
    const rows = moneyQuery.data?.topPipeline ?? [];
    if (sectorFilter === 'all') return rows;
    if (sectorFilter === 'unassigned') {
      return rows.filter((row) => !row.vectorId);
    }
    return rows.filter((row) => row.vectorId === sectorFilter);
  }, [moneyQuery.data?.topPipeline, sectorFilter]);
  const stages = stagesQuery.data ?? [];
  const activeStages = useMemo(
    () =>
      [...stages]
        .filter((stage) => stage.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );
  const vectors = vectorsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const customers = tableQuery.data?.data ?? [];
  const pagination = tableQuery.data?.pagination;
  const defaultCountry = countriesQuery.data?.defaultCountry ?? 'Ethiopia';

  const ownerName = (
    ownerUserId?: string | null,
    owner?: (typeof customers)[number]['owner'],
  ) => formatOwnerLabel(ownerUserId, owner, users);

  const kpiCards: {
    label: string;
    value: string;
    changePercent: number | null;
    hint: string | null;
    tone: keyof typeof TONE_COLORS;
    icon: LucideIcon;
  }[] = [
    {
      label: 'Total Customers',
      value: kpis ? String(kpis.totalCustomers) : '—',
      changePercent: kpis?.totalCustomersChangePercent ?? null,
      hint: null,
      tone: 'blue',
      icon: Users,
    },
    {
      label: 'Active Customers',
      value: kpis ? String(kpis.activeCustomers) : '—',
      changePercent: kpis?.activeCustomersChangePercent ?? null,
      hint: 'With open or won opportunities',
      tone: 'green',
      icon: UserCheck,
    },
    {
      label: 'New Customers',
      value: kpis ? String(kpis.newCustomers) : '—',
      changePercent: kpis?.newCustomersChangePercent ?? null,
      hint: null,
      tone: 'orange',
      icon: UserPlus,
    },
    {
      label: 'At Risk & Churned',
      value: kpis ? String(kpis.atRiskAndChurned) : '—',
      changePercent: null,
      hint: kpis
        ? `${kpis.atRiskCount} at risk · ${kpis.churnedCount} churned`
        : '—',
      tone: 'red',
      icon: AlertTriangle,
    },
  ];

  const resetCreate = () => {
    setCreateDraft({ ...EMPTY_DRAFT, country: defaultCountry });
    setCreateOpen(false);
    setDuplicateOpen(false);
  };

  const submitCreate = () => {
    const accountName = createDraft.name.trim();
    if (!accountName) {
      toast.error('Account name is required.');
      return;
    }
    createCustomer.mutate(
      {
        accountName,
        vectorId: createDraft.vectorId || null,
        organizationSize: createDraft.organizationSize || undefined,
        city: createDraft.city.trim() || undefined,
        country: createDraft.country || defaultCountry,
        website: createDraft.website.trim() || undefined,
        ownerUserId: createDraft.ownerUserId || null,
        logoUrl: createDraft.logoUrl.trim() || null,
      },
      {
        onSuccess: (created) => {
          toast.success(`Customer “${created.accountName}” created.`);
          resetCreate();
          router.push(`${BASE_PATH}/${created.id}`);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Could not create customer.';
          toast.error(
            typeof message === 'string'
              ? message
              : 'Could not create customer.',
          );
        },
      },
    );
  };

  const handleCreateClick = async () => {
    const accountName = createDraft.name.trim();
    if (!accountName) {
      toast.error('Account name is required.');
      return;
    }
    try {
      const check = await checkCustomerName(accountName);
      if (check.exists) {
        setDuplicateOpen(true);
        return;
      }
    } catch {
      // If the check fails, still allow create — backend does not unique-constrain names.
    }
    submitCreate();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex-shrink-0 border-b border-border bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            Customers
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <AccessGuard permissions={[PERMISSIONS.CREATE_CONTACTS]}>
              <ImportButton
                kind="contact"
                label="Import contacts"
                className="h-9 border-border bg-white text-foreground hover:bg-surface-elevated"
              />
            </AccessGuard>
            <AccessGuard permissions={[PERMISSIONS.CREATE_CUSTOMERS]}>
              <div className="flex flex-wrap items-center gap-2">
                <ImportButton className="h-9 border-border bg-white text-foreground hover:bg-surface-elevated" />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
                  onClick={() => {
                    setCreateDraft({ ...EMPTY_DRAFT, country: defaultCountry });
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-1.5" />
                  New Customer
                </Button>
              </div>
            </AccessGuard>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-white">
        <div className="space-y-4 p-[10.5px] sm:p-[17.5px]">
          {overviewQuery.isError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Could not load dashboard KPIs.
            </p>
          ) : null}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((kpi) => {
              const tone = TONE_COLORS[kpi.tone];
              const Icon = kpi.icon;
              const change = kpi.changePercent;
              const hasTrend = typeof change === 'number';
              const down = hasTrend && change < 0;
              const up = hasTrend && change > 0;
              return (
                <div
                  key={kpi.label}
                  className="flex min-h-[132px] flex-col rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <p className="m-0 line-clamp-2 text-[12px] font-medium leading-4 text-muted-foreground">
                      {kpi.label}
                    </p>
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${tone}18`, color: tone }}
                    >
                      <Icon size={18} strokeWidth={2.25} />
                    </span>
                  </div>
                  <div className="mt-3">
                    {overviewQuery.isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-[26px] font-bold leading-none tabular-nums tracking-tight text-foreground">
                        {kpi.value}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'mt-auto flex items-center gap-1 pt-3 text-[12px] font-medium',
                      down
                        ? 'text-error'
                        : up
                          ? 'text-success'
                          : 'text-muted-foreground',
                    )}
                  >
                    {down ? (
                      <TrendingDown size={13} />
                    ) : up ? (
                      <TrendingUp size={13} />
                    ) : null}
                    {hasTrend
                      ? `${up ? '+' : ''}${change}% vs last 30 days`
                      : kpi.hint}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            <Panel className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Customers by Vector
                </h2>
                <CurrencySelector
                  value={currency}
                  onChange={(next) => {
                    setCurrency(next);
                    setPage(1);
                  }}
                  className="h-[31.5px] min-w-[148px] sm:w-auto"
                />
              </div>
              {showVectorEmpty ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isAllCurrencies(currency)
                    ? 'No vector data yet.'
                    : `No vector pipeline in ${currency.toUpperCase()}.`}
                </p>
              ) : vectorSlices.length === 0 ? (
                <div className="flex flex-col items-center gap-6 overflow-hidden py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <Skeleton className="size-[160px] shrink-0 rounded-full" />
                  <div className="w-full min-w-0 flex-1 space-y-3">
                    {Array.from({ length: 4 }).map((unused, index) => (
                      <Skeleton key={index} className="h-8 w-full rounded-md" />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
                    moneyQuery.isFetching &&
                      moneyQuery.isPreviousData &&
                      'opacity-70',
                  )}
                >
                  <div className="shrink-0 px-2">
                    <DonutChart
                      segments={vectorSlices}
                      total={vectorDonutTotal}
                    />
                  </div>
                  <div className="w-full min-w-0 flex-1">
                    <div
                      className={`${VECTOR_LEGEND_GRID} border-b border-border/60 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground`}
                    >
                      <span>Vector</span>
                      <span>Pipeline</span>
                      <span className="justify-self-end">#</span>
                      <span className="justify-self-end">%</span>
                    </div>
                    <ul className="m-0 list-none p-0">
                      {vectorSlices.map((item) => (
                        <li
                          key={item.id}
                          className={`${VECTOR_LEGEND_GRID} border-b border-border/60 py-2.5 text-[13px] last:border-b-0`}
                        >
                          <span className="flex min-w-0 items-center gap-2 text-foreground">
                            <span
                              className="inline-block size-2 shrink-0 rounded-full"
                              style={{ background: item.color }}
                            />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <DualCurrencyPair
                            money={presentMoney(
                              item.openPipelineByCurrency,
                              currency,
                            )}
                            fit="fill"
                          />
                          <strong className="justify-self-end tabular-nums text-foreground">
                            {item.count}
                          </strong>
                          <span className="justify-self-end tabular-nums text-muted-foreground">
                            {item.percent}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Panel>

            <Panel className="flex max-h-[28rem] flex-col overflow-hidden xl:max-h-[32rem]">
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Customer by Open Pipeline
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ranked by open pipeline value
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger className="h-8 w-[160px] border-border text-xs">
                      <SelectValue placeholder="All sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sectors</SelectItem>
                      {vectors.map((vector) => (
                        <SelectItem key={vector.id} value={vector.id}>
                          {vector.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="rounded-md bg-brand-muted px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {topPipeline.length}
                  </span>
                </div>
              </div>
              {topPipeline.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {isAllCurrencies(currency)
                    ? 'No open pipeline yet.'
                    : `No open pipeline in ${currency.toUpperCase()}.`}
                </p>
              ) : (
                <ul
                  className={cn(
                    'm-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-0',
                    'scrollbar-hide',
                  )}
                >
                  {topPipeline.map((customer, index) => (
                    <li
                      key={customer.id}
                      className="border-b border-border/60 last:border-b-0"
                    >
                      <Link
                        href={`${BASE_PATH}/${customer.id}`}
                        className="grid grid-cols-[1rem_2rem_minmax(0,1fr)_7.25rem] items-center gap-x-3 py-3 pl-4 hover:bg-surface-elevated/60 sm:pl-5"
                      >
                        <span className="w-4 shrink-0 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <CustomerAvatar
                          name={customer.accountName}
                          initials={initialsFromName(customer.accountName)}
                          logoUrl={customer.logoUrl}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm font-medium text-foreground">
                            {customer.accountName}
                          </strong>
                          <small className="text-xs text-muted-foreground">
                            {customer.vectorName ?? 'Unassigned'}
                            {customer.openDealsCount
                              ? ` · ${customer.openDealsCount} open ${dealUiLabel(
                                  {
                                    plural: customer.openDealsCount !== 1,
                                    lowercase: true,
                                  },
                                )}`
                              : ''}
                          </small>
                        </span>
                        <DualCurrencyPair
                          money={presentMoney(
                            customer.openPipelineByCurrency,
                            currency,
                          )}
                          fit="fill"
                          className="w-full min-w-0"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Customers
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full min-w-[180px] sm:w-[220px]">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search customers..."
                    className="h-[31.5px] border-border bg-white pl-9 text-[12.25px]"
                  />
                </div>
                <Select
                  value={stageFilter}
                  onValueChange={(value) => {
                    setStageFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[160px]">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {activeStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={vectorFilter}
                  onValueChange={(value) => {
                    setVectorFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-[31.5px] w-full border-border sm:w-[180px]">
                    <SelectValue placeholder="All vectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vectors</SelectItem>
                    {vectors.map((vector) => (
                      <SelectItem key={vector.id} value={vector.id}>
                        {vector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-auto">
              {tableQuery.isError ? (
                <p className="px-5 py-10 text-center text-sm text-destructive">
                  Could not load customers.
                </p>
              ) : tableQuery.isLoading ? (
                <div className="overflow-hidden p-0">
                  <DataTableSkeleton
                    rows={8}
                    columns={7}
                    className="rounded-none border-0"
                  />
                </div>
              ) : customers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No customers match these filters.
                </p>
              ) : (
                <Table className="table-fixed min-w-[72rem]">
                  <TableHeader>
                    <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                      <TableHead className="w-[22%] pl-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Customer
                      </TableHead>
                      <TableHead className="w-[12%] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Stage
                      </TableHead>
                      <TableHead className="w-[14%] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Vector
                      </TableHead>
                      <TableHead className="w-[14%] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Owner
                      </TableHead>
                      <TableHead className="w-[16%] min-w-[8.5rem] pl-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Open Pipeline
                      </TableHead>
                      <TableHead className="w-[12%] min-w-[7.5rem] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Last Activity
                      </TableHead>
                      <TableHead className="w-[10%] pr-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Days in Stage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => {
                      const color = customer.journeyStage?.color ?? '#64748B';
                      return (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`${BASE_PATH}/${customer.id}`)
                          }
                        >
                          <TableCell className="pl-8">
                            <Link
                              href={`${BASE_PATH}/${customer.id}`}
                              className="flex items-center gap-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CustomerAvatar
                                name={customer.accountName}
                                initials={initialsFromName(
                                  customer.accountName,
                                )}
                                logoUrl={customer.logoUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {customer.accountName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {[customer.city, customer.country]
                                    .filter(Boolean)
                                    .join(', ') || '—'}
                                </p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="pl-5">
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                              style={{
                                color,
                                background: `${color}18`,
                              }}
                            >
                              {customer.journeyStage?.name ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="pl-5">
                            {customer.vector?.name ? (
                              <Badge
                                variant="outline"
                                className="rounded-md border-brand/20 bg-brand-muted/40 font-medium text-brand"
                              >
                                {customer.vector.name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="pl-5 text-sm text-foreground">
                            {ownerName(customer.ownerUserId, customer.owner)}
                          </TableCell>
                          <TableCell className="min-w-[8.5rem] whitespace-normal pl-9 align-middle">
                            <DualCurrencyPair
                              money={presentMoney(
                                customer.openPipelineByCurrency,
                                currency,
                              )}
                            />
                          </TableCell>
                          <TableCell className="min-w-[7.5rem] pl-5 text-sm text-foreground">
                            {formatRelativeDay(customer.lastActivityAt)}
                          </TableCell>
                          <TableCell className="pl-5 pr-5 text-sm tabular-nums text-foreground">
                            {customer.daysInStage}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            {pagination && pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
                <span>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>
              Create an account in the customers catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-auto py-1">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input
                value={createDraft.name}
                onChange={(e) =>
                  setCreateDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-9 border-border"
                placeholder="e.g. Awash Bank"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vector</Label>
              <Select
                value={createDraft.vectorId || undefined}
                onValueChange={(value) =>
                  setCreateDraft((prev) => ({ ...prev, vectorId: value }))
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
              value={createDraft.organizationSize}
              onChange={(organizationSize) =>
                setCreateDraft((prev) => ({ ...prev, organizationSize }))
              }
              options={sizesQuery.data?.organizationSizes ?? []}
            />
            <div className="space-y-1.5">
              <Label>City / location</Label>
              <Input
                value={createDraft.city}
                onChange={(e) =>
                  setCreateDraft((prev) => ({ ...prev, city: e.target.value }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <CountrySelect
                value={createDraft.country}
                onChange={(country) =>
                  setCreateDraft((prev) => ({ ...prev, country }))
                }
                countries={countriesQuery.data?.countries}
                fallback={defaultCountry}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={createDraft.website}
                onChange={(e) =>
                  setCreateDraft((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                className="h-9 border-border"
                placeholder="https://"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select
                value={createDraft.ownerUserId || undefined}
                onValueChange={(value) =>
                  setCreateDraft((prev) => ({ ...prev, ownerUserId: value }))
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
              value={createDraft.logoUrl}
              onChange={(logoUrl) =>
                setCreateDraft((prev) => ({ ...prev, logoUrl }))
              }
              accountName={createDraft.name}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={resetCreate}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={createCustomer.isLoading}
              onClick={() => void handleCreateClick()}
            >
              {createCustomer.isLoading ? 'Creating…' : 'Create customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate name</DialogTitle>
            <DialogDescription>
              A customer with this name already exists — create anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDuplicateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={createCustomer.isLoading}
              onClick={submitCreate}
            >
              Create anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
