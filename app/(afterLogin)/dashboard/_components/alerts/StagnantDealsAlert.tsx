import React from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useGetStagnantDealsStats } from '@/store/server/features/dashboard/stagnant-deals/queries';

const StagnantDealsAlert: React.FC = () => {
  const router = useRouter();
  const { data: stats, isLoading } = useGetStagnantDealsStats();

  const handleReview = () => {
    router.push('/dashboard/stagnant');
  };

  // Don't show alert if no stagnant deals or still loading
  if (isLoading) {
    return <Skeleton.Input active size="large" className="mb-6 w-full h-24" />;
  }

  if (!stats || stats.totalStagnant === 0) {
    return null;
  }

  return (
    <Alert
      message={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-yellow-600" />
            <span className="font-medium">
              {stats.totalStagnant} deals have been stagnant for over 30 days
            </span>
          </div>
        </div>
      }
      description={
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-muted-foreground">
            These deals need immediate attention to prevent loss.
          </span>
          <Button
            type="primary"
            size="small"
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600"
            onClick={handleReview}
          >
            Review
          </Button>
        </div>
      }
      type="warning"
      showIcon={false}
      className="mb-6 border-yellow-200 bg-yellow-50"
    />
  );
};

export default StagnantDealsAlert;
