import React, { useState, useMemo, useCallback } from 'react';
import AIAnalysisPanel from '../ai/AIAnalysisPanel';

const ResultsVisualization = () => {
  const [selectedVisualization, setSelectedVisualization] = useState('heatmap');
  const [selectedVintage, setSelectedVintage] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Mock data for demonstration
  const vintageData = useMemo(() => {
    const vintages = [
      '2020-Q1', '2020-Q2', '2020-Q3', '2020-Q4',
      '2021-Q1', '2021-Q2', '2021-Q3', '2021-Q4',
      '2022-Q1', '2022-Q2', '2022-Q3', '2022-Q4',
      '2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4',
      '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4',
      '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'
    ];
    const ages = ['0-3', '3-6', '6-12', '12-24', '24-36', '36+'];
    const segments = ['Healthy', 'Education', 'Agriculture', 'Manufacturing'];
    
    return {
      heatmap: vintages.map(vintage => ({
        vintage,
        data: ages.map(age => ({
          age,
          performance: Math.random() * 100,
          color: Math.random() > 0.5 ? 'green' : Math.random() > 0.3 ? 'yellow' : 'red'
        }))
      })),
      survival: [
        { time: 0, survival: 1.0, vintage: '2020-Q1' },
        { time: 3, survival: 0.98, vintage: '2020-Q1' },
        { time: 6, survival: 0.92, vintage: '2020-Q1' },
        { time: 12, survival: 0.85, vintage: '2020-Q1' },
        { time: 24, survival: 0.72, vintage: '2020-Q1' },
        { time: 36, survival: 0.58, vintage: '2020-Q1' },
        { time: 0, survival: 1.0, vintage: '2021-Q1' },
        { time: 3, survival: 0.96, vintage: '2021-Q1' },
        { time: 6, survival: 0.90, vintage: '2021-Q1' },
        { time: 12, survival: 0.80, vintage: '2021-Q1' },
        { time: 24, survival: 0.65, vintage: '2021-Q1' },
        { time: 36, survival: 0.52, vintage: '2021-Q1' },
        { time: 0, survival: 1.0, vintage: '2022-Q1' },
        { time: 3, survival: 0.95, vintage: '2022-Q1' },
        { time: 6, survival: 0.88, vintage: '2022-Q1' },
        { time: 12, survival: 0.75, vintage: '2022-Q1' },
        { time: 24, survival: 0.60, vintage: '2022-Q1' },
        { time: 36, survival: 0.45, vintage: '2022-Q1' },
        { time: 0, survival: 1.0, vintage: '2023-Q1' },
        { time: 3, survival: 0.92, vintage: '2023-Q1' },
        { time: 6, survival: 0.82, vintage: '2023-Q1' },
        { time: 12, survival: 0.68, vintage: '2023-Q1' },
        { time: 24, survival: 0.50, vintage: '2023-Q1' },
        { time: 36, survival: 0.35, vintage: '2023-Q1' },
        { time: 0, survival: 1.0, vintage: '2024-Q1' },
        { time: 3, survival: 0.94, vintage: '2024-Q1' },
        { time: 6, survival: 0.86, vintage: '2024-Q1' },
        { time: 12, survival: 0.72, vintage: '2024-Q1' },
        { time: 24, survival: 0.55, vintage: '2024-Q1' },
        { time: 36, survival: 0.40, vintage: '2024-Q1' }
      ],
      migration: [
        { from: 'Current', to: '1-30 DPD', count: 4500, percentage: 12.5 },
        { from: 'Current', to: '31-60 DPD', count: 1200, percentage: 3.3 },
        { from: 'Current', to: '61-90 DPD', count: 800, percentage: 2.2 },
        { from: 'Current', to: '90+ DPD', count: 500, percentage: 1.4 },
        { from: '1-30 DPD', to: 'Current', count: 3800, percentage: 84.4 },
        { from: '1-30 DPD', to: '31-60 DPD', count: 400, percentage: 8.9 },
        { from: '1-30 DPD', to: '61-90 DPD', count: 200, percentage: 4.4 },
        { from: '1-30 DPD', to: '90+ DPD', count: 100, percentage: 2.2 },
        { from: '31-60 DPD', to: 'Current', count: 800, percentage: 66.7 },
        { from: '31-60 DPD', to: '1-30 DPD', count: 200, percentage: 16.7 },
        { from: '31-60 DPD', to: '61-90 DPD', count: 100, percentage: 8.3 },
        { from: '31-60 DPD', to: '90+ DPD', count: 100, percentage: 8.3 }
      ],
      statistics: {
        model: 'Kaplan-Meier',
        logLikelihood: -1250.45,
        aic: 2508.90,
        bic: 2525.12,
        concordance: 0.78,
        pValue: 0.023,
        hazardRatio: 1.45,
        confidenceInterval: '1.12 - 1.88'
      }
    };
  }, []);

  // Prepare data for AI analysis
  const prepareAIAnalysisData = useCallback(() => {
    const filteredHeatmap = selectedVintage === 'all'
      ? vintageData.heatmap
      : vintageData.heatmap.filter(v => v.vintage === selectedVintage);

    const filteredSurvival = selectedVintage === 'all'
      ? vintageData.survival
      : vintageData.survival.filter(d => d.vintage === selectedVintage);

    // Calculate total accounts from migration data
    const totalAccounts = vintageData.migration.reduce((sum, migration) => sum + migration.count, 0);
    
    // Calculate average performance
    const averagePerformance = filteredHeatmap.length > 0 
      ? filteredHeatmap.reduce((acc, vintage) => {
          const avgPerf = vintage.data.reduce((sum, age) => sum + age.performance, 0) / vintage.data.length;
          return acc + avgPerf;
        }, 0) / filteredHeatmap.length
      : 0;

    const data = {
      visualizationType: selectedVisualization,
      selectedVintage: selectedVintage,
      heatmapData: filteredHeatmap,
      survivalData: filteredSurvival,
      migrationData: vintageData.migration,
      statistics: vintageData.statistics,
      summary: {
        totalVintages: vintageData.heatmap.length,
        selectedVintages: filteredHeatmap.length,
        totalAccounts: totalAccounts,
        averagePerformance: averagePerformance,
        migrationInsights: {
          currentToDelinquent: vintageData.migration
            .filter(m => m.from === 'Current' && m.to !== 'Current')
            .reduce((sum, m) => sum + m.percentage, 0),
          recoveryRate: vintageData.migration
            .filter(m => m.from === '1-30 DPD' && m.to === 'Current')
            .reduce((sum, m) => sum + m.percentage, 0)
        }
      }
    };

    console.log('Prepared AI Analysis Data:', data);
    return data;
  }, [selectedVisualization, selectedVintage, vintageData]);

  const renderHeatmap = () => {
    // Filter heatmap data based on selected vintage
    const filteredData = selectedVintage === 'all' 
      ? vintageData.heatmap 
      : vintageData.heatmap.filter(v => v.vintage === selectedVintage);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-xs font-medium text-gray-700">Select Vintage:</label>
          <select
            value={selectedVintage}
            onChange={(e) => setSelectedVintage(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Vintages</option>
            {vintageData.heatmap.map(v => (
              <option key={v.vintage} value={v.vintage}>{v.vintage}</option>
            ))}
          </select>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-xs font-medium text-gray-800 mb-3">Vintage Performance Heatmap</h4>
          <div className="grid grid-cols-7 gap-1">
            <div className="text-xs font-medium text-gray-600 p-2">Vintage</div>
            {vintageData.heatmap[0].data.map(age => (
              <div key={age.age} className="text-xs font-medium text-gray-600 p-2 text-center">{age.age}</div>
            ))}
            
            {filteredData.map(vintage => (
              <React.Fragment key={vintage.vintage}>
                <div className="text-xs font-medium text-gray-700 p-2">{vintage.vintage}</div>
                {vintage.data.map(age => (
                  <div
                    key={age.age}
                    className={`p-2 text-xs text-center rounded ${
                      age.color === 'green' ? 'bg-green-200 text-green-800' :
                      age.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}
                  >
                    {age.performance.toFixed(1)}%
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Good Performance (0-30% default)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-200 rounded"></div>
              <span>Moderate Performance (30-60% default)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span>Poor Performance (60%+ default)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSurvivalCurves = () => {
    // Filter survival data based on selected vintage
    const filteredSurvivalData = selectedVintage === 'all' 
      ? vintageData.survival 
      : vintageData.survival.filter(d => d.vintage === selectedVintage);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-xs font-medium text-gray-700">Select Vintage:</label>
          <select
            value={selectedVintage}
            onChange={(e) => setSelectedVintage(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Vintages</option>
            {['2020-Q1', '2021-Q1', '2022-Q1', '2023-Q1', '2024-Q1'].map(vintage => (
              <option key={vintage} value={vintage}>{vintage}</option>
            ))}
          </select>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-xs font-medium text-gray-800 mb-3">Survival Curve Comparison</h4>
          <div className="h-64 flex items-end justify-between border-b border-l border-gray-300">
            {filteredSurvivalData.map((point, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`w-4 rounded-t ${
                    point.vintage === '2020-Q1' ? 'bg-blue-500' :
                    point.vintage === '2021-Q1' ? 'bg-green-500' :
                    point.vintage === '2022-Q1' ? 'bg-yellow-500' :
                    point.vintage === '2023-Q1' ? 'bg-red-500' :
                    point.vintage === '2024-Q1' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}
                  style={{ height: `${point.survival * 200}px` }}
                ></div>
                <div className="text-xs text-gray-600 mt-1">{point.time}m</div>
                <div className="text-xs text-gray-500">{point.survival.toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <p>Survival probability over time for {selectedVintage === 'all' ? 'all selected vintages' : selectedVintage} vintage</p>
          </div>
          {selectedVintage === 'all' && (
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>2020-Q1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>2021-Q1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>2022-Q1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>2023-Q1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>2024-Q1</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMigrationFlow = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-xs font-medium text-gray-800 mb-3">Migration Flow Diagram</h4>
        <div className="grid grid-cols-2 gap-4">
          {['Current', '1-30 DPD', '31-60 DPD', '61-90 DPD', '90+ DPD'].map(stage => (
            <div key={stage} className="bg-white p-3 rounded border">
              <div className="text-xs font-medium text-gray-800 mb-2">{stage}</div>
              <div className="space-y-1">
                {vintageData.migration
                  .filter(m => m.from === stage)
                  .map((migration, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">→ {migration.to}</span>
                      <span className="text-gray-800">{migration.count} ({migration.percentage}%)</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <p>Migration patterns between delinquency stages (last 12 months)</p>
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-xs font-medium text-gray-800 mb-3">Statistical Outputs</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Model Type</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.model}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Log-Likelihood</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.logLikelihood}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">AIC</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.aic}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">BIC</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.bic}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Concordance Index</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.concordance}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">P-Value</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.pValue}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Hazard Ratio</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.hazardRatio}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">95% CI</label>
              <div className="text-xs text-gray-800">{vintageData.statistics.confidenceInterval}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h5 className="text-xs font-medium text-blue-800 mb-1">Model Assessment</h5>
          <p className="text-xs text-blue-700">
            The model shows good fit with concordance index of {vintageData.statistics.concordance}. 
            The hazard ratio of {vintageData.statistics.hazardRatio} indicates significant risk factors.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white space-y-6">
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2">Results Visualization</h2>
        <p className="text-xs text-gray-600 mb-4">Visualize vintage analysis and survival analysis results</p>
      </div>

      {/* Visualization Type Selector */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'heatmap', label: 'Vintage Performance Heatmaps' },
          { id: 'survival', label: 'Survival Curve Comparisons' },
          { id: 'migration', label: 'Migration Flow Diagrams' },
          { id: 'statistics', label: 'Statistical Outputs' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedVisualization(type.id)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedVisualization === type.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
        
        {/* AI Analysis Button */}
        <button
          onClick={() => setShowAIAnalysis(!showAIAnalysis)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            showAIAnalysis
              ? 'bg-green-600 text-white'
              : 'bg-green-200 text-green-700 hover:bg-green-300'
          }`}
        >
          {showAIAnalysis ? 'Hide AI Analysis' : 'AI Analysis'}
        </button>
      </div>

      {/* AI Analysis Panel */}
      {showAIAnalysis && (
        <div className="mb-6">
          <AIAnalysisPanel
            reportType="results_visualization"
            reportData={prepareAIAnalysisData()}
          />
        </div>
      )}

      {/* Visualization Content */}
      {selectedVisualization === 'heatmap' && renderHeatmap()}
      {selectedVisualization === 'survival' && renderSurvivalCurves()}
      {selectedVisualization === 'migration' && renderMigrationFlow()}
      {selectedVisualization === 'statistics' && renderStatistics()}
    </div>
  );
};

export default ResultsVisualization;
