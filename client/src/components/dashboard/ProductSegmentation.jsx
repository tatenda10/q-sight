import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const ProductSegmentation = ({ productSegmentation, portfolioSummary }) => {
  if (!productSegmentation || productSegmentation.length === 0) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Product Segmentation</h3>
        <div className="text-xs text-gray-500">No data available</div>
      </div>
    );
  }

  const formatPercentage = (value) => {
    return value ? `${(value * 100).toFixed(2)}%` : '0.00%';
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Product Types</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-xs text-gray-700">
              <th className="px-2 py-2 text-left font-medium">Product Type</th>
              <th className="px-2 py-2 text-right font-medium">Accounts</th>
              <th className="px-2 py-2 text-right font-medium">ECL</th>
              <th className="px-2 py-2 text-right font-medium">PD</th>
              <th className="px-2 py-2 text-right font-medium">LGD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productSegmentation.map((segment, index) => (
              <tr key={index} className="text-xs hover:bg-gray-50">
                <td className="px-2 py-2 text-gray-900">{segment.n_prod_type}</td>
                <td className="px-2 py-2 text-right text-gray-600">
                  {segment.account_count.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-gray-600">
                  {formatCurrency(segment.total_ecl)}
                </td>
                <td className="px-2 py-2 text-right text-gray-600">
                  {formatPercentage(segment.average_pd)}
                </td>
                <td className="px-2 py-2 text-right text-gray-600">
                  {formatPercentage(segment.average_lgd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Total Product Types: </span>
            <span className="font-medium text-gray-900">{productSegmentation.length}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Total Accounts: </span>
            <span className="font-medium text-gray-900">
              {productSegmentation.reduce((sum, segment) => sum + segment.account_count, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSegmentation; 