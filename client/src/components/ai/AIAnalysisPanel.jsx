import React, { useState } from 'react';
import { FaRobot, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaLightbulb } from 'react-icons/fa';
import axios from 'axios';
import API_URL from '../../utils/Api';

const AIAnalysisPanel = ({ reportData, reportType = 'loss_allowance' }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const analyzeReport = async () => {
    if (!reportData) {
      setError('No report data available for analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine the correct API endpoint based on report type
      let endpoint;
      switch (reportType) {
        case 'ecl_analysis':
          endpoint = `${API_URL}/ai/analyze-ecl-analysis`;
          break;
        case 'ifrs_735g':
          endpoint = `${API_URL}/ai/analyze-ifrs-735g`;
          break;
        case 'pd_comparison':
          endpoint = `${API_URL}/ai/analyze-pd-comparison`;
          break;
        case 'loss_allowance':
        default:
          endpoint = `${API_URL}/ai/analyze-loss-allowance`;
          break;
      }

      const response = await axios.post(endpoint, {
        reportData: reportData
      });

      if (response.data.success) {
        // Handle different response structures for different report types
        if (reportType === 'pd_comparison') {
          // Parse the AI analysis text into sections
          const analysisText = response.data.analysis;
          const sections = parseAnalysisSections(analysisText);
          
          setAnalysis({
            insights: sections,
            keyMetrics: response.data.metrics,
            riskAlerts: response.data.riskAlerts
          });
        } else {
          setAnalysis(response.data.data);
        }
      } else {
        setError(response.data.message || 'AI analysis failed');
      }
    } catch (err) {
      console.error('AI Analysis Error:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to analyze report');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'alert':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'info':
        return <FaInfoCircle className="text-blue-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const parseAnalysisSections = (analysisText) => {
    if (!analysisText) return {};
    
    const sections = {};
    const lines = analysisText.split('\n');
    let currentSection = '';
    let currentContent = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header (all caps, no lowercase, length > 3)
      if (trimmedLine && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.includes(':')) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = trimmedLine;
        currentContent = [];
      } else if (trimmedLine) {
        currentContent.push(line);
      }
    }
    
    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    
    // If no sections found, put everything in a general analysis section
    if (Object.keys(sections).length === 0) {
      sections['Analysis'] = analysisText;
    }
    
    return sections;
  };

  if (!reportData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <FaRobot className="mx-auto text-4xl text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Generate a report first to enable AI analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Analysis Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2">
              <FaRobot className="text-xl text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">AI Risk Analysis</h3>
              <p className="text-xs text-gray-600">
                Intelligent insights and recommendations for your {
                  reportType === 'pd_comparison' ? 'PD Comparison Report' :
                  reportType === 'ecl_analysis' ? 'ECL Analysis Report' :
                  reportType === 'ifrs_735g' ? 'IFRS 7.35G Report' :
                  'Loss Allowance Report'
                }
              </p>
            </div>
          </div>
          <button
            onClick={analyzeReport}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white text-xs font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin h-4 w-4" />
                Analyzing...
              </>
            ) : (
              <>
                <FaLightbulb className="h-4 w-4" />
                Analyze Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaExclamationTriangle className="text-red-500" />
            <h4 className="text-sm font-bold text-red-800">Analysis Error</h4>
          </div>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FaSpinner className="animate-spin text-blue-500" />
            <p className="text-sm text-blue-700">Analyzing report data...</p>
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && analysis.keyMetrics && (
        <div className="space-y-4">
        {/* Key Metrics */}
        {analysis.keyMetrics && (
          <div className="bg-white border border-gray-200 p-4">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              Key Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportType === 'loss_allowance' ? (
                // Loss Allowance Report metrics
                <>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Net ECL Change</div>
                    <div className={`text-lg font-bold ${
                      analysis.keyMetrics.netECLChange?.direction === 'increase' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {analysis.keyMetrics.netECLChange?.percentage?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analysis.keyMetrics.netECLChange?.direction || 'stable'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Stage 1 Change</div>
                    <div className="text-sm font-bold text-gray-800">
                      ${((analysis.keyMetrics.stageChanges?.stage1 || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Low Risk</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Stage 2 Change</div>
                    <div className="text-sm font-bold text-gray-800">
                      ${((analysis.keyMetrics.stageChanges?.stage2 || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Medium Risk</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Stage 3 Change</div>
                    <div className="text-sm font-bold text-gray-800">
                      ${((analysis.keyMetrics.stageChanges?.stage3 || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">High Risk</div>
                  </div>
                </>
              ) : reportType === 'ecl_analysis' ? (
                // ECL Analysis Report metrics
                <>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Total EAD</div>
                    <div className="text-lg font-bold text-gray-800">
                      ${((analysis.keyMetrics.totalEAD || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Exposure at Default</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Lifetime ECL</div>
                    <div className="text-lg font-bold text-gray-800">
                      ${((analysis.keyMetrics.totalLifetimeECL || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Expected Loss</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">12M ECL</div>
                    <div className="text-lg font-bold text-gray-800">
                      ${((analysis.keyMetrics.total12MECL || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">12 Month Loss</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">ECL Rate</div>
                    <div className="text-lg font-bold text-gray-800">
                      {(analysis.keyMetrics.averageECLRate || 0).toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Average Rate</div>
                  </div>
                </>
              ) : reportType === 'pd_comparison' ? (
                // PD Comparison Report metrics
                <>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Total Segments</div>
                    <div className="text-lg font-bold text-gray-800">
                      {analysis.keyMetrics.totalSegments || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Product Segments</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Total Comparisons</div>
                    <div className="text-lg font-bold text-gray-800">
                      {analysis.keyMetrics.totalComparisons || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">PD Comparisons</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Average Variance</div>
                    <div className={`text-lg font-bold ${
                      (analysis.keyMetrics.averageVariance || 0) > 15 ? 'text-red-600' : 
                      (analysis.keyMetrics.averageVariance || 0) < 5 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {(analysis.keyMetrics.averageVariance || 0).toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Observed vs Model</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">High Variance</div>
                    <div className="text-lg font-bold text-red-600">
                      {analysis.keyMetrics.highVarianceCount || 0}
                    </div>
                      <div className="text-xs text-gray-500 mt-1">&gt;20% Difference</div>
                  </div>
                </>
              ) : (
                // IFRS 7.35G Report metrics
                <>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Total Segments</div>
                    <div className="text-lg font-bold text-gray-800">
                      {analysis.keyMetrics.totalSegments || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Product Segments</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Total Accounts</div>
                    <div className="text-lg font-bold text-gray-800">
                      {(analysis.keyMetrics.totalAccounts || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Portfolio Size</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Average PD</div>
                    <div className="text-lg font-bold text-gray-800">
                      {analysis.keyMetrics.averagePD || '0.00'}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Probability of Default</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50">
                    <div className="text-xs text-gray-600 mb-1">Average LGD</div>
                    <div className="text-lg font-bold text-gray-800">
                      {analysis.keyMetrics.averageLGD || '0.00'}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Loss Given Default</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {/* Risk Alerts */}
          {analysis.riskAlerts && analysis.riskAlerts.length > 0 && (
            <div className="bg-white border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-500" />
                Risk Alerts
              </h4>
              <div className="space-y-2">
                {analysis.riskAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`border p-3 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{alert.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {analysis.insights && (
            <div className="space-y-3">
              {Object.entries(analysis.insights).map(([section, content]) => (
                <div key={section} className="bg-white border border-gray-200">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="text-xs font-bold text-gray-800 capitalize">
                      {section.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <span className="text-gray-400 text-sm">
                      {expandedSections[section] ? '−' : '+'}
                    </span>
                  </button>
                  {expandedSections[section] && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pt-3">
                        {content.split('\n').map((line, index) => {
                          // Check if line is a section header (all caps, no lowercase)
                          if (line.trim() && line.trim() === line.trim().toUpperCase() && line.trim().length > 3) {
                            return (
                              <div key={index} className="font-bold text-gray-800 mb-2 mt-3 first:mt-0">
                                {line.trim()}
                              </div>
                            );
                          }
                          return (
                            <div key={index} className="mb-1">
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
