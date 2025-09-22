import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const ECLByProductType = () => {
  // Static data for demonstration
  const productTypeData = [
    { name: 'Retail', value: 12500000, percentage: 45.2, color: '#0088FE' },
    { name: 'SME', value: 8500000, percentage: 30.8, color: '#00C49F' },
    { name: 'Corporate', value: 5500000, percentage: 19.9, color: '#FFBB28' },
    { name: 'Sovereign', value: 1100000, percentage: 4.1, color: '#FF8042' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 text-white p-3 text-xs">
          <div className="font-semibold mb-1">{data.name}</div>
          <div>ECL: {formatCurrency(data.value)}</div>
          <div>Percentage: {data.percentage}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">ECL by Product Type</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={productTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {productTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {productTypeData.map((item, index) => (
          <div key={index} className="flex items-center">
            <div 
              className="w-3 h-3 mr-2" 
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-gray-700">{item.name}</span>
            <span className="ml-auto text-gray-600">{item.percentage}%</span>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default ECLByProductType;
