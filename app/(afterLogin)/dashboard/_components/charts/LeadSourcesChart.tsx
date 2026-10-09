import { tokens } from '@/lib/design-tokens';
import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import ChartContainer from '../shared/ChartContainer';
import { useGetLeadSources } from '@/store/server/features/dashboard';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Simple, clean plugin that shows labels only on large enough segments
const cleanLabelsPlugin = {
  id: 'cleanLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx, data } = chart;

    if (
      !data ||
      !data.datasets ||
      !data.datasets[0] ||
      !data.datasets[0].data
    ) {
      return;
    }

    ctx.save();

    // Calculate total for percentage
    const total = data.datasets[0].data.reduce(
      (acc: number, val: number) => acc + val,
      0,
    );

    data.datasets[0].data.forEach((value: any, index: number) => {
      const meta = chart.getDatasetMeta(0).data[index];
      if (!meta) return;

      const { x, y } = meta.getCenterPoint();
      const label = data.labels[index];

      if (!label) return;

      // Calculate percentage of this segment
      const percentage = (value / total) * 100;

      // Calculate segment angle and dimensions
      const startAngle = meta.startAngle;
      const endAngle = meta.endAngle;
      const segmentAngle = endAngle - startAngle;
      const radius = (meta.outerRadius + meta.innerRadius) / 2;

      // Calculate available width at the center of the segment
      // Using chord length formula: 2 * r * sin(angle/2)
      const availableWidth = 2 * radius * Math.sin(segmentAngle / 2);

      // Strategy: Smart text fitting with truncation
      // Always try to show some text, not just numbers
      // Use more generous width allowance for better readability

      ctx.fillStyle = tokens.color.surfaceCard;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Helper function to fit text within available width
      const fitText = (
        text: string,
        maxWidth: number,
        minChars: number = 3,
      ): string | null => {
        ctx.font = 'bold 10px sans-serif';
        const fullTextWidth = ctx.measureText(text).width;

        if (fullTextWidth <= maxWidth) {
          return text; // Full text fits
        }

        // Progressively truncate
        let truncateLength = text.length;
        while (truncateLength >= minChars) {
          const truncated = text.substring(0, truncateLength) + '...';
          const testWidth = ctx.measureText(truncated).width;

          if (testWidth <= maxWidth) {
            return truncated;
          }
          truncateLength -= 1;
        }

        return null; // Cannot fit meaningful text
      };

      if (percentage > 5 && segmentAngle > Math.PI / 8) {
        // Medium to large segments - try to show text with truncation

        // Use 85% of available width for better fit
        const maxAllowedWidth = availableWidth * 0.85;

        // Try full label + count on same line
        ctx.font = 'bold 10px sans-serif';
        const labelWithCount = `${label} ${value}`;
        const combinedWidth = ctx.measureText(labelWithCount).width;

        if (combinedWidth <= maxAllowedWidth) {
          // Full label + count fits on same line
          ctx.fillText(labelWithCount, x, y);
        } else {
          // Try two-line approach: label on top, count below
          ctx.font = 'bold 10px sans-serif';
          const labelWidth = ctx.measureText(label).width;

          if (labelWidth <= maxAllowedWidth) {
            // Full label fits on one line, count on another
            ctx.fillText(label, x, y - 8);
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(value.toString(), x, y + 8);
          } else {
            // Label needs truncation
            const fittedLabel = fitText(label, maxAllowedWidth, 3);

            if (fittedLabel) {
              // Show truncated label + count
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText(fittedLabel, x, y - 8);
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText(value.toString(), x, y + 8);
            } else {
              // Extremely small - show count only as last resort
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText(value.toString(), x, y);
            }
          }
        }
      }
      // Very small segments (<5%): Show nothing inside, users will use legend/tooltip
    });

    ctx.restore();
  },
};

interface LeadSourcesChartProps {
  calendarId?: string;
  sessionId?: string;
  monthId?: string;
}

const LeadSourcesChart: React.FC<LeadSourcesChartProps> = ({
  calendarId,
  sessionId,
  monthId,
}) => {
  // State to track screen size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);

  // Get lead sources data from API
  const { data: leadSourcesData, isLoading } = useGetLeadSources({
    calendarId,
    sessionId,
    monthId,
  });

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

  // Transform API data for chart
  const sources = leadSourcesData?.sources || [];
  const labels = sources.map((source) => source.name);
  const dataValues = sources.map((source) => source.count);
  const colors = sources.map((source) => source.color || tokens.color.blue); // Fallback color

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: colors,
        borderColor: tokens.color.surfaceCard,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // Remove duplicate title since ChartContainer already has one
      legend: {
        display: true,
        position: isMobile ? ('bottom' as const) : ('right' as const),
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: isMobile ? 10 : 15,
          boxWidth: 8,
          font: { size: isMobile ? 12 : 14 },
          generateLabels: function (chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets[0].data.length) {
              return data.labels.map((label: string, index: number) => ({
                text: `${label}: ${data.datasets[0].data[index]}`,
                fillStyle: data.datasets[0].backgroundColor[index],
                strokeStyle: data.datasets[0].borderColor,
                lineWidth: data.datasets[0].borderWidth,
                hidden: false,
                index: index,
              }));
            }
            return [];
          },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
      // IMPORTANT: Remove the 'datalabels' configuration since we are not using that plugin
    },
  };

  return (
    <ChartContainer
      title="Top Lead Sources"
      chartHeight={isMobile ? 'h-[400px]' : 'h-[350px]'}
      loading={isLoading}
    >
      <Pie data={data} options={options} plugins={[cleanLabelsPlugin]} />
    </ChartContainer>
  );
};

export default LeadSourcesChart;
