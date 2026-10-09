import React, { useState, useEffect } from 'react';
import { Avatar, Skeleton } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useGetDashboardActivities } from '@/store/server/features/dashboard';
import { useUserNames } from '../../_hooks';
import ChartContainer from '../shared/ChartContainer';
interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar?: string;
}

interface RecentActivitiesProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
  limit?: number;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  calendarId,
  sessionId,
  monthId,
  limit = 10,
}) => {
  // State to track screen size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);

  // Get dashboard activities from API
  const { data: activitiesData, isLoading } = useGetDashboardActivities({
    calendarId,
    sessionId,
    monthId,
    activitiesLimit: limit,
  });

  // Get user names mapping
  const { getUserName } = useUserNames();

  // Handle window resize for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Transform API data to component format
  const activities: Activity[] =
    activitiesData?.activities?.map((activity) => ({
      id: activity.id,
      user: getUserName(activity.user), // Use actual user name instead of ID
      action: activity.description,
      time: activity.relativeTime,
    })) || [];

  // Loading skeleton
  if (isLoading) {
    return (
      <ChartContainer title="Recent Activities" loading={true}>
        <div className="space-y-3 pr-2">
          {/* eslint-disable-next-line */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3">
              <Skeleton.Avatar active size={40} />
              <div className="flex-1">
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: '60%', marginBottom: 8 }}
                />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: '90%', marginBottom: 4 }}
                />
                <Skeleton.Input active size="small" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Recent Activities"
      chartHeight={isMobile ? 'h-[400px]' : 'h-[350px]'}
    >
      {/* Scrollable activities list */}
      <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="space-y-3 pr-2">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
              >
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  className="bg-gray-200 text-muted-foreground flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {activity.user}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {activity.action}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No recent activities found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try changing the time period
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  );
};

export default RecentActivities;
