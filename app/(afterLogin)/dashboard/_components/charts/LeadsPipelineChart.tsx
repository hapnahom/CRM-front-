import React from 'react';
import {
  dealUiLabel,
  isLeadsEnabled,
  pipelineChartTitle,
} from '@/config/salesWorkflow';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement, // 1. Import LineElement for the combined chart
  PointElement, // 1. Import PointElement for the line chart legend
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Switch } from 'antd';
import ChartContainer from '../shared/ChartContainer';
import { useGetPipeline } from '@/store/server/features/dashboard';
import { tokens } from '@/lib/design-tokens';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement, // 2. Register the new elements
  PointElement,
  Title,
  Tooltip,
  Legend,
);

interface PipelineChartProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const PipelineChart: React.FC<PipelineChartProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  const showLeads = isLeadsEnabled();
  const [isDealsPipeline, setIsDealsPipeline] = React.useState(!showLeads);

  // Get pipeline data from API
  const { data: pipelineData, isLoading } = useGetPipeline({
    pipelineType: isDealsPipeline || !showLeads ? 'deals' : 'leads',
    calendarId,
    sessionId,
    monthId,
  });

  // Transform API data for chart
  const stages = pipelineData?.pipeline?.stages || [];
  const labels = stages.map((stage) => stage.name);
  const dataValues = stages.map((stage) => stage.count);

  // Check if we need horizontal scrolling (more than 5 stages)
  const needsHorizontalScroll = stages.length > 5;

  // Data for the chart
  const data = {
    labels,
    datasets: [
      {
        label:
          isDealsPipeline || !showLeads
            ? dealUiLabel({ plural: true })
            : 'Leads',
        data: dataValues,
        backgroundColor: tokens.color.blue,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.6, // Adjust bar width
        categoryPercentage: 0.7, // Adjust spacing between bars
      },
    ],
  };

  // Configuration options for the chart
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'start' as const,
        labels: {
          // 4. Let Chart.js automatically use the correct style (rect for bar, line for line)
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
        // Display vertical grid lines that separate the categories
        grid: {
          display: true,
          drawOnChartArea: true, // This is true by default
          color: tokens.color.borderDefault,
          drawBorder: false,
        },
        // Hide the main x-axis line
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <ChartContainer
      title={
        showLeads ? (
          <div className="flex w-full items-center justify-between gap-4">
            {/* Left side - Leads Pipeline */}
            <span
              className={`text-sm font-bold transition-colors duration-200 ${
                !isDealsPipeline ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Leads Pipeline
            </span>

            {/* Right side - Deals Pipeline with switch */}
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold transition-colors duration-200 ${
                  isDealsPipeline ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {dealUiLabel({ plural: true })} Pipeline
              </span>
              <Switch
                checked={isDealsPipeline}
                onChange={setIsDealsPipeline}
                className="[&.ant-switch-checked]:bg-primary-muted0"
              />
            </div>
          </div>
        ) : (
          pipelineChartTitle(true)
        )
      }
      loading={isLoading}
    >
      {needsHorizontalScroll ? (
        <div className="overflow-x-auto h-full scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-gray-100 hover:scrollbar-thumb-primary/50">
          <div className="min-w-[600px] h-full">
            <Bar data={data} options={options} />
          </div>
        </div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </ChartContainer>
  );
};

export default PipelineChart;
