import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const ECLTrend = ({ eclTrends }) => {
  if (!eclTrends || eclTrends.length === 0) return null;

  // Prepare data for Recharts
  const chartData = eclTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    }),
    fullDate: trend.date,
    runKey: trend.run_key,
    ecl: trend.ecl_amount
  }));

  // Define bright colors similar to Model Governance charts
  const colors = [
    '#0088FE', // Bright blue
    '#00C49F', // Bright teal
    '#FFBB28', // Bright yellow
    '#FF8042', // Bright orange
    '#8884D8', // Bright purple
    '#82CA9D', // Bright green
    '#FFC658', // Bright amber
    '#FF7300'  // Bright red
  ];

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">12-Month ECL Trend</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
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
              formatter={(value) => [formatCurrency(value), 'ECL Amount']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return `Date: ${payload[0].payload.fullDate}`;
                }
                return `Date: ${label}`;
              }}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                color: 'white',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="ecl" 
              fill={colors[0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Additional info */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-blue-50 p-3">
          <div className="text-blue-600 font-medium mb-1">Latest ECL</div>
          <div className="text-blue-800 font-bold">
            {formatCurrency(eclTrends[eclTrends.length - 1]?.ecl_amount || 0)}
          </div>
        </div>
        <div className="bg-green-50 p-3">
          <div className="text-green-600 font-medium mb-1">Trend</div>
          <div className="text-green-800 font-bold">
            {eclTrends.length > 1 ? 
              (eclTrends[eclTrends.length - 1]?.ecl_amount > eclTrends[0]?.ecl_amount ? 
                '↗ Increasing' : '↘ Decreasing') : 
              '→ Stable'
            }
          </div>
        </div>
        <div className="bg-purple-50 p-3">
          <div className="text-purple-600 font-medium mb-1">Periods</div>
          <div className="text-purple-800 font-bold">
            {eclTrends.length} months
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECLTrend;