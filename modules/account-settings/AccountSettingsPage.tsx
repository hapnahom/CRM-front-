'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarRange,
  CheckCircle2,
  Coins,
  User,
  Bell,
  Link2,
  Target,
  TrendingUp,
  Handshake,
  Compass,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FiscalYearSection } from './FiscalYearSection';
import { ProfileSection } from './ProfileSection';
import { CurrenciesSettingsSection } from './CurrenciesSettingsSection';
import { ApprovalWorkflowsSection } from './ApprovalWorkflowsSection';
import { NotificationPreferencesSection } from './NotificationPreferencesSection';
import { IntegrationsSettingsSection } from './IntegrationsSettingsSection';
import { LeadAndDealSettingsSection } from './LeadAndDealSettingsSection';
import {
  leadDealSettingsSectionLabel,
  resolveLeadDealSettingsTab,
} from '@/config/salesWorkflow';
import { SalesTargetingProvider } from '@/components/sales-targeting/SalesTargetingContext';
import { SalesTargetingSettingsPanel } from '@/components/sales-targeting/SalesTargetingSettingsPanel';
import { PRMFunctionalSettingsSection } from './PRMFunctionalSettingsSection';
import { CustomersSettingsPage } from '@/modules/customers/CustomersSettingsPage';
import { settingsPath, type SettingsSection } from '@/lib/routes/settings';
import { IS_CORE } from '@/utils/constants';

interface SettingItemConfig {
  key: SettingsSection;
  icon: typeof User;
  label: string;
  description: string;
  category: 'system' | 'functional';
}

const ALL_SETTINGS: SettingItemConfig[] = [
  {
    key: 'profile',
    icon: User,
    label: 'Profile',
    description: 'Your account details',
    category: 'system',
  },
  {
    key: 'approvals',
    icon: ShieldCheck,
    label: 'Approvals',
    description: 'Stage and exception workflows',
    category: 'system',
  },
  {
    key: 'notifications',
    icon: Bell,
    label: 'Notifications',
    description: 'In-app and email alerts',
    category: 'system',
  },
  {
    key: 'integrations',
    icon: Link2,
    label: 'Integrations',
    description: 'Marketing channels and connections',
    category: 'system',
  },
  {
    key: 'currencies',
    icon: Coins,
    label: 'Currencies',
    description: 'Enabled tenant currencies',
    category: 'system',
  },
  {
    key: 'fiscal',
    icon: CalendarRange,
    label: 'Fiscal Year',
    description: 'Planning calendar and periods',
    category: 'system',
  },
  {
    key: 'leads',
    icon: Target,
    label: leadDealSettingsSectionLabel(),
    description: 'Stages, types, roles, and custom fields',
    category: 'functional',
  },
  {
    key: 'targets',
    icon: TrendingUp,
    label: 'Targets',
    description: 'Target setting method and planning sequencing rules',
    category: 'functional',
  },
  {
    key: 'prm',
    icon: Handshake,
    label: 'Partners',
    description: 'Roles, tiers, and workflows',
    category: 'functional',
  },
  {
    key: 'journey',
    icon: Compass,
    label: 'Customers',
    description: 'Journey stages and vectors',
    category: 'functional',
  },
];

const AVAILABLE_SETTINGS = IS_CORE
  ? ALL_SETTINGS.filter((item) => item.key !== 'profile')
  : ALL_SETTINGS;

const DEFAULT_SETTINGS_SECTION: SettingsSection =
  AVAILABLE_SETTINGS[0]?.key ?? 'approvals';

export function AccountSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const [active, setActive] = useState<SettingsSection>(
    DEFAULT_SETTINGS_SECTION,
  );
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const leadDealTab = resolveLeadDealSettingsTab(sectionParam);
  const settingsCatalog = AVAILABLE_SETTINGS.map((item) =>
    item.key === 'leads'
      ? { ...item, label: leadDealSettingsSectionLabel() }
      : item,
  );

  useEffect(() => {
    if (
      sectionParam === 'deals' ||
      sectionParam === 'leads' ||
      sectionParam === 'types' ||
      sectionParam === 'custom-fields' ||
      sectionParam === 'roles' ||
      sectionParam === 'solution-roles' ||
      sectionParam === 'reports' ||
      sectionParam === 'workflow'
    ) {
      setActive('leads');
      return;
    }
    if (
      sectionParam &&
      AVAILABLE_SETTINGS.some((s) => s.key === sectionParam)
    ) {
      setActive(sectionParam as SettingsSection);
      return;
    }
    // Core embeds profile elsewhere — never land on Profile here.
    if (IS_CORE && (!sectionParam || sectionParam === 'profile')) {
      setActive(DEFAULT_SETTINGS_SECTION);
      router.replace(settingsPath(DEFAULT_SETTINGS_SECTION), { scroll: false });
      return;
    }
    setActive(DEFAULT_SETTINGS_SECTION);
  }, [sectionParam, router]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setSection = (section: SettingsSection) => {
    setActive(section);
    router.replace(settingsPath(section), { scroll: false });
  };

  const currentSetting = useMemo(
    () => settingsCatalog.find((s) => s.key === active) || settingsCatalog[0],
    [active, settingsCatalog],
  );

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return settingsCatalog;
    const q = searchQuery.toLowerCase();
    return settingsCatalog.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [searchQuery, settingsCatalog]);

  const systemItems = useMemo(
    () => filteredSettings.filter((s) => s.category === 'system'),
    [filteredSettings],
  );

  const functionalItems = useMemo(
    () => filteredSettings.filter((s) => s.category === 'functional'),
    [filteredSettings],
  );

  const renderNavGroup = (title: string, items: SettingItemConfig[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {items.length}
          </span>
        </div>
        {items.map((item) => {
          const NavIcon = item.icon;
          const isCurrent = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                isCurrent
                  ? 'bg-brand-muted text-brand'
                  : 'text-foreground hover:bg-surface-elevated',
              )}
            >
              <NavIcon
                size={15}
                className={cn(
                  'shrink-0',
                  isCurrent ? 'text-brand' : 'text-muted-foreground',
                )}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-[12px] leading-tight',
                    isCurrent ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-[11px] leading-tight',
                    isCurrent ? 'text-brand/70' : 'text-muted-foreground',
                  )}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full w-full bg-white p-4 sm:p-6">
      <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="h-fit w-full shrink-0 self-start rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)] lg:w-80 lg:overflow-y-auto">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h1 className="m-0 text-[20px] font-semibold text-foreground">
              Settings
            </h1>
            <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
              System and module preferences
            </p>
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search settings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-border bg-white pl-8 text-[12px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-5 p-3 sm:p-4">
            {renderNavGroup('System', systemItems)}
            {renderNavGroup('Modules', functionalItems)}

            {filteredSettings.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                No settings match &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {saved && (
            <div className="mb-4 flex justify-end">
              <Badge className="gap-1 border-emerald-200 bg-emerald-50 py-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Changes saved
              </Badge>
            </div>
          )}

          <div className="mb-5 border-b border-border pb-4">
            <h2 className="m-0 text-[20px] font-semibold text-foreground">
              {currentSetting.label}
            </h2>
            <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
              {currentSetting.description}
            </p>
          </div>

          {active === 'profile' && !IS_CORE && (
            <ProfileSection onSave={handleSave} />
          )}
          {active === 'approvals' && <ApprovalWorkflowsSection />}
          {active === 'notifications' && <NotificationPreferencesSection />}
          {active === 'integrations' && <IntegrationsSettingsSection />}
          {active === 'currencies' && (
            <CurrenciesSettingsSection onSave={handleSave} />
          )}
          {active === 'fiscal' && <FiscalYearSection onSave={handleSave} />}
          {active === 'leads' && (
            <LeadAndDealSettingsSection initialTab={leadDealTab} />
          )}
          {active === 'targets' && (
            <SalesTargetingProvider>
              <SalesTargetingSettingsPanel
                onSave={handleSave}
                embedded
                panelMode="planning-admin"
              />
            </SalesTargetingProvider>
          )}
          {active === 'prm' && <PRMFunctionalSettingsSection />}
          {active === 'journey' && <CustomersSettingsPage />}
        </div>
      </div>
    </div>
  );
}
