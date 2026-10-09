'use client';

import { tokens } from '@/lib/design-tokens';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuSettings2 } from 'react-icons/lu';
import { CiSearch } from 'react-icons/ci';
import { X } from 'lucide-react';
import { useRef } from 'react';
import BulkAction from '../BulkAction';

interface LeadsSearchBarProps {
  selectedRowsCount?: number;
  leads?: any[];
  selectedRows?: string[];
  totalLeadsCount?: number;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear?: () => void;
  onFilterClick?: () => void;
  onImportLeads?: () => void;
  isImporting?: boolean;
  activeFiltersCount?: number;
  filterButtonRef?: React.RefObject<HTMLDivElement>;
}

export default function LeadsSearchBar({
  selectedRowsCount = 0,
  leads = [],
  selectedRows = [],
  totalLeadsCount = 0,
  searchValue = '',
  onSearchChange,
  onSearchClear,
  onFilterClick,
  onImportLeads,
  isImporting = false,
  activeFiltersCount = 0,
  filterButtonRef: externalFilterButtonRef,
}: LeadsSearchBarProps) {
  const internalFilterButtonRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = externalFilterButtonRef || internalFilterButtonRef;
  return (
    <div className="flex flex-row items-center justify-between gap-4 mb-6">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-sm min-w-0">
        <CiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-2xl z-10" />
        <Input
          placeholder="Search Leads"
          value={searchValue}
          onChange={onSearchChange}
          className="search-bar-input pl-12 pr-10 bg-surface-card w-full h-11 text-base"
          style={{
            borderColor: tokens.color.borderStrong,
            boxShadow: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = tokens.color.borderFocus;
            e.target.style.boxShadow = 'none';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = tokens.color.borderStrong;
            e.target.style.boxShadow = 'none';
          }}
          data-cy="leads-search-input"
        />
        {searchValue && (
          <button
            type="button"
            onClick={onSearchClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground z-10"
            aria-label="Clear search"
            data-cy="leads-search-clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Action Buttons - Horizontal layout on all screen sizes */}
      <div className="flex flex-row items-center gap-3 flex-shrink-0">
        <div className="relative" ref={filterButtonRef}>
          <Button
            variant="outline"
            className="py-3 px-4 rounded-lg w-11 h-11 sm:w-auto flex items-center justify-center"
            style={{
              borderColor: tokens.color.blue,
              color: tokens.color.blue,
              backgroundColor: tokens.color.surfaceCard,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.color.lightblue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tokens.color.surfaceCard;
            }}
            onClick={onFilterClick}
            data-cy="leads-filter-button"
          >
            <LuSettings2 size={24} />
            <span className="hidden sm:inline">Filter</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-brand-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        <BulkAction
          selectedRowsCount={selectedRowsCount}
          leads={leads}
          selectedRows={selectedRows}
          totalLeadsCount={totalLeadsCount}
          onImportLeads={onImportLeads}
          isImporting={isImporting}
        />
      </div>
    </div>
  );
}
