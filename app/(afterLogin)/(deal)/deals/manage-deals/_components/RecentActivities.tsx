import {
  useFilterDealActivities,
  useGetDealActivitiesTypes,
} from '@/store/server/features/deals/activity/query';
import { getIconByKey } from '@/utils/activityIcons';
import { Button, Card, Typography, List, Empty, Spin } from 'antd';

const { Title, Text } = Typography;

interface Activity {
  id: string;
  type: string;
  activityName: string;
  description: string;
  date: string;
  status?: 'completed' | 'pending' | 'in-progress';
  activityTypeId?: string;
}

interface RecentActivitiesProps {
  dealId: string;
}

export default function RecentActivities({ dealId }: RecentActivitiesProps) {
  const filters = {
    dealId: dealId,
    priority: '',
    activityDate: '',
    activityType: '',
  };

  const { data: filterActivities } = useFilterDealActivities(
    filters.dealId || '',
    filters.priority || '',
    filters.activityDate || '',
    filters.activityType || '',
  );
  const { data: dealActivitiesTypes } = useGetDealActivitiesTypes();

  const activities = filterActivities?.data
    ? filterActivities.data
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 2)
        .map((activity: any) => ({
          id: activity.id,
          type: activity.activityType?.name || 'Activity',
          activityName:
            activity.activityName || activity.activityType?.name || 'Activity',
          description: activity.description,
          date: new Date(activity.createdAt).toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          status: activity.status?.toLowerCase() || 'pending',
          activityTypeId: activity.activityTypeId,
        }))
    : [];

  const isLoading = !filterActivities;

  const getActivityColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return {
          background: 'bg-surface-card',
          border: 'border-green-500',
        };
      case 'in-progress':
        return {
          background: 'bg-surface-card',
          border: 'border-primary',
        };
      case 'pending':
        return {
          background: 'bg-surface-card',
          border: 'border-yellow-500',
        };
      default:
        return {
          background: 'bg-surface-card',
          border: 'border-gray-500',
        };
    }
  };

  const handleViewAll = () => {
    // Navigate to full activities page or open modal
    // You can implement navigation to a dedicated activities page
    // router.push(`/deals/manage-deals/${dealId}/activities`);
  };

  if (isLoading) {
    return (
      <Card
        title={
          <div className="flex items-center justify-between">
            <Title level={5} style={{ margin: 0 }}>
              Recent Activities
            </Title>
            <Button type="link" className="text-primary p-0" disabled>
              View All
            </Button>
          </div>
        }
      >
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>
            Recent Activities
          </Title>
          <Button
            type="link"
            className="text-primary p-0"
            onClick={handleViewAll}
          >
            View All
          </Button>
        </div>
      }
    >
      {activities.length === 0 ? (
        <Empty
          description="No recent activities"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          split={false}
          dataSource={activities}
          renderItem={(activity: Activity) => {
            const colors = getActivityColor(activity.status);

            return (
              <List.Item
                className={`border ${colors.border} rounded-lg ${colors.background} p-4 mb-3 `}
              >
                <div className="flex items-start gap-3 w-full">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 flex-shrink-0`}
                  >
                    {(() => {
                      const activityType = dealActivitiesTypes?.find(
                        (type: any) =>
                          type.id === (activity as any).activityTypeId,
                      );
                      const iconData = activityType
                        ? getIconByKey(activityType.activityIcon)
                        : null;
                      return iconData ? (
                        <i className="w-[14px] h-[14px] text-primary text-brand">
                          {iconData.icon}
                        </i>
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Text strong className="text-foreground block">
                          {activity.activityName}
                        </Text>
                        <div className="mt-1">
                          <Text type="secondary" className="text-sm">
                            {activity.description}
                          </Text>
                        </div>
                      </div>
                      <Text
                        type="secondary"
                        className="text-xs whitespace-nowrap ml-2"
                      >
                        {activity.date}
                      </Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
