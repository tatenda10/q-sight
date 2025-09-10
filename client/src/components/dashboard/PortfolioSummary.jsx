import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const PortfolioSummary = ({ portfolioSummary }) => {
  if (!portfolioSummary) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Portfolio Summary</h3>
        <div className="text-xs text-gray-500">No data available</div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Current No. of Accounts",
      value: portfolioSummary.total_accounts || 0,
      format: (val) => val.toLocaleString(),
      bgColor: "bg-blue-50"
    },
    {
      title: "Current ECL",
      value: portfolioSummary.total_ecl || 0,
      format: formatCurrency,
      bgColor: "bg-green-50"
    },
    {
      title: "Current Exposure at Default",
      value: portfolioSummary.total_ead || 0,
      format: formatCurrency,
      bgColor: "bg-yellow-50"
    },
    {
      title: "Current Outstanding Balance",
      value: portfolioSummary.total_outstanding_balance || 0,
      format: formatCurrency,
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Portfolio Summary</h3>
        {portfolioSummary.date && (
          <div className="text-xs text-gray-500">
            As of {new Date(portfolioSummary.date).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className={`${metric.bgColor} p-3`}>
            <p className="text-xs font-medium text-gray-600 mb-1">{metric.title}</p>
            <p className="text-xs font-semibold text-gray-900">
              {metric.format(metric.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioSummary;