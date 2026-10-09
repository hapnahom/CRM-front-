import { tokens } from '@/lib/design-tokens';
import {
  DashboardQueryParams,
  KPISQueryParams,
  PipelineQueryParams,
  ConversionFunnelQueryParams,
  LeadSourcesQueryParams,
  ActivitiesQueryParams,
  StagnantDealsQueryParams,
  StagnantDealsStats,
} from './types';

// --- Query String Building Utilities ---

/**
 * Remove undefined values from params object for React Query key consistency
 */
export const cleanParams = <T extends Record<string, any>>(
  params: T,
): Partial<T> => {
  const cleaned: Partial<T> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key as keyof T] = value;
    }
  });
  return cleaned;
};

/**
 * Build query string from dashboard query parameters
 * Maps frontend parameter names to backend parameter names
 */
export const buildDashboardQueryString = (
  params: DashboardQueryParams,
): string => {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Map frontend params to backend params
      let backendKey = key;
      if (key === 'calendarId') {
        backendKey = 'yearId'; // Backend expects yearId for calendar
      } else if (key === 'sessionId') {
        backendKey = 'quarterId'; // Backend expects quarterId for session
      }
      // monthId stays as monthId

      if (value instanceof Date) {
        urlParams.append(backendKey, value.toISOString());
      } else {
        urlParams.append(backendKey, String(value));
      }
    }
  });

  return urlParams.toString();
};

/**
 * Build query string from KPI query parameters
 */
export const buildKPIQueryString = (params: KPISQueryParams): string => {
  return buildDashboardQueryString(params);
};

/**
 * Build query string from pipeline query parameters
 */
export const buildPipelineQueryString = (
  params: PipelineQueryParams,
): string => {
  return buildDashboardQueryString(params);
};

/**
 * Build query string from conversion funnel query parameters
 */
export const buildConversionFunnelQueryString = (
  params: ConversionFunnelQueryParams,
): string => {
  return buildDashboardQueryString(params);
};

/**
 * Build query string from lead sources query parameters
 */
export const buildLeadSourcesQueryString = (
  params: LeadSourcesQueryParams,
): string => {
  return buildDashboardQueryString(params);
};

/**
 * Build query string from activities query parameters
 */
export const buildActivitiesQueryString = (
  params: ActivitiesQueryParams,
): string => {
  return buildDashboardQueryString(params);
};

/**
 * Build query string from stagnant deals query parameters
 */
export const buildStagnantDealsQueryString = (
  params: StagnantDealsQueryParams,
): string => {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (value instanceof Date) {
        urlParams.append(key, value.toISOString());
      } else {
        urlParams.append(key, String(value));
      }
    }
  });

  return urlParams.toString();
};

// --- Date and Period Utilities ---

/**
 * Get default date range for a given period
 */
export const getDefaultDateRange = (
  period: string,
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );

  switch (period) {
    case 'week':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { startDate: startOfWeek, endDate: endOfDay };

    case 'month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };

    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        startDate: new Date(now.getFullYear(), quarterStart, 1),
        endDate: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59),
      };

    case 'year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };

    default:
      return { startDate: startOfDay, endDate: endOfDay };
  }
};

/**
 * Validate dashboard query parameters
 */
export const validateDashboardQueryParams = (
  params: DashboardQueryParams,
): string[] => {
  const errors: string[] = [];

  // Validate custom period requires both start and end dates
  if (params.period === 'custom') {
    if (!params.startDate) {
      errors.push('startDate is required for custom period');
    }
    if (!params.endDate) {
      errors.push('endDate is required for custom period');
    }
    if (
      params.startDate &&
      params.endDate &&
      params.startDate > params.endDate
    ) {
      errors.push('startDate must be before endDate');
    }
  }

  // Validate currency format - Allow any 3-letter ISO currency code
  if (params.currency) {
    // Check if it's a valid 3-letter currency code format
    const currencyRegex = /^[A-Z]{3}$/;
    if (!currencyRegex.test(params.currency.toUpperCase())) {
      errors.push(
        'currency must be a valid 3-letter ISO currency code (e.g., USD, EUR, AUD, GBP)',
      );
    }
  }

  // Validate period format
  if (
    params.period &&
    !['week', 'month', 'quarter', 'year', 'custom'].includes(params.period)
  ) {
    errors.push('period must be week, month, quarter, year, or custom');
  }

  // Validate activities limit
  if (
    params.activitiesLimit &&
    (params.activitiesLimit < 1 || params.activitiesLimit > 100)
  ) {
    errors.push('activitiesLimit must be between 1 and 100');
  }

  return errors;
};

/**
 * Validate stagnant deals query parameters
 */
export const validateStagnantDealsQueryParams = (
  params: StagnantDealsQueryParams,
): string[] => {
  const errors: string[] = [];

  // Validate pagination
  if (params.page && params.page < 1) {
    errors.push('page must be greater than 0');
  }

  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    errors.push('limit must be between 1 and 100');
  }

  // Validate date format (YYYY-MM-DD)
  if (params.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.date)) {
      errors.push('date must be in YYYY-MM-DD format');
    }
  }

  // Validate currency format
  if (params.currency) {
    const validCurrencies = ['USD', 'AUD', 'EUR', 'GBP', 'CAD', 'ETB']; // Add more as needed
    if (!validCurrencies.includes(params.currency.toUpperCase())) {
      errors.push(`currency must be one of: ${validCurrencies.join(', ')}`);
    }
  }

  return errors;
};

// --- Stagnant Deals Utilities ---

/**
 * Get stagnation level based on days
 */
export const getStagnationLevel = (
  stagnationDays: number,
): 'Low' | 'Medium' | 'High' | 'Critical' => {
  if (stagnationDays >= 90) return 'Critical';
  if (stagnationDays >= 60) return 'High';
  if (stagnationDays >= 30) return 'Medium';
  return 'Low';
};

/**
 * Get stagnation level color for UI
 */
export const getStagnationLevelColor = (
  level: 'Low' | 'Medium' | 'High' | 'Critical',
): string => {
  switch (level) {
    case 'Critical':
      return tokens.color.error; // red-600
    case 'High':
      return tokens.color.orange; // orange-600
    case 'Medium':
      return tokens.color.warning; // amber-600
    case 'Low':
      return tokens.color.success; // emerald-600
    default:
      return tokens.color.textMuted; // gray-500
  }
};

/**
 * Calculate stagnant deals statistics
 */
export const calculateStagnantDealsStats = (
  deals: any[],
): StagnantDealsStats => {
  const stats: StagnantDealsStats = {
    totalStagnant: deals.length,
    criticalStagnant: 0,
    highStagnant: 0,
    mediumStagnant: 0,
  };

  deals.forEach((deal) => {
    const level =
      deal.stagnationLevel ?? getStagnationLevel(deal.stagnationDays);
    switch (level) {
      case 'Critical':
        stats.criticalStagnant++;
        break;
      case 'High':
        stats.highStagnant++;
        break;
      case 'Medium':
        stats.mediumStagnant++;
        break;
    }
  });

  return stats;
};

// --- Formatting Utilities ---

/**
 * Format currency for display
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format percentage for display
 */
export const formatPercentage = (
  value: number,
  decimals: number = 1,
): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format relative time for activities
 */
export const formatRelativeTime = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000)
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Format large numbers with K/M/B suffixes
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
