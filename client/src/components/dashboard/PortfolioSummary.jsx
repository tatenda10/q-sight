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

  // All metrics combined
  const allMetrics = [
    // Overview metrics
    {
      title: "Current No. of Accounts",
      value: portfolioSummary.total_accounts || 0,
      format: (val) => val.toLocaleString(),
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    {
      title: "Current ECL",
      value: portfolioSummary.total_ecl || 0,
      format: formatCurrency,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    {
      title: "Current Exposure at Default",
      value: portfolioSummary.total_ead || 0,
      format: formatCurrency,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    {
      title: "Current Outstanding Balance",
      value: portfolioSummary.total_outstanding_balance || 0,
      format: formatCurrency,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    // Risk metrics
    {
      title: "Current NPL Ratio",
      value: 3.7,
      format: (val) => `${val.toFixed(1)}%`,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-red-600"
    },
    {
      title: "Stage 2 Ratio",
      value: 13.4,
      format: (val) => `${val.toFixed(1)}%`,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-orange-600"
    },
    {
      title: "High Risk Triggers",
      value: 1440,
      format: (val) => val.toLocaleString(),
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-red-600"
    },
    {
      title: "Portfolio Health",
      value: "Moderate",
      format: (val) => val,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-yellow-600"
    },
    // Financial metrics
    {
      title: "YTD Impairment Charge",
      value: 53700000,
      format: formatCurrency,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-red-600"
    },
    {
      title: "Current RoRWA",
      value: 13.0,
      format: (val) => `${val.toFixed(1)}%`,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-green-600"
    },
    {
      title: "CET1 Impact",
      value: -0.6,
      format: (val) => `${val.toFixed(1)}%`,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-red-600"
    },
    {
      title: "Loss Variance",
      value: 0.3,
      format: (val) => `${val.toFixed(1)}%`,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-green-600"
    }
  ];

  return (
    <div className="bg-white p-4">
      <h2 className="text-xs font-bold text-gray-800 mb-4">Portfolio Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allMetrics.map((metric, index) => (
          <div key={index} className={`${metric.bgColor} p-3`}>
            <p className="text-xs font-medium text-gray-600 mb-1">{metric.title}</p>
            <p className={`text-sm font-bold ${metric.textColor || 'text-gray-800'}`}>
              {metric.format(metric.value)}
            </p>
            {metric.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioSummary;