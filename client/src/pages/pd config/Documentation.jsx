import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../utils/Api';

function Documentation() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/pd-documentation/versions/all`);
      
      if (response.data.success) {
        setVersions(response.data.versions || []);
      } else {
        setError(response.data.message || 'Failed to fetch versions');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch versions');
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (versionId) => {
    navigate(`/documentation/${versionId}`);
  };

  const handleCreateNew = () => {
    navigate('/create-documentation');
  };

  const handleAuthorize = async (versionId) => {
    const confirmed = window.confirm('Are you sure you want to approve this version?');
    
    if (confirmed) {
      try {
        const response = await axios.post(`${API_URL}/pd-documentation/${versionId}/authorize`);
        
        if (response.data.success) {
          // Refresh the versions list after successful authorization
          fetchVersions();
        } else {
          alert('Approval failed: make sure you have the necessary rights to proceed');
        }
      } catch {
        alert('Approval failed: make sure you have the necessary rights to proceed');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-full px-6 py-6 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h1 className="font-bold text-[#011325]">
          PD Model Documentation 
        </h1>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#011325] text-white rounded-md hover:bg-[#011325]/90 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>Create New Documentation</span>
        </button>
      </div>
      <hr className='border border-gray-300 mb-2'></hr>
      {versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documentation versions found. Click "Create New Documentation" to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm shadow">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Version</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Created By</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Created Date</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Authorized By</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Authorized Date</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{version.version}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{version.created_by}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                    {new Date(version.created_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{version.authorized_by || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                    {version.authorized_date ? new Date(version.authorized_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                      ${version.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' : 
                        version.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {version.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs space-x-2">
                    <button
                      onClick={() => handleView(version.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </button>
                    {version.status.toLowerCase() !== 'approved' && (
                      <button
                        onClick={() => handleAuthorize(version.id)}
                        className="text-green-600 hover:text-green-900 font-medium ml-2"
                      >
                        Authorize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Documentation;
