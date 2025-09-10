import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

const ECLByProduct = ({ productSegmentation, portfolioSummary }) => {
  if (!productSegmentation || productSegmentation.length === 0) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">ECL by Product Type</h3>
        <div className="text-xs text-gray-500">No data available</div>
      </div>
    );
  }

  // Filter out any segments with null/undefined ECL values and ensure numbers
  const validSegments = productSegmentation.filter(segment => 
    segment.total_ecl !== null && 
    segment.total_ecl !== undefined && 
    !isNaN(segment.total_ecl)
  ).map(segment => ({
    ...segment,
    total_ecl: Number(segment.total_ecl) || 0
  }));

  // Calculate total ECL
  const totalECL = validSegments.reduce((sum, segment) => sum + segment.total_ecl, 0);

  // Colors for the doughnut chart
  const colors = [
    'rgba(0, 122, 255, 0.9)',     // Bright Blue
    'rgba(255, 45, 85, 0.9)',     // Vibrant Red
    'rgba(255, 184, 0, 0.9)',     // Golden Yellow
    'rgba(0, 199, 190, 0.9)',     // Turquoise
    'rgba(88, 86, 214, 0.9)',     // Purple
    'rgba(255, 149, 0, 0.9)',     // Orange
    'rgba(52, 199, 89, 0.9)',     // Green
    'rgba(175, 82, 222, 0.9)',    // Pink Purple
    'rgba(255, 59, 48, 0.9)',     // Red Orange
    'rgba(90, 200, 250, 0.9)',    // Light Blue
    'rgba(76, 217, 100, 0.9)',    // Light Green
    'rgba(255, 45, 85, 0.9)'      // Hot Pink
  ];

  const chartData = {
    labels: validSegments.map(segment => segment.n_prod_type || 'Unknown'),
    datasets: [
      {
        data: validSegments.map(segment => segment.total_ecl),
        backgroundColor: colors.slice(0, validSegments.length),
        borderColor: colors.slice(0, validSegments.length).map(color => color.replace('0.9', '1')),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 11
          },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = totalECL > 0 ? ((value / totalECL) * 100).toFixed(1) : '0.0';
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = totalECL > 0 ? ((value / totalECL) * 100).toFixed(1) : '0.0';
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // If no valid data, show empty state
  if (validSegments.length === 0 || totalECL === 0) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">ECL by Product Type</h3>
        <div className="text-xs text-gray-500">No valid ECL data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">ECL by Product Type</h3>
      <div className="h-[300px]">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Total ECL: <span className="font-medium text-gray-900">
            {formatCurrency(totalECL)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ECLByProduct; 