import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';

const MacroEconomicConfig = () => {
  const [selectedTab, setSelectedTab] = useState('macro_variables');
  const [selectedVariable, setSelectedVariable] = useState('gdp_growth');
  const [selectedScenario, setSelectedScenario] = useState('base_case');
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editingCorrelation, setEditingCorrelation] = useState(null);
  const [editCorrelationValues, setEditCorrelationValues] = useState({});

  // Mock data for Macro-Economic Configuration
  const macroData = useMemo(() => ({
    macroVariables: [
      { name: 'GDP Growth', code: 'gdp_growth', unit: '%', current: 3.2, historical: 2.8, projected: 3.5, weight: 0.4, source: 'IMF' },
      { name: 'Unemployment Rate', code: 'unemployment', unit: '%', current: 5.8, historical: 6.2, projected: 5.5, weight: 0.3, source: 'IMF' },
      { name: 'Inflation Rate', code: 'inflation', unit: '%', current: 4.1, historical: 3.8, projected: 4.3, weight: 0.2, source: 'IMF' },
      { name: 'Interest Rate', code: 'interest_rate', unit: '%', current: 6.5, historical: 6.0, projected: 7.0, weight: 0.1, source: 'Central Bank' },
      { name: 'Exchange Rate', code: 'exchange_rate', unit: 'USD/ZWL', current: 25.5, historical: 23.8, projected: 27.2, weight: 0.15, source: 'Central Bank' }
    ],
    historicalData: [
      { year: 2020, gdp_growth: 2.1, unemployment: 6.8, inflation: 2.5, interest_rate: 4.5, exchange_rate: 18.2 },
      { year: 2021, gdp_growth: 1.8, unemployment: 7.2, inflation: 3.2, interest_rate: 4.8, exchange_rate: 19.5 },
      { year: 2022, gdp_growth: 2.5, unemployment: 6.5, inflation: 4.8, interest_rate: 5.5, exchange_rate: 21.8 },
      { year: 2023, gdp_growth: 2.8, unemployment: 6.2, inflation: 3.8, interest_rate: 6.0, exchange_rate: 23.8 },
      { year: 2024, gdp_growth: 3.2, unemployment: 5.8, inflation: 4.1, interest_rate: 6.5, exchange_rate: 25.5 },
      { year: 2025, gdp_growth: 3.5, unemployment: 5.5, inflation: 4.3, interest_rate: 7.0, exchange_rate: 27.2 },
      { year: 2026, gdp_growth: 3.8, unemployment: 5.2, inflation: 4.0, interest_rate: 7.2, exchange_rate: 28.8 },
      { year: 2027, gdp_growth: 4.0, unemployment: 5.0, inflation: 3.8, interest_rate: 7.5, exchange_rate: 30.2 }
    ],
    scenarios: [
      { name: 'Base Case', code: 'base_case', gdp_growth: 3.2, unemployment: 5.8, inflation: 4.1, interest_rate: 6.5, exchange_rate: 25.5, probability: 0.6, description: 'Most likely economic scenario' },
      { name: 'Optimistic', code: 'optimistic', gdp_growth: 4.5, unemployment: 4.5, inflation: 3.2, interest_rate: 5.8, exchange_rate: 22.8, probability: 0.2, description: 'Favorable economic conditions' },
      { name: 'Pessimistic', code: 'pessimistic', gdp_growth: 1.8, unemployment: 7.5, inflation: 5.8, interest_rate: 8.2, exchange_rate: 28.5, probability: 0.15, description: 'Challenging economic conditions' },
      { name: 'Stress', code: 'stress', gdp_growth: -1.2, unemployment: 12.0, inflation: 8.5, interest_rate: 12.0, exchange_rate: 35.2, probability: 0.05, description: 'Severe economic downturn' }
    ],
    adjustmentFactors: [
      { segment: 'Retail', gdp_sensitivity: 0.8, unemployment_sensitivity: 1.2, inflation_sensitivity: 0.6, interest_sensitivity: 1.0, exchange_sensitivity: 0.3 },
      { segment: 'SME', gdp_sensitivity: 1.2, unemployment_sensitivity: 1.5, inflation_sensitivity: 0.8, interest_sensitivity: 1.3, exchange_sensitivity: 0.7 },
      { segment: 'Corporate', gdp_sensitivity: 1.5, unemployment_sensitivity: 0.8, inflation_sensitivity: 1.0, interest_sensitivity: 0.9, exchange_sensitivity: 1.2 },
      { segment: 'Sovereign', gdp_sensitivity: 0.5, unemployment_sensitivity: 0.3, inflation_sensitivity: 0.4, interest_sensitivity: 0.6, exchange_sensitivity: 0.1 }
    ],
    impactAnalysis: [
      { segment: 'Retail', basePD: 2.8, adjustedPD: 3.1, impact: 0.3, eadImpact: 1500000, scenario: 'Base Case' },
      { segment: 'SME', basePD: 4.2, adjustedPD: 4.8, impact: 0.6, eadImpact: 2800000, scenario: 'Base Case' },
      { segment: 'Corporate', basePD: 1.5, adjustedPD: 1.8, impact: 0.3, eadImpact: 1200000, scenario: 'Base Case' },
      { segment: 'Sovereign', basePD: 0.8, adjustedPD: 0.9, impact: 0.1, eadImpact: 200000, scenario: 'Base Case' }
    ],
    correlations: [
      { variable1: 'GDP Growth', variable2: 'Unemployment', correlation: -0.75, significance: 'High' },
      { variable1: 'GDP Growth', variable2: 'Inflation', correlation: 0.45, significance: 'Medium' },
      { variable1: 'Unemployment', variable2: 'Inflation', correlation: -0.60, significance: 'High' },
      { variable1: 'Interest Rate', variable2: 'Inflation', correlation: 0.80, significance: 'High' },
      { variable1: 'Exchange Rate', variable2: 'Inflation', correlation: 0.65, significance: 'High' }
    ]
  }), []);

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleEdit = (index) => {
    setEditingRow(index);
    const row = macroData.adjustmentFactors[index];
    setEditValues({
      gdp_sensitivity: row.gdp_sensitivity,
      unemployment_sensitivity: row.unemployment_sensitivity,
      inflation_sensitivity: row.inflation_sensitivity,
      interest_sensitivity: row.interest_sensitivity,
      exchange_sensitivity: row.exchange_sensitivity
    });
  };

  const handleSave = (index) => {
    // In a real application, this would update the backend
    console.log('Saving values for row', index, editValues);
    setEditingRow(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleCorrelationEdit = (index) => {
    setEditingCorrelation(index);
    const row = macroData.correlations[index];
    setEditCorrelationValues({
      correlation: row.correlation,
      significance: row.significance
    });
  };

  const handleCorrelationSave = (index) => {
    // In a real application, this would update the backend
    console.log('Saving correlation values for row', index, editCorrelationValues);
    setEditingCorrelation(null);
    setEditCorrelationValues({});
  };

  const handleCorrelationCancel = () => {
    setEditingCorrelation(null);
    setEditCorrelationValues({});
  };

  const handleCorrelationInputChange = (field, value) => {
    setEditCorrelationValues(prev => ({
      ...prev,
      [field]: field === 'correlation' ? parseFloat(value) || 0 : value
    }));
  };

  const renderMacroVariables = () => {
    return (
      <div className="space-y-6">
        {/* Variable Selection */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-xs font-medium text-gray-700">Select Variable:</label>
            <select
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              {macroData.macroVariables.map(variable => (
                <option key={variable.code} value={variable.code}>
                  {variable.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Variable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {macroData.macroVariables.map((variable, index) => (
            <div key={index} className={`p-4 border border-gray-200 ${selectedVariable === variable.code ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-gray-600">{variable.name}</div>
                <div className="text-xs text-gray-500">{variable.source}</div>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {variable.current.toFixed(1)}{variable.unit}
              </div>
              <div className="text-xs text-gray-500">Current Value</div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Weight: {(variable.weight * 100).toFixed(0)}%</span>
                <span>Historical: {variable.historical.toFixed(1)}{variable.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Historical Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Historical and Projected Values</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={macroData.historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Legend />
              <Line type="monotone" dataKey={selectedVariable} stroke="#8884d8" name={macroData.macroVariables.find(v => v.code === selectedVariable)?.name} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Variable Configuration Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Macro Variable Configuration</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Historical Avg</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Projected</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {macroData.macroVariables.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{row.current.toFixed(1)}{row.unit}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{row.historical.toFixed(1)}{row.unit}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{row.projected.toFixed(1)}{row.unit}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{(row.weight * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 text-xs text-gray-900">{row.source}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-center">
                      <button className="text-blue-600 hover:text-blue-800">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderScenarios = () => {
    return (
      <div className="space-y-6">
        {/* Scenario Selection */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-xs font-medium text-gray-700">Select Scenario:</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              {macroData.scenarios.map(scenario => (
                <option key={scenario.code} value={scenario.code}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {macroData.scenarios.map((scenario, index) => (
            <div key={index} className={`p-4 border border-gray-200 ${selectedScenario === scenario.code ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
              <div className="text-xs text-gray-600 mb-1">{scenario.name}</div>
              <div className="text-lg font-bold text-gray-800">
                {(scenario.probability * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Probability</div>
              <div className="mt-2 text-xs text-gray-500">
                {scenario.description}
              </div>
            </div>
          ))}
        </div>

        {/* Scenario Comparison Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Scenario Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={macroData.scenarios}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatPercent(value)} />
              <Legend />
              <Bar dataKey="gdp_growth" fill="#8884d8" name="GDP Growth" />
              <Bar dataKey="unemployment" fill="#82ca9d" name="Unemployment" />
              <Bar dataKey="inflation" fill="#ffc658" name="Inflation" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario Details Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Scenario Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">GDP Growth</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unemployment</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Inflation</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Interest Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exchange Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Probability</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {macroData.scenarios.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.gdp_growth)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.unemployment)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.inflation)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.interest_rate)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{row.exchange_rate.toFixed(1)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{(row.probability * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAdjustmentFactors = () => {
    return (
      <div className="space-y-6">
        {/* Adjustment Factors Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Segment Sensitivity Factors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">GDP Sensitivity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unemployment Sensitivity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Inflation Sensitivity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Interest Sensitivity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exchange Sensitivity</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {macroData.adjustmentFactors.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.segment}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingRow === index ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.gdp_sensitivity || ''}
                          onChange={(e) => handleInputChange('gdp_sensitivity', e.target.value)}
                          className="w-16 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.gdp_sensitivity.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingRow === index ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.unemployment_sensitivity || ''}
                          onChange={(e) => handleInputChange('unemployment_sensitivity', e.target.value)}
                          className="w-16 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.unemployment_sensitivity.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingRow === index ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.inflation_sensitivity || ''}
                          onChange={(e) => handleInputChange('inflation_sensitivity', e.target.value)}
                          className="w-16 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.inflation_sensitivity.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingRow === index ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.interest_sensitivity || ''}
                          onChange={(e) => handleInputChange('interest_sensitivity', e.target.value)}
                          className="w-16 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.interest_sensitivity.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingRow === index ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.exchange_sensitivity || ''}
                          onChange={(e) => handleInputChange('exchange_sensitivity', e.target.value)}
                          className="w-16 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.exchange_sensitivity.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-center">
                      {editingRow === index ? (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleSave(index)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(index)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Impact Analysis */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Forward-Looking Impact Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Base PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Adjusted PD</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Impact</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">EAD Impact</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {macroData.impactAnalysis.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.segment}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.basePD)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatPercent(row.adjustedPD)}</td>
                    <td className={`px-4 py-2 text-xs text-right ${row.impact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.impact > 0 ? '+' : ''}{formatPercent(row.impact)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">{formatCurrency(row.eadImpact)}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">{row.scenario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCorrelations = () => {
    return (
      <div className="space-y-6">
        {/* Correlation Matrix */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Variable Correlations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variable 1</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variable 2</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Correlation</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Significance</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {macroData.correlations.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-900">{row.variable1}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">{row.variable2}</td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-right">
                      {editingCorrelation === index ? (
                        <input
                          type="number"
                          step="0.01"
                          min="-1"
                          max="1"
                          value={editCorrelationValues.correlation || ''}
                          onChange={(e) => handleCorrelationInputChange('correlation', e.target.value)}
                          className="w-20 px-1 py-1 text-xs border border-gray-300 rounded text-right"
                        />
                      ) : (
                        row.correlation.toFixed(2)
                      )}
                    </td>
                    <td className={`px-4 py-2 text-xs text-center ${
                      editingCorrelation === index ? '' : 
                      row.significance === 'High' ? 'text-red-600' : 
                      row.significance === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {editingCorrelation === index ? (
                        <select
                          value={editCorrelationValues.significance || ''}
                          onChange={(e) => handleCorrelationInputChange('significance', e.target.value)}
                          className="px-1 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      ) : (
                        row.significance
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900 text-center">
                      {editingCorrelation === index ? (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleCorrelationSave(index)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCorrelationCancel}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCorrelationEdit(index)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Macro-Economic Configuration</h1>
        <p className="text-sm text-gray-600 mt-1">Configure macro-economic variables and their impact on ECL calculations</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 px-6">
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              selectedTab === 'macro_variables'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTab('macro_variables')}
          >
            Macro Variables
          </button>
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              selectedTab === 'scenarios'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTab('scenarios')}
          >
            Economic Scenarios
          </button>
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              selectedTab === 'adjustment_factors'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTab('adjustment_factors')}
          >
            Adjustment Factors
          </button>
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              selectedTab === 'correlations'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTab('correlations')}
          >
            Correlations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {selectedTab === 'macro_variables' && renderMacroVariables()}
        {selectedTab === 'scenarios' && renderScenarios()}
        {selectedTab === 'adjustment_factors' && renderAdjustmentFactors()}
        {selectedTab === 'correlations' && renderCorrelations()}
      </div>
    </div>
  );
};

export default MacroEconomicConfig;
