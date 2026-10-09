import React from 'react';
import { EyeOutlined } from '@ant-design/icons';
import StatCard from '../shared/StatCard';
import { useGetKPIs } from '@/store/server/features/dashboard';

interface ConversionRateCardProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const ConversionRateCard: React.FC<ConversionRateCardProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  const { data: kpiData, isLoading } = useGetKPIs({
    calendarId,
    sessionId,
    monthId,
  });

  // Get conversion rate data from API response
  const conversionRateData = kpiData?.conversionRate || {
    rate: 0,
    changePercent: 0,
  };

  // Calculate trend
  const changePercentage = conversionRateData.changePercent || 0;
  const isPositive = changePercentage >= 0;
  const trendValue = Math.abs(changePercentage).toFixed(1);

  return (
    <StatCard
      title="Conversion Rate"
      value={`${conversionRateData.rate.toFixed(1)}%`}
      trend={{
        value: `${trendValue}%`,
        isPositive: isPositive,
      }}
      icon={<EyeOutlined className="text-primary text-2xl" />}
      loading={isLoading}
    />
  );
};

export default ConversionRateCard;
