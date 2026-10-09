import React from 'react';
import StatCard from '../shared/StatCard';
import { LiaHandsHelpingSolid } from 'react-icons/lia';
import { useGetKPIs } from '@/store/server/features/dashboard';
import { dealUiLabel } from '@/config/salesWorkflow';

interface ActiveDealsCardProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const ActiveDealsCard: React.FC<ActiveDealsCardProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  const { data: kpiData, isLoading } = useGetKPIs({
    calendarId,
    sessionId,
    monthId,
  });

  // Get active deals data from API response
  const activeDealsData = kpiData?.activeDeals || {
    count: 0,
    changeFromLastMonth: 0,
    changePercent: 0,
  };

  // Calculate trend
  const changeValue = activeDealsData.changeFromLastMonth || 0;
  const isPositive = changeValue >= 0;
  const trendValue = Math.abs(changeValue);

  return (
    <StatCard
      title={`Active ${dealUiLabel({ plural: true })}`}
      value={activeDealsData.count.toLocaleString()}
      trend={{
        value: `${isPositive ? '+' : '-'}${trendValue}`,
        isPositive: isPositive,
      }}
      icon={<LiaHandsHelpingSolid className="text-primary text-2xl" />}
      loading={isLoading}
    />
  );
};

export default ActiveDealsCard;
