import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../../utils/formatters';
import API_URL from '../../utils/Api';

const LossAllowanceReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      // First, get the two most recent approved dates
      console.log('Fetching recent approved dates...');
      const datesResponse = await axios.get(`${API_URL}/dashboard/recent-approved-dates`);
      console.log('Dates response:', datesResponse.data);
      const approvedDates = datesResponse.data.data;

      if (!approvedDates || approvedDates.length < 2) {
        console.log('Not enough approved dates:', approvedDates);
        setDebugInfo({
          error: 'Not enough approved dates',
          approvedDates
        });
        setError('Not enough approved dates available');
        setLoading(false);
        return;
      }

      // Get dates and run keys from response
      const [endDate, startDate] = approvedDates;
      console.log('Using dates and run keys:', { startDate, endDate });

      // Get the report data using the run keys directly
      console.log('Fetching report data with params:', {
        startDate: startDate.date,
        endDate: endDate.date,
        startRunKey: startDate.run_key,
        endRunKey: endDate.run_key
      });
      
      const response = await axios.get(`${API_URL}/ecl/analysis/loss-allowance-report`, {
        params: {
          startDate: startDate.date,
          endDate: endDate.date,
          startRunKey: startDate.run_key,
          endRunKey: endDate.run_key
        }
      });

      console.log('Report response:', response.data);

      if (!response.data.data) {
        console.log('Invalid report data:', response.data);
        setDebugInfo({
          error: 'Invalid report data',
          response: response.data
        });
        throw new Error('Invalid data received from server');
      }

      setReportData(response.data.data);
    } catch (err) {
      console.error('Error in fetchReportData:', err);
      setDebugInfo({
        error: err.message,
        response: err.response?.data
      });
      setError(err.response?.data?.message || err.message || 'Failed to fetch report data');
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

  if (loading) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Loss Allowance Report</h3>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Loss Allowance Report</h3>
        <div className="text-xs text-red-500">Loss allowance report not available yet.</div>
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded text-xs font-mono">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Loss Allowance Report</h3>
        <div className="text-xs text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Loss Allowance Report</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Movement Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Stage 1</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Stage 2</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Stage 3</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Opening Balance */}
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-gray-900">Opening ECL balance</td>
              {[1, 2, 3].map(stage => {
                const data = getStageData('opening_balance', stage);
                return (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-900">{formatNumber(data.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {data.account_count.toLocaleString()} accounts
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="text-xs font-medium text-gray-900">
                  {formatNumber(getTotalData('opening_balance').amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {getTotalData('opening_balance').account_count.toLocaleString()} accounts
                </div>
              </td>
            </tr>

            {/* New Assets */}
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-gray-900">New financial assets originated</td>
              {[1, 2, 3].map(stage => {
                const data = getStageData('new_assets', stage);
                return (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-900">{formatNumber(data.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {data.account_count.toLocaleString()} accounts
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="text-xs font-medium text-gray-900">
                  {formatNumber(getTotalData('new_assets').amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {getTotalData('new_assets').account_count.toLocaleString()} accounts
                </div>
              </td>
            </tr>

            {/* Stage Transfers */}
            {reportData.stage_transfer_losses?.transfers?.map((transfer, index) => (
              <tr key={`loss-${index}`}>
                <td className="px-4 py-3 text-xs font-medium text-gray-900">
                  Transfer from Stage {transfer.from_stage} to Stage {transfer.to_stage}
                </td>
                {[1, 2, 3].map(stage => (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-900">
                      {stage === transfer.from_stage ? formatNumber(-transfer.amount) : 
                       stage === transfer.to_stage ? formatNumber(transfer.amount) : '-'}
                    </div>
                    {(stage === transfer.from_stage || stage === transfer.to_stage) && (
                      <div className="text-xs text-gray-500">
                        {transfer.account_count.toLocaleString()} accounts
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">-</td>
              </tr>
            ))}

            {/* Derecognized Assets */}
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-gray-900">Assets derecognized or repaid</td>
              {[1, 2, 3].map(stage => {
                const data = getStageData('derecognized_assets', stage);
                return (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-900">{formatNumber(-data.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {data.account_count.toLocaleString()} accounts
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="text-xs font-medium text-gray-900">
                  {formatNumber(-getTotalData('derecognized_assets').amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {getTotalData('derecognized_assets').account_count.toLocaleString()} accounts
                </div>
              </td>
            </tr>

            {/* Changes in ECL */}
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-gray-900">Changes in credit risk</td>
              {[1, 2, 3].map(stage => {
                const increases = getStageData('ecl_increases', stage);
                const decreases = getStageData('ecl_decreases', stage);
                const netChange = increases.amount + decreases.amount;
                return (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-medium text-gray-900">{formatNumber(netChange)}</div>
                    <div className="text-xs text-gray-500">
                      {(increases.account_count + decreases.account_count).toLocaleString()} accounts
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="text-xs font-medium text-gray-900">
                  {formatNumber(getTotalData('ecl_increases').amount + getTotalData('ecl_decreases').amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {(getTotalData('ecl_increases').account_count + getTotalData('ecl_decreases').account_count).toLocaleString()} accounts
                </div>
              </td>
            </tr>

            {/* Closing Balance */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-xs font-semibold text-gray-900">Closing ECL balance</td>
              {[1, 2, 3].map(stage => {
                const data = getStageData('closing_balance', stage);
                return (
                  <td key={stage} className="px-4 py-3 text-right">
                    <div className="text-xs font-semibold text-gray-900">{formatNumber(data.amount)}</div>
                    <div className="text-xs text-gray-600">
                      {data.account_count.toLocaleString()} accounts
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="text-xs font-semibold text-gray-900">
                  {formatNumber(getTotalData('closing_balance').amount)}
                </div>
                <div className="text-xs text-gray-600">
                  {getTotalData('closing_balance').account_count.toLocaleString()} accounts
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LossAllowanceReport; 