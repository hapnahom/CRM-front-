import { tokens } from '@/lib/design-tokens';
import {
  conversionFunnelChartTitle,
  dealUiLabel,
  isLeadsEnabled,
} from '@/config/salesWorkflow';
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartContainer from '../shared/ChartContainer';
import { useGetConversionFunnel } from '@/store/server/features/dashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface ConversionFunnelChartProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  // Get conversion funnel data from API
  const { data: funnelData, isLoading } = useGetConversionFunnel({
    calendarId,
    sessionId,
    monthId,
  });

  // Transform API data for chart with proper validation
  const periods = Array.isArray(funnelData?.data) ? funnelData.data : [];
  const labels = periods.map((period) => period.period || '');
  const dealsData = periods.map((period) => period.deals || 0);
  const leadsData = periods.map((period) => period.leads || 0);

  const showLeads = isLeadsEnabled();
  const data = {
    labels,
    datasets: [
      {
        label: `${dealUiLabel({ plural: true })} Closed`,
        data: dealsData,
        borderColor: tokens.color.purple,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        pointStyle: 'circle',
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 2,
      },
      ...(showLeads
        ? [
            {
              label: 'Leads Generated',
              data: leadsData,
              borderColor: tokens.color.success,
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderDash: [5, 5],
              tension: 0.4,
              pointStyle: 'circle' as const,
              pointRadius: 6,
              pointHoverRadius: 8,
              borderWidth: 2,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'start' as const,
        labels: {
          usePointStyle: false,
          boxWidth: 12,
          padding: 25,
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: tokens.color.textSubtle,
        },
        grid: {
          color: tokens.color.borderDefault,
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          color: tokens.color.textPrimary,
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          color: tokens.color.borderDefault,
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <ChartContainer title={conversionFunnelChartTitle()} loading={isLoading}>
      <Line data={data} options={options} />
    </ChartContainer>
  );
};

export default ConversionFunnelChart;
