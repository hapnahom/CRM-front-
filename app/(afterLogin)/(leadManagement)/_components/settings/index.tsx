'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { LeadStatusSettings } from './LeadStatusSettings';
import { ActivitySettings } from './ActivitySettings';
import { useLeadSettingsStore } from '@/store/uistate/features/leads/settings';

type SettingTab = 'status' | 'activity';

export const LeadSettings: React.FC = () => {
  // Zustand store
  const { activeTab, setActiveTab } = useLeadSettingsStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'status':
        return <LeadStatusSettings />;
      case 'activity':
        return <ActivitySettings />;
      default:
        return <LeadStatusSettings />;
    }
  };

  const getTabLabel = (tab: SettingTab) => {
    switch (tab) {
      case 'status':
        return 'Define Lead Status';
      case 'activity':
        return 'Define Activity';
      default:
        return 'Define Lead Status';
    }
  };

  return (
    <div
      className="min-h-screen bg-surface-elevated p-6"
      data-cy="lead-settings-container"
    >
      {/* Header Section */}
      <div className="mb-6" data-cy="lead-settings-header">
        <div className="flex justify-between items-start">
          <div>
            <h1
              className="text-xl font-semibold text-foreground m-0"
              data-cy="lead-settings-title"
            >
              Lead Settings
            </h1>
            <p
              className="text-muted-foreground text-base"
              data-cy="lead-settings-subtitle"
            >
              Manage Your Lead Settings
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden mb-6" data-cy="mobile-tab-navigation">
        <div className="flex overflow-x-auto space-x-6 border-b border-border scrollbar-hide">
          {(['status', 'activity'] as SettingTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-cy={`mobile-tab-${tab}`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        data-cy="lead-settings-content"
      >
        {/* Left Panel - Settings Navigation */}
        <div
          className="hidden lg:block lg:col-span-1 mt-16"
          data-cy="lead-settings-sidebar"
        >
          <Card className="shadow-sm" data-cy="lead-settings-nav-card">
            <CardContent>
              <h2
                className="text-lg font-semibold text-foreground mb-4"
                data-cy="lead-settings-nav-title"
              >
                Lead Settings
              </h2>
              <div className="space-y-3" data-cy="lead-settings-nav-buttons">
                {(['status', 'activity'] as SettingTab[]).map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'default' : 'outline'}
                    className={`w-full justify-start h-12 rounded-lg text-sm ${
                      activeTab === tab
                        ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                        : 'bg-surface-card border-brand text-brand hover:bg-primary-muted'
                    }`}
                    onClick={() => setActiveTab(tab)}
                    data-cy={`lead-settings-tab-${tab}`}
                  >
                    {getTabLabel(tab)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Content based on active tab */}
        <div
          className="w-full lg:col-span-3 mt-6 lg:mt-12"
          data-cy="lead-settings-content-area"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
