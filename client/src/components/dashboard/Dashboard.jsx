import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Mock data - replace with actual data from your backend
  const metrics = {
    totalPortfolio: '1,234,567,890',
    eclAmount: '123,456,789',
    eclRatio: '10.0%',
    stage1: '45%',
    stage2: '30%',
    stage3: '25%',
    pdCoverage: '98%',
    lgdCoverage: '95%',
    totalExposures: '5,678',
    impairedExposures: '234',
    lastCalculation: '2024-03-20',
  };

  const recentActivities = [
    { id: 1, action: 'ECL Calculation', date: '2024-03-20', status: 'Completed', user: 'John Doe' },
    { id: 2, action: 'Stage Reassignment', date: '2024-03-19', status: 'Completed', user: 'Jane Smith' },
    { id: 3, action: 'Cashflow Upload', date: '2024-03-18', status: 'Completed', user: 'Mike Johnson' },
    { id: 4, action: 'PD Model Update', date: '2024-03-17', status: 'In Progress', user: 'Sarah Wilson' },
  ];

  const stageMetrics = [
    { stage: 'Stage 1', count: '2,555', value: '555,555,550', ecl: '5,555,555' },
    { stage: 'Stage 2', count: '1,703', value: '370,370,370', ecl: '37,037,037' },
    { stage: 'Stage 3', count: '1,420', value: '308,641,970', ecl: '80,802,197' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Last Calculation Date */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome to your ECL Management Dashboard</p>
        </div>
        <div className="text-sm text-gray-500">
          Last Calculation: {metrics.lastCalculation}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Link to="/ecl-calculation" className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">ECL Calculation</h3>
              <p className="text-xs text-gray-500">Run new calculation</p>
            </div>
          </div>
        </Link>

        <Link to="/upload-cashflows" className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Upload Cashflows</h3>
              <p className="text-xs text-gray-500">Import new data</p>
            </div>
          </div>
        </Link>

        <Link to="/reports" className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">View Reports</h3>
              <p className="text-xs text-gray-500">Generate reports</p>
            </div>
          </div>
        </Link>

        <Link to="/stage-reassignment" className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Stage Reassignment</h3>
              <p className="text-xs text-gray-500">Update stages</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Overview</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalPortfolio}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total ECL Amount</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.eclAmount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ECL Ratio</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.eclRatio}</p>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">Total Exposures</p>
              <p className="text-xl font-semibold text-gray-900">{metrics.totalExposures}</p>
              <p className="text-sm text-red-600">Impaired: {metrics.impairedExposures}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Stage Distribution</h3>
          <div className="space-y-4">
            {stageMetrics.map((stage, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">{stage.stage}</span>
                  <span className="text-sm font-medium text-gray-900">{stage.count} exposures</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' : 
                      index === 1 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`} 
                    style={{ width: stage.value.replace(/[^0-9]/g, '') / metrics.totalPortfolio.replace(/[^0-9]/g, '') * 100 + '%' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Value: ${stage.value}</span>
                  <span>ECL: ${stage.ecl}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Model Coverage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">PD Model Coverage</span>
                <span className="text-sm font-medium text-gray-900">{metrics.pdCoverage}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: metrics.pdCoverage }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">LGD Model Coverage</span>
                <span className="text-sm font-medium text-gray-900">{metrics.lgdCoverage}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: metrics.lgdCoverage }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Model Status</span>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  All Models Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
          <Link to="/audit-logs" className="text-sm text-blue-600 hover:text-blue-800">
            View All Activities
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      activity.status === 'Completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 