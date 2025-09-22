import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const CreditRiskExposure = () => {
  // Static data for demonstration
  const portfolioData = [
    { name: 'Retail', exposure: 1250000000, percentage: 45.2, accounts: 125000 },
    { name: 'SME', exposure: 850000000, percentage: 30.8, accounts: 45000 },
    { name: 'Corporate', exposure: 550000000, percentage: 19.9, accounts: 2500 },
    { name: 'Sovereign', exposure: 110000000, percentage: 4.1, accounts: 150 }
  ];

  const stageDistribution = [
    { stage: 'Stage 1', exposure: 2200000000, percentage: 79.5, accounts: 165000 },
    { stage: 'Stage 2', exposure: 350000000, percentage: 12.7, accounts: 8500 },
    { stage: 'Stage 3', exposure: 215000000, percentage: 7.8, accounts: 2150 }
  ];

  const migrationData = [
    { month: 'Jan', stage1to2: 2.1, stage2to3: 1.8, stage2to1: 0.9, stage3to2: 0.3 },
    { month: 'Feb', stage1to2: 2.3, stage2to3: 1.9, stage2to1: 1.1, stage3to2: 0.4 },
    { month: 'Mar', stage1to2: 2.0, stage2to3: 2.1, stage2to1: 0.8, stage3to2: 0.2 },
    { month: 'Apr', stage1to2: 2.5, stage2to3: 1.7, stage2to1: 1.2, stage3to2: 0.5 },
    { month: 'May', stage1to2: 2.2, stage2to3: 2.0, stage2to1: 1.0, stage3to2: 0.3 },
    { month: 'Jun', stage1to2: 2.4, stage2to3: 1.9, stage2to1: 1.3, stage3to2: 0.4 }
  ];

  const topBorrowers = [
    { name: 'ABC Manufacturing Ltd', exposure: 45000000, percentage: 1.63, sector: 'Manufacturing' },
    { name: 'XYZ Retail Group', exposure: 38000000, percentage: 1.38, sector: 'Retail' },
    { name: 'DEF Construction Co', exposure: 32000000, percentage: 1.16, sector: 'Construction' },
    { name: 'GHI Agriculture', exposure: 28000000, percentage: 1.01, sector: 'Agriculture' },
    { name: 'JKL Mining Corp', exposure: 25000000, percentage: 0.91, sector: 'Mining' },
    { name: 'MNO Technology', exposure: 22000000, percentage: 0.80, sector: 'Technology' },
    { name: 'PQR Financial', exposure: 20000000, percentage: 0.72, sector: 'Financial' },
    { name: 'STU Healthcare', exposure: 18000000, percentage: 0.65, sector: 'Healthcare' },
    { name: 'VWX Education', exposure: 16000000, percentage: 0.58, sector: 'Education' },
    { name: 'YZA Energy', exposure: 15000000, percentage: 0.54, sector: 'Energy' }
  ];

  const eadUtilization = [
    { segment: 'Retail', ead: 1250000000, utilized: 1180000000, utilization: 94.4 },
    { segment: 'SME', ead: 850000000, utilized: 720000000, utilization: 84.7 },
    { segment: 'Corporate', ead: 550000000, utilized: 480000000, utilization: 87.3 },
    { segment: 'Sovereign', ead: 110000000, utilized: 110000000, utilization: 100.0 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Credit Risk & Exposure</h2>
      
      {/* Total Gross Exposure by Portfolio */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Total Gross Exposure by Portfolio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="exposure" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="exposure"
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Portfolio Summary Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Portfolio</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Exposure</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Accounts</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolioData.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.name}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.exposure)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.percentage)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{row.accounts.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage Distribution */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Stage Distribution of Exposures</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stageDistribution.map((stage, index) => (
            <div key={index} className="bg-gray-50 p-3 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">{stage.stage}</div>
              <div className="text-lg font-bold text-gray-800">{formatCurrency(stage.exposure)}</div>
              <div className="text-xs text-gray-500">{formatPercent(stage.percentage)} of total</div>
              <div className="text-xs text-gray-500">{stage.accounts.toLocaleString()} accounts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Migration Analysis */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Migration Analysis (% of loans moving between stages)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={migrationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="stage1to2" stroke="#ff7300" name="Stage 1 → 2" />
              <Line type="monotone" dataKey="stage2to3" stroke="#ff0000" name="Stage 2 → 3" />
              <Line type="monotone" dataKey="stage2to1" stroke="#00ff00" name="Stage 2 → 1" />
              <Line type="monotone" dataKey="stage3to2" stroke="#0000ff" name="Stage 3 → 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Borrower Concentration */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Top 10 Borrower Concentration</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Borrower</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Sector</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Exposure</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">% of Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topBorrowers.map((borrower, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{borrower.name}</td>
                  <td className="px-3 py-2 text-gray-900">{borrower.sector}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(borrower.exposure)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(borrower.percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EAD vs Utilized Exposure */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">EAD vs Utilized Exposure</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eadUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="ead" fill="#8884d8" name="EAD" />
              <Bar dataKey="utilized" fill="#82ca9d" name="Utilized" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">EAD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Utilized</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Utilization %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eadUtilization.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-gray-900">{row.segment}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.ead)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(row.utilized)}</td>
                  <td className="px-3 py-2 text-gray-900 text-right">{formatPercent(row.utilization)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CreditRiskExposure;
