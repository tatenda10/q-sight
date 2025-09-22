import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PDBacktestingChart = () => {
  // Static data for demonstration
  const backtestingData = [
    { month: 'Jan', predicted: 2.8, actual: 2.6, variance: -0.2, hitRate: 0.85 },
    { month: 'Feb', predicted: 2.9, actual: 3.1, variance: 0.2, hitRate: 0.82 },
    { month: 'Mar', predicted: 3.0, actual: 2.8, variance: -0.2, hitRate: 0.88 },
    { month: 'Apr', predicted: 2.8, actual: 3.2, variance: 0.4, hitRate: 0.79 },
    { month: 'May', predicted: 3.1, actual: 2.9, variance: -0.2, hitRate: 0.86 },
    { month: 'Jun', predicted: 2.9, actual: 3.0, variance: 0.1, hitRate: 0.84 }
  ];

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatRatio = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Back-testing of PDs vs Actual Defaults</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={backtestingData}>
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
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'hitRate') {
                  return [formatRatio(value), 'Hit Rate'];
                }
                return [formatPercent(value), name === 'predicted' ? 'Predicted PD' : 'Actual PD'];
              }}
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
              dataKey="predicted" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Predicted PD" 
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="Actual PD" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary metrics */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-blue-50 p-3">
          <div className="text-blue-600 font-medium mb-1">Average Predicted PD</div>
          <div className="text-blue-800 font-bold">
            {formatPercent(backtestingData.reduce((sum, item) => sum + item.predicted, 0) / backtestingData.length)}
          </div>
        </div>
        <div className="bg-green-50 p-3">
          <div className="text-green-600 font-medium mb-1">Average Actual PD</div>
          <div className="text-green-800 font-bold">
            {formatPercent(backtestingData.reduce((sum, item) => sum + item.actual, 0) / backtestingData.length)}
          </div>
        </div>
        <div className="bg-purple-50 p-3">
          <div className="text-purple-600 font-medium mb-1">Average Hit Rate</div>
          <div className="text-purple-800 font-bold">
            {formatRatio(backtestingData.reduce((sum, item) => sum + item.hitRate, 0) / backtestingData.length)}
          </div>
        </div>
        <div className="bg-orange-50 p-3">
          <div className="text-orange-600 font-medium mb-1">Model Performance</div>
          <div className="text-orange-800 font-bold">
            {backtestingData.reduce((sum, item) => sum + item.hitRate, 0) / backtestingData.length > 0.8 ? 'Good' : 'Needs Review'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDBacktestingChart;
