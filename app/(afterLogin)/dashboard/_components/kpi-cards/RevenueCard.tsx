import React, { useState, useMemo } from 'react';
import { DollarOutlined } from '@ant-design/icons';
import StatCard from '../shared/StatCard';
import { useGetKPIs } from '@/store/server/features/dashboard';

interface RevenueCardProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const RevenueCard: React.FC<RevenueCardProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  // State to track user's currency filter by ID (undefined = backend default)
  const [currencyIdFilter, setCurrencyIdFilter] = useState<string | undefined>(
    undefined,
  );

  // Build query params object with BOTH calendar filters AND currency ID (stable reference)
  const queryParams = useMemo(() => {
    const params: any = {};

    // Add calendar filters from parent
    if (calendarId) params.calendarId = calendarId;
    if (sessionId) params.sessionId = sessionId;
    if (monthId) params.monthId = monthId;

    // Add currency filter by ID (internal state)
    if (currencyIdFilter) params.currencyId = currencyIdFilter;

    return params;
  }, [calendarId, sessionId, monthId, currencyIdFilter]);

  // Pass currency ID filter to API - backend will return that currency as primary
  const { data: kpiData, isLoading } = useGetKPIs(queryParams);

  // Format currency value
  const formatCurrency = (value: number, currency: string) => {
    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return formatter.format(value);
    } catch (error) {
      // Fallback for non-ISO currencies like GOLD, crypto, etc.
      return `${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} ${currency}`;
    }
  };

  // Get revenue data from API response
  const revenueData = kpiData?.totalRevenue || {
    value: 0,
    changePercent: 0,
    primaryCurrency: 'USD',
    breakdown: [],
  };

  // Calculate trend
  const changePercentage = revenueData.changePercent || 0;
  const isPositive = changePercentage >= 0;
  const trendValue = Math.abs(changePercentage).toFixed(1);

  // Format currency breakdown data from API
  const formatBreakdownCurrency = (amount: number, curr: string) => {
    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
      return formatter.format(amount);
    } catch (error) {
      // Fallback for non-ISO currencies like GOLD, crypto, etc.
      return `${amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })} ${curr}`;
    }
  };

  // Handler for when user clicks a breakdown currency - triggers API refetch
  const handleCurrencySwitch = (currency: string, currencyId: string) => {
    // Skip non-ISO currencies like GOLD (they're for display only)
    const nonFilterableCurrencies = ['GOLD', 'SILVER'];
    if (nonFilterableCurrencies.includes(currency.toUpperCase())) {
      return;
    }

    // Send currency ID to backend for filtering
    setCurrencyIdFilter(currencyId);
  };

  // Display what backend sends as primary (backend controls the filtering)
  const displayCurrency = revenueData.primaryCurrency || 'USD';
  const displayValue = revenueData.value;

  // Breakdown: explicitly filter out primary currency (even if backend includes it)
  const placeholderData = (revenueData.breakdown || [])
    .filter((item) => {
      // Remove empty, null, or undefined currencies
      if (!item.currency || item.currency.trim() === '') return false;

      // IMPORTANT: Remove if it matches the current primary currency
      if (item.currency === displayCurrency) {
        return false;
      }

      return true;
    })
    .map((item) => {
      try {
        return {
          label: item.currency,
          value: formatBreakdownCurrency(item.amount, item.currency),
          onClick: () => handleCurrencySwitch(item.currency, item.currencyId),
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean) as { label: string; value: string; onClick: () => void }[];

  return (
    <StatCard
      title="Total Revenue"
      value={formatCurrency(displayValue, displayCurrency)}
      trend={{
        value: `${trendValue}%`,
        isPositive: isPositive,
      }}
      icon={<DollarOutlined className="text-primary text-2xl" />}
      loading={isLoading}
      placeholderData={placeholderData}
    />
  );
};

export default RevenueCard;
