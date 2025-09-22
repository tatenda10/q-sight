import React, { useState } from 'react';
import { 
  FaUpload, 
  FaCog, 
  FaChartLine, 
  FaTable, 
  FaCheckCircle, 
  FaInfoCircle,
  FaPlay,
  FaFileCsv,
  FaDatabase,
  FaChartBar,
  FaCogs,
  FaShieldAlt
} from 'react-icons/fa';

const VintageAnalysis = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [vintageConfig, setVintageConfig] = useState({
    vintageDefinition: 'quarter', // year, quarter, month
    analysisPeriod: 60, // months
    confidenceLevel: 95, // percentage
    censoringRule: 'maturity', // maturity, observation_end, custom
    customCensoringMonths: 36
  });
  const [survivalConfig, setSurvivalConfig] = useState({
    modelType: 'kaplan_meier', // kaplan_meier, cox_proportional, weibull, exponential
    timeUnit: 'months',
    maxObservationPeriod: 60,
    minSampleSize: 100,
    significanceLevel: 0.05
  });
  const [dataQuality, setDataQuality] = useState({
    completeness: 0,
    consistency: 0,
    accuracy: 0,
    issues: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const steps = [
    { id: 1, title: 'Data Quality', icon: FaShieldAlt, description: 'Validate data completeness and quality' },
    { id: 2, title: 'Vintage Config', icon: FaCog, description: 'Configure vintage analysis parameters' },
    { id: 3, title: 'Survival Config', icon: FaCogs, description: 'Configure survival analysis models' },
    { id: 4, title: 'Analysis Results', icon: FaChartBar, description: 'View vintage and survival analysis results' }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };


  const runDataQualityCheck = () => {
    // Simulate data quality analysis
    setDataQuality({
      completeness: 87.5,
      consistency: 92.3,
      accuracy: 89.1,
      issues: [
        'Missing origination dates for 2.5% of accounts',
        'Inconsistent delinquency codes in Q3 2023 data',
        'Duplicate account records found in 0.8% of cases'
      ]
    });
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 5000);
  };


  const renderDataQuality = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FaShieldAlt className="text-blue-500" />
        Data Quality Validation
      </h2>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Validate uploaded data for completeness and consistency</p>
        <button
          onClick={runDataQualityCheck}
          className="px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <FaPlay /> Run Quality Check
        </button>
      </div>

      {dataQuality.completeness > 0 && (
        <div className="space-y-4">
          {/* Quality Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded">
              <div className="text-xs text-gray-600 mb-1">Completeness</div>
              <div className="text-2xl font-bold text-blue-600">{dataQuality.completeness}%</div>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded">
              <div className="text-xs text-gray-600 mb-1">Consistency</div>
              <div className="text-2xl font-bold text-green-600">{dataQuality.consistency}%</div>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded">
              <div className="text-xs text-gray-600 mb-1">Accuracy</div>
              <div className="text-2xl font-bold text-orange-600">{dataQuality.accuracy}%</div>
            </div>
          </div>

          {/* Data Issues */}
          {dataQuality.issues.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Data Quality Issues</h3>
              <ul className="space-y-1">
                {dataQuality.issues.map((issue, index) => (
                  <li key={index} className="text-xs text-yellow-700 flex items-center gap-2">
                    <FaInfoCircle className="text-yellow-500" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVintageConfig = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FaCog className="text-blue-500" />
        Vintage Analysis Configuration
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vintage Definition
            </label>
            <select
              value={vintageConfig.vintageDefinition}
              onChange={(e) => setVintageConfig(prev => ({ ...prev, vintageDefinition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="year">Year</option>
              <option value="quarter">Quarter</option>
              <option value="month">Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Period (Months)
            </label>
            <input
              type="number"
              value={vintageConfig.analysisPeriod}
              onChange={(e) => setVintageConfig(prev => ({ ...prev, analysisPeriod: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence Level (%)
            </label>
            <input
              type="number"
              min="80"
              max="99"
              value={vintageConfig.confidenceLevel}
              onChange={(e) => setVintageConfig(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Censoring Rule
            </label>
            <select
              value={vintageConfig.censoringRule}
              onChange={(e) => setVintageConfig(prev => ({ ...prev, censoringRule: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="maturity">Account Maturity</option>
              <option value="observation_end">End of Observation Period</option>
              <option value="custom">Custom Period</option>
            </select>
          </div>

          {vintageConfig.censoringRule === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Censoring Period (Months)
              </label>
              <input
                type="number"
                value={vintageConfig.customCensoringMonths}
                onChange={(e) => setVintageConfig(prev => ({ ...prev, customCensoringMonths: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Configuration Summary</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Vintage: {vintageConfig.vintageDefinition}</div>
              <div>Analysis Period: {vintageConfig.analysisPeriod} months</div>
              <div>Confidence: {vintageConfig.confidenceLevel}%</div>
              <div>Censoring: {vintageConfig.censoringRule}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSurvivalConfig = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FaCogs className="text-blue-500" />
        Survival Analysis Configuration
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statistical Model
            </label>
            <select
              value={survivalConfig.modelType}
              onChange={(e) => setSurvivalConfig(prev => ({ ...prev, modelType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kaplan_meier">Kaplan-Meier Estimator</option>
              <option value="cox_proportional">Cox Proportional Hazards</option>
              <option value="weibull">Weibull Distribution</option>
              <option value="exponential">Exponential Distribution</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Unit
            </label>
            <select
              value={survivalConfig.timeUnit}
              onChange={(e) => setSurvivalConfig(prev => ({ ...prev, timeUnit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="months">Months</option>
              <option value="quarters">Quarters</option>
              <option value="years">Years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Observation Period
            </label>
            <input
              type="number"
              value={survivalConfig.maxObservationPeriod}
              onChange={(e) => setSurvivalConfig(prev => ({ ...prev, maxObservationPeriod: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Sample Size
            </label>
            <input
              type="number"
              value={survivalConfig.minSampleSize}
              onChange={(e) => setSurvivalConfig(prev => ({ ...prev, minSampleSize: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Significance Level
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.1"
              value={survivalConfig.significanceLevel}
              onChange={(e) => setSurvivalConfig(prev => ({ ...prev, significanceLevel: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">Model Configuration</h3>
            <div className="text-xs text-green-700 space-y-1">
              <div>Model: {survivalConfig.modelType.replace('_', ' ')}</div>
              <div>Time Unit: {survivalConfig.timeUnit}</div>
              <div>Max Period: {survivalConfig.maxObservationPeriod} {survivalConfig.timeUnit}</div>
              <div>Min Sample: {survivalConfig.minSampleSize} accounts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalysisResults = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FaChartBar className="text-blue-500" />
          Vintage & Survival Analysis Results
        </h2>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing...
            </>
          ) : (
            <>
              <FaPlay /> Run Analysis
            </>
          )}
        </button>
      </div>

      {isAnalyzing ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Running vintage and survival analysis...</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">This may take several minutes</p>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FaChartBar className="mx-auto text-4xl mb-2" />
          <p className="text-sm">Click "Run Analysis" to generate results</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Vintage & Survival Analysis for ECL</h1>
          </div>
          <div className="h-px bg-gray-200 w-full"></div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 text-sm flex items-center gap-2 ${
              currentStep === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>

          <button
            onClick={nextStep}
            disabled={currentStep === steps.length}
            className={`px-4 py-2 text-sm flex items-center gap-2 ${
              currentStep === steps.length
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next
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
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? <FaCheckCircle /> : <Icon />}
                </div>
                <div className="ml-2">
                  <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
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
        {currentStep === 1 && renderDataQuality()}
        {currentStep === 2 && renderVintageConfig()}
        {currentStep === 3 && renderSurvivalConfig()}
        {currentStep === 4 && renderAnalysisResults()}
      </div>
    </div>
  );
};

export default VintageAnalysis;
