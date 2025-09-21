import React, { useState } from 'react';
import { 
  FaTable, 
  FaCog, 
  FaUsers, 
  FaChartPie, 
  FaChartLine, 
  FaArrowLeft, 
  FaArrowRight as FaArrowRightIcon,
  FaUpload,
  FaCheckCircle,
  FaInfoCircle,
  FaPlay,
  FaChartBar
} from 'react-icons/fa';

function LGDMethodolody() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [dataFile, setDataFile] = useState(null);
  const [lgdResults, setLgdResults] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const steps = [
    { id: 1, title: 'Recovery Data Upload', icon: FaTable, description: 'Upload historical recovery data and collateral information' },
    { id: 2, title: 'LGD Model Configuration', icon: FaCog, description: 'Select LGD calculation methodology' },
    { id: 3, title: 'Customer Segments', icon: FaUsers, description: 'Select customer segments for LGD calculation' },
    { id: 4, title: 'LGD Results', icon: FaChartPie, description: 'View calculated LGD values' }
  ];

  const segments = [
    { id: 1, name: 'HEALTHY', accounts: 45230, recoveryRate: 95.2, collateralValue: 85.5, vintage: '2019-2024' },
    { id: 2, name: 'EDUCATION', accounts: 78450, recoveryRate: 87.5, collateralValue: 78.2, vintage: '2019-2024' },
    { id: 3, name: 'AGRICULTURE', accounts: 125680, recoveryRate: 72.3, collateralValue: 65.8, vintage: '2019-2024' },
    { id: 4, name: 'MANUFACTURING', accounts: 89340, recoveryRate: 58.7, collateralValue: 52.1, vintage: '2019-2024' }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      
      // Auto-generate LGD results when moving to step 4
      if (currentStep === 3) {
        generateLgdResults();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateLgdResults = () => {
    setIsCalculating(true);
    
    // Simulate calculation time with 8 second delay
    setTimeout(() => {
      const results = segments.map(segment => {
        // LGD calculation based on recovery data and collateral
        const recoveryLgd = (100 - segment.recoveryRate) / 100;
        const collateralLgd = (100 - segment.collateralValue) / 100;
        const hybridLgd = (recoveryLgd + collateralLgd) / 2;
        
        return {
          ...segment,
          recoveryLgd: recoveryLgd,
          collateralLgd: collateralLgd,
          hybridLgd: hybridLgd,
          finalLgd: selectedModel === 'recovery' ? recoveryLgd : 
                   selectedModel === 'collateral' ? collateralLgd : hybridLgd,
          vintage: segment.vintage,
          status: 'Active'
        };
      });
      setLgdResults(results);
      setIsCalculating(false);
    }, 8000); // 8 seconds
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDataFile(file);
    }
  };

  const handleSegmentToggle = (segmentId) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };



  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h1 className="text-sm font-semibold text-gray-800">LGD Methodology & Calculation</h1>
            </div>
            <div className="h-px bg-gray-200 w-full"></div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 text-xs flex items-center gap-2 ${
                currentStep === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <FaArrowLeft /> Previous
            </button>

            <button
              onClick={nextStep}
              disabled={currentStep === steps.length}
              className={`px-4 py-2 text-xs flex items-center gap-2 ${
                currentStep === steps.length
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next <FaArrowRightIcon />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const Icon = step.icon;
              
  return (
                <div key={step.id} className="flex items-center space-x-2 min-w-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <FaCheckCircle /> : <Icon />}
                  </div>
                  <div className="ml-2">
                    <div className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-4 h-px bg-gray-300 ml-2"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-[#011325] mb-4 flex items-center gap-2">
                <FaTable className="text-blue-500" />
                Recovery Data Upload & Collateral Information
              </h2>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <h3 className="text-xs font-semibold text-gray-900 mb-3">Data Source</h3>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                     <FaUpload className="mx-auto text-gray-400 mb-3 text-2xl" />
                     <input
                       type="file"
                       accept=".csv,.xlsx,.xls"
                       onChange={handleFileUpload}
                       className="hidden"
                       id="data-upload"
                     />
                     <label
                       htmlFor="data-upload"
                       className="cursor-pointer text-xs text-gray-600 hover:text-gray-800"
                     >
                       {dataFile ? dataFile.name : 'Upload CSV/Excel File'}
                     </label>
                     <p className="text-xs text-gray-500 mt-2">Supports CSV, XLSX, XLS formats</p>
                   </div>
                 </div>

                 <div>
                   <h3 className="text-xs font-semibold text-gray-900 mb-3">Required Data Fields</h3>
                   <div className="space-y-2 text-xs text-gray-700">
                     <div className="flex items-center gap-2">
                       <FaCheckCircle className="text-green-500" />
                       <span>Historical recovery rates by segment</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <FaCheckCircle className="text-green-500" />
                       <span>Collateral values and types</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <FaCheckCircle className="text-green-500" />
                       <span>Default and recovery events</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <FaInfoCircle className="text-blue-500" />
                   <span className="text-xs font-medium text-blue-800">LGD Calculation Method</span>
                 </div>
                 <p className="text-xs text-blue-700">
                   LGD = (100 - Recovery Rate) / 100 × Collateral Adjustment Factor
                 </p>
                 <p className="text-xs text-blue-600 mt-1">
                   Based on historical recovery data and collateral valuation
                 </p>
               </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-[#011325] mb-4 flex items-center gap-2">
                <FaCog className="text-blue-500" />
                LGD Model Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setSelectedModel('recovery')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedModel === 'recovery'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Recovery Rate Method</h3>
                  <p className="text-xs text-gray-600">Based on historical recovery data</p>
                </div>
                <div
                  onClick={() => setSelectedModel('collateral')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedModel === 'collateral'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Collateral Value Method</h3>
                  <p className="text-xs text-gray-600">Based on collateral valuation</p>
                </div>
                <div
                  onClick={() => setSelectedModel('hybrid')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedModel === 'hybrid'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Hybrid Method</h3>
                  <p className="text-xs text-gray-600">Combines recovery and collateral data</p>
                </div>
              </div>

              {selectedModel && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCheckCircle className="text-green-500" />
                    <span className="text-xs font-medium text-green-800">Model Selected</span>
                  </div>
                  <p className="text-xs text-green-700">
                    {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} method has been selected for LGD calculation
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-[#011325] mb-4 flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Customer Segments Selection
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    onClick={() => handleSegmentToggle(segment.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSegments.includes(segment.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">{segment.name}</h3>
                        <p className="text-xs text-gray-600">{segment.accounts.toLocaleString()} accounts</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Recovery: {segment.recoveryRate}%</p>
                        <p className="text-xs text-gray-600">Collateral: {segment.collateralValue}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSegments.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCheckCircle className="text-green-500" />
                    <span className="text-xs font-medium text-green-800">Segments Selected</span>
                  </div>
                  <p className="text-xs text-green-700">
                    {selectedSegments.length} segment(s) selected for LGD calculation
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-[#011325] flex items-center gap-2">
                  <FaChartPie className="text-blue-500" />
                  LGD Results (Recovery-Based)
                </h2>
                <button
                  onClick={generateLgdResults}
                  className="px-4 py-2 bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-2"
                >
                  <FaPlay /> Calculate LGDs
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaInfoCircle className="text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-800">Calculation Method</span>
                </div>
                <p className="text-xs text-yellow-700">
                  LGD = (100 - Recovery Rate) / 100 × Collateral Adjustment Factor
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Based on historical recovery data and collateral valuation (2019-2024)
                </p>
              </div>

              {isCalculating ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Calculating LGDs...</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This may take up to 8 seconds</p>
                </div>
              ) : lgdResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                     <thead className="bg-gray-100">
                       <tr>
                         <th className="px-2 py-2 text-left font-medium text-gray-700">Customer Segment</th>
                         <th className="px-2 py-2 text-left font-medium text-gray-700">Recovery Rate (%)</th>
                         <th className="px-2 py-2 text-center font-medium text-gray-700">Collateral Value (%)</th>
                         <th className="px-2 py-2 text-center font-medium text-gray-700">LGD (%)</th>
                         <th className="px-2 py-2 text-left font-medium text-gray-700">Accounts</th>
                         <th className="px-2 py-2 text-left font-medium text-gray-700">Vintage</th>
                       </tr>
                     </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lgdResults.map((result, index) => (
                        <tr key={index}>
                          <td className="px-2 py-2 text-gray-900 font-medium">{result.name}</td>
                          <td className="px-2 py-2 text-gray-900">{result.recoveryRate}%</td>
                          <td className="px-2 py-2 text-center text-gray-900">{result.collateralValue}%</td>
                          <td className="px-2 py-2 text-center text-gray-900 font-medium">{(result.finalLgd * 100).toFixed(2)}%</td>
                          <td className="px-2 py-2 text-gray-900">{result.accounts.toLocaleString()}</td>
                          <td className="px-2 py-2 text-gray-900">{result.vintage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaChartPie className="mx-auto text-4xl mb-2" />
                  <p className="text-xs">Click "Calculate LGDs" to generate results</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default LGDMethodolody;
