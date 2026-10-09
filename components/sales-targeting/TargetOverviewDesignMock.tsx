'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Target,
  FileText,
  BarChart3,
  Clock,
  Info,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Send,
  CheckCircle2,
  Building2,
  Layers,
  LineChart,
  Search,
  X,
  Check,
  AlertCircle,
  Filter,
  UserRound,
  History,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { TARGETS_CARD_CLASS } from '@/components/sales-targeting/ui-kit';
import { cn } from '@/lib/utils';
import { PlanningWorkbenchHeader } from '@/components/sales-targeting/planning/PlanningWorkbenchHeader';
import { PlanningOrgExplorer } from '@/components/sales-targeting/planning/PlanningOrgExplorer';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TeamRow {
  name: string;
  proposedTarget: number | null;
  approvedTarget: number | null;
  status: 'Approved' | 'Awaiting Review' | 'Submitted' | 'Not Submitted';
}

interface DepartmentRow {
  id: string;
  name: string;
  teamsCount: number;
  teamsSubmitted: string;
  progressPercent: number;
  proposedTarget: number | null;
  status: 'In Progress' | 'Not Started' | 'Approved';
  teams?: TeamRow[];
}

const BASE_DEPARTMENTS_DATA: DepartmentRow[] = [
  {
    id: 'sales',
    name: 'Sales',
    teamsCount: 4,
    teamsSubmitted: '3/4',
    progressPercent: 75,
    proposedTarget: 1980000,
    status: 'In Progress',
    teams: [
      {
        name: 'Sales Team A',
        proposedTarget: 850000,
        approvedTarget: 700000,
        status: 'Approved',
      },
      {
        name: 'Sales Team B',
        proposedTarget: 700000,
        approvedTarget: null,
        status: 'Awaiting Review',
      },
      {
        name: 'Sales Team C',
        proposedTarget: 430000,
        approvedTarget: null,
        status: 'Submitted',
      },
      {
        name: 'Sales Team D',
        proposedTarget: null,
        approvedTarget: null,
        status: 'Not Submitted',
      },
    ],
  },
  {
    id: 'pre-sales',
    name: 'Pre-Sales',
    teamsCount: 4,
    teamsSubmitted: '1/4',
    progressPercent: 25,
    proposedTarget: 80000,
    status: 'In Progress',
    teams: [
      {
        name: 'Pre-Sales Team 1',
        proposedTarget: 80000,
        approvedTarget: null,
        status: 'Submitted',
      },
      {
        name: 'Pre-Sales Team 2',
        proposedTarget: null,
        approvedTarget: null,
        status: 'Not Submitted',
      },
    ],
  },
  {
    id: 'customer-success',
    name: 'Customer Success',
    teamsCount: 1,
    teamsSubmitted: '0/1',
    progressPercent: 0,
    proposedTarget: null,
    status: 'Not Started',
    teams: [
      {
        name: 'CS Core Team',
        proposedTarget: null,
        approvedTarget: null,
        status: 'Not Submitted',
      },
    ],
  },
  {
    id: 'dept-a',
    name: 'dept A',
    teamsCount: 4,
    teamsSubmitted: '1/4',
    progressPercent: 25,
    proposedTarget: 52870,
    status: 'In Progress',
    teams: [
      {
        name: 'Sales Team A',
        proposedTarget: 850000,
        approvedTarget: 700000,
        status: 'Approved',
      },
      {
        name: 'Sales Team B',
        proposedTarget: 700000,
        approvedTarget: null,
        status: 'Awaiting Review',
      },
      {
        name: 'Sales Team C',
        proposedTarget: 430000,
        approvedTarget: null,
        status: 'Submitted',
      },
      {
        name: 'Sales Team D',
        proposedTarget: null,
        approvedTarget: null,
        status: 'Not Submitted',
      },
    ],
  },
];

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) return '—';
  if (amount >= 1000000) {
    const val = (amount / 1000000).toFixed(2);
    return `${currency} ${val}M`;
  }
  if (amount >= 1000) {
    const val = amount % 1000 === 0 ? (amount / 1000).toFixed(0) : (amount / 1000).toFixed(2);
    return `${currency} ${val}K`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

const MOCK_HIERARCHY_ROOT: TargetPlanningHierarchyNode = {
  scopeLevel: 'company',
  scopeId: 'company-selamnew',
  scopeName: 'SelamNew Corp',
  parentScopeId: null,
  currencyId: 'curr-etb',
  horizon: 'annual',
  sessionId: null,
  strategicTarget: 30000000,
  officialTarget: 30000000,
  proposedTarget: 28500000,
  originalProposal: 28500000,
  reviewedTarget: 28500000,
  currentForecast: 21000000,
  forecastAtProposal: 21000000,
  actualWon: 8500000,
  gap: 1500000,
  coverage: 0.74,
  requestId: null,
  requestStatus: 'COMPANY_APPROVED',
  eligibleActions: ['SUBMIT', 'RECONCILE'],
  children: [
    {
      scopeLevel: 'department',
      scopeId: 'dept-commercial',
      parentScopeId: 'company-selamnew',
      scopeName: 'Commercial',
      currencyId: 'curr-etb',
      horizon: 'annual',
      sessionId: null,
      strategicTarget: 18000000,
      officialTarget: 18000000,
      proposedTarget: 17500000,
      originalProposal: 17500000,
      reviewedTarget: 17500000,
      currentForecast: 14500000,
      forecastAtProposal: 14500000,
      actualWon: 5200000,
      gap: 500000,
      coverage: 0.83,
      requestId: 'req-dept-commercial',
      requestStatus: 'DEPARTMENT_APPROVED',
      eligibleActions: ['SUBMIT'],
      children: [
        {
          scopeLevel: 'team',
          scopeId: 'team-enterprise',
          parentScopeId: 'dept-commercial',
          scopeName: 'Enterprise Sales',
          currencyId: 'curr-etb',
          horizon: 'annual',
          sessionId: null,
          strategicTarget: 10000000,
          officialTarget: 10000000,
          proposedTarget: 10500000,
          originalProposal: 10500000,
          reviewedTarget: 10500000,
          currentForecast: 8200000,
          forecastAtProposal: 8200000,
          actualWon: 3100000,
          gap: null,
          coverage: 0.78,
          requestId: 'req-team-enterprise',
          requestStatus: 'TEAM_APPROVED',
          eligibleActions: [],
          children: [],
        },
        {
          scopeLevel: 'team',
          scopeId: 'team-midmarket',
          parentScopeId: 'dept-commercial',
          scopeName: 'Mid-Market Sales',
          currencyId: 'curr-etb',
          horizon: 'annual',
          sessionId: null,
          strategicTarget: 8000000,
          officialTarget: 8000000,
          proposedTarget: 7000000,
          originalProposal: 7000000,
          reviewedTarget: null,
          currentForecast: 6300000,
          forecastAtProposal: 6300000,
          actualWon: 2100000,
          gap: 1000000,
          coverage: 0.9,
          requestId: 'req-team-midmarket',
          requestStatus: 'PENDING_DEPARTMENT',
          eligibleActions: ['APPROVE', 'REJECT'],
          children: [],
        },
      ],
    },
    {
      scopeLevel: 'department',
      scopeId: 'dept-presales',
      parentScopeId: 'company-selamnew',
      scopeName: 'Pre-Sales',
      currencyId: 'curr-etb',
      horizon: 'annual',
      sessionId: null,
      strategicTarget: 6000000,
      officialTarget: 6000000,
      proposedTarget: 5800000,
      originalProposal: 5800000,
      reviewedTarget: null,
      currentForecast: 4200000,
      forecastAtProposal: 4200000,
      actualWon: 1800000,
      gap: 200000,
      coverage: 0.72,
      requestId: 'req-dept-presales',
      requestStatus: 'PENDING_COMPANY',
      eligibleActions: ['APPROVE', 'REJECT'],
      children: [
        {
          scopeLevel: 'team',
          scopeId: 'team-solutions',
          parentScopeId: 'dept-presales',
          scopeName: 'Solutions Consulting',
          currencyId: 'curr-etb',
          horizon: 'annual',
          sessionId: null,
          strategicTarget: 3500000,
          officialTarget: 3500000,
          proposedTarget: 3400000,
          originalProposal: 3400000,
          reviewedTarget: 3400000,
          currentForecast: 2500000,
          forecastAtProposal: 2500000,
          actualWon: 1100000,
          gap: 100000,
          coverage: 0.74,
          requestId: 'req-team-solutions',
          requestStatus: 'TEAM_APPROVED',
          eligibleActions: [],
          children: [],
        },
        {
          scopeLevel: 'team',
          scopeId: 'team-demo',
          parentScopeId: 'dept-presales',
          scopeName: 'Demo Engineering',
          currencyId: 'curr-etb',
          horizon: 'annual',
          sessionId: null,
          strategicTarget: 2500000,
          officialTarget: 2500000,
          proposedTarget: 2400000,
          originalProposal: 2400000,
          reviewedTarget: null,
          currentForecast: 1700000,
          forecastAtProposal: 1700000,
          actualWon: 700000,
          gap: 100000,
          coverage: 0.71,
          requestId: 'req-team-demo',
          requestStatus: 'DRAFT',
          eligibleActions: [],
          children: [],
        },
      ],
    },
    {
      scopeLevel: 'department',
      scopeId: 'dept-cs',
      parentScopeId: 'company-selamnew',
      scopeName: 'Customer Success',
      currencyId: 'curr-etb',
      horizon: 'annual',
      sessionId: null,
      strategicTarget: 6000000,
      officialTarget: 6000000,
      proposedTarget: 5200000,
      originalProposal: 5200000,
      reviewedTarget: null,
      currentForecast: 2300000,
      forecastAtProposal: 2300000,
      actualWon: 1500000,
      gap: 800000,
      coverage: 0.44,
      requestId: null,
      requestStatus: 'DRAFT',
      eligibleActions: [],
      children: [
        {
          scopeLevel: 'team',
          scopeId: 'team-csm',
          parentScopeId: 'dept-cs',
          scopeName: 'CS Management',
          currencyId: 'curr-etb',
          horizon: 'annual',
          sessionId: null,
          strategicTarget: 4000000,
          officialTarget: 4000000,
          proposedTarget: 3500000,
          originalProposal: 3500000,
          reviewedTarget: null,
          currentForecast: 1500000,
          forecastAtProposal: 1500000,
          actualWon: 1000000,
          gap: 500000,
          coverage: 0.43,
          requestId: null,
          requestStatus: 'DRAFT',
          eligibleActions: [],
          children: [],
        },
      ],
    },
  ],
};

interface ProposalRecord {
  id: string;
  scopeName: string;
  scopeType: 'Department' | 'Team';
  department: string;
  submitter: string;
  submitterRole: string;
  proposedAmount: number;
  baselineAmount: number;
  status: 'PENDING_REVIEW' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  statusLabel: string;
  submittedDate: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  notes: string;
}

const INITIAL_PROPOSALS: ProposalRecord[] = [
  {
    id: 'p-1',
    scopeName: 'Sales Team B',
    scopeType: 'Team',
    department: 'Commercial',
    submitter: 'Abebe Kebede',
    submitterRole: 'Sales Team Lead',
    proposedAmount: 700000,
    baselineAmount: 600000,
    status: 'PENDING_REVIEW',
    statusLabel: 'Awaiting Review',
    submittedDate: 'Oct 07, 2026',
    q1: 175000,
    q2: 175000,
    q3: 175000,
    q4: 175000,
    notes: 'Target based on 5 enterprise pipeline deals in qualification.',
  },
  {
    id: 'p-2',
    scopeName: 'Sales Team C',
    scopeType: 'Team',
    department: 'Commercial',
    submitter: 'Sara Tadesse',
    submitterRole: 'Account Executive Lead',
    proposedAmount: 430000,
    baselineAmount: 400000,
    status: 'SUBMITTED',
    statusLabel: 'Submitted',
    submittedDate: 'Oct 06, 2026',
    q1: 100000,
    q2: 110000,
    q3: 110000,
    q4: 110000,
    notes: 'Expanded team territory into regional commercial sectors.',
  },
  {
    id: 'p-3',
    scopeName: 'Pre-Sales Team 1',
    scopeType: 'Team',
    department: 'Pre-Sales',
    submitter: 'Dawit Haile',
    submitterRole: 'Solutions Lead',
    proposedAmount: 80000,
    baselineAmount: 75000,
    status: 'SUBMITTED',
    statusLabel: 'Submitted',
    submittedDate: 'Oct 05, 2026',
    q1: 20000,
    q2: 20000,
    q3: 20000,
    q4: 20000,
    notes: 'Support target aligned with technical qualification rate.',
  },
  {
    id: 'p-4',
    scopeName: 'Sales Team A',
    scopeType: 'Team',
    department: 'Commercial',
    submitter: 'Tigist Alemu',
    submitterRole: 'Enterprise Director',
    proposedAmount: 850000,
    baselineAmount: 700000,
    status: 'APPROVED',
    statusLabel: 'Approved',
    submittedDate: 'Oct 04, 2026',
    q1: 200000,
    q2: 210000,
    q3: 220000,
    q4: 220000,
    notes: 'Approved by Commercial Department head on Oct 08.',
  },
];

interface AuditHistoryRecord {
  id: string;
  scopeName: string;
  department: string;
  action: 'APPROVED' | 'SUBMITTED' | 'REJECTED';
  actionLabel: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  amount: number;
  note: string;
}

const MOCK_AUDIT_HISTORY: AuditHistoryRecord[] = [
  {
    id: 'aud-1',
    scopeName: 'Sales Team A',
    department: 'Commercial',
    action: 'APPROVED',
    actionLabel: 'Proposal Approved',
    actor: 'Commercial Dept Head',
    actorRole: 'Reviewer',
    timestamp: 'Oct 08, 2026 · 14:22',
    amount: 850000,
    note: 'Approved target proposal for FY 2026/27. Reconciled with annual strategy.',
  },
  {
    id: 'aud-2',
    scopeName: 'Sales Team B',
    department: 'Commercial',
    action: 'SUBMITTED',
    actionLabel: 'Proposal Submitted',
    actor: 'Abebe Kebede',
    actorRole: 'Sales Team Lead',
    timestamp: 'Oct 07, 2026 · 11:05',
    amount: 700000,
    note: 'Submitted bottom-up target proposal based on 5 enterprise pipeline deals.',
  },
  {
    id: 'aud-3',
    scopeName: 'Sales Team C',
    department: 'Commercial',
    action: 'SUBMITTED',
    actionLabel: 'Proposal Submitted',
    actor: 'Sara Tadesse',
    actorRole: 'Account Executive Lead',
    timestamp: 'Oct 06, 2026 · 09:30',
    amount: 430000,
    note: 'Expanded team territory into regional commercial sectors.',
  },
  {
    id: 'aud-4',
    scopeName: 'Your Proposal',
    department: 'Commercial',
    action: 'SUBMITTED',
    actionLabel: 'Proposal Submitted',
    actor: 'You',
    actorRole: 'Commercial Sales Lead',
    timestamp: 'Oct 06, 2026 · 08:15',
    amount: 500000,
    note: 'Commercial sales proposal submitted (Annual: ETB 500,000 · Q1–Q4: 125K each).',
  },
  {
    id: 'aud-5',
    scopeName: 'Pre-Sales Team 1',
    department: 'Pre-Sales',
    action: 'SUBMITTED',
    actionLabel: 'Proposal Submitted',
    actor: 'Dawit Haile',
    actorRole: 'Solutions Lead',
    timestamp: 'Oct 05, 2026 · 15:10',
    amount: 80000,
    note: 'Support target aligned with technical qualification rate.',
  },
];

type ProposalTabId = 'all' | 'history';

export function TargetOverviewDesignMock() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven planView: 'org' | 'requests' | undefined
  const urlPlanView = searchParams?.get('planView');
  const [internalView, setInternalView] = useState<'overview' | 'org' | 'requests'>('overview');

  const activeView: 'overview' | 'org' | 'requests' =
    urlPlanView === 'org'
      ? 'org'
      : urlPlanView === 'requests'
        ? 'requests'
        : internalView;

  const handleNavigateView = (view: 'overview' | 'org' | 'requests') => {
    setInternalView(view);
    if (view === 'requests') {
      setActiveProposalTab('all');
      setProposalStatusFilter('ALL');
      setProposalSearch('');
    }
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', 'overview');
    if (view === 'overview') {
      params.delete('planView');
    } else {
      params.set('planView', view);
    }
    router.push(`?${params.toString()}`);
  };

  React.useEffect(() => {
    if (urlPlanView === 'requests') {
      setActiveProposalTab('all');
    }
  }, [urlPlanView]);

  // Pre-selected default period and currency
  const [viewBy, setViewBy] = useState<'Annual' | 'Period'>('Period');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('FY 2026/27');
  const [selectedCurrency, setSelectedCurrency] = useState('ETB');
  const [planningMethod, setPlanningMethod] = useState('Bottom to Top');
  const [periodFilter, setPeriodFilter] = useState<'Annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('Annual');

  // dept-a is expanded by default matching the screenshot
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>('dept-a');

  const toggleDept = (id: string) => {
    setExpandedDeptId((prev) => (prev === id ? null : id));
  };

  // Multiplier depending on periodFilter (Annual = 1, Q1..Q4 = 0.25)
  const periodMultiplier = periodFilter === 'Annual' ? 1 : 0.25;
  const officialTargetValue = 2800000 * periodMultiplier;
  const proposedTargetValue = 2110000 * periodMultiplier;

  // ── Proposals State (Clean view without tabs) ──
  const [proposals, setProposals] = useState<ProposalRecord[]>(INITIAL_PROPOSALS);
  const [activeProposalTab, setActiveProposalTab] = useState<'all' | 'history'>('all');
  const [proposalPeriodFilter, setProposalPeriodFilter] = useState<'Annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('Annual');
  const [proposalStatusFilter, setProposalStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'APPROVED'>('ALL');
  const [proposalSearch, setProposalSearch] = useState('');
  const [selectedProposalForModal, setSelectedProposalForModal] = useState<ProposalRecord | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const proposalMultiplier = proposalPeriodFilter === 'Annual' ? 1 : 0.25;
  const myProposalValue = proposalPeriodFilter === 'Annual' ? 500000 : 125000;
  const totalTeamProposedValue = 2060000 * proposalMultiplier;

  const pendingCount = proposals.filter((p) => p.status === 'PENDING_REVIEW').length;
  const submittedCount = proposals.filter((p) => p.status === 'SUBMITTED').length;
  const approvedCount = proposals.filter((p) => p.status === 'APPROVED').length;

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (proposalStatusFilter === 'PENDING' && p.status !== 'PENDING_REVIEW') return false;
      if (proposalStatusFilter === 'SUBMITTED' && p.status !== 'SUBMITTED') return false;
      if (proposalStatusFilter === 'APPROVED' && p.status !== 'APPROVED') return false;
      if (proposalSearch.trim()) {
        const q = proposalSearch.toLowerCase();
        return (
          p.scopeName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.submitter.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [proposals, proposalStatusFilter, proposalSearch]);

  const handleConfirmReview = () => {
    if (!selectedProposalForModal || !modalMode) return;
    const newStatus = modalMode === 'approve' ? 'APPROVED' : 'REJECTED';
    const newStatusLabel = modalMode === 'approve' ? 'Approved' : 'Rejected';

    setProposals((prev) =>
      prev.map((item) =>
        item.id === selectedProposalForModal.id
          ? { ...item, status: newStatus, statusLabel: newStatusLabel }
          : item,
      ),
    );

    setToastMessage(
      `Proposal for ${selectedProposalForModal.scopeName} has been ${modalMode === 'approve' ? 'approved' : 'rejected'}.`,
    );
    setTimeout(() => setToastMessage(null), 4000);

    setSelectedProposalForModal(null);
    setModalMode(null);
    setReviewNote('');
  };

  // ── SUBVIEW: Organization Hierarchy View ──
  if (activeView === 'org') {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <PlanningWorkbenchHeader
          options={[{ id: 'org', label: 'Organization hierarchy' }]}
          activeView="org"
          onBack={() => handleNavigateView('overview')}
          onChangeView={() => {}}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 bg-white">
          <PlanningOrgExplorer
            root={MOCK_HIERARCHY_ROOT}
            currencyCode={selectedCurrency}
            method="REQUEST_WORKFLOW"
            showProposalsAction={true}
            onOpenProposals={() => handleNavigateView('requests')}
          />
        </div>
      </div>
    );
  }

  // ── SUBVIEW: Proposal View (Clean KPI Cards with Period Dropdown + Direct Table, No Tabs) ──
  if (activeView === 'requests') {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <PlanningWorkbenchHeader
          options={[{ id: 'requests', label: 'Target proposals' }]}
          activeView="requests"
          onBack={() => handleNavigateView('overview')}
          onChangeView={() => {}}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-4 sm:p-6 space-y-6">
          {/* Notification Toast */}
          {toastMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-xs animate-in fade-in duration-200">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ── Subview Top Controls Bar (Fiscal Year Badge, Description & Filters) ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
                <span className="size-1.5 rounded-full bg-brand" />
                {selectedFiscalYear}
              </span>
              <span className="text-xs text-muted-foreground">
                Review, compare, and approve team commercial targets
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Period Dropdown Filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium">Period:</span>
                <div className="relative flex items-center">
                  <select
                    value={proposalPeriodFilter}
                    onChange={(e) => setProposalPeriodFilter(e.target.value as any)}
                    aria-label="Filter target proposals by period"
                    className="h-8.5 rounded-lg border border-border bg-white pl-3 pr-8 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
                </div>
              </div>

              {/* Currency selector */}
              <div className="relative flex items-center">
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-white px-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
                >
                  <option value="ETB">ETB (Br)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* ── Main KPI Cards (Clean, Professional, Uniform 3-Line Cards) ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Card 1: Target Proposal */}
            <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Target Proposal
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <UserRound size={15} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {selectedCurrency} {myProposalValue.toLocaleString()}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <span>Submitted · Awaiting Review</span>
              </div>
            </div>

            {/* Card 2: Total Team Proposed */}
            <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Team Proposed
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <FileText size={15} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {selectedCurrency} {Math.round(totalTeamProposedValue).toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">4 team proposals submitted</p>
            </div>

            {/* Card 3: Pending Review */}
            <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Review
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock size={15} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-amber-700">
                {pendingCount} {pendingCount === 1 ? 'proposal' : 'proposals'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Awaiting your approval</p>
            </div>

            {/* Card 4: Approved Proposals */}
            <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Approved
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={15} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-700">
                {approvedCount} {approvedCount === 1 ? 'proposal' : 'proposals'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Locked in official target</p>
            </div>
          </div>

          {/* ── Proposals Container with ONLY TWO TABS: 'All Proposals' & 'Audit History' ── */}
          <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
            {/* Tab Bar Header: Exactly All Proposals and Audit History */}
            <div className="flex items-center gap-6 border-b border-border bg-white px-5 pt-3">
              <button
                type="button"
                onClick={() => setActiveProposalTab('all')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-medium transition-colors cursor-pointer relative',
                  activeProposalTab === 'all'
                    ? 'text-brand font-semibold border-b-2 border-brand -mb-px'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>All Proposals</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    activeProposalTab === 'all'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {proposals.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProposalTab('history')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-medium transition-colors cursor-pointer relative',
                  activeProposalTab === 'history'
                    ? 'text-brand font-semibold border-b-2 border-brand -mb-px'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>Audit History</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    activeProposalTab === 'history'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {MOCK_AUDIT_HISTORY.length}
                </span>
              </button>
            </div>

            {activeProposalTab === 'all' && (
              <>
                {/* Table Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#fafbfc] px-5 py-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search input */}
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="search"
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                    placeholder="Search proposals..."
                    className="h-8.5 w-56 rounded-lg border border-border bg-white pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  />
                  {proposalSearch && (
                    <button
                      type="button"
                      onClick={() => setProposalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status Filter dropdown */}
                <div className="relative flex items-center">
                  <select
                    value={proposalStatusFilter}
                    onChange={(e) => setProposalStatusFilter(e.target.value as any)}
                    aria-label="Filter by approval status"
                    className="h-8.5 rounded-lg border border-border bg-white pl-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  >
                    <option value="ALL">All Statuses ({proposals.length})</option>
                    <option value="PENDING">Awaiting Review ({pendingCount})</option>
                    <option value="SUBMITTED">Submitted ({submittedCount})</option>
                    <option value="APPROVED">Approved ({approvedCount})</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredProposals.length} of {proposals.length} proposals
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border bg-white text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setToastMessage('Exporting proposals summary...');
                    setTimeout(() => setToastMessage(null), 2500);
                  }}
                >
                  <FileText size={13} />
                  Export
                </Button>
              </div>
            </div>

            {/* Proposals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-5">Team / Submitter</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">
                      Proposed Target ({proposalPeriodFilter})
                    </th>
                    <th className="py-3 px-4 text-right">
                      Baseline Target ({proposalPeriodFilter})
                    </th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                        No proposals match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((item) => {
                      const scaledProposed = Math.round(item.proposedAmount * proposalMultiplier);
                      const scaledBaseline = Math.round(item.baselineAmount * proposalMultiplier);
                      const delta = scaledProposed - scaledBaseline;
                      const deltaPercent =
                        scaledBaseline > 0
                          ? ((delta / scaledBaseline) * 100).toFixed(1)
                          : '0.0';

                      return (
                        <tr key={item.id} className="transition-colors hover:bg-muted/25">
                          <td className="py-3.5 px-5">
                            <div>
                              <p className="font-semibold text-foreground">{item.scopeName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.submitter} · {item.submitterRole}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-medium">
                            {item.department}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold tabular-nums text-foreground">
                            {selectedCurrency} {scaledProposed.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right tabular-nums text-muted-foreground">
                            {selectedCurrency} {scaledBaseline.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium tabular-nums">
                            <span
                              className={cn(
                                delta >= 0 ? 'text-emerald-700' : 'text-rose-600',
                              )}
                            >
                              {delta >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                                item.status === 'APPROVED' &&
                                  'border-emerald-200 bg-emerald-50 text-emerald-700',
                                item.status === 'PENDING_REVIEW' &&
                                  'border-amber-200 bg-amber-50 text-amber-800',
                                item.status === 'SUBMITTED' &&
                                  'border-blue-200 bg-blue-50 text-blue-700',
                                item.status === 'REJECTED' &&
                                  'border-rose-200 bg-rose-50 text-rose-700',
                              )}
                            >
                              <span
                                className={cn(
                                  'size-1.5 rounded-full',
                                  item.status === 'APPROVED' && 'bg-emerald-500',
                                  item.status === 'PENDING_REVIEW' && 'bg-amber-500',
                                  item.status === 'SUBMITTED' && 'bg-blue-500',
                                  item.status === 'REJECTED' && 'bg-rose-500',
                                )}
                              />
                              {item.statusLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                            {item.submittedDate}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'PENDING_REVIEW' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProposalForModal(item);
                                      setModalMode('approve');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition-colors cursor-pointer"
                                  >
                                    <Check size={12} />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProposalForModal(item);
                                      setModalMode('reject');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                  >
                                    <X size={12} />
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProposalForModal(item);
                                    setModalMode('approve');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                  View details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TAB 2: AUDIT HISTORY ── */}
        {activeProposalTab === 'history' && (
          <div className="p-0">
            <div className="flex items-center justify-between border-b border-border bg-[#fafbfc] px-5 py-3">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  Target Proposal Audit & Decision Trail
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Chronological trail of submissions, reviews, and approval decisions
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {MOCK_AUDIT_HISTORY.length} recorded events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-5">Event</th>
                    <th className="py-3 px-4">Proposal / Target</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-5">Audit Context / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {MOCK_AUDIT_HISTORY.map((audit) => (
                    <tr key={audit.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3.5 px-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                            audit.action === 'APPROVED' &&
                              'border-emerald-200 bg-emerald-50 text-emerald-700',
                            audit.action === 'SUBMITTED' &&
                              'border-blue-200 bg-blue-50 text-blue-700',
                            audit.action === 'REJECTED' &&
                              'border-rose-200 bg-rose-50 text-rose-700',
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              audit.action === 'APPROVED' && 'bg-emerald-500',
                              audit.action === 'SUBMITTED' && 'bg-blue-500',
                              audit.action === 'REJECTED' && 'bg-rose-500',
                            )}
                          />
                          {audit.actionLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div>{audit.scopeName}</div>
                        <span className="text-[11px] text-muted-foreground">
                          {audit.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-foreground">
                        <div>{audit.actor}</div>
                        <span className="text-[11px] text-muted-foreground">
                          {audit.actorRole}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-foreground">
                        {selectedCurrency} {audit.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {audit.timestamp}
                      </td>
                      <td className="py-3.5 px-5 text-muted-foreground text-[11px] max-w-sm">
                        {audit.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>

        {/* ── Review & Approval Confirmation Dialog ── */}
        <Dialog
          open={selectedProposalForModal != null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProposalForModal(null);
              setModalMode(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {modalMode === 'approve'
                  ? `Approve Target: ${selectedProposalForModal?.scopeName}`
                  : `Reject Target: ${selectedProposalForModal?.scopeName}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {modalMode === 'approve'
                  ? 'Confirm approval of this target proposal to forward it into the official plan.'
                  : 'Provide feedback so the team lead can adjust and resubmit their proposal.'}
              </DialogDescription>
            </DialogHeader>

            {selectedProposalForModal && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-[#fafbfc] p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Proposed:</span>
                    <p className="font-bold text-foreground">
                      {selectedCurrency} {Math.round(selectedProposalForModal.proposedAmount * proposalMultiplier).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Baseline:</span>
                    <p className="font-bold text-foreground">
                      {selectedCurrency} {Math.round(selectedProposalForModal.baselineAmount * proposalMultiplier).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedProposalForModal.notes && (
                  <div className="rounded-lg border border-border bg-white p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Submitter note:</span>
                    <p className="mt-0.5">{selectedProposalForModal.notes}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-foreground">
                    Review note / Feedback (optional):
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={
                      modalMode === 'approve'
                        ? 'e.g. Looks good, approved for Q1-Q4.'
                        : 'e.g. Please adjust based on revised enterprise quotas.'
                    }
                    className="mt-1.5 w-full rounded-lg border border-border bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-border"
                onClick={() => {
                  setSelectedProposalForModal(null);
                  setModalMode(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(
                  'text-xs font-semibold text-white',
                  modalMode === 'approve' ? 'bg-brand hover:bg-brand/90' : 'bg-rose-600 hover:bg-rose-700',
                )}
                onClick={handleConfirmReview}
              >
                {modalMode === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── DEFAULT VIEW: Main Target Overview Page ──
  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 space-y-6">
      {/* ── Top Bar Controls: View By, FY, Currency, Method ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Target Planning Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-foreground">
              <span className="size-1.5 rounded-full bg-brand" />
              {selectedFiscalYear}
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {planningMethod}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Strategic sales quota planning, team proposal workflows, and real-time attainment tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View by: Annual / Period toggle */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <span className="font-medium">View by</span>
            <div className="inline-flex rounded-lg border border-border bg-white p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setViewBy('Annual')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  viewBy === 'Annual'
                    ? 'bg-muted/80 text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Annual
              </button>
              <button
                type="button"
                onClick={() => setViewBy('Period')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  viewBy === 'Period'
                    ? 'bg-muted/80 text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Period
              </button>
            </div>
          </div>

          {/* FY selector */}
          <div className="relative flex items-center">
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-white px-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <option value="FY 2026/27">FY 2026/27</option>
              <option value="FY 2025/26">FY 2025/26</option>
              <option value="FY 2024/25">FY 2024/25</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
          </div>

          {/* Currency selector */}
          <div className="relative flex items-center">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-white px-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <option value="ETB">ETB (Br)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
          </div>

          {/* Method selector */}
          <div className="relative flex items-center">
            <select
              value={planningMethod}
              onChange={(e) => setPlanningMethod(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-white px-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <option value="Bottom to Top">Bottom to Top</option>
              <option value="Top to Bottom">Top to Bottom</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Section 1: KPI Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Card 1: Official Target */}
        <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Official Target
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <Target size={15} />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {formatMoney(officialTargetValue, selectedCurrency)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>2 of 4 teams approved</span>
          </div>
        </div>

        {/* Card 2: Proposed Target */}
        <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Proposed Target
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <FileText size={15} />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {formatMoney(proposedTargetValue, selectedCurrency)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span>3 of 4 teams proposed</span>
          </div>
        </div>

        {/* Card 3: Planning Progress */}
        <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Planning Progress
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <BarChart3 size={15} />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              75%
            </p>
            <span className="text-xs font-semibold text-emerald-600">On Track</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand rounded-full" style={{ width: '75%' }} />
            </div>
            <span>3 of 4 completed</span>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className={cn(TARGETS_CARD_CLASS, 'flex flex-col p-4 bg-white')}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Approvals
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <Clock size={15} />
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              1
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>1 team awaiting review</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Planning Status & Breakdown Card ── */}
      <div className={cn(TARGETS_CARD_CLASS, 'p-5 bg-white')}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Progress summary */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Planning Status
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Awaiting Final Approvals
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: '75%' }}
                />
              </div>
              <span className="text-xs font-bold text-foreground">75%</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>3 of 4 teams submitted</span>
              <span>·</span>
              <span>1 awaiting review</span>
            </div>
          </div>

          {/* Middle Column: Approval Breakdown */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
            <p className="text-xs font-bold text-foreground mb-3">Approval Breakdown</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <span className="size-2 rounded-full bg-slate-400" />
                  <span>Not Started</span>
                </div>
                <p className="text-lg font-bold text-foreground">1</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span>Submitted</span>
                </div>
                <p className="text-lg font-bold text-foreground">2</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>Awaiting Review</span>
                </div>
                <p className="text-lg font-bold text-foreground">1</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Approved</span>
                </div>
                <p className="text-lg font-bold text-foreground">2</p>
              </div>
            </div>
          </div>

          {/* Right Column: Actions (Clean, clickable, uniform outline buttons) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
            <button
              type="button"
              onClick={() => handleNavigateView('requests')}
              className="inline-flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span>Review Proposals ({pendingCount})</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => {
                handleNavigateView('requests');
                setActiveProposalTab('all');
              }}
              className="inline-flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span>Submit My Target</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => router.push('/sales-targeting/forecast')}
              className="inline-flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <LineChart size={14} className="text-muted-foreground" /> View Pipeline Forecast
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Planning by Department Table ── */}
      <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden bg-white')}>
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Planning by Department</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review target proposals and approval status across all departments
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Dropdown Filter */}
            <div className="relative flex items-center">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                aria-label="Filter department planning by period"
                className="h-8 rounded-lg border border-border bg-white pl-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 cursor-pointer appearance-none outline-none focus-visible:ring-1 focus-visible:ring-brand"
              >
                <option value="Annual">Annual</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
            </div>

            {/* View Organization button with working click navigation */}
            <button
              type="button"
              onClick={() => handleNavigateView('org')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 shadow-xs cursor-pointer"
            >
              <Building2 size={13} className="text-muted-foreground" />
              <span>View Organization</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/20 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="py-3 pl-6 pr-2 w-8" />
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Department</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Teams Submitted</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Proposed Target</th>
                <th className="py-3 pr-6 text-right font-semibold uppercase tracking-wider">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {BASE_DEPARTMENTS_DATA.map((dept) => {
                const isExpanded = expandedDeptId === dept.id;
                const canExpand = Boolean(dept.teams?.length);
                const scaledProposed = dept.proposedTarget != null ? dept.proposedTarget * periodMultiplier : null;

                return (
                  <React.Fragment key={dept.id}>
                    <tr
                      onClick={() => canExpand && toggleDept(dept.id)}
                      className={cn(
                        'transition-colors',
                        canExpand && 'cursor-pointer',
                        isExpanded ? 'bg-surface-elevated/60' : 'hover:bg-muted/20',
                      )}
                    >
                      <td className="py-3.5 pl-6 pr-2 text-muted-foreground">
                        {canExpand ? (
                          <button
                            type="button"
                            aria-label={isExpanded ? `Collapse ${dept.name}` : `Expand ${dept.name}`}
                            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <span className="text-sm font-semibold">{dept.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{dept.teamsSubmitted}</span>
                          <span className="text-muted-foreground">({dept.progressPercent}%)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold tabular-nums text-foreground">
                        {formatMoney(scaledProposed, selectedCurrency)}
                      </td>
                      <td className="py-3.5 pr-6 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                            dept.status === 'Approved' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                            dept.status === 'In Progress' && 'border-amber-200 bg-amber-50 text-amber-800',
                            dept.status === 'Not Started' && 'border-border bg-muted/50 text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              dept.status === 'Approved' && 'bg-emerald-500',
                              dept.status === 'In Progress' && 'bg-amber-500',
                              dept.status === 'Not Started' && 'bg-muted-foreground/60',
                            )}
                          />
                          {dept.status}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Teams Sub-Table */}
                    {isExpanded && dept.teams && (
                      <tr>
                        <td colSpan={5} className="bg-muted/10 p-0 border-y border-border/60">
                          <div className="py-3 pl-12 pr-6">
                            <div className="rounded-lg border border-border bg-white shadow-xs overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase text-muted-foreground">
                                  <tr>
                                    <th className="py-2.5 px-4">Team</th>
                                    <th className="py-2.5 px-4">Proposed Target</th>
                                    <th className="py-2.5 px-4">Approved Target</th>
                                    <th className="py-2.5 pr-4 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {dept.teams.map((team, idx) => {
                                    const scaledTeamProposed =
                                      team.proposedTarget != null ? team.proposedTarget * periodMultiplier : null;
                                    const scaledTeamApproved =
                                      team.approvedTarget != null ? team.approvedTarget * periodMultiplier : null;

                                    return (
                                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-foreground">
                                          {team.name}
                                        </td>
                                        <td className="py-2.5 px-4 tabular-nums text-foreground">
                                          {formatMoney(scaledTeamProposed, selectedCurrency)}
                                        </td>
                                        <td className="py-2.5 px-4 tabular-nums text-muted-foreground">
                                          {formatMoney(scaledTeamApproved, selectedCurrency)}
                                        </td>
                                        <td className="py-2.5 pr-4 text-right">
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border',
                                              team.status === 'Approved' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                              team.status === 'Awaiting Review' && 'border-amber-200 bg-amber-50 text-amber-800',
                                              team.status === 'Submitted' && 'border-blue-200 bg-blue-50 text-blue-700',
                                              team.status === 'Not Submitted' && 'border-border bg-muted/40 text-muted-foreground',
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                'size-1.5 rounded-full',
                                                team.status === 'Approved' && 'bg-emerald-500',
                                                team.status === 'Awaiting Review' && 'bg-amber-500',
                                                team.status === 'Submitted' && 'bg-blue-500',
                                                team.status === 'Not Submitted' && 'bg-muted-foreground/60',
                                              )}
                                            />
                                            {team.status}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
