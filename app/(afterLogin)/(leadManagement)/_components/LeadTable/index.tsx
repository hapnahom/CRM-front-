'use client';
import type { ReactNode, MouseEvent } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { LeadStates } from '../LeadStates';
import type { Lead } from '@/store/server/features/leads/interface';
import {
  useCampaignsQuery,
  useCompaniesQuery,
} from '@/store/server/features/leads/queries';
import { useQueryClient } from 'react-query';

// Helper function to detect if a string looks like a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to get display name with fallback
const getDisplayName = (
  id: string | null,
  lookupData: any[],
  dataType: string,
  isLoading: boolean,
  hasError: boolean,
): { text: string; className: string } => {
  if (!id) {
    return { text: '-', className: 'text-sm font-normal text-foreground' };
  }

  if (isLoading) {
    return {
      text: 'Loading...',
      className: 'text-sm font-normal text-muted-foreground',
    };
  }

  if (hasError) {
    return {
      text: 'Error loading',
      className: 'text-sm font-normal text-red-500 italic',
    };
  }

  const foundItem = lookupData.find((item) => item.id === id);

  if (!foundItem) {
    // If it looks like a UUID, it's likely a missing reference
    if (isUUID(id)) {
      return {
        text: `${dataType} not found`,
        className: 'text-sm font-normal text-muted-foreground italic',
      };
    }
    // If it doesn't look like a UUID, it might be a name that got stored as ID
    return { text: id, className: 'text-sm font-normal text-foreground' };
  }

  return {
    text: foundItem.name,
    className: 'text-sm font-normal text-foreground',
  };
};

interface ColumnDef {
  title: ReactNode;
  dataIndex: string;
  key: string;
  width?: number;
  render?: (value: any, record: Lead) => ReactNode;
}

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  selectedRows: string[];
  onSelectionChange: (selectedRows: string[]) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
}

export default function LeadTable({
  leads,
  isLoading,
  selectedRows,
  onSelectionChange,
}: LeadTableProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleStageChange = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const {
    data: campaigns = [],
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useCampaignsQuery();
  const {
    data: companies = [],
    isLoading: companiesLoading,
    error: companiesError,
  } = useCompaniesQuery();

  const handleSelectRow = (leadId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRows, leadId]);
    } else {
      onSelectionChange(selectedRows.filter((id) => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(leads.map((lead) => lead.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleLeadClick = (leadId: string) => {
    router.push(`/leads/${leadId}`);
  };

  const columns: ColumnDef[] = [
    {
      title: (
        <Checkbox
          checked={selectedRows.length === leads.length && leads.length > 0}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label="Select all leads"
          data-cy="select-all-leads-checkbox"
        />
      ),
      dataIndex: 'selection',
      key: 'selection',
      width: 35,
      render: (unused: any, record: Lead) => (
        <Checkbox
          checked={selectedRows.includes(record.id)}
          onCheckedChange={(checked) =>
            handleSelectRow(record.id, checked === true)
          }
          aria-label={`Select ${record.contactPersonFName} ${record.contactPersonLName}`}
          data-cy={`select-lead-checkbox-${record.id}`}
        />
      ),
    },
    {
      title: 'Leads Name',
      dataIndex: 'name',
      key: 'leadName',
      width: 150,
      render: (name: string, record: Lead) => (
        <span
          className="text-sm font-normal text-foreground"
          data-cy={`lead-name-${record.id}`}
        >
          {name || '-'}
        </span>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'companyId',
      key: 'company',
      width: 150,
      render: (companyId: string | null) => {
        const display = getDisplayName(
          companyId,
          companies,
          'Company',
          companiesLoading,
          !!companiesError,
        );
        return (
          <span
            className={display.className}
            data-cy={`lead-company-${companyId}`}
          >
            {display.text}
          </span>
        );
      },
    },
    {
      title: 'Email',
      dataIndex: 'contactPersonEmail',
      key: 'email',
      width: 150,
      render: (email: string, record: Lead) => (
        <span
          className="text-sm font-normal text-foreground"
          data-cy={`lead-email-${record.id}`}
        >
          {email}
        </span>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'contactPersonPhoneNumber',
      key: 'phone',
      width: 150,
      render: (phone: string, record: Lead) => (
        <span
          className="text-sm font-normal text-foreground"
          data-cy={`lead-phone-${record.id}`}
        >
          {phone || '-'}
        </span>
      ),
    },
    {
      title: 'Campaign',
      dataIndex: 'campaignId',
      key: 'campaign',
      width: 150,
      render: (campaignId: string | null, record: Lead) => {
        if (record.campaign?.name) {
          return (
            <span
              className="text-sm font-normal text-foreground"
              data-cy={`lead-campaign-${campaignId}`}
            >
              {record.campaign.name}
            </span>
          );
        }
        const display = getDisplayName(
          campaignId,
          campaigns,
          'Campaign',
          campaignsLoading,
          !!campaignsError,
        );
        return (
          <span
            className={display.className}
            data-cy={`lead-campaign-${campaignId}`}
          >
            {display.text}
          </span>
        );
      },
    },
    {
      title: 'Lead Stage',
      dataIndex: 'engagementStageId',
      key: 'engagementStageId',
      width: 150,
      render: (stageId: string | null, record: Lead) => (
        <LeadStates
          leadId={record.id}
          currentStage={stageId}
          onStageChange={handleStageChange}
          data-cy={`lead-stage-dropdown-${record.id}`}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-surface-card rounded-lg border-0">
        <div className="p-8 text-center text-sm font-medium text-muted-foreground">
          Loading leads...
        </div>
      </div>
    );
  }

  const handleRowClick = (
    e: MouseEvent<HTMLTableRowElement>,
    leadId: string,
  ) => {
    // Check if the click target is a button, dropdown, select, checkbox, or
    // other interactive element so we don't navigate when interacting with it.
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest(
      'button, [role="checkbox"], [data-slot="checkbox"], [data-slot="dropdown-menu-trigger"], [data-slot="dropdown-menu-content"], [data-slot="select-trigger"], [data-slot="select-content"]',
    );

    if (!isInteractiveElement) {
      handleLeadClick(leadId);
    }
  };

  return (
    <div
      className="w-full min-w-0 overflow-hidden"
      data-cy="leads-table-container"
      style={{ fontFamily: 'inherit' }}
    >
      <Table className="custom-table leads-table" data-cy="leads-table">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className="text-sm font-medium text-muted-foreground"
              >
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}>
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    No leads found yet. Create your first lead to get started!
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((record) => (
              <TableRow
                key={record.id}
                className={
                  selectedRows.includes(record.id) ? 'selected-row' : ''
                }
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleRowClick(e, record.id)}
              >
                {columns.map((column) => {
                  const value = (record as any)[column.dataIndex];
                  return (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render(value, record)
                        : (value ?? '-')}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
