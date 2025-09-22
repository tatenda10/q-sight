import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ProbabilityRiskParameters = () => {
  // Static data for demonstration
  const weightedAvgPD = [
    { segment: 'Retail', pd: 2.8, accounts: 125000, exposure: 1250000000 },
    { segment: 'SME', pd: 4.2, accounts: 45000, exposure: 850000000 },
    { segment: 'Corporate', pd: 1.5, accounts: 2500, exposure: 550000000 },
    { segment: 'Sovereign', pd: 0.8, accounts: 150, exposure: 110000000 }
  ];

  const lgdTrends = [
    { month: 'Jan', retail: 45.2, sme: 52.8, corporate: 38.5, sovereign: 25.0 },
    { month: 'Feb', retail: 45.8, sme: 53.2, corporate: 39.1, sovereign: 25.2 },
    { month: 'Mar', retail: 46.1, sme: 53.5, corporate: 39.4, sovereign: 25.5 },
    { month: 'Apr', retail: 45.9, sme: 53.0, corporate: 38.8, sovereign: 24.8 },
    { month: 'May', retail: 46.3, sme: 53.8, corporate: 39.6, sovereign: 25.8 },
    { month: 'Jun', retail: 46.0, sme: 53.3, corporate: 39.2, sovereign: 25.3 }
  ];

  const eadSensitivity = [
    { scenario: 'Base Case', ead: 2765000000, pd: 2.8, ecl: 27700000 },
    { scenario: 'Optimistic', ead: 2650000000, pd: 2.2, ecl: 22000000 },
    { scenario: 'Pessimistic', ead: 2880000000, pd: 3.5, ecl: 35000000 },
    { scenario: 'Stress', ead: 3100000000, pd: 5.2, ecl: 52000000 }
  ];

  const backtestingData = [
    { month: 'Jan', predicted: 2.8, actual: 2.6, variance: -0.2, hitRate: 0.85 },
    { month: 'Feb', predicted: 2.9, actual: 3.1, variance: 0.2, hitRate: 0.82 },
    { month: 'Mar', predicted: 3.0, actual: 2.8, variance: -0.2, hitRate: 0.88 },
    { month: 'Apr', predicted: 2.8, actual: 3.2, variance: 0.4, hitRate: 0.79 },
    { month: 'May', predicted: 3.1, actual: 2.9, variance: -0.2, hitRate: 0.86 },
    { month: 'Jun', predicted: 2.9, actual: 3.0, variance: 0.1, hitRate: 0.84 }
  ];

  const forwardLookingImpact = [
    { variable: 'GDP Growth', basePD: 2.8, adjustedPD: 2.5, impact: -0.3, weight: 0.4 },
    { variable: 'Unemployment', basePD: 2.8, adjustedPD: 3.2, impact: 0.4, weight: 0.3 },
    { variable: 'Inflation', basePD: 2.8, adjustedPD: 3.0, impact: 0.2, weight: 0.2 },
    { variable: 'Interest Rate', basePD: 2.8, adjustedPD: 2.9, impact: 0.1, weight: 0.1 }
  ];

  const modelValidationKPIs = [
    { metric: 'Gini Coefficient', value: 0.68, threshold: 0.6, status: 'Good' },
    { metric: 'AUC Score', value: 0.75, threshold: 0.7, status: 'Good' },
    { metric: 'Calibration Slope', value: 0.95, threshold: 0.9, status: 'Good' },
    { metric: 'H-L Statistic', value: 2.3, threshold: 3.0, status: 'Good' },
    { metric: 'Hit Rate', value: 0.84, threshold: 0.8, status: 'Good' },
    { metric: 'Variance Ratio', value: 0.12, threshold: 0.15, status: 'Good' }
  ];

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatRatio = (value) => {
    return value.toFixed(2);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Probability & Risk Parameters</h2>
      
      {/* Weighted Average PD by Segment */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Weighted Average Probability of Default (PD) by Segment</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weightedAvgPD}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Bar dataKey="pd" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Weighted Avg PD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Accounts</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Exposure</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weightedAvgPD.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.segment}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.pd)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{row.accounts.toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.exposure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LGD Trends */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Loss Given Default (LGD) Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lgdTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="retail" stroke="#8884d8" name="Retail" />
              <Line type="monotone" dataKey="sme" stroke="#82ca9d" name="SME" />
              <Line type="monotone" dataKey="corporate" stroke="#ffc658" name="Corporate" />
              <Line type="monotone" dataKey="sovereign" stroke="#ff7300" name="Sovereign" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EAD Sensitivity */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Exposure at Default (EAD) Sensitivity</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eadSensitivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scenario" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="ead" fill="#8884d8" name="EAD" />
              <Bar dataKey="ecl" fill="#82ca9d" name="ECL" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Back-testing of PDs vs Actual Defaults */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Back-testing of PDs vs Actual Defaults</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={backtestingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="predicted" stroke="#8884d8" name="Predicted PD" />
              <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual PD" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Month</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Predicted PD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Actual PD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Hit Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backtestingData.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.month}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.predicted)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.actual)}</td>
                  <td className={`px-3 py-2 text-right ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.variance > 0 ? '+' : ''}{formatPercent(row.variance)}
                  </td>
                  <td className="px-3 py-2 text-gray-900 text-right">{(row.hitRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forward-looking Adjustment Impact */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Forward-looking Adjustment Impact</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Macro Variable</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Base PD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Adjusted PD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Impact</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Weight</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forwardLookingImpact.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.variable}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.basePD)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.adjustedPD)}</td>
                  <td className={`px-3 py-2 text-right ${row.impact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.impact > 0 ? '+' : ''}{formatPercent(row.impact)}
                  </td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.weight * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Validation KPIs */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Model Validation KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modelValidationKPIs.map((kpi, index) => (
            <div key={index} className={`p-3 border border-gray-200 ${
              kpi.status === 'Good' ? 'bg-green-50 border-green-200' : 
              kpi.status === 'Warning' ? 'bg-yellow-50 border-yellow-200' : 
              'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs text-gray-600 mb-1">{kpi.metric}</div>
              <div className="text-lg font-bold text-gray-800">{formatRatio(kpi.value)}</div>
              <div className="text-xs text-gray-500">Threshold: {formatRatio(kpi.threshold)}</div>
              <div className={`text-xs font-medium ${
                kpi.status === 'Good' ? 'text-green-600' : 
                kpi.status === 'Warning' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {kpi.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProbabilityRiskParameters;
