'use client';
import React from 'react';
import { Card } from 'antd';

const CriteriaCard: React.FC = () => {
  return (
    <Card className="mx-6 mb-6">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Criteria Card</h3>
        <div className="space-y-4">
          <div className="p-3 bg-surface-elevated rounded-lg">
            <p className="text-sm text-muted-foreground">
              Criteria placeholder
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CriteriaCard;
