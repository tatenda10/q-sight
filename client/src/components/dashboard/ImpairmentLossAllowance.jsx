import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const ImpairmentLossAllowance = () => {
  // Static data for demonstration
  const eclAllowanceData = [
    { stage: 'Stage 1', allowance: 12500000, percentage: 45.2, coverage: 0.57 },
    { stage: 'Stage 2', allowance: 8500000, percentage: 30.8, coverage: 2.43 },
    { stage: 'Stage 3', allowance: 6700000, percentage: 24.0, coverage: 3.12 }
  ];

  const allowanceMovement = [
    { period: 'Q1 2023', stage1: 12000000, stage2: 8000000, stage3: 6500000, total: 26500000 },
    { period: 'Q2 2023', stage1: 12200000, stage2: 8200000, stage3: 6600000, total: 27000000 },
    { period: 'Q3 2023', stage1: 12400000, stage2: 8400000, stage3: 6700000, total: 27500000 },
    { period: 'Q4 2023', stage1: 12500000, stage2: 8500000, stage3: 6700000, total: 27700000 },
    { period: 'Q1 2024', stage1: 12600000, stage2: 8600000, stage3: 6800000, total: 28000000 },
    { period: 'Q2 2024', stage1: 12500000, stage2: 8500000, stage3: 6700000, total: 27700000 }
  ];

  const writeOffsRecoveries = [
    { month: 'Jan', writeoffs: 2500000, recoveries: 1800000, net: -700000 },
    { month: 'Feb', writeoffs: 2800000, recoveries: 2200000, net: -600000 },
    { month: 'Mar', writeoffs: 3200000, recoveries: 1900000, net: -1300000 },
    { month: 'Apr', writeoffs: 2900000, recoveries: 2100000, net: -800000 },
    { month: 'May', writeoffs: 3100000, recoveries: 2400000, net: -700000 },
    { month: 'Jun', writeoffs: 2700000, recoveries: 2000000, net: -700000 }
  ];

  const eclCoverageTrend = [
    { month: 'Jan', coverage: 0.95, ecl: 26500000, exposure: 2790000000 },
    { month: 'Feb', coverage: 0.98, ecl: 27000000, exposure: 2750000000 },
    { month: 'Mar', coverage: 1.02, ecl: 27500000, exposure: 2700000000 },
    { month: 'Apr', coverage: 1.05, ecl: 28000000, exposure: 2670000000 },
    { month: 'May', coverage: 1.08, ecl: 28500000, exposure: 2640000000 },
    { month: 'Jun', coverage: 1.10, ecl: 27700000, exposure: 2520000000 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatRatio = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Impairment & Loss Allowance</h2>
      
      {/* Total ECL Allowance by Stage */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Total ECL Allowance by Stage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eclAllowanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="allowance" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eclAllowanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ stage, percentage }) => `${stage}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="allowance"
                >
                  {eclAllowanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* ECL Allowance Summary Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Allowance</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">% of Total</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Coverage Ratio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eclAllowanceData.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.stage}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.allowance)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.percentage)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatRatio(row.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coverage Ratio Trend */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Coverage Ratio Trend (ECL ÷ Gross Exposure)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eclCoverageTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${(value * 100).toFixed(2)}%`} />
              <Legend />
              <Line type="monotone" dataKey="coverage" stroke="#8884d8" name="Coverage Ratio" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allowance Movement Analysis */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Allowance Movement Analysis (Quarterly)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allowanceMovement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="stage1" stackId="a" fill="#0088FE" name="Stage 1" />
              <Bar dataKey="stage2" stackId="a" fill="#00C49F" name="Stage 2" />
              <Bar dataKey="stage3" stackId="a" fill="#FFBB28" name="Stage 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Write-offs vs Recoveries */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Write-offs vs Recoveries Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={writeOffsRecoveries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="writeoffs" stroke="#ff0000" name="Write-offs" />
              <Line type="monotone" dataKey="recoveries" stroke="#00ff00" name="Recoveries" />
              <Line type="monotone" dataKey="net" stroke="#0000ff" name="Net Loss" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Total ECL Allowance</div>
          <div className="text-lg font-bold text-gray-800">{formatCurrency(27700000)}</div>
          <div className="text-xs text-gray-500">Current Period</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Coverage Ratio</div>
          <div className="text-lg font-bold text-gray-800">1.10%</div>
          <div className="text-xs text-gray-500">ECL ÷ Gross Exposure</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">YoY Change</div>
          <div className="text-lg font-bold text-gray-800 text-green-600">+4.5%</div>
          <div className="text-xs text-gray-500">vs Previous Year</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Net Write-offs</div>
          <div className="text-lg font-bold text-gray-800 text-red-600">{formatCurrency(-700000)}</div>
          <div className="text-xs text-gray-500">Current Month</div>
        </div>
      </div>
    </div>
  );
};

export default ImpairmentLossAllowance;
