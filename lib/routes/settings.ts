export const SETTINGS_PATH = '/setting';

export type SystemSettingsSection =
  | 'profile'
  | 'company'
  | 'users'
  | 'approvals'
  | 'notifications'
  | 'integrations'
  | 'currencies'
  | 'fiscal';

export type FunctionalSettingsSection =
  | 'leads'
  | 'deals'
  | 'types'
  | 'custom-fields'
  | 'roles'
  | 'reports'
  | 'workflow'
  | 'targets'
  | 'prm'
  | 'marketing'
  | 'products'
  | 'journey';

export type SettingsSection = SystemSettingsSection | FunctionalSettingsSection;

export const SYSTEM_SECTIONS: SystemSettingsSection[] = [
  'profile',
  'approvals',
  'notifications',
  'integrations',
  'currencies',
  'fiscal',
];

export const FUNCTIONAL_SECTIONS: FunctionalSettingsSection[] = [
  'leads',
  'deals',
  'types',
  'custom-fields',
  'roles',
  'reports',
  'workflow',
  'targets',
  'prm',
  'journey',
];

export function isSystemSetting(
  section: string,
): section is SystemSettingsSection {
  return SYSTEM_SECTIONS.includes(section as SystemSettingsSection);
}

export function isFunctionalSetting(
  section: string,
): section is FunctionalSettingsSection {
  return FUNCTIONAL_SECTIONS.includes(section as FunctionalSettingsSection);
}

export function settingsPath(section?: SettingsSection) {
  if (!section || section === 'profile') {
    return SETTINGS_PATH;
  }

  return `${SETTINGS_PATH}?section=${section}`;
}

/** Central Marketing Integration settings, optionally opened on a provider detail. */
export function settingsIntegrationsPath(provider?: string | null) {
  if (!provider) return settingsPath('integrations');
  return `${SETTINGS_PATH}?section=integrations&provider=${encodeURIComponent(provider)}`;
}

export function isSettingsPath(pathname: string) {
  return pathname === SETTINGS_PATH || pathname.startsWith(`${SETTINGS_PATH}?`);
}
