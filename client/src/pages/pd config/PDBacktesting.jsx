import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';

const PDBacktesting = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRunKey, setSelectedRunKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [selectedTab, setSelectedTab] = useState('performance');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const [showOutliers, setShowOutliers] = useState(true);

  // Mock data for available dates and run keys
  const availableDates = [
    '2024-12-31',
    '2024-11-30',
    '2024-10-31',
    '2024-09-30',
    '2024-08-31',
    '2024-07-31'
  ];

  const availableRunKeys = [
    'RUN_20241231_001',
    'RUN_20241130_002',
    'RUN_20241031_001',
    'RUN_20240930_003',
    'RUN_20240831_001',
    'RUN_20240731_002'
  ];

  // Mock data for PD Backtesting results
  const backtestingData = useMemo(() => ({
    performance: [
      { period: '2023-Q1', predictedPD: 2.5, actualPD: 2.3, variance: -0.2, accounts: 1250, defaults: 29 },
      { period: '2023-Q2', predictedPD: 2.7, actualPD: 2.8, variance: 0.1, accounts: 1280, defaults: 36 },
      { period: '2023-Q3', predictedPD: 2.9, actualPD: 3.2, variance: 0.3, accounts: 1310, defaults: 42 },
      { period: '2023-Q4', predictedPD: 3.1, actualPD: 2.9, variance: -0.2, accounts: 1340, defaults: 39 },
      { period: '2024-Q1', predictedPD: 3.3, actualPD: 3.5, variance: 0.2, accounts: 1370, defaults: 48 },
      { period: '2024-Q2', predictedPD: 3.5, actualPD: 3.2, variance: -0.3, accounts: 1400, defaults: 45 },
      { period: '2024-Q3', predictedPD: 3.7, actualPD: 4.1, variance: 0.4, accounts: 1430, defaults: 59 },
      { period: '2024-Q4', predictedPD: 3.9, actualPD: 3.8, variance: -0.1, accounts: 1460, defaults: 55 }
    ],
    calibration: [
      { pdBucket: '0-1%', predictedCount: 450, actualCount: 420, predictedPD: 0.5, actualPD: 0.4, calibration: 0.8 },
      { pdBucket: '1-2%', predictedCount: 320, actualCount: 310, predictedPD: 1.5, actualPD: 1.3, calibration: 0.87 },
      { pdBucket: '2-3%', predictedCount: 280, actualCount: 295, predictedPD: 2.5, actualPD: 2.7, calibration: 1.08 },
      { pdBucket: '3-5%', predictedCount: 200, actualCount: 220, predictedPD: 4.0, actualPD: 4.5, calibration: 1.13 },
      { pdBucket: '5-10%', predictedCount: 120, actualCount: 135, predictedPD: 7.5, actualPD: 8.2, calibration: 1.09 },
      { pdBucket: '10%+', predictedCount: 80, actualCount: 90, predictedPD: 15.0, actualPD: 16.5, calibration: 1.10 }
    ],
    segmentAnalysis: [
      { segment: 'Retail', predictedPD: 2.8, actualPD: 2.9, variance: 0.1, accounts: 800, defaults: 23, hitRate: 0.85 },
      { segment: 'SME', predictedPD: 4.2, actualPD: 4.5, variance: 0.3, accounts: 400, defaults: 18, hitRate: 0.78 },
      { segment: 'Corporate', predictedPD: 1.5, actualPD: 1.8, variance: 0.3, accounts: 200, defaults: 4, hitRate: 0.92 },
      { segment: 'Sovereign', predictedPD: 0.8, actualPD: 0.9, variance: 0.1, accounts: 60, defaults: 1, hitRate: 0.95 }
    ],
    modelMetrics: {
      hitRate: 0.87,
      gini: 0.65,
      ks: 0.42,
      auc: 0.78,
      cStatistic: 0.75,
      hLStatistic: 12.5,
      pValue: 0.15,
      calibrationSlope: 1.05,
      calibrationIntercept: -0.02
    },
    outliers: [
      { account: 'ACC001234', predictedPD: 2.1, actualPD: 8.5, variance: 6.4, segment: 'Retail', reason: 'Economic shock' },
      { account: 'ACC002456', predictedPD: 5.2, actualPD: 1.2, variance: -4.0, segment: 'SME', reason: 'Recovery' },
      { account: 'ACC003789', predictedPD: 1.8, actualPD: 12.3, variance: 10.5, segment: 'Corporate', reason: 'Fraud' },
      { account: 'ACC004123', predictedPD: 6.5, actualPD: 0.8, variance: -5.7, segment: 'Retail', reason: 'Model error' }
    ]
  }), []);

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleRun = () => {
    if (!selectedDate || !selectedRunKey) {
      alert('Please select both date and run key');
      return;
    }
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setHasRun(true);
      console.log('Running PD Backtesting with:', { selectedDate, selectedRunKey });
    }, 2000);
  };

  const renderPerformanceAnalysis = () => {
    const filteredData = selectedSegment === 'all' 
      ? backtestingData.performance 
      : backtestingData.performance; // In real implementation, filter by segment

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-xs font-medium text-gray-700">Segment:</label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="all">All Segments</option>
              <option value="retail">Retail</option>
              <option value="sme">SME</option>
              <option value="corporate">Corporate</option>
            </select>
            <label className="text-xs font-medium text-gray-700">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="12m">12 Months</option>
              <option value="24m">24 Months</option>
              <option value="36m">36 Months</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Hit Rate</div>
            <div className="text-lg font-bold text-gray-800">
              {(backtestingData.modelMetrics.hitRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Model Accuracy</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Gini Coefficient</div>
            <div className="text-lg font-bold text-gray-800">
              {backtestingData.modelMetrics.gini.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Discriminatory Power</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">AUC</div>
            <div className="text-lg font-bold text-gray-800">
              {backtestingData.modelMetrics.auc.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Area Under Curve</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Calibration Slope</div>
            <div className="text-lg font-bold text-gray-800">
              {backtestingData.modelMetrics.calibrationSlope.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Model Calibration</div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Predicted vs Actual PD Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Legend />
              <Line type="monotone" dataKey="predictedPD" stroke="#8884d8" name="Predicted PD" />
              <Line type="monotone" dataKey="actualPD" stroke="#82ca9d" name="Actual PD" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Variance Analysis */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">PD Variance Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Bar dataKey="variance" fill="#ffc658" name="PD Variance" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Performance Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accounts</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Defaults</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.period}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.predictedPD)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.actualPD)}</td>
                    <td className={`px-4 py-2 text-xs text-right ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.variance > 0 ? '+' : ''}{formatPercent(row.variance)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatNumber(row.accounts)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatNumber(row.defaults)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCalibrationAnalysis = () => {
    return (
      <div className="space-y-6">
        {/* Calibration Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">PD Calibration Analysis</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={backtestingData.calibration}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="predictedPD" name="Predicted PD" />
              <YAxis dataKey="actualPD" name="Actual PD" />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Scatter dataKey="actualPD" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Calibration Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Calibration by PD Bucket</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PD Bucket</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calibration Ratio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backtestingData.calibration.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.pdBucket}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatNumber(row.predictedCount)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatNumber(row.actualCount)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.predictedPD)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.actualPD)}</td>
                    <td className={`px-4 py-2 text-xs text-right ${row.calibration > 1.1 ? 'text-red-600' : row.calibration < 0.9 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {row.calibration.toFixed(2)}
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

  const renderSegmentAnalysis = () => {
    return (
      <div className="space-y-6">
        {/* Segment Performance Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Segment Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={backtestingData.segmentAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" />
              <YAxis />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Legend />
              <Bar dataKey="predictedPD" fill="#8884d8" name="Predicted PD" />
              <Bar dataKey="actualPD" fill="#82ca9d" name="Actual PD" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Segment Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Segment Analysis Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Hit Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accounts</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backtestingData.segmentAnalysis.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.segment}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.predictedPD)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.actualPD)}</td>
                    <td className={`px-4 py-2 text-xs text-right ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.variance > 0 ? '+' : ''}{formatPercent(row.variance)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{(row.hitRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatNumber(row.accounts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOutlierAnalysis = () => {
    return (
      <div className="space-y-6">
        {/* Outlier Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOutliers}
                onChange={(e) => setShowOutliers(e.target.checked)}
                className="mr-2"
              />
              <span className="text-xs text-gray-700">Show Outliers Only</span>
            </label>
          </div>
        </div>

        {/* Outlier Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Outlier Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backtestingData.outliers.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.account}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.predictedPD)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.actualPD)}</td>
                    <td className={`px-4 py-2 text-xs text-right ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.variance > 0 ? '+' : ''}{formatPercent(row.variance)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900">{row.segment}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white">
      {/* Header with Selection Form */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">PD Backtesting</h1>
          <p className="text-sm text-gray-600 mt-1">Run PD backtesting analysis for selected date and run key</p>
        </div>
        
        {/* Compact Selection Form - Top Right */}
        <div className="flex items-center space-x-3">
          {/* Date Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Run Key Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Run Key
            </label>
            <select
              value={selectedRunKey}
              onChange={(e) => setSelectedRunKey(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              {availableRunKeys.map((runKey) => (
                <option key={runKey} value={runKey}>
                  {runKey}
                </option>
              ))}
            </select>
          </div>

          {/* Run Button */}
          <div className="pt-5">
            <button
              onClick={handleRun}
              disabled={!selectedDate || !selectedRunKey || isLoading}
              className={`py-1 px-3 text-xs font-medium rounded ${
                !selectedDate || !selectedRunKey || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full mr-1"></div>
                  Running...
                </div>
              ) : (
                'Run'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section - Only show after running */}
      {hasRun && (
        <div>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 px-6">
              <button
                className={`py-2 px-1 text-xs font-medium border-b-2 ${
                  selectedTab === 'performance'
                    ? 'border-gray-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTab('performance')}
              >
                Performance Analysis
              </button>
              <button
                className={`py-2 px-1 text-xs font-medium border-b-2 ${
                  selectedTab === 'calibration'
                    ? 'border-gray-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTab('calibration')}
              >
                Calibration Analysis
              </button>
              <button
                className={`py-2 px-1 text-xs font-medium border-b-2 ${
                  selectedTab === 'segment'
                    ? 'border-gray-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTab('segment')}
              >
                Segment Analysis
              </button>
              <button
                className={`py-2 px-1 text-xs font-medium border-b-2 ${
                  selectedTab === 'outliers'
                    ? 'border-gray-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTab('outliers')}
              >
                Outlier Analysis
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {selectedTab === 'performance' && renderPerformanceAnalysis()}
            {selectedTab === 'calibration' && renderCalibrationAnalysis()}
            {selectedTab === 'segment' && renderSegmentAnalysis()}
            {selectedTab === 'outliers' && renderOutlierAnalysis()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDBacktesting;