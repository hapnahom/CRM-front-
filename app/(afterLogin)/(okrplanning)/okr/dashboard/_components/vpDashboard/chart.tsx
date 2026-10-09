'use client';
import React from 'react';
import { Card } from 'antd';

const VPChart: React.FC = () => {
  return (
    <Card className="mx-6 mb-6">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">VP Chart</h3>
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Chart placeholder</p>
        </div>
      </div>
    </Card>
  );
};

export default VPChart;
