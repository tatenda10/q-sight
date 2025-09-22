import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ProfitCapitalImpact = () => {
  // Static data for demonstration
  const pnlImpact = [
    { month: 'Jan', impairmentCharge: 8500000, netInterestIncome: 45000000, netImpact: -36500000 },
    { month: 'Feb', impairmentCharge: 9200000, netInterestIncome: 46000000, netImpact: -36800000 },
    { month: 'Mar', impairmentCharge: 8800000, netInterestIncome: 47000000, netImpact: -38200000 },
    { month: 'Apr', impairmentCharge: 9500000, netInterestIncome: 48000000, netImpact: -38500000 },
    { month: 'May', impairmentCharge: 9100000, netInterestIncome: 49000000, netImpact: -39900000 },
    { month: 'Jun', impairmentCharge: 8700000, netInterestIncome: 50000000, netImpact: -41300000 }
  ];

  const rorwaData = [
    { month: 'Jan', rorwa: 12.5, rwa: 2500000000, netIncome: 312500000 },
    { month: 'Feb', rorwa: 12.8, rwa: 2550000000, netIncome: 326400000 },
    { month: 'Mar', rorwa: 13.1, rwa: 2600000000, netIncome: 340600000 },
    { month: 'Apr', rorwa: 12.9, rwa: 2580000000, netIncome: 332820000 },
    { month: 'May', rorwa: 13.2, rwa: 2620000000, netIncome: 345840000 },
    { month: 'Jun', rorwa: 13.0, rwa: 2600000000, netIncome: 338000000 }
  ];

  const capitalAdequacy = [
    { period: 'Q1 2023', cet1Before: 14.2, cet1After: 13.8, impact: -0.4, totalCapital: 4500000000 },
    { period: 'Q2 2023', cet1Before: 14.5, cet1After: 14.0, impact: -0.5, totalCapital: 4600000000 },
    { period: 'Q3 2023', cet1Before: 14.8, cet1After: 14.2, impact: -0.6, totalCapital: 4700000000 },
    { period: 'Q4 2023', cet1Before: 15.1, cet1After: 14.5, impact: -0.6, totalCapital: 4800000000 },
    { period: 'Q1 2024', cet1Before: 15.3, cet1After: 14.7, impact: -0.6, totalCapital: 4900000000 },
    { period: 'Q2 2024', cet1Before: 15.5, cet1After: 14.9, impact: -0.6, totalCapital: 5000000000 }
  ];

  const expectedVsActual = [
    { month: 'Jan', expected: 8500000, actual: 8200000, variance: -300000, variancePercent: -3.5 },
    { month: 'Feb', expected: 9200000, actual: 9500000, variance: 300000, variancePercent: 3.3 },
    { month: 'Mar', expected: 8800000, actual: 8600000, variance: -200000, variancePercent: -2.3 },
    { month: 'Apr', expected: 9500000, actual: 9800000, variance: 300000, variancePercent: 3.2 },
    { month: 'May', expected: 9100000, actual: 8900000, variance: -200000, variancePercent: -2.2 },
    { month: 'Jun', expected: 8700000, actual: 9000000, variance: 300000, variancePercent: 3.4 }
  ];

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
    return value.toFixed(2);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Profit & Capital Impact</h2>
      
      {/* ECL Impact on P&L */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">ECL Impact on Profit & Loss</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pnlImpact}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="impairmentCharge" fill="#ff0000" name="Impairment Charge" />
              <Bar dataKey="netInterestIncome" fill="#00ff00" name="Net Interest Income" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Month</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Impairment Charge</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net Interest Income</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net Impact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pnlImpact.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.month}</td>
                  <td className="px-3 py-2 text-gray-900 text-right text-red-600">{formatCurrency(row.impairmentCharge)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right text-green-600">{formatCurrency(row.netInterestIncome)}</td>
                  <td className={`px-3 py-2 text-right ${row.netImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(row.netImpact)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return on Risk-Weighted Assets */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Return on Risk-Weighted Assets (RoRWA)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rorwaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="rorwa" stroke="#8884d8" name="RoRWA %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capital Adequacy Impact */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Capital Adequacy Impact (CET1 Ratio)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={capitalAdequacy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="cet1Before" stroke="#8884d8" name="CET1 Before IFRS 9" />
              <Line type="monotone" dataKey="cet1After" stroke="#82ca9d" name="CET1 After IFRS 9" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Period</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">CET1 Before</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">CET1 After</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Impact</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Total Capital</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capitalAdequacy.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.period}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.cet1Before)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.cet1After)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right text-red-600">{formatPercent(row.impact)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.totalCapital)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expected vs Actual Losses */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Expected vs Actual Losses Variance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={expectedVsActual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="expected" stroke="#8884d8" name="Expected Losses" />
              <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual Losses" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Month</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Variance %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expectedVsActual.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.month}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.expected)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.actual)}</td>
                  <td className={`px-3 py-2 text-right ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(row.variance)}
                  </td>
                  <td className={`px-3 py-2 text-right ${row.variancePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPercent(row.variancePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">YTD Impairment Charge</div>
          <div className="text-lg font-bold text-gray-800 text-red-600">{formatCurrency(53700000)}</div>
          <div className="text-xs text-gray-500">vs Budget: +5.2%</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Current RoRWA</div>
          <div className="text-lg font-bold text-gray-800">{formatPercent(13.0)}</div>
          <div className="text-xs text-gray-500">Target: 12.0%</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">CET1 Impact</div>
          <div className="text-lg font-bold text-gray-800 text-red-600">{formatPercent(-0.6)}</div>
          <div className="text-xs text-gray-500">vs Previous Quarter</div>
        </div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Loss Variance</div>
          <div className="text-lg font-bold text-gray-800 text-green-600">{formatPercent(0.3)}</div>
          <div className="text-xs text-gray-500">Average Monthly</div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCapitalImpact;
