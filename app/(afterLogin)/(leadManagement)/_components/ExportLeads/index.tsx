'use client';

import { tokens } from '@/lib/design-tokens';

import { FileUp } from 'lucide-react';
import { ExportLeadsProps } from '@/types/leads';

export default function ExportLeads({
  selectedRows,
  totalLeadsCount = 0,
  isLoading,
  onExport,
}: ExportLeadsProps) {
  const handleExportClick = () => {
    onExport();
  };

  const getExportButtonText = () => {
    if (isLoading) {
      return 'Exporting to Excel...';
    }

    if (selectedRows.length > 0) {
      return `Export Selected (${selectedRows.length})`;
    }

    return `Export Leads (${totalLeadsCount})`;
  };

  const isDisabled = isLoading || totalLeadsCount === 0;

  return (
    <button
      onClick={handleExportClick}
      disabled={isDisabled}
      className="w-full flex items-center justify-center px-4 py-3 rounded-lg h-11 focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: tokens.color.blue,
        borderColor: tokens.color.blue,
        color: tokens.color.surfaceCard,
        transition: 'background-color 0.2s ease',
        transform: 'none',
        boxShadow: 'none',
        border: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = tokens.color.blue;
          e.currentTarget.style.borderColor = tokens.color.blue;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = tokens.color.blue;
          e.currentTarget.style.borderColor = tokens.color.blue;
        }
      }}
      data-cy="bulk-export-button"
    >
      <FileUp className="w-6 h-6 mr-3 text-brand-foreground" />
      <span className="text-brand-foreground">{getExportButtonText()}</span>
    </button>
  );
}
