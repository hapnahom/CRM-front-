import React from 'react';
import StatCard from '../shared/StatCard';
import { TbTargetArrow } from 'react-icons/tb';
import { useGetKPIs } from '@/store/server/features/dashboard';
import { isLeadsEnabled } from '@/config/salesWorkflow';

interface NewLeadsCardProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const NewLeadsCard: React.FC<NewLeadsCardProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  const { data: kpiData, isLoading } = useGetKPIs({
    calendarId,
    sessionId,
    monthId,
  });

  // Get new leads data from API response
  const newLeadsData = kpiData?.newLeads || {
    count: 0,
    changeFromLastMonth: 0,
    changePercent: 0,
  };

  // Calculate trend
  const changePercentage = newLeadsData.changePercent || 0;
  const isPositive = changePercentage >= 0;
  const trendValue = Math.abs(changePercentage).toFixed(1);

  if (!isLeadsEnabled()) {
    return null;
  }

  return (
    <StatCard
      title="New Leads"
      value={newLeadsData.count.toLocaleString()}
      trend={{
        value: `${trendValue}%`,
        isPositive: isPositive,
      }}
      icon={<TbTargetArrow className="text-primary text-2xl" />}
      loading={isLoading}
    />
  );
};

export default NewLeadsCard;
