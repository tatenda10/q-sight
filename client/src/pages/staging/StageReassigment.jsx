import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';

const StageReassignment = () => {

    // Search form state
    const [searchCriteria, setSearchCriteria] = useState({
        accountNumber: '',
        runKey: '',
        misDate: '',
        stage: ''
    });
    
    // Results and selection state
    const [searchResults, setSearchResults] = useState([]);
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    // Stage reassignment state
    const [newStage, setNewStage] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        // Add authorization header for all requests
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }, []);

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchCriteria(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/staging/reassignment`, { 
                params: searchCriteria,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            });
            setSearchResults(response.data.data || []);
            setSelectedAccounts([]); // Reset selections
            setSelectAll(false);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to search accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        setSelectAll(checked);
        setSelectedAccounts(checked ? searchResults.map(acc => acc.account_number) : []);
    };

    const handleSelectAccount = (accountNumber) => {
        setSelectedAccounts(prev => {
            if (prev.includes(accountNumber)) {
                return prev.filter(acc => acc !== accountNumber);
            }
            return [...prev, accountNumber];
        });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedAccounts.length === 0) {
            setError('Please select at least one account');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const searchResult = searchResults.find(result => result.n_account_number === selectedAccounts[0]);
            if (!searchResult) {
                throw new Error('Selected account not found in search results');
            }
            
            // Handle date correctly:
            // 1. Parse the date string to a Date object in local time
            // 2. Extract the components and reconstruct as YYYY-MM-DD
            const dateParts = new Date(searchResult.fic_mis_date).toISOString().split('T')[0];
            
            const requestPayload = {
                accountSelections: selectedAccounts.map(accountNumber => ({ accountNumber })),
                newStage: parseInt(newStage),
                reason,
                runKey: searchResult.n_run_key,
                misDate: dateParts
            };

            console.log('Making request with payload:', requestPayload);
            const response = await axios.post(`${API_URL}/staging/reassignment/reassign`, requestPayload);
            console.log('Server response:', response.data);

            setSuccess('Stage reassignment completed successfully');
            setNewStage('');

            setReason('');
            setSelectedAccounts([]);
            setSelectAll(false);
        } catch (error) {
            console.log('Error response:', error.response?.data);
            setError(error.response?.data?.error || 'Failed to reassign stages');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Search Form */}
            <div className="bg-white border border-gray-300 mb-8">
                <div className="p-8">
                    <h2 className="text-sm font-semibold mb-6 text-gray-800">Search Accounts</h2>
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Account Number</label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={searchCriteria.accountNumber}
                                onChange={handleSearchChange}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                                placeholder="Enter account number"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Run Key</label>
                            <input
                                type="text"
                                name="runKey"
                                value={searchCriteria.runKey}
                                onChange={handleSearchChange}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                                placeholder="Enter run key"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">MIS Date</label>
                            <input
                                type="date"
                                name="misDate"
                                value={searchCriteria.misDate}
                                onChange={handleSearchChange}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Stage</label>
                            <select
                                name="stage"
                                value={searchCriteria.stage}
                                onChange={handleSearchChange}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                            >
                                <option value="">All Stages</option>
                                <option value="1">Stage 1</option>
                                <option value="2">Stage 2</option>
                                <option value="3">Stage 3</option>
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gray-600 text-white px-6 py-3 text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors duration-200"
                            >
                                {loading ? 'Searching...' : 'Search Accounts'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="bg-white border border-gray-300 mb-8">
                    <div className="p-8">
                        <h2 className="text-sm font-semibold mb-6 text-gray-800">Search Results</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="w-5 h-5 border-gray-300 text-gray-600 focus:ring-gray-500"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Account Number</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Run Key</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">MIS Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stage</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-300">
                                    {searchResults.map((account) => (
                                        <tr key={`${account.n_account_number}-${account.n_run_key}-${account.fic_mis_date}`} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAccounts.includes(account.n_account_number)}
                                                    onChange={() => handleSelectAccount(account.n_account_number)}
                                                    className="w-5 h-5 border-gray-300 text-gray-600 focus:ring-gray-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-900">{account.n_account_number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">{account.n_run_key}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">{account.fic_mis_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">Stage {account.n_curr_ifrs_stage_skey}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Stage Reassignment Form */}
            <div className="bg-white border border-gray-300 mb-8">
                <div className="p-8">
                    <h2 className="text-sm font-semibold mb-6 text-gray-800">Stage Reassignment</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">New Stage</label>
                            <select
                                value={newStage}
                                onChange={(e) => setNewStage(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                                required
                            >
                                <option value="">Select stage</option>
                                <option value="1">Stage 1</option>
                                <option value="2">Stage 2</option>
                                <option value="3">Stage 3</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Reason for Reassignment</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-300 text-xs focus:border-gray-500 focus:ring-gray-500"
                                rows="4"
                                placeholder="Enter reason for stage reassignment"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-xs">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-xs">
                                {success}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <div className="text-xs font-medium text-gray-600">
                                {selectedAccounts.length} account(s) selected
                            </div>
                            <button
                                type="submit"
                                disabled={loading || selectedAccounts.length === 0}
                                className="bg-gray-600 text-white px-6 py-3 text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors duration-200"
                            >
                                {loading ? 'Processing...' : 'Reassign Stage'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StageReassignment;
