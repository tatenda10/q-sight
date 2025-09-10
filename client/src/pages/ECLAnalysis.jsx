import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import axios from 'axios';
import API_URL from '../utils/Api';
function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const ECLAnalysis = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [date, setDate] = useState('');
    const [runKey, setRunKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Stage Analysis Data
    const [stageData, setStageData] = useState([]);
    const [productSegmentData, setProductSegmentData] = useState([]);
    const [stageMigrationData, setStageMigrationData] = useState([]);
    const [periodComparisonData, setPeriodComparisonData] = useState([]);

    // Loss Allowance Data
    const [lossAllowanceData, setLossAllowanceData] = useState(null);

    const fetchStageAnalysis = async () => {
        try {
            setLoading(true);
            const [stageRes, productRes] = await Promise.all([
                axios.get(`/api/ecl/analysis/by-stage?date=${date}&run_key=${runKey}`),
                axios.get(`/api/ecl/analysis/by-product-segment?date=${date}&run_key=${runKey}`)
            ]);
            setStageData(stageRes.data.data);
            setProductSegmentData(productRes.data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchMigrationAnalysis = async () => {
        try {
            setLoading(true);
            const [migrationRes, comparisonRes] = await Promise.all([
                axios.get(`/api/ecl/analysis/stage-migration?current_date=${date}&current_run_key=${runKey}`),
                axios.get(`/api/ecl/analysis/period-comparison?current_date=${date}&current_run_key=${runKey}`)
            ]);
            setStageMigrationData(migrationRes.data.data);
            setPeriodComparisonData(comparisonRes.data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLossAllowanceReport = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/ecl/analysis/loss-allowance?current_date=${date}&current_run_key=${runKey}`);
            setLossAllowanceData(response.data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        setDate(e.target.value);
    };

    const handleRunKeyChange = (e) => {
        setRunKey(e.target.value);
    };

    const handleFetchData = () => {
        if (selectedTab === 0) {
            fetchStageAnalysis();
        } else if (selectedTab === 1) {
            fetchMigrationAnalysis();
        } else if (selectedTab === 2) {
            fetchLossAllowanceReport();
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">ECL Analysis Reports</h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={handleDateChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Run Key</label>
                        <input
                            type="text"
                            value={runKey}
                            onChange={handleRunKeyChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleFetchData}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Fetch Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                <Tab.List className="flex space-x-1 border-b border-gray-300">
                    <Tab
                        className={({ selected }) =>
                            classNames(
                                'px-3 py-2 text-xs font-medium transition-colors focus:outline-none text-left',
                                selected
                                    ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            )
                        }
                    >
                        Stage Analysis
                    </Tab>
                    <Tab
                        className={({ selected }) =>
                            classNames(
                                'px-3 py-2 text-xs font-medium transition-colors focus:outline-none text-left',
                                selected
                                    ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            )
                        }
                    >
                        Reconciliations
                    </Tab>
                    <Tab
                        className={({ selected }) =>
                            classNames(
                                'px-3 py-2 text-xs font-medium transition-colors focus:outline-none text-left',
                                selected
                                    ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            )
                        }
                    >
                        Other Reports
                    </Tab>
                </Tab.List>

                <Tab.Panels className="mt-6">
                    {/* Stage Analysis Panel */}
                    <Tab.Panel>
                        <div className="space-y-6">
                            {/* ECL by Stage */}
                            <div className="bg-white shadow p-4">
                                <h2 className="text-sm font-semibold mb-3">ECL by Stage</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Account Count</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Total Exposure</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Total ECL</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">ECL %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {stageData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-2.5 text-left font-medium text-gray-900">{row.stage}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatNumber(row.account_count)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatCurrency(row.total_exposure)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatCurrency(row.total_ecl)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{row.ecl_percentage.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ECL by Product Segment */}
                            <div className="bg-white shadow p-4">
                                <h2 className="text-sm font-semibold mb-3">ECL by Product Segment</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Product</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Account Count</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Total Exposure</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Total ECL</th>
                                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">ECL %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {productSegmentData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-2.5 text-left font-medium text-gray-900">{row.v_product_class}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{row.stage}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatNumber(row.account_count)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatCurrency(row.total_exposure)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{formatCurrency(row.total_ecl)}</td>
                                                    <td className="px-4 py-2.5 text-left text-gray-700">{row.ecl_percentage.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* Reconciliations Panel */}
                    <Tab.Panel>
                        <div className="space-y-6">
                            {/* Stage Migration */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-4">Stage Migration Analysis</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Stage</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Stage</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Count</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Exposure</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total ECL</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ECL %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {stageMigrationData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.from_stage}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.to_stage}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(row.account_count)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.total_exposure)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.total_ecl)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ecl_percentage.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Period Comparison */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-4">Period Comparison</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Accounts</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Accounts</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Exposure</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Exposure</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current ECL</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous ECL</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current ECL %</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous ECL %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {periodComparisonData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.stage}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(row.current_account_count)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(row.previous_account_count)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.current_exposure)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.previous_exposure)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.current_ecl)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.previous_ecl)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.current_ecl_percentage.toFixed(2)}%</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.previous_ecl_percentage.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* Other Reports Panel */}
                    <Tab.Panel>
                        <div className="space-y-6">
                            {/* Loss Allowance Report */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-4">Loss Allowance Report (IFRS 7)</h2>
                                {lossAllowanceData ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement Description</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage 1</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage 2</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage 3</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {/* Opening Balance */}
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Opening ECL balance</td>
                                                    {lossAllowanceData.opening_balance.map((row, idx) => (
                                                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatCurrency(row.opening_balance)}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(lossAllowanceData.opening_balance.reduce((sum, row) => sum + row.opening_balance, 0))}
                                                    </td>
                                                </tr>

                                                {/* New Financial Assets */}
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">New financial assets originated or purchased</td>
                                                    {lossAllowanceData.new_assets.map((row, idx) => (
                                                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatCurrency(row.new_assets)}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(lossAllowanceData.new_assets.reduce((sum, row) => sum + row.new_assets, 0))}
                                                    </td>
                                                </tr>

                                                {/* Stage Transfers */}
                                                {lossAllowanceData.stage_transfers.map((transfer, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            Transfers from Stage {transfer.from_stage} to Stage {transfer.to_stage}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {transfer.from_stage === '1' ? formatCurrency(-transfer.transfer_amount) : 
                                                             transfer.to_stage === '1' ? formatCurrency(transfer.transfer_amount) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {transfer.from_stage === '2' ? formatCurrency(-transfer.transfer_amount) : 
                                                             transfer.to_stage === '2' ? formatCurrency(transfer.transfer_amount) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {transfer.from_stage === '3' ? formatCurrency(-transfer.transfer_amount) : 
                                                             transfer.to_stage === '3' ? formatCurrency(transfer.transfer_amount) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                                                    </tr>
                                                ))}

                                                {/* Credit Risk Changes */}
                                                {lossAllowanceData.credit_risk_changes.map((change, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            ECL {change.deterioration > 0 ? 'increase' : 'decrease'} due to credit risk {change.deterioration > 0 ? 'deterioration' : 'improvement'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {change.stage === '1' ? formatCurrency(change.deterioration - change.improvement) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {change.stage === '2' ? formatCurrency(change.deterioration - change.improvement) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {change.stage === '3' ? formatCurrency(change.deterioration - change.improvement) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatCurrency(change.deterioration - change.improvement)}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Derecognitions */}
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Assets derecognised (excluding write-offs)</td>
                                                    {lossAllowanceData.derecognitions.map((row, idx) => (
                                                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatCurrency(-row.derecognition_amount)}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(-lossAllowanceData.derecognitions.reduce((sum, row) => sum + row.derecognition_amount, 0))}
                                                    </td>
                                                </tr>

                                                {/* Closing Balance */}
                                                <tr className="bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Closing ECL balance</td>
                                                    {lossAllowanceData.closing_balance.map((row, idx) => (
                                                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {formatCurrency(row.closing_balance)}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {formatCurrency(lossAllowanceData.closing_balance.reduce((sum, row) => sum + row.closing_balance, 0))}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Select a date and run key to view the report.</p>
                                )}
                            </div>
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>

            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg">
                        <p className="text-lg">Loading...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ECLAnalysis;