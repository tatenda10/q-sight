import React, { useState, useEffect, useRef } from 'react';
import API_URL from '../../utils/Api';
import Configuration from '../../components/ecl/Configuration';
import ViewResults from './ViewResults';
import RunHistory from '../../components/ecl/RunHistory';


const ECLCalculation = () => {
  const [ficMisDate, setFicMisDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState('calculation');
  const [runHistory, setRunHistory] = useState([]);
  const eventSourceRef = useRef(null);
  
  // Clean up event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle existing progress check
  useEffect(() => {
    const checkExistingProgress = async () => {
      try {
        const response = await fetch(`${API_URL}/ecl/progress/${ficMisDate}`);
        const data = await response.json();
        
        if (data.progress && data.progress.length > 0) {
          setProgress(data.progress.map(item => ({
            step: item.step,
            status: item.status,
            output: item.output
          })));
          
          // Check if the last item indicates completion or error
          const lastItem = data.progress[data.progress.length - 1];
          if (lastItem.status === 'Success' && lastItem.step.includes('completed successfully')) {
            setSuccess(true);
          } else if (lastItem.status === 'Error') {
            setError(lastItem.output || 'An error occurred during previous calculation.');
          }
        }
      } catch (err) {
        console.log('No previous progress found or error fetching progress');
      }
    };
    
    if (ficMisDate) {
      checkExistingProgress();
    }
  }, [ficMisDate]);
  
  // Mock function to fetch run history (replace with actual API call)
  useEffect(() => {
    const fetchRunHistory = async () => {
      // Mock data - replace with actual API call
      setRunHistory([
        { date: '2024-11-25', status: 'Success', duration: '45 minutes' },
        { date: '2024-11-26', status: 'Failed', duration: '12 minutes' },
        { date: '2024-11-28', status: 'Success', duration: '43 minutes' },
        { date: '2024-11-30', status: 'In Progress', duration: '30 minutes' }
      ]);
    };
    
    if (activeTab === 'history') {
      fetchRunHistory();
    }
  }, [activeTab]);

  const handleRunECL = () => {
    // Reset state
    setIsRunning(true);
    setProgress([]);
    setError(null);
    setSuccess(false);
    
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource(`${API_URL}/ecl/run-simple-ead/stream?date=${ficMisDate}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.step && data.status) {
          setProgress(prev => [...prev, data]);

          // Handle error status
          if (data.status === 'Error') {
            setError(data.output || 'An error occurred during calculation.');
            eventSource.close();
            eventSourceRef.current = null;
            setIsRunning(false);
          }

          // Handle successful completion
          if (data.status === 'Success' && data.step.includes('completed successfully')) {
            setSuccess(true);
            eventSource.close();
            eventSourceRef.current = null;
            setIsRunning(false);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection lost or server error. The calculation may still be running in the background.');
      eventSource.close();
      eventSourceRef.current = null;
      setIsRunning(false);
    };
  };

  const handleCancelECL = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setError('Calculation was cancelled by user. It may still be running on the server.');
  };
  
  const openOutputModal = (step, output) => {
    setModalContent({
      title: step,
      content: output || 'No output available'
    });
    setShowModal(true);
  };

  // Helper function to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-700';
      case 'Error':
      case 'Failed':
        return 'bg-red-100 text-red-700';
      case 'Running':
        return 'bg-blue-100 text-blue-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Info':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch(activeTab) {
      case 'calculation':
        return (
          <div className="bg-white p-1">
            <div className="space-y-4">
              {/* Status section */}
              {isRunning && (
                <div className="bg-gray-50 border-l-4 border-gray-500 p-3 flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-xs text-gray-700">ECL calculation is in progress...</p>
                </div>
              )}

              {error && !isRunning && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && !isRunning && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-green-700">ECL calculation completed successfully!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Process Table */}
              {progress.length > 0 ? (
                <div className="overflow-auto border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-700">Process</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-700">Output</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {progress.map((step, index) => (
                        <tr key={index} className={`hover:bg-gray-50 transition-colors ${index === progress.length - 1 && isRunning ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-2.5 text-left font-medium text-gray-900">{step.step}</td>
                          <td className="px-4 py-2.5 text-left">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(step.status)}`}
                            >
                              {step.status === 'Running' ? 'Processing' : step.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-left">
                            {step.output ? (
                              <button 
                                onClick={() => openOutputModal(step.step, step.output)}
                                className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg 
                    className="mx-auto h-10 w-10 text-gray-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                    />
                  </svg>
                  <h3 className="mt-2 text-xs font-medium text-gray-900">No calculation in progress</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Click "Run ECL Calculation" to start the process.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'history':
        return (
          <RunHistory/>
        );
      
      case 'config':
        return (
         <Configuration/>
        );
      case 'Ecl-Results':
        return (
       <ViewResults/>
       );
        
      default:
        return null;
    }
  };

  return (
    <div className="w-full px-5 mt-4 min-h-screen ">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-sm font-bold text-gray-800">ECL Calculation</h1>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label htmlFor="ficMisDate" className="text-xs font-medium text-gray-700">
                Calculation Date:
              </label>
              <input
                id="ficMisDate"
                type="date"
                className="border border-gray-300 px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500"
                value={ficMisDate}
                onChange={e => setFicMisDate(e.target.value)}
                disabled={isRunning}
              />
            </div>
            {isRunning ? (
              <button
                className="px-3 py-1.5 text-xs text-white font-medium bg-red-600 hover:bg-red-700 transition-colors"
                onClick={handleCancelECL}
              >
                Cancel
              </button>
            ) : (
              <button
                className="px-3 py-1.5 text-xs text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors"
                onClick={handleRunECL}
              >
                Run ECL Calculation
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-6">
            <button
              className={`py-2 px-1 text-xs font-medium border-b-2 ${
                activeTab === 'calculation'
                  ? 'border-gray-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('calculation')}
            >
              Calculation
            </button>
            <button
              className={`py-2 px-1 text-xs font-medium border-b-2 ${
                activeTab === 'history'
                  ? 'border-gray-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Run History
            </button>
            <button
              className={`py-2 px-1 text-xs font-medium border-b-2 ${
                activeTab === 'config'
                  ? 'border-gray-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('config')}
            >
              Configuration
            </button>
            
          </nav>
        </div>
        
        {/* Tab content */}
        {renderTabContent()}
      </div>
      
      {/* Output Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl mx-auto overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-900">{modalContent.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">{modalContent.content}</pre>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 bg-gray-600 text-xs text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ECLCalculation;