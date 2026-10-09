'use client';

import { tokens } from '@/lib/design-tokens';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useModalManagerStore } from '@/store/uistate/features/leads/useModalManagerStore';
import { CreateLeadDrawer } from '../create-lead-drawer';

export default function LeadsHeader() {
  // Use the new modal manager store for better state management
  const {
    isCreateLeadDrawerOpen,
    openCreateLeadDrawer,
    closeCreateLeadDrawer,
  } = useModalManagerStore();

  return (
    <div
      className="flex flex-row items-center justify-between gap-4 mb-6"
      style={{ marginTop: '0px' }}
    >
      <div className="flex-1">
        <h1
          className="text-2xl font-bold text-foreground mb-1"
          style={{ marginTop: '-4px' }}
        >
          Leads
        </h1>
        <p
          className="text-sm font-medium text-muted-foreground"
          style={{ marginTop: '-2px' }}
        >
          View Potential Customers
        </p>
      </div>
      <div className="flex-shrink-0">
        <Button
          className="px-4 py-3 rounded-lg w-11 h-11 sm:w-auto flex items-center justify-center focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none"
          onClick={() => {
            // Use the new modal manager store for proper mutual exclusion
            openCreateLeadDrawer();
          }}
          style={{
            backgroundColor: tokens.color.blue,
            borderColor: tokens.color.blue,
            color: tokens.color.surfaceCard,
            transition: 'background-color 0.2s ease',
            transform: 'none',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.color.blue;
            e.currentTarget.style.borderColor = tokens.color.blue;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = tokens.color.blue;
            e.currentTarget.style.borderColor = tokens.color.blue;
          }}
          data-cy="create-lead-button"
        >
          <Plus className="text-lg sm:mr-2" />
          <span className="hidden sm:inline">Create Lead</span>
        </Button>
      </div>

      {/* Drawer only rendered when open to prevent layout interference */}
      {isCreateLeadDrawerOpen && (
        <CreateLeadDrawer
          isOpen={isCreateLeadDrawerOpen}
          onClose={closeCreateLeadDrawer}
        />
      )}
    </div>
  );
}
