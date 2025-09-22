import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const ECLImpactOnPnL = () => {
  // Static data for demonstration
  const pnlImpact = [
    { month: 'Jan', impairmentCharge: 8500000, netInterestIncome: 45000000, netImpact: -36500000 },
    { month: 'Feb', impairmentCharge: 9200000, netInterestIncome: 46000000, netImpact: -36800000 },
    { month: 'Mar', impairmentCharge: 8800000, netInterestIncome: 47000000, netImpact: -38200000 },
    { month: 'Apr', impairmentCharge: 9500000, netInterestIncome: 48000000, netImpact: -38500000 },
    { month: 'May', impairmentCharge: 9100000, netInterestIncome: 49000000, netImpact: -39900000 },
    { month: 'Jun', impairmentCharge: 8700000, netInterestIncome: 50000000, netImpact: -41300000 }
  ];

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">ECL Impact on Profit & Loss</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pnlImpact}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
              domain={[0, 'dataMax']}
            />
            <Tooltip 
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                color: 'white',
                fontSize: '12px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="impairmentCharge" 
              fill="#ff0000" 
              name="Impairment Charge" 
            />
            <Bar 
              dataKey="netInterestIncome" 
              fill="#00ff00" 
              name="Net Interest Income" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary metrics */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-red-50 p-3">
          <div className="text-red-600 font-medium mb-1">YTD Impairment Charge</div>
          <div className="text-red-800 font-bold">
            {formatCurrency(pnlImpact.reduce((sum, item) => sum + item.impairmentCharge, 0))}
          </div>
        </div>
        <div className="bg-green-50 p-3">
          <div className="text-green-600 font-medium mb-1">YTD Net Interest Income</div>
          <div className="text-green-800 font-bold">
            {formatCurrency(pnlImpact.reduce((sum, item) => sum + item.netInterestIncome, 0))}
          </div>
        </div>
        <div className="bg-blue-50 p-3">
          <div className="text-blue-600 font-medium mb-1">YTD Net Impact</div>
          <div className="text-blue-800 font-bold">
            {formatCurrency(pnlImpact.reduce((sum, item) => sum + item.netImpact, 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECLImpactOnPnL;
