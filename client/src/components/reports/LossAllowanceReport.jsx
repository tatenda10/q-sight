import React, { useState } from 'react';
import axios from 'axios';
import { formatCurrency } from '../../utils/formatters';
import API_URL from '../../utils/Api';

function LossAllowanceReport() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startRunKey, setStartRunKey] = useState('');
    const [endRunKey, setEndRunKey] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAccountNumbers, setShowAccountNumbers] = useState(false);

    const validateDates = () => {
        if (!startDate || !endDate || !startRunKey || !endRunKey) {
            setError('Please fill in all fields');
            return false;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            setError('Start date cannot be later than end date');
            return false;
        }

        return true;
    };

    const handleSearch = async () => {
        if (!validateDates()) {
            return;
        }

        setLoading(true);
        setError(null);
        setReportData(null);

        try {
            const response = await axios.get(`${API_URL}/ecl/analysis/loss-allowance-report`, {
                params: {
                    startDate,
                    endDate,
                    startRunKey,
                    endRunKey
                }
            });

            // Validate the response data structure
            if (!response.data.data || !response.data.data.opening_balance || !response.data.data.closing_balance) {
                throw new Error('Invalid data received from server');
            }

            setReportData(response.data.data);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 
                               err.message || 
                               'Failed to fetch report data. Please ensure the dates and run keys are correct.';
            setError(errorMessage);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to safely access nested properties
    const getStageData = (section, stage) => {
        if (!reportData || !reportData[section] || !reportData[section].stages) {
            return { amount: 0, account_count: 0 };
        }
        return reportData[section].stages[stage] || { amount: 0, account_count: 0 };
    };

    // Helper function to safely get total data
    const getTotalData = (section) => {
        if (!reportData || !reportData[section] || !reportData[section].total) {
            return { amount: 0, account_count: 0 };
        }
        return reportData[section].total;
    };

    const formatNumber = (value) => {
        if (value < 0) {
            return `(${formatCurrency(Math.abs(value))})`;
        }
        return formatCurrency(value);
    };

    const handleDownload = () => {
        if (!reportData) return;

        const rows = [
            ['Movement Description', 'Stage 1', 'Stage 2', 'Stage 3', 'Total'],
            ['Opening ECL balance', 
                formatNumber(getStageData('opening_balance', 1).amount),
                formatNumber(getStageData('opening_balance', 2).amount),
                formatNumber(getStageData('opening_balance', 3).amount),
                formatNumber(getTotalData('opening_balance').amount)
            ],
            ['New financial assets originated or purchased',
                formatNumber(getStageData('new_assets', 1).amount),
                formatNumber(getStageData('new_assets', 2).amount),
                formatNumber(getStageData('new_assets', 3).amount),
                formatNumber(getTotalData('new_assets').amount)
            ],
            ['Assets derecognised (excluding write-offs, appreciation)',
                formatNumber(-getStageData('derecognized_assets', 1).amount),
                formatNumber(-getStageData('derecognized_assets', 2).amount),
                formatNumber(-getStageData('derecognized_assets', 3).amount),
                formatNumber(-getTotalData('derecognized_assets').amount)
            ],
            ['Closing ECL balance',
                formatNumber(getStageData('closing_balance', 1).amount),
                formatNumber(getStageData('closing_balance', 2).amount),
                formatNumber(getStageData('closing_balance', 3).amount),
                formatNumber(getTotalData('closing_balance').amount)
            ]
        ];

        // Add stage transfers if they exist
        if (reportData.stage_transfer_losses?.transfers) {
            reportData.stage_transfer_losses.transfers.forEach(transfer => {
                const row = [`Transfers from Stage ${transfer.from_stage} to Stage ${transfer.to_stage}`];
                for (let stage = 1; stage <= 3; stage++) {
                    if (stage === transfer.from_stage) {
                        row.push(formatNumber(-transfer.amount));
                    } else if (stage === transfer.to_stage) {
                        row.push(formatNumber(transfer.amount));
                    } else {
                        row.push('-');
                    }
                }
                row.push('-');
                rows.splice(2, 0, row);
            });
        }

        const csvContent = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loss-allowance-report-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white p-4">
            <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    {/* Start Date Section */}
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Start Run Key</label>
                        <input
                            type="text"
                            value={startRunKey}
                            onChange={(e) => setStartRunKey(e.target.value)}
                            placeholder="Enter start run key"
                            className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* End Date Section */}
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">End Run Key</label>
                        <input
                            type="text"
                            value={endRunKey}
                            onChange={(e) => setEndRunKey(e.target.value)}
                            placeholder="Enter end run key"
                            className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Search Button */}
                    <div className="md:col-span-2">
                        <button
                            onClick={handleSearch}
                            className="w-full px-3 py-1 text-xs bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                            <span>Search</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Controls */}
            {reportData && (
                <div className="flex justify-end space-x-4 mb-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={showAccountNumbers}
                            onChange={(e) => setShowAccountNumbers(e.target.checked)}
                            className="border-gray-300 text-gray-600 focus:border-gray-300 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                        />
                        <span className="text-xs text-gray-600">Show account numbers</span>
                    </label>
                    <button
                        onClick={handleDownload}
                        className="px-3 py-1 text-xs bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center space-x-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Download CSV</span>
                    </button>
                </div>
            )}

            <div className="overflow-x-auto border border-gray-200">
                {error && (
                    <div className="p-3 text-red-700 bg-red-100 mb-3 flex items-center text-xs">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="p-4 text-center">
                        <div className="inline-block animate-spin h-6 w-6 border-3 border-gray-500 border-t-transparent"></div>
                        <div className="mt-2 text-gray-600 text-xs">Loading report data...</div>
                    </div>
                ) : reportData ? (
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Movement Description</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage 1</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage 2</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage 3</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {/* Opening Balance */}
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                    Opening ECL balance
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('opening_balance', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {formatNumber(data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-400">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left text-gray-700">
                                    {formatNumber(getTotalData('opening_balance').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('opening_balance').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* New Financial Assets */}
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                    New financial assets originated or purchased
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('new_assets', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {formatNumber(data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-400">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left text-gray-700">
                                    {formatNumber(getTotalData('new_assets').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('new_assets').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* Stage Transfer Losses */}
                            {reportData?.stage_transfer_losses?.transfers?.map((transfer, idx) => (
                                <tr key={`loss-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                        Transfers from Stage {transfer.from_stage} to Stage {transfer.to_stage}
                                    </td>
                                    {[1, 2, 3].map(stage => (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {stage === transfer.from_stage ? (
                                                <>
                                                    {formatNumber(-transfer.amount)}
                                                    {showAccountNumbers && (
                                                        <div className="text-xxs text-gray-400">
                                                            ({transfer.account_count} accounts)
                                                        </div>
                                                    )}
                                                </>
                                            ) : stage === transfer.to_stage ? (
                                                <>
                                                    {formatNumber(transfer.amount)}
                                                    {showAccountNumbers && (
                                                        <div className="text-xxs text-gray-400">
                                                            ({transfer.account_count} accounts)
                                                        </div>
                                                    )}
                                                </>
                                            ) : '-'}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2.5 text-left text-gray-700">-</td>
                                </tr>
                            ))}

                            {/* Stage Transfer Gains */}
                            {reportData?.stage_transfer_gains?.transfers?.map((transfer, idx) => (
                                <tr key={`gain-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                        Transfers from Stage {transfer.from_stage} to Stage {transfer.to_stage}
                                    </td>
                                    {[1, 2, 3].map(stage => (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {stage === transfer.from_stage ? (
                                                <>
                                                    {formatNumber(-transfer.amount)}
                                                    {showAccountNumbers && (
                                                        <div className="text-xxs text-gray-400">
                                                            ({transfer.account_count} accounts)
                                                        </div>
                                                    )}
                                                </>
                                            ) : stage === transfer.to_stage ? (
                                                <>
                                                    {formatNumber(transfer.amount)}
                                                    {showAccountNumbers && (
                                                        <div className="text-xxs text-gray-400">
                                                            ({transfer.account_count} accounts)
                                                        </div>
                                                    )}
                                                </>
                                            ) : '-'}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2.5 text-left text-gray-700">-</td>
                                </tr>
                            ))}

                            {/* Derecognized Assets */}
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                    Assets derecognised (excluding write-offs, appreciation)
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('derecognized_assets', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {formatNumber(-data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-400">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left text-gray-700">
                                    {formatNumber(-getTotalData('derecognized_assets').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('derecognized_assets').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* ECL Increases */}
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                    Increase in ECL due to credit deterioration
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('ecl_increases', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {formatNumber(data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-400">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left text-gray-700">
                                    {formatNumber(getTotalData('ecl_increases').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('ecl_increases').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* ECL Decreases */}
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                                    Decrease in ECL due to credit appreciation
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('ecl_decreases', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left text-gray-700">
                                            {formatNumber(data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-400">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left text-gray-700">
                                    {formatNumber(getTotalData('ecl_decreases').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('ecl_decreases').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* Closing Balance */}
                            <tr className="bg-gray-100 hover:bg-gray-200 transition-colors">
                                <td className="px-4 py-2.5 text-left font-bold text-gray-900">
                                    Closing ECL balance
                                </td>
                                {[1, 2, 3].map(stage => {
                                    const data = getStageData('closing_balance', stage);
                                    return (
                                        <td key={stage} className="px-4 py-2.5 text-left font-bold text-gray-900">
                                            {formatNumber(data.amount)}
                                            {showAccountNumbers && (
                                                <div className="text-xxs text-gray-500">
                                                    ({data.account_count} accounts)
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-left font-bold text-gray-900">
                                    {formatNumber(getTotalData('closing_balance').amount)}
                                    {showAccountNumbers && (
                                        <div className="text-xxs text-gray-400">
                                            ({getTotalData('closing_balance').account_count} accounts)
                                        </div>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div className="p-4 text-center">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-xs font-medium text-gray-900">No report data</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Select a start date, end date, and corresponding run keys to generate the report.
                        </p>
                        <p className="mt-1 text-xxs text-gray-400">
                            Make sure the run keys match with their respective dates.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LossAllowanceReport;