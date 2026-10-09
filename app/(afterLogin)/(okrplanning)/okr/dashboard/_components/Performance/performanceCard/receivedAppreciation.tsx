import React from 'react';

interface ReceivedAppreciationProps {
  kpi: number;
  engagement: number;
}

const ReceivedAppreciation: React.FC<ReceivedAppreciationProps> = ({
  kpi,
  engagement,
}) => {
  return (
    <div className="bg-surface-card p-4 rounded-lg border border-border">
      <div className="text-sm font-medium text-muted-foreground">
        Received Appreciations
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">KPI</div>
          <div className="text-lg font-semibold text-green-600">{kpi}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Engagement</div>
          <div className="text-lg font-semibold text-green-600">
            {engagement}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivedAppreciation;
