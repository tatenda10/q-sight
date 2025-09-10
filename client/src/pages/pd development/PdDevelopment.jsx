import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';
import * as XLSX from 'xlsx';
import TtcPdModal from '../../components/pd/TtcPdModal';
import MevModal from '../../components/pd/MevModal';

export default function PdDevelopment() {
  // State for TTC PDs
  const [ttcPds, setTtcPds] = useState([]);
  const [ttcForm, setTtcForm] = useState({ portfolio: '', product: '', risk_band: '', bucket: 1, ttc_pd: '', valid_from: '', valid_to: '' });
  const [showTtcModal, setShowTtcModal] = useState(false);

  // State for MEVs
  const [mevVariables, setMevVariables] = useState([]);
  const [mevForm, setMevForm] = useState({ period: '', scenario: '', variable_name: '', value: '' });
  const [mevUploadMsg, setMevUploadMsg] = useState("");
  const [showMevModal, setShowMevModal] = useState(false);

  // State for PIT PD matrix
  const [pitMatrix, setPitMatrix] = useState([]);
  const [pitQuery, setPitQuery] = useState({ scenario: '', period: '', portfolio: '', product: '' });

  // MEV variable filter state
  const [selectedVariable, setSelectedVariable] = useState("");
  const [selectedScenario, setSelectedScenario] = useState("Best");

  // Unique variable names
  const variableNames = Array.from(new Set(mevVariables.map(v => v.variable_name)));
  // Filtered MEV data for selected variable and scenario
  const filteredMev = mevVariables.filter(v =>
    (!selectedVariable || v.variable_name === selectedVariable) &&
    (!selectedScenario || v.scenario === selectedScenario)
  );

  // Handlers for TTC PDs
  const fetchTtcPds = async () => {
    const res = await axios.get(`${API_URL}/ttc-pds`);
    setTtcPds(res.data.ttcPds || []);
  };

  // Handlers for MEVs
  const fetchMevVariables = async () => {
    const res = await axios.get(`${API_URL}/pitpd/mev-variables`);
    setMevVariables(res.data.mevVariables || []);
  };

  // Handler for MEV file upload (JSON or Excel)
  const handleMevFileUpload = async (e) => {
    setMevUploadMsg("");
    const file = e.target.files[0];
    if (!file) return;
    try {
      let mevVariables = [];
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        mevVariables = json.mevVariables || [];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        mevVariables = rows.map(row => ({
          period: row.period || row.Period,
          scenario: row.scenario || row.Scenario,
          variable_name: row.variable_name || row["Variable Name"] || row.variable || row.Variable,
          value: Number(row.value || row.Value)
        })).filter(v => v.period && v.scenario && v.variable_name && !isNaN(v.value));
      } else {
        setMevUploadMsg("Unsupported file type. Please upload a .json or .xlsx file.");
        return;
      }
      if (!mevVariables.length) {
        setMevUploadMsg("No valid MEV data found in file.");
        return;
      }
      await axios.post(`${API_URL}/pitpd/mev-variables`, { mevVariables });
      // Summarize upload
      const variables = Array.from(new Set(mevVariables.map(v => v.variable_name)));
      const periods = Array.from(new Set(mevVariables.map(v => v.period))).sort();
      const scenarios = Array.from(new Set(mevVariables.map(v => v.scenario)));
      setMevUploadMsg(
        `MEV data uploaded successfully!\n` +
        `Variables: ${variables.join(", ")}\n` +
        `Scenarios: ${scenarios.join(", ")}\n` +
        `Periods: ${periods[0]} to ${periods[periods.length-1]}`
      );
      fetchMevVariables();
    } catch (err) {
      setMevUploadMsg("Error uploading MEV data: " + (err.message || "Unknown error"));
    }
  };

  // Handler for PIT PD matrix
  const fetchPitMatrix = async () => {
    const params = new URLSearchParams(pitQuery).toString();
    const res = await axios.get(`${API_URL}/pit-pd-matrix?${params}`);
    setPitMatrix(res.data.pitMatrix || []);
  };

  useEffect(() => {
    fetchMevVariables();
  }, []);

  return (
    <div className="p-8 w-full min-h-screen bg-gray-50 space-y-10">
      {/* TTC PDs Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b-0 pb-0 m-0">TTC PDs</h2>
          <div className="flex gap-4">
            <button type="button" onClick={() => setShowTtcModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">Add</button>
            <button type="button" onClick={fetchTtcPds} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded font-medium transition border border-gray-300">Refresh</button>
          </div>
        </div>
        <TtcPdModal
          open={showTtcModal}
          onClose={() => setShowTtcModal(false)}
          onSubmit={async (form) => {
            await axios.post(`${API_URL}/ttc-pds`, { ttcPds: [form] });
            setShowTtcModal(false);
            fetchTtcPds();
          }}
        />
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3 font-medium">Portfolio</th><th className="py-2 px-3 font-medium">Product</th><th className="py-2 px-3 font-medium">Risk Band</th><th className="py-2 px-3 font-medium">Bucket</th><th className="py-2 px-3 font-medium">TTC PD</th><th className="py-2 px-3 font-medium">Valid From</th><th className="py-2 px-3 font-medium">Valid To</th>
              </tr>
            </thead>
            <tbody>
              {ttcPds.map((pd, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="py-1 px-3">{pd.portfolio}</td>
                  <td className="py-1 px-3">{pd.product}</td>
                  <td className="py-1 px-3">{pd.risk_band}</td>
                  <td className="py-1 px-3">{pd.bucket}</td>
                  <td className="py-1 px-3">{pd.ttc_pd}</td>
                  <td className="py-1 px-3">{pd.valid_from}</td>
                  <td className="py-1 px-3">{pd.valid_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MEV Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b-0 pb-0 m-0">Macroeconomic Variables</h2>
          <div className="flex gap-4 items-center">
            <button type="button" onClick={() => setShowMevModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">Add</button>
            <button type="button" onClick={fetchMevVariables} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded font-medium transition border border-gray-300">Refresh</button>
            <label className="block">
              <span className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition cursor-pointer">Upload MEV (.json or .xlsx)
                <input type="file" accept=".json,.xlsx,.xls" onChange={handleMevFileUpload} className="hidden" />
              </span>
            </label>
          </div>
        </div>
        {mevUploadMsg && <span className="text-sm ml-2 text-blue-700 whitespace-pre-line">{mevUploadMsg}</span>}
        <MevModal
          open={showMevModal}
          onClose={() => setShowMevModal(false)}
          onSubmit={async (form) => {
            await axios.post(`${API_URL}/pitpd/mev-variables`, { mevVariables: [form] });
            setShowMevModal(false);
            fetchMevVariables();
          }}
        />
        {/* Variable filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {variableNames.length === 0 && <span className="text-gray-400">No macroeconomic variables loaded.</span>}
          {variableNames.map(name => (
            <button
              key={name}
              onClick={() => setSelectedVariable(name)}
              className={`px-3 py-1 rounded border text-sm font-medium transition ${selectedVariable === name ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50'}`}
            >
              {name}
            </button>
          ))}
        </div>
        {/* Scenario filter buttons */}
        {selectedVariable && (
          <div className="flex gap-2 mb-4">
            {["Best", "Base", "Worst"].map(scenario => (
              <button
                key={scenario}
                onClick={() => setSelectedScenario(scenario)}
                className={`px-3 py-1 rounded border text-xs font-medium transition ${selectedScenario === scenario ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50'}`}
              >
                {scenario}
              </button>
            ))}
          </div>
        )}
        {/* MEV Data Table */}
        {selectedVariable && (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-2 px-3 font-medium">Period</th>
                  <th className="py-2 px-3 font-medium">Scenario</th>
                  <th className="py-2 px-3 font-medium">Variable Name</th>
                  <th className="py-2 px-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredMev.map((v, i) => (
                  <tr key={i} className="even:bg-gray-50">
                    <td className="py-1 px-3">{v.period}</td>
                    <td className="py-1 px-3">{v.scenario}</td>
                    <td className="py-1 px-3">{v.variable_name}</td>
                    <td className="py-1 px-3">{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PIT PD Matrix Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">PIT PD Matrix</h2>
        <form className="flex flex-wrap gap-4 mb-6 items-end">
          <input className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" placeholder="Scenario" value={pitQuery.scenario} onChange={e => setPitQuery(f => ({ ...f, scenario: e.target.value }))} />
          <input className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" placeholder="Period" type="date" value={pitQuery.period} onChange={e => setPitQuery(f => ({ ...f, period: e.target.value }))} />
          <input className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" placeholder="Portfolio" value={pitQuery.portfolio} onChange={e => setPitQuery(f => ({ ...f, portfolio: e.target.value }))} />
          <input className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" placeholder="Product" value={pitQuery.product} onChange={e => setPitQuery(f => ({ ...f, product: e.target.value }))} />
          <button type="button" onClick={fetchPitMatrix} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">Get PIT PD Matrix</button>
        </form>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-2 px-3 font-medium">Portfolio</th><th className="py-2 px-3 font-medium">Product</th><th className="py-2 px-3 font-medium">Risk Band</th><th className="py-2 px-3 font-medium">PIT PDs (by bucket)</th>
              </tr>
            </thead>
            <tbody>
              {pitMatrix.map((row, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="py-1 px-3">{row.portfolio}</td>
                  <td className="py-1 px-3">{row.product}</td>
                  <td className="py-1 px-3">{row.risk_band}</td>
                  <td className="py-1 px-3">
                    {row.pit_buckets && row.pit_buckets.map((pd, j) => (
                      <span key={j} className="inline-block bg-gray-100 text-gray-800 rounded px-2 py-0.5 mr-1 mb-1 text-xs font-mono border border-gray-200">{(pd * 100).toFixed(2)}%</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
