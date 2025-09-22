import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const WriteoffsRecoveriesTrend = () => {
  // Static data for demonstration
  const writeOffsRecoveries = [
    { month: 'Jan', writeoffs: 2500000, recoveries: 1800000, net: -700000 },
    { month: 'Feb', writeoffs: 2800000, recoveries: 2200000, net: -600000 },
    { month: 'Mar', writeoffs: 3200000, recoveries: 1900000, net: -1300000 },
    { month: 'Apr', writeoffs: 2900000, recoveries: 2100000, net: -800000 },
    { month: 'May', writeoffs: 3100000, recoveries: 2400000, net: -700000 },
    { month: 'Jun', writeoffs: 2700000, recoveries: 2000000, net: -700000 }
  ];

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Write-offs vs Recoveries Trend</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={writeOffsRecoveries}>
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
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Amount']}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                color: 'white',
                fontSize: '12px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="writeoffs" 
              stroke="#ff0000" 
              strokeWidth={2}
              name="Write-offs" 
            />
            <Line 
              type="monotone" 
              dataKey="recoveries" 
              stroke="#00ff00" 
              strokeWidth={2}
              name="Recoveries" 
            />
            <Line 
              type="monotone" 
              dataKey="net" 
              stroke="#0000ff" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Net Loss" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary metrics */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-red-50 p-3">
          <div className="text-red-600 font-medium mb-1">Total Write-offs (YTD)</div>
          <div className="text-red-800 font-bold">
            {formatCurrency(writeOffsRecoveries.reduce((sum, item) => sum + item.writeoffs, 0))}
          </div>
        </div>
        <div className="bg-green-50 p-3">
          <div className="text-green-600 font-medium mb-1">Total Recoveries (YTD)</div>
          <div className="text-green-800 font-bold">
            {formatCurrency(writeOffsRecoveries.reduce((sum, item) => sum + item.recoveries, 0))}
          </div>
        </div>
        <div className="bg-blue-50 p-3">
          <div className="text-blue-600 font-medium mb-1">Net Loss (YTD)</div>
          <div className="text-blue-800 font-bold">
            {formatCurrency(writeOffsRecoveries.reduce((sum, item) => sum + item.net, 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WriteoffsRecoveriesTrend;
