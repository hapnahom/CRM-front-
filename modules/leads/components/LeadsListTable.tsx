'use client';

import { useMemo } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PipelinePagination } from '@/lib/pipeline/list-query';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import type {
  PipelineCustomerSummary,
  PipelineLead,
  PipelineStage,
} from '@/store/server/features/leads/pipeline/types';
import { resolveLeadCustomerName } from '@/lib/leads/kanban-display';
import { PipelineListPagination } from '@/components/pipeline/PipelineListPagination';
import { PipelineListColumnsButton } from '@/components/pipeline/PipelineListColumnSelector';
import {
  ResizablePipelineTableHead,
  isWrappableCustomFieldType,
  pipelineTableCellStyle,
} from '@/components/pipeline/ResizablePipelineTableHead';
import { TruncatedValueList } from '@/components/pipeline/TruncatedValueList';
import { formatCustomFieldListItems } from '@/lib/pipeline/format-custom-field-value';
import { useCustomFieldDirectory } from '@/hooks/useCustomFieldDirectory';
import { usePipelineTableColumnWidths } from '@/hooks/usePipelineTableColumnWidths';
import { sumColumnWidths } from '@/lib/pipeline/table-column-widths';
import {
  contactDisplayName,
  observerDisplayNames,
  productDisplayNames,
} from '@/lib/pipeline/list-cell-values';
import type { PipelineListColumnDef } from '@/lib/pipeline/list-columns';
import { parseRoleColumnId } from '@/lib/pipeline/role-columns';
import { RoleAssignmentTableCell } from '@/components/pipeline/RoleAssignmentTableCell';
import { cn } from '@/lib/utils';
import {
  formatDate,
  formatMoney,
  initials,
  leadAgingLabel,
  ownerName,
} from './leads-pipeline-utils';

interface LeadsListTableProps {
  leads: PipelineLead[];
  sortedStages: PipelineStage[];
  stageById: Map<string, PipelineStage>;
  customerById: Map<string, PipelineCustomerSummary>;
  columns: PipelineListColumnDef[];
  customFieldValuesByEntityId?: Map<string, Record<string, unknown>>;
  pagination?: PipelinePagination;
  onPageChange: (page: number) => void;
  onOpenLead: (lead: PipelineLead) => void;
  onConfigureColumns?: () => void;
}

export function LeadsListTable({
  leads,
  sortedStages,
  stageById,
  customerById,
  columns,
  customFieldValuesByEntityId,
  pagination,
  onPageChange,
  onOpenLead,
  onConfigureColumns,
}: LeadsListTableProps) {
  const customFieldDirectory = useCustomFieldDirectory(columns);
  const columnIds = useMemo(
    () => columns.map((column) => column.id),
    [columns],
  );
  const { columnWidths, setColumnWidth } = usePipelineTableColumnWidths(
    'leads',
    columnIds,
  );
  const tableMinWidth = useMemo(
    () => sumColumnWidths(columnIds, columnWidths),
    [columnIds, columnWidths],
  );
  const customerName = (lead: PipelineLead) =>
    resolveLeadCustomerName(lead, customerById);

  const cellStyle = (column: PipelineListColumnDef) =>
    pipelineTableCellStyle(columnWidths[column.id] ?? 140);

  const renderCustomFieldCell = (
    lead: PipelineLead,
    column: PipelineListColumnDef,
  ) => {
    const fieldId = column.fieldId;
    const raw =
      fieldId != null
        ? customFieldValuesByEntityId?.get(lead.id)?.[fieldId]
        : undefined;
    const items = formatCustomFieldListItems(
      raw,
      column.fieldType,
      column.options,
      customFieldDirectory,
      column.subFields,
    );
    const wrapText = isWrappableCustomFieldType(column.fieldType);
    return (
      <TableCell
        key={column.id}
        style={cellStyle(column)}
        className={cn(
          'px-4 py-3 align-top text-sm text-foreground',
          wrapText ? 'whitespace-normal' : 'max-w-0',
        )}
      >
        {wrapText ? (
          <div className="break-words leading-snug">
            {items.length ? items.join(', ') : '—'}
          </div>
        ) : (
          <TruncatedValueList values={items} />
        )}
      </TableCell>
    );
  };

  const renderCell = (lead: PipelineLead, column: PipelineListColumnDef) => {
    const stage = stageById.get(lead.stageId) ?? lead.stage;
    const stageIndex = stage
      ? sortedStages.findIndex((s) => s.id === stage.id)
      : 0;
    const stageAppearance = stage
      ? pipelineStageAppearance(stage, Math.max(stageIndex, 0))
      : null;
    const stuck = leadAgingLabel(lead, stageById);
    const owner = ownerName(lead);
    const ownerAvatarUrl = lead.responsibleUser?.avatarUrl ?? null;
    const customer = customerName(lead);

    switch (column.id) {
      case 'name':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 font-medium text-foreground"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate" title={lead.name}>
                {lead.name}
              </span>
              {lead.pendingApproval ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                >
                  Pending approval
                </Badge>
              ) : null}
              {stuck ? (
                <Badge variant="warning" className="shrink-0 text-[10px]">
                  <AlertTriangle className="mr-0.5 size-3" />
                  {stuck}
                </Badge>
              ) : null}
            </div>
          </TableCell>
        );
      case 'customer':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 text-sm text-foreground"
          >
            <span className="block truncate" title={customer}>
              {customer}
            </span>
          </TableCell>
        );
      case 'contact': {
        const contact = contactDisplayName(lead.contact);
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 text-sm text-foreground"
          >
            <span className="block truncate" title={contact}>
              {contact}
            </span>
          </TableCell>
        );
      }
      case 'stage':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="px-4 py-3"
          >
            {stage && stageAppearance ? (
              <Badge
                variant="outline"
                className="max-w-full truncate border text-xs font-medium text-foreground"
                style={{
                  backgroundColor: stageAppearance.backgroundColor,
                  borderColor: stageAppearance.borderColor,
                }}
                title={stage.name}
              >
                {stage.name}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case 'value':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-foreground"
          >
            {formatMoney(lead.value, lead.currency)}
          </TableCell>
        );
      case 'expectedClose':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="px-4 py-3 text-sm text-foreground"
          >
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} className="shrink-0" />
              {formatDate(lead.expectedClose)}
            </span>
          </TableCell>
        );
      case 'responsible':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-6 shrink-0">
                {ownerAvatarUrl ? (
                  <AvatarImage src={ownerAvatarUrl} alt={owner} />
                ) : null}
                <AvatarFallback className="bg-brand-muted text-[9px] text-brand-hover">
                  {owner === '—' ? '—' : initials(owner)}
                </AvatarFallback>
              </Avatar>
              <span
                className="min-w-0 truncate text-xs text-foreground"
                title={owner}
              >
                {owner}
              </span>
            </div>
          </TableCell>
        );
      case 'observers':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 align-top"
          >
            <TruncatedValueList values={observerDisplayNames(lead.observers)} />
          </TableCell>
        );
      case 'products':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 align-top"
          >
            <TruncatedValueList values={productDisplayNames(lead.products)} />
          </TableCell>
        );
      case 'type': {
        const typeName = lead.type?.name ?? '—';
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="max-w-0 px-4 py-3 text-sm text-foreground"
          >
            <span className="block truncate" title={typeName}>
              {typeName}
            </span>
          </TableCell>
        );
      }
      case 'createdAt':
        return (
          <TableCell
            key={column.id}
            style={cellStyle(column)}
            className="px-4 py-3 text-xs text-muted-foreground"
          >
            {formatDate(lead.createdAt)}
          </TableCell>
        );
      default: {
        const roleId = parseRoleColumnId(column.id);
        if (roleId) {
          return (
            <RoleAssignmentTableCell
              columnId={column.id}
              roleId={roleId}
              isPrimary={column.isPrimary}
              record={lead}
              style={cellStyle(column)}
            />
          );
        }
        return renderCustomFieldCell(lead, column);
      }
    }
  };

  const colCount = Math.max(columns.length, 1);

  return (
    <div className="min-h-[min(60vh,560px)] flex-1">
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface-card">
        {onConfigureColumns ? (
          <div className="pointer-events-none absolute top-0 right-0 z-20 flex h-12 items-center pr-1">
            <div className="pointer-events-auto rounded-md bg-surface-card/95 shadow-sm ring-1 ring-border/60 backdrop-blur-sm">
              <PipelineListColumnsButton onClick={onConfigureColumns} />
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table
            className="caption-bottom text-sm"
            style={{
              tableLayout: 'fixed',
              width: tableMinWidth,
              minWidth: '100%',
            }}
          >
            <TableHeader>
              <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                {columns.map((column, index) => (
                  <ResizablePipelineTableHead
                    key={column.id}
                    columnId={column.id}
                    width={columnWidths[column.id] ?? 140}
                    onResize={(columnId, width) =>
                      setColumnWidth(columnId as typeof column.id, width)
                    }
                    align={column.align}
                    className={
                      onConfigureColumns && index === columns.length - 1
                        ? 'pr-10'
                        : undefined
                    }
                  >
                    {column.label}
                  </ResizablePipelineTableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No leads match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => onOpenLead(lead)}
                  >
                    {columns.map((column) => renderCell(lead, column))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>

        {pagination ? (
          <PipelineListPagination
            pagination={pagination}
            onPageChange={onPageChange}
          />
        ) : null}
      </div>
    </div>
  );
}
