import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';
function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const response = await axios.get(`${API_URL}/ecl/runs`);
      setRuns(response.data.data);
      setLoading(false);
    } catch {
      setError('Failed to fetch run history');
      setLoading(false);
    }
  };

  const handleApprove = async (runKey, approved) => {
    try {
      await axios.post(`${API_URL}/ecl/approve/${runKey}`, { approved });
      fetchRuns(); // Refresh the list
    } catch {
      setError('Failed to update approval status');
    }
  };

  if (loading) return <div className="text-xs text-gray-600">Loading...</div>;
  if (error) return <div className="text-xs text-red-600">{error}</div>;

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-1.5 text-left font-medium text-gray-700">Run Key</th>
              <th className="px-4 py-1.5 text-left font-medium text-gray-700">Date</th>
              <th className="px-4 py-1.5 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-1.5 text-left font-medium text-gray-700">Approved</th>
              <th className="px-4 py-1.5 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {runs.map((run) => (
              <tr key={run.run_key} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-1.5 text-left font-medium text-gray-900">{run.run_key}</td>
                <td className="px-4 py-1.5 text-left text-gray-700">{new Date(run.date).toLocaleDateString()}</td>
                <td className="px-4 py-1.5 text-left text-gray-700">{run.status}</td>
                <td className="px-4 py-1.5 text-left text-gray-700">{run.approved ? 'Yes' : 'No'}</td>
                <td className="px-4 py-1.5 text-left">
                  <button
                    onClick={() => handleApprove(run.run_key, !run.approved)}
                    className="bg-gray-600 text-white px-3 py-1 text-xs hover:bg-gray-700 transition-colors"
                  >
                    {run.approved ? 'Unapprove' : 'Approve'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RunHistory;
