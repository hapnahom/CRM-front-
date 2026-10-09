'use client';

import { tokens } from '@/lib/design-tokens';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { RiExchange2Line } from 'react-icons/ri';
import { FileDown } from 'lucide-react';
import { Lead } from '@/types/leads';

interface BulkActionProps {
  selectedRowsCount: number;
  leads: Lead[];
  selectedRows: string[];
  totalLeadsCount?: number;
  onImportLeads?: () => void;
  isImporting?: boolean;
}

export default function BulkAction({
  selectedRowsCount,
  onImportLeads,
  isImporting = false,
}: BulkActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const bulkActionRef = useRef<HTMLDivElement>(null);

  // Function to calculate dropdown position
  const calculateDropdownPosition = () => {
    if (bulkActionRef.current) {
      const rect = bulkActionRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (window.innerWidth <= 500) {
        // Mobile positioning - center the modal and ensure it fits
        const modalWidth = Math.min(400, window.innerWidth - 32); // Ensure modal fits with 16px margins
        const buttonCenter = rect.left + rect.width / 2;
        const leftPosition = Math.max(
          16,
          Math.min(
            buttonCenter - modalWidth / 2,
            window.innerWidth - modalWidth - 16,
          ),
        );

        setDropdownPosition({
          top: rect.bottom + scrollY + 8,
          right: window.innerWidth - leftPosition - modalWidth + scrollX,
        });
      } else {
        // Desktop positioning - original logic
        setDropdownPosition({
          top: rect.top + scrollY,
          right: window.innerWidth - rect.right + scrollX,
        });
      }
    }
  };

  const handleBulkActionClick = () => {
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleImportClick = () => {
    if (onImportLeads) {
      onImportLeads();
      closeDropdown();
    }
  };

  // Handle dropdown positioning and keyboard events
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown();
      }
    };

    const handleScroll = () => {
      if (isOpen) calculateDropdownPosition();
    };

    const handleResize = () => {
      if (isOpen) calculateDropdownPosition();
    };

    if (isOpen) {
      // Calculate initial position immediately
      calculateDropdownPosition();

      // Add event listeners
      document.addEventListener('keydown', handleEscapeKey);
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={bulkActionRef}>
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
          onClick={handleBulkActionClick}
          data-cy="bulk-action-button"
        >
          <RiExchange2Line className="text-brand" size={24} />
          <span className="hidden sm:inline">Action</span>{' '}
          {selectedRowsCount > 0 && (
            <span className="hidden sm:inline">({selectedRowsCount})</span>
          )}
        </Button>
      </div>

      {/* Bulk Action Dropdown - positioned using calculated state */}
      {isOpen &&
        createPortal(
          <div
            className="absolute z-[99999]"
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              position: 'absolute',
            }}
          >
            <div className="bg-surface-card border border-border rounded-lg shadow-lg px-6 py-4 w-[400px] max-w-[calc(100vw-32px)] sm:w-auto sm:min-w-[320px]">
              {/* Header Section */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-foreground mb-0 m-0">
                  Actions
                </h3>
                <p className="text-sm font-medium text-muted-foreground m-0">
                  Lead Actions
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleImportClick}
                  disabled={isImporting}
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
                    if (!isImporting) {
                      e.currentTarget.style.backgroundColor = tokens.color.blue;
                      e.currentTarget.style.borderColor = tokens.color.blue;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isImporting) {
                      e.currentTarget.style.backgroundColor = tokens.color.blue;
                      e.currentTarget.style.borderColor = tokens.color.blue;
                    }
                  }}
                  data-cy="bulk-import-button"
                >
                  <FileDown className="w-6 h-6 mr-3 text-brand-foreground" />
                  <span className="text-brand-foreground">
                    {isImporting ? 'Importing...' : 'Import Leads'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Background Overlay Portal */}
      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.3)', // Light dark overlay - same as action button
              zIndex: 9999,
              pointerEvents: 'auto', // Allow clicks to close
            }}
            onClick={closeDropdown}
          />,
          document.body,
        )}
    </>
  );
}
