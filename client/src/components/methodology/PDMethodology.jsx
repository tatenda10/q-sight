import React, { useState, useCallback } from 'react';
import { Upload, FileText, Calculator, BarChart3, Download, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PDMethodology = () => {
  // State for file uploads
  const [portfolioData, setPortfolioData] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [portfolioFileName, setPortfolioFileName] = useState('');
  const [macroFileName, setMacroFileName] = useState('');

  // State for configuration
  const [selectedMEV, setSelectedMEV] = useState('gdp_growth');
  const [assetCorrelation, setAssetCorrelation] = useState(0.15);
  const [economicScenario, setEconomicScenario] = useState('base');
  const [isCalculating, setIsCalculating] = useState(false);

  // State for results
  const [results, setResults] = useState(null);
  const [zScore, setZScore] = useState(null);
  const [error, setError] = useState(null);

  // Sample data for demonstration
  const samplePortfolioData = [
    { account_id: 'ACC001', date: '2023-01-01', days_past_due: 0, outstanding_balance: 50000 },
    { account_id: 'ACC002', date: '2023-01-01', days_past_due: 15, outstanding_balance: 75000 },
    { account_id: 'ACC003', date: '2023-01-01', days_past_due: 45, outstanding_balance: 30000 },
    { account_id: 'ACC004', date: '2023-01-01', days_past_due: 75, outstanding_balance: 60000 },
    { account_id: 'ACC005', date: '2023-01-01', days_past_due: 120, outstanding_balance: 40000 },
    { account_id: 'ACC006', date: '2023-01-01', days_past_due: 0, outstanding_balance: 80000 },
    { account_id: 'ACC007', date: '2023-01-01', days_past_due: 30, outstanding_balance: 25000 },
    { account_id: 'ACC008', date: '2023-01-01', days_past_due: 90, outstanding_balance: 55000 },
  ];

  const sampleMacroData = [
    { year: 2020, quarter: 1, gdp_growth: 2.1, unemployment_rate: 3.5, inflation_rate: 2.3 },
    { year: 2020, quarter: 2, gdp_growth: -8.2, unemployment_rate: 13.3, inflation_rate: 0.6 },
    { year: 2020, quarter: 3, gdp_growth: 7.4, unemployment_rate: 8.7, inflation_rate: 1.4 },
    { year: 2020, quarter: 4, gdp_growth: 4.3, unemployment_rate: 6.7, inflation_rate: 1.2 },
    { year: 2021, quarter: 1, gdp_growth: 6.3, unemployment_rate: 6.0, inflation_rate: 2.6 },
    { year: 2021, quarter: 2, gdp_growth: 6.7, unemployment_rate: 5.4, inflation_rate: 5.4 },
    { year: 2021, quarter: 3, gdp_growth: 2.3, unemployment_rate: 4.8, inflation_rate: 5.3 },
    { year: 2021, quarter: 4, gdp_growth: 6.9, unemployment_rate: 3.9, inflation_rate: 7.0 },
    { year: 2022, quarter: 1, gdp_growth: -1.6, unemployment_rate: 3.6, inflation_rate: 8.5 },
    { year: 2022, quarter: 2, gdp_growth: -0.6, unemployment_rate: 3.5, inflation_rate: 9.1 },
    { year: 2022, quarter: 3, gdp_growth: 3.2, unemployment_rate: 3.5, inflation_rate: 8.2 },
    { year: 2022, quarter: 4, gdp_growth: 2.6, unemployment_rate: 3.5, inflation_rate: 6.5 },
    { year: 2023, quarter: 1, gdp_growth: 2.0, unemployment_rate: 3.4, inflation_rate: 4.9 },
    { year: 2023, quarter: 2, gdp_growth: 2.4, unemployment_rate: 3.6, inflation_rate: 3.0 },
    { year: 2023, quarter: 3, gdp_growth: 4.9, unemployment_rate: 3.8, inflation_rate: 3.2 },
    { year: 2023, quarter: 4, gdp_growth: 3.1, unemployment_rate: 3.7, inflation_rate: 3.4 },
  ];

  // TTC PD curve (Through-The-Cycle PDs)
  const ttcPDCurve = {
    '0 DPD': 0.02,      // 2%
    '1-30 DPD': 0.08,   // 8%
    '31-60 DPD': 0.15,  // 15%
    '61-90 DPD': 0.30,  // 30%
    '90+ DPD': 0.50     // 50%
  };

  // File upload handlers
  const handlePortfolioUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index];
            });
            return obj;
          }).filter(row => row.account_id); // Filter out empty rows

          setPortfolioData(data);
          setPortfolioFileName(file.name);
          setError(null);
        } catch (err) {
          setError('Error parsing portfolio data file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleMacroUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, index) => {
              const value = values[index];
              // Convert numeric fields
              if (['year', 'quarter', 'gdp_growth', 'unemployment_rate', 'inflation_rate'].includes(header)) {
                obj[header] = parseFloat(value) || 0;
              } else {
                obj[header] = value;
              }
            });
            return obj;
          }).filter(row => row.year); // Filter out empty rows

          setMacroData(data);
          setMacroFileName(file.name);
          setError(null);
        } catch (err) {
          setError('Error parsing macroeconomic data file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const loadSampleData = () => {
    setPortfolioData(samplePortfolioData);
    setMacroData(sampleMacroData);
    setPortfolioFileName('sample_portfolio_data.csv');
    setMacroFileName('sample_macro_data.csv');
    setError(null);
  };

  // Mathematical functions for Vasicek model
  const normSInv = (p) => {
    // Approximation of inverse normal CDF
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < 0.5) return -normSInv(1 - p);
    
    const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    
    const x = Math.sqrt(-2 * Math.log(1 - p));
    const x0 = x - ((c[0] + c[1] * x + c[2] * x * x) / (1 + d[1] * x + d[2] * x * x + d[3] * x * x * x + d[4] * x * x * x * x));
    return x0;
  };

  const normSDist = (x) => {
    // Approximation of normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  };

  // Calculate economic factor Z-score
  const calculateZScore = (macroData, selectedMEV, scenario) => {
    if (!macroData || macroData.length === 0) return 0;

    const values = macroData.map(row => row[selectedMEV]).filter(val => !isNaN(val));
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const latestValue = values[values.length - 1];
    let zScore = (latestValue - mean) / stdDev;

    // Apply scenario modifier
    switch (scenario) {
      case 'optimistic':
        zScore += 1.0;
        break;
      case 'pessimistic':
        zScore -= 1.0;
        break;
      default: // base case
        break;
    }

    return zScore;
  };

  // Apply Vasicek formula
  const applyVasicekFormula = (ttcPD, zScore, correlation) => {
    const sqrtRho = Math.sqrt(correlation);
    const sqrtOneMinusRho = Math.sqrt(1 - correlation);
    
    const numerator = normSInv(ttcPD) - sqrtRho * zScore;
    const pitPD = normSDist(numerator / sqrtOneMinusRho);
    
    return Math.max(0, Math.min(1, pitPD)); // Clamp between 0 and 1
  };

  // Main calculation function
  const calculatePDs = async () => {
    if (!portfolioData || !macroData) {
      setError('Please upload both portfolio and macroeconomic data files.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Calculate Z-score
      const calculatedZScore = calculateZScore(macroData, selectedMEV, economicScenario);
      setZScore(calculatedZScore);

      // Calculate PIT PDs using Vasicek formula
      const pitPDs = {};
      Object.entries(ttcPDCurve).forEach(([bucket, ttcPD]) => {
        pitPDs[bucket] = applyVasicekFormula(ttcPD, calculatedZScore, assetCorrelation);
      });

      // Prepare chart data
      const chartData = Object.entries(ttcPDCurve).map(([bucket, ttcPD]) => ({
        bucket,
        ttcPD: ttcPD * 100, // Convert to percentage
        pitPD: pitPDs[bucket] * 100 // Convert to percentage
      }));

      setResults({
        chartData,
        ttcPDs: ttcPDCurve,
        pitPDs,
        zScore: calculatedZScore,
        scenario: economicScenario,
        mev: selectedMEV
      });

    } catch (err) {
      setError('Error calculating PDs. Please check your data and try again.');
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Get MEV display name
  const getMEVDisplayName = (mev) => {
    const names = {
      'gdp_growth': 'GDP Growth',
      'unemployment_rate': 'Unemployment Rate',
      'inflation_rate': 'Inflation Rate'
    };
    return names[mev] || mev;
  };

  // Get scenario display name
  const getScenarioDisplayName = (scenario) => {
    const names = {
      'base': 'Base Case',
      'optimistic': 'Optimistic',
      'pessimistic': 'Pessimistic'
    };
    return names[scenario] || scenario;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PD Methodology - Vasicek Model</h1>
        <p className="text-gray-600">Calculate Point-in-Time (PIT) PDs using the Vasicek single-factor model</p>
      </div>

      {/* Step 1: File Upload Areas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Step 1: Data Upload
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Portfolio Data Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">Portfolio Data</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Upload CSV file with columns: account_id, date, days_past_due, outstanding_balance
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handlePortfolioUpload}
                className="hidden"
                id="portfolio-upload"
              />
              <label
                htmlFor="portfolio-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </label>
              {portfolioFileName && (
                <p className="text-xs text-green-600 mt-2">✓ {portfolioFileName}</p>
              )}
            </div>
          </div>

          {/* Macroeconomic Data Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">Macroeconomic Data</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Upload CSV file with columns: year, quarter, gdp_growth, unemployment_rate, inflation_rate
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleMacroUpload}
                className="hidden"
                id="macro-upload"
              />
              <label
                htmlFor="macro-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </label>
              {macroFileName && (
                <p className="text-xs text-green-600 mt-2">✓ {macroFileName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Use Sample Data Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadSampleData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Use Sample Data
          </button>
        </div>
      </div>

      {/* Step 2: Configuration Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Step 2: Model Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MEV Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Macroeconomic Variable (MEV)
            </label>
            <select
              value={selectedMEV}
              onChange={(e) => setSelectedMEV(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="gdp_growth">GDP Growth</option>
              <option value="unemployment_rate">Unemployment Rate</option>
              <option value="inflation_rate">Inflation Rate</option>
            </select>
          </div>

          {/* Asset Correlation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Correlation (ρ)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={assetCorrelation}
              onChange={(e) => setAssetCorrelation(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Measures how sensitive defaults are to the economy. Higher value = more sensitive.
            </p>
          </div>

          {/* Economic Scenario Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Economic Scenario
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="base"
                  checked={economicScenario === 'base'}
                  onChange={(e) => setEconomicScenario(e.target.value)}
                  className="mr-2"
                />
                Base Case
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="optimistic"
                  checked={economicScenario === 'optimistic'}
                  onChange={(e) => setEconomicScenario(e.target.value)}
                  className="mr-2"
                />
                Optimistic (+1.0 Z)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pessimistic"
                  checked={economicScenario === 'pessimistic'}
                  onChange={(e) => setEconomicScenario(e.target.value)}
                  className="mr-2"
                />
                Pessimistic (-1.0 Z)
              </label>
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <div className="mt-6 text-center">
          <button
            onClick={calculatePDs}
            disabled={!portfolioData || !macroData || isCalculating}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-lg font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5 mr-2" />
                Calculate PDs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Step 3: Results Display */}
      {results && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Step 3: Results & Visualization
          </h2>

          {/* Key Metrics Display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Key Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Economic Factor (Z-Score)</p>
                <p className="text-2xl font-bold text-blue-600">{zScore?.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected MEV</p>
                <p className="text-lg font-semibold text-gray-800">{getMEVDisplayName(results.mev)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Scenario</p>
                <p className="text-lg font-semibold text-gray-800">{getScenarioDisplayName(results.scenario)}</p>
              </div>
            </div>
          </div>

          {/* PD Curve Chart */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">PD Curve Comparison</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="bucket" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Probability of Default (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value.toFixed(2)}%`, name === 'ttcPD' ? 'TTC PD' : 'PIT PD']}
                    labelFormatter={(label) => `Delinquency Bucket: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ttcPD" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="TTC PD"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pitPD" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="PIT PD"
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Results Summary Table */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Results Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delinquency Bucket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TTC PD
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PIT PD
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Change
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(results.ttcPDs).map(([bucket, ttcPD]) => (
                    <tr key={bucket}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bucket}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(ttcPD * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(results.pitPDs[bucket] * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((results.pitPDs[bucket] - ttcPD) * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(((results.pitPDs[bucket] - ttcPD) / ttcPD) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDMethodology;
