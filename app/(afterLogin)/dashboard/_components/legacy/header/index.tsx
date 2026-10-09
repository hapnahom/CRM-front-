'use client';

import { tokens } from '@/lib/design-tokens';

import { Card, Progress } from 'antd';
import { useRouter } from 'next/navigation';
import { GoGoal } from 'react-icons/go';

type ObjectiveDashboard = {
  userOkr: number;
  okrCompleted: number;
  keyResultCount: number;
  supervisorOkr: number;
  supervisorKeyResultAchieved: number;
  supervisorKeyResultCount: number;
  companyOkr: number;
};

const Header = () => {
  // const { userId } = useAuthenticationStore(); // Commented out since not used
  const router = useRouter();

  // Default dashboard data
  const objectiveDashboard: ObjectiveDashboard = {
    userOkr: 0,
    okrCompleted: 0,
    keyResultCount: 1,
    supervisorOkr: 0,
    supervisorKeyResultAchieved: 0,
    supervisorKeyResultCount: 1,
    companyOkr: 0,
  };

  const vpScore = { score: 0 };
  const isLoading = false;

  const onDetail = () => {
    router.push('/dashboard/vp');
  };

  // Helper function to calculate percentage
  const calculatePercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return (completed / total) * 100;
  };

  // Card component to reduce duplication
  const StatCard = ({
    title,
    value,
    achieved,
    total,
    loading = false,
    onClick,
  }: {
    title: string;
    value: string | number | React.ReactNode;
    achieved: number;
    total: number;
    loading?: boolean;
    onClick?: () => void;
  }) => (
    <Card
      loading={loading}
      bordered={false}
      bodyStyle={{ padding: '10px' }}
      className="flex flex-col gap-4 rounded-lg bg-surface-card p-2 min-w-52 sm:shrink-0 shadow-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="bg-muted rounded-md">
          <GoGoal size={12} className="text-[#7152f3] w-8 h-8 p-2" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">{value}</div>
        <div className="xl:min-w-28">
          <div className="text-xs text-muted-foreground text-end">
            <span className="text-brand">{achieved}</span>{' '}
            {total > 1 ? 'Key Results' : 'Key Result'} Achieved
          </div>
          <Progress
            percent={calculatePercentage(achieved, total)}
            showInfo={false}
            strokeColor={tokens.color.brand}
            trailColor={tokens.color.surfaceSelected}
          />
        </div>
      </div>
      <div className="text-muted-foreground w-full text-start text-xs">
        {title}
      </div>
    </Card>
  );

  return (
    <div className="w-full pb-6 flex overflow-x-auto 2xl:grid 2xl:grid-cols-5 gap-4 scrollbar-none">
      <StatCard
        title="Average OKR"
        value={objectiveDashboard.userOkr.toFixed(2)}
        achieved={objectiveDashboard.okrCompleted}
        total={objectiveDashboard.keyResultCount}
        loading={isLoading}
      />

      <StatCard
        title="Supervisor OKR"
        value={objectiveDashboard.supervisorOkr.toFixed(2)}
        achieved={objectiveDashboard.supervisorKeyResultAchieved}
        total={objectiveDashboard.supervisorKeyResultCount}
        loading={isLoading}
      />

      <StatCard
        title="Company OKR"
        value={objectiveDashboard.companyOkr.toFixed(2)}
        achieved={Math.round(objectiveDashboard.companyOkr)}
        total={100}
        loading={isLoading}
      />

      <StatCard
        title="KR Planned"
        value={
          <>
            <span className="text-xl font-bold">
              {objectiveDashboard.okrCompleted}
            </span>
            <span className="text-xs font-bold">
              {' / '}
              {objectiveDashboard.keyResultCount}
            </span>
          </>
        }
        achieved={objectiveDashboard.okrCompleted}
        total={objectiveDashboard.keyResultCount}
        loading={isLoading}
      />

      <StatCard
        title="Total VP Score"
        value={`${vpScore.score}%`}
        achieved={vpScore.score}
        total={30}
        loading={isLoading}
        onClick={onDetail}
      />
    </div>
  );
};

export default Header;
