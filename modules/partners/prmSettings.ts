'use client';

export interface PRMLifecycleStage {
  id: string;
  name: string;
  order: number;
  enabled: boolean;
  description?: string;
  requirement?: string;
  color?: string;
}

export interface PRMSettings {
  enableLifecycleStages: boolean;
  lifecycleStages: PRMLifecycleStage[];
  // Deal registration settings
  dealRegistrationSlaHours: number;
  priceProtectionDays: number;
  autoMapToCrmPipeline: boolean;
  // Tier criteria
  tierPlatinumMinRevenue: number;
  tierGoldMinRevenue: number;
  tierSilverMinRevenue: number;
  // 4-pillar scorecard weights
  scorecardCommercialWeight: number;
  scorecardCapabilityWeight: number;
  scorecardEngagementWeight: number;
  scorecardGovernanceWeight: number;
}

export const DEFAULT_PRM_SETTINGS: PRMSettings = {
  enableLifecycleStages: true,
  lifecycleStages: [
    {
      id: 'stg-1',
      order: 1,
      name: 'Onboarding',
      enabled: true,
      description: 'Initial legal agreement & company verification',
      requirement: 'Signed Partner NDA & Company Registration',
    },
    {
      id: 'stg-2',
      order: 2,
      name: 'Authorization',
      enabled: true,
      description: 'Product family & territory authorization',
      requirement: 'Vendor Product Matrix Approval',
    },
    {
      id: 'stg-3',
      order: 3,
      name: 'Certified',
      enabled: true,
      description: 'Technical certifications verified',
      requirement: 'Min. 1 Certified Engineer (CCIE/AWS/NSE)',
    },
    {
      id: 'stg-4',
      order: 4,
      name: 'Active Partner',
      enabled: true,
      description: 'Actively transacting & registering deals',
      requirement: 'Active price protected deal registration',
    },
    {
      id: 'stg-5',
      order: 5,
      name: 'Strategic',
      enabled: true,
      description: 'High-volume tier 1 revenue partner',
      requirement: 'Over $1M Annual Attained Revenue',
    },
    {
      id: 'stg-6',
      order: 6,
      name: 'At Risk',
      enabled: true,
      description: 'Low engagement or expiring certifications',
      requirement: 'PAM Escalation required within 14 days',
    },
    {
      id: 'stg-7',
      order: 7,
      name: 'Inactive',
      enabled: true,
      description: 'Dormant or terminated partnership',
      requirement: 'Formal offboarding executed',
    },
  ],
  dealRegistrationSlaHours: 48,
  priceProtectionDays: 90,
  autoMapToCrmPipeline: true,
  tierPlatinumMinRevenue: 2500000,
  tierGoldMinRevenue: 1000000,
  tierSilverMinRevenue: 250000,
  scorecardCommercialWeight: 40,
  scorecardCapabilityWeight: 25,
  scorecardEngagementWeight: 20,
  scorecardGovernanceWeight: 15,
};

const PRM_SETTINGS_STORAGE_KEY = 'prm_configurable_settings_v2';

export function getPRMSettings(): PRMSettings {
  if (typeof window === 'undefined') return DEFAULT_PRM_SETTINGS;
  try {
    const raw = localStorage.getItem(PRM_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRM_SETTINGS;
    return { ...DEFAULT_PRM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRM_SETTINGS;
  }
}

export function savePRMSettings(settings: PRMSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('prm-settings-updated'));
  } catch {
    // storage fallback
  }
}
