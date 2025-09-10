import React, { useState } from 'react';
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
    Cell
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ECLReconciliations() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [previousDate, setPreviousDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reconciliationData, setReconciliationData] = useState(null);

    const fetchReconciliationData = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentFormatted = formatDate(currentDate);
            const previousFormatted = formatDate(previousDate);

            const response = await axios.get(`/api/ecl-reconciliations/two-period-reconciliation`, {
                params: {
                    currentMisDate: currentFormatted,
                    previousMisDate: previousFormatted,
                    currentRunKey: 'latest',
                    previousRunKey: 'previous'
                }
            });

            setReconciliationData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching reconciliation data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const formatPercentage = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };

  return (
        <div className="p-6 max-w-7xl mx-auto">

            {/* Date Selection */}
            <div className=" p-6 mb-8">
                <div className="flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="currentDate" className="block text-sm font-medium text-gray-700 mb-2">
                            Current Date
                        </label>
                        <input
                            type="date"
                            id="currentDate"
                            value={formatDate(currentDate)}
                            onChange={(e) => setCurrentDate(new Date(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="previousDate" className="block text-sm font-medium text-gray-700 mb-2">
                            Previous Date
                        </label>
                        <input
                            type="date"
                            id="previousDate"
                            value={formatDate(previousDate)}
                            onChange={(e) => setPreviousDate(new Date(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button 
                        onClick={fetchReconciliationData}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                    {error}
                </div>
            )}

            {reconciliationData && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Stage Distribution Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Stage Distribution</h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reconciliationData.stageComparison}
                                            dataKey="current_accounts"
                                            nameKey="stage"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        >
                                            {reconciliationData.stageComparison.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ECL Movement Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">ECL Movement</h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reconciliationData.stageComparison}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="stage" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="current_ecl" name="Current ECL" fill="#8884d8" />
                                        <Bar dataKey="previous_ecl" name="Previous ECL" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Stage Comparison Table */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Stage Comparison</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Accounts</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Accounts</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Movement</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current ECL</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous ECL</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ECL Movement</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reconciliationData.stageComparison.map((row) => (
                                        <tr key={row.stage} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Stage {row.stage}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.current_accounts}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.previous_accounts}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.account_movement}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.current_ecl)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.previous_ecl)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.ecl_movement)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Portfolio Quality Metrics */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Portfolio Quality Metrics</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total Accounts</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reconciliationData.portfolioComparison.current_total_accounts}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reconciliationData.portfolioComparison.previous_total_accounts}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reconciliationData.portfolioComparison.account_movement}</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Coverage Ratio</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPercentage(reconciliationData.portfolioComparison.current_coverage_ratio)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPercentage(reconciliationData.portfolioComparison.previous_coverage_ratio)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPercentage(reconciliationData.portfolioComparison.coverage_ratio_movement)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
    </div>
    );
}
