import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/formatters';

const LoanBookDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Mock data - replace with actual API calls
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalLoanBook: 2450000, // in thousands
      totalAccounts: 125847,
      totalNPL: 18750, // in thousands
      lastCalculatedDate: '2024-12-31',
      totalBranches: 6
    },
    branches: [
      {
        id: 'BR001',
        name: 'Harare Central Branch',
        totalLoanBook: 450000, // in thousands
        totalAccounts: 23456,
        nplBalance: 3400, // in thousands
        performing: { balance: 380000, accounts: 19876 },
        underperforming: { balance: 52000, accounts: 2980 },
        nonPerforming: { balance: 18000, accounts: 600 },
        region: 'Harare',
        manager: 'Tendai Moyo',
        loanTypes: {
          personal: { count: 12000, balance: 180000 },
          business: { count: 8000, balance: 200000 },
          mortgage: { count: 2000, balance: 50000 },
          vehicle: { count: 1456, balance: 20000 }
        }
      },
      {
        id: 'BR002',
        name: 'Bulawayo Branch',
        totalLoanBook: 380000, // in thousands
        totalAccounts: 19876,
        nplBalance: 2900, // in thousands
        performing: { balance: 320000, accounts: 16890 },
        underperforming: { balance: 45000, accounts: 2586 },
        nonPerforming: { balance: 15000, accounts: 400 },
        region: 'Bulawayo',
        manager: 'Blessing Ncube',
        loanTypes: {
          personal: { count: 9500, balance: 140000 },
          business: { count: 7000, balance: 180000 },
          mortgage: { count: 1800, balance: 40000 },
          vehicle: { count: 1576, balance: 20000 }
        }
      },
      {
        id: 'BR003',
        name: 'Mutare Branch',
        totalLoanBook: 420000, // in thousands
        totalAccounts: 22134,
        nplBalance: 3200, // in thousands
        performing: { balance: 360000, accounts: 18900 },
        underperforming: { balance: 48000, accounts: 2734 },
        nonPerforming: { balance: 12000, accounts: 500 },
        region: 'Manicaland',
        manager: 'Priscilla Chigumba',
        loanTypes: {
          personal: { count: 11000, balance: 160000 },
          business: { count: 7500, balance: 190000 },
          mortgage: { count: 2200, balance: 50000 },
          vehicle: { count: 1434, balance: 20000 }
        }
      },
      {
        id: 'BR004',
        name: 'Gweru Branch',
        totalLoanBook: 350000, // in thousands
        totalAccounts: 18234,
        nplBalance: 2650, // in thousands
        performing: { balance: 300000, accounts: 15600 },
        underperforming: { balance: 40000, accounts: 2234 },
        nonPerforming: { balance: 10000, accounts: 400 },
        region: 'Midlands',
        manager: 'Tatenda Muzenda',
        loanTypes: {
          personal: { count: 9000, balance: 130000 },
          business: { count: 6500, balance: 150000 },
          mortgage: { count: 1500, balance: 40000 },
          vehicle: { count: 1234, balance: 30000 }
        }
      },
      {
        id: 'BR005',
        name: 'Masvingo Branch',
        totalLoanBook: 400000, // in thousands
        totalAccounts: 20890,
        nplBalance: 3050, // in thousands
        performing: { balance: 340000, accounts: 17890 },
        underperforming: { balance: 50000, accounts: 2500 },
        nonPerforming: { balance: 10000, accounts: 500 },
        region: 'Masvingo',
        manager: 'Rumbidzai Chikwava',
        loanTypes: {
          personal: { count: 10000, balance: 150000 },
          business: { count: 7200, balance: 170000 },
          mortgage: { count: 2000, balance: 50000 },
          vehicle: { count: 1690, balance: 30000 }
        }
      },
      {
        id: 'BR006',
        name: 'Kadoma Branch',
        totalLoanBook: 450000, // in thousands
        totalAccounts: 21347,
        nplBalance: 3450, // in thousands
        performing: { balance: 380000, accounts: 18347 },
        underperforming: { balance: 55000, accounts: 2500 },
        nonPerforming: { balance: 15000, accounts: 500 },
        region: 'Mashonaland West',
        manager: 'Kudakwashe Mhaka',
        loanTypes: {
          personal: { count: 11000, balance: 170000 },
          business: { count: 7800, balance: 200000 },
          mortgage: { count: 1800, balance: 50000 },
          vehicle: { count: 1747, balance: 30000 }
        }
      }
    ],
    trends: {
      loanBookTrend: [
        { month: 'Jan', loanBook: 2300000 }, // in thousands
        { month: 'Feb', loanBook: 2320000 },
        { month: 'Mar', loanBook: 2350000 },
        { month: 'Apr', loanBook: 2380000 },
        { month: 'May', loanBook: 2400000 },
        { month: 'Jun', loanBook: 2420000 },
        { month: 'Jul', loanBook: 2430000 },
        { month: 'Aug', loanBook: 2440000 },
        { month: 'Sep', loanBook: 2445000 },
        { month: 'Oct', loanBook: 2450000 },
        { month: 'Nov', loanBook: 2450000 },
        { month: 'Dec', loanBook: 2450000 }
      ],
      nplTrend: [
        { month: 'Jan', npl: 17500 }, // in thousands
        { month: 'Feb', npl: 17600 },
        { month: 'Mar', npl: 17800 },
        { month: 'Apr', npl: 18000 },
        { month: 'May', npl: 18200 },
        { month: 'Jun', npl: 18400 },
        { month: 'Jul', npl: 18500 },
        { month: 'Aug', npl: 18600 },
        { month: 'Sep', npl: 18650 },
        { month: 'Oct', npl: 18700 },
        { month: 'Nov', npl: 18720 },
        { month: 'Dec', npl: 18750 }
      ]
    }
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1500);
  };

  const filteredBranches = selectedBranch === 'all' 
    ? dashboardData.branches 
    : dashboardData.branches.filter(branch => branch.id === selectedBranch);

  const branchChartData = dashboardData.branches.map(branch => ({
    name: branch.name.split(' ')[0], // Short name for chart
    loanBook: branch.totalLoanBook, // Already in thousands
    accounts: branch.totalAccounts,
    npl: branch.nplBalance // Already in thousands
  }));

  const loanStatusDistribution = dashboardData.branches.reduce((acc, branch) => {
    acc.performing.balance += branch.performing.balance;
    acc.performing.accounts += branch.performing.accounts;
    acc.underperforming.balance += branch.underperforming.balance;
    acc.underperforming.accounts += branch.underperforming.accounts;
    acc.nonPerforming.balance += branch.nonPerforming.balance;
    acc.nonPerforming.accounts += branch.nonPerforming.accounts;
    return acc;
  }, {
    performing: { balance: 0, accounts: 0 },
    underperforming: { balance: 0, accounts: 0 },
    nonPerforming: { balance: 0, accounts: 0 }
  });

  const pieData = [
    { name: 'Performing', value: loanStatusDistribution.performing.balance, color: '#10B981' },
    { name: 'Underperforming', value: loanStatusDistribution.underperforming.balance, color: '#F59E0B' },
    { name: 'Non-Performing', value: loanStatusDistribution.nonPerforming.balance, color: '#EF4444' }
  ];

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Loan Book Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Live tracking of loan balances and portfolio across Zimbabwean branches</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`px-3 py-1 text-xs font-medium rounded ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full mr-1"></div>
                  Refreshing...
                </div>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Loan Book</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboardData.summary.totalLoanBook)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Accounts</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatNumber(dashboardData.summary.totalAccounts)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">NPL Balance</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboardData.summary.totalNPL)}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active Branches</p>
                <p className="text-lg font-bold text-gray-900">
                  {dashboardData.summary.totalBranches}
                </p>
                <p className="text-xs text-gray-500">Across Zimbabwe</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Loan Book Trend */}
          <div className="bg-white p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Loan Book Trend (12 Months)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dashboardData.trends.loanBookTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Loan Book']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line type="monotone" dataKey="loanBook" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Loan Status Distribution */}
          <div className="bg-white p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Loan Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), 'Balance']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Performance */}
        <div className="bg-white border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">Branch Performance</h3>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Branches</option>
                {dashboardData.branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={(value) => `$${value}K`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'loanBook' ? formatCurrency(value * 1000) : value,
                    name === 'loanBook' ? 'Loan Book' : 'Accounts'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="loanBook" fill="#3B82F6" name="Loan Book (Thousands)" />
                <Bar yAxisId="right" dataKey="accounts" fill="#10B981" name="Accounts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Details Table */}
        <div className="bg-white border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Branch Details</h3>
          </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loan Book</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accounts</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NPL Balance</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performing</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Underperforming</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Non-Performing</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{branch.name}</div>
                    <div className="text-xs text-gray-500">{branch.id}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{branch.region}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{branch.manager}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                    {formatCurrency(branch.totalLoanBook)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {formatNumber(branch.totalAccounts)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-red-600">
                    {formatCurrency(branch.nplBalance)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{formatCurrency(branch.performing.balance)}</div>
                    <div className="text-xs text-gray-500">{formatNumber(branch.performing.accounts)} accounts</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{formatCurrency(branch.underperforming.balance)}</div>
                    <div className="text-xs text-gray-500">{formatNumber(branch.underperforming.accounts)} accounts</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{formatCurrency(branch.nonPerforming.balance)}</div>
                    <div className="text-xs text-gray-500">{formatNumber(branch.nonPerforming.accounts)} accounts</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>

        {/* Loan Type Breakdown */}
        <div className="bg-white border border-gray-200 mt-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Loan Type Breakdown by Branch</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {dashboardData.branches.map((branch) => (
                <div key={branch.id} className="bg-gray-50 p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-800 mb-3">{branch.name}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Personal Loans</span>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-900">{formatNumber(branch.loanTypes.personal.count)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(branch.loanTypes.personal.balance)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Business Loans</span>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-900">{formatNumber(branch.loanTypes.business.count)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(branch.loanTypes.business.balance)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Mortgage Loans</span>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-900">{formatNumber(branch.loanTypes.mortgage.count)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(branch.loanTypes.mortgage.balance)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Vehicle Loans</span>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-900">{formatNumber(branch.loanTypes.vehicle.count)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(branch.loanTypes.vehicle.balance)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanBookDashboard;
