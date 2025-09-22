import React, { useEffect, useState } from 'react';
import API_URL from '../../utils/Api';
import axios from 'axios';

const ALL_COLUMNS = [
  "id","n_run_key","fic_mis_date","n_account_number","d_acct_start_date","d_last_payment_date","d_next_payment_date","d_maturity_date","n_acct_classification","n_cust_ref_code","n_partner_name","n_party_type","n_accrual_basis_code","n_curr_interest_rate","n_effective_interest_rate","v_interest_freq_unit","v_interest_method","n_accrued_interest","n_rate_chg_min","v_ccy_code","n_carrying_amount_ncy","n_carrying_amount_rcy","n_exposure_at_default_ncy","n_exposure_at_default_rcy","n_pv_of_cash_flows","n_write_off_amount","n_expected_recovery","n_lifetime_ecl_ncy","n_lifetime_ecl_rcy","n_12m_ecl_ncy","n_12m_ecl_rcy","n_lgd_percent","n_pd_percent","n_twelve_months_orig_pd","n_lifetime_orig_pd","n_twelve_months_pd","n_lifetime_pd","n_pd_term_structure_skey","n_pd_term_structure_name","n_pd_term_structure_desc","n_12m_pd_change","v_amrt_repayment_type","n_remain_no_of_pmts","n_amrt_term","v_amrt_term_unit","n_delinquent_days","n_delq_band_code","n_stage_descr","n_curr_ifrs_stage_skey","n_prev_ifrs_stage_skey","d_cooling_start_date","n_target_ifrs_stage_skey","n_in_cooling_period_flag","n_cooling_period_duration","n_country","n_segment_skey","n_prod_segment","n_prod_code","n_prod_name","n_prod_type","n_prod_desc","n_credit_rating_code","n_org_credit_score","n_curr_credit_score","n_acct_rating_movement","n_party_rating_movement","n_conditionally_cancel_flag","n_collateral_amount","n_loan_type"
];


function Configuration() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Analysis Configuration state
  const [analysisConfig, setAnalysisConfig] = useState({
    vintageDefinition: 'quarter', // year, quarter, month
    survivalModel: 'kaplan_meier', // kaplan_meier, cox, weibull, exponential
    censoringRule: 'maturity', // maturity, observation_end, custom
    customCensoringMonths: 36,
    confidenceLevel: 95, // percentage
    minSampleSize: 30,
    significanceLevel: 0.05
  });

  useEffect(() => {
    // Fetch selected columns from backend
    setLoading(true);
    axios.get(`${API_URL}/ecl-config/config/columns`)
      .then(res => {
        setSelected(res.data.columns || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch column configuration");
        setLoading(false);
      });
  }, []);

  const handleToggle = col => {
    setSelected(selected.includes(col)
      ? selected.filter(c => c !== col)
      : [...selected, col]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post(`${API_URL}/ecl-config/config/columns`, { columns: selected });
      if (res.status === 200) {
        setMessage("Configuration saved successfully.");
      } else {
        setError(res.data.error || "Failed to save configuration.");
      }
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.error) || "Failed to save configuration.");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post(`${API_URL}/ecl-config/config/columns/reset`);
      if (res.status === 200) {
        setSelected(res.data.columns || []);
        setMessage("Reset to default columns.");
      } else {
        setError(res.data.error || "Failed to reset.");
      }
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.error) || "Failed to reset.");
    }
    setSaving(false);
  };

  const handleAnalysisConfigChange = (field, value) => {
    setAnalysisConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAnalysisConfig = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post(`${API_URL}/ecl-config/config/analysis`, analysisConfig);
      if (res.status === 200) {
        setMessage("Analysis configuration saved successfully.");
      } else {
        setError(res.data.error || "Failed to save analysis configuration.");
      }
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.error) || "Failed to save analysis configuration.");
    }
    setSaving(false);
  };

  return (
    <div className="w-full bg-white space-y-8">
      {/* ECL Extraction Column Configuration */}
      <div>
        <h1 className="text-sm font-bold mb-4">ECL Extraction Column Configuration</h1>
        <p className="text-xs mb-4 text-gray-700">Select the columns you want to use for ECL extraction. You can save or reset to defaults at any time.</p>
        {loading ? (
          <div className="text-center text-gray-500 text-xs">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-gray-300 p-2 mb-4">
            {ALL_COLUMNS.map(col => (
              <label key={col} className="flex items-center text-xs">
                <input
                  type="checkbox"
                  className="mr-2 accent-gray-600"
                  checked={selected.includes(col)}
                  onChange={() => handleToggle(col)}
                  disabled={saving}
                />
                {col}
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-gray-600 text-white text-xs hover:bg-gray-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            className="px-3 py-1 bg-gray-600 text-white text-xs hover:bg-gray-700 disabled:opacity-50"
            onClick={handleReset}
            disabled={saving || loading}
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Analysis Configuration */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-bold mb-4">Analysis Configuration</h2>
        <p className="text-xs mb-4 text-gray-700">Configure parameters for vintage analysis and survival analysis ECL calculation.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vintage Definition */}
          <div>
            <h3 className="text-xs font-medium text-gray-800 mb-3">Vintage Definition</h3>
            <div className="space-y-2">
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="vintageDefinition"
                  value="year"
                  checked={analysisConfig.vintageDefinition === 'year'}
                  onChange={(e) => handleAnalysisConfigChange('vintageDefinition', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Year
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="vintageDefinition"
                  value="quarter"
                  checked={analysisConfig.vintageDefinition === 'quarter'}
                  onChange={(e) => handleAnalysisConfigChange('vintageDefinition', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Quarter
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="vintageDefinition"
                  value="month"
                  checked={analysisConfig.vintageDefinition === 'month'}
                  onChange={(e) => handleAnalysisConfigChange('vintageDefinition', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Month
              </label>
            </div>
          </div>

          {/* Survival Analysis Parameters */}
          <div>
            <h3 className="text-xs font-medium text-gray-800 mb-3">Survival Analysis Parameters</h3>
            <div className="space-y-2">
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="survivalModel"
                  value="kaplan_meier"
                  checked={analysisConfig.survivalModel === 'kaplan_meier'}
                  onChange={(e) => handleAnalysisConfigChange('survivalModel', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Kaplan-Meier
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="survivalModel"
                  value="cox"
                  checked={analysisConfig.survivalModel === 'cox'}
                  onChange={(e) => handleAnalysisConfigChange('survivalModel', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Cox Proportional Hazards
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="survivalModel"
                  value="weibull"
                  checked={analysisConfig.survivalModel === 'weibull'}
                  onChange={(e) => handleAnalysisConfigChange('survivalModel', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Weibull
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="survivalModel"
                  value="exponential"
                  checked={analysisConfig.survivalModel === 'exponential'}
                  onChange={(e) => handleAnalysisConfigChange('survivalModel', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Exponential
              </label>
            </div>
          </div>

          {/* Censoring Rules */}
          <div>
            <h3 className="text-xs font-medium text-gray-800 mb-3">Censoring Rules</h3>
            <div className="space-y-2">
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="censoringRule"
                  value="maturity"
                  checked={analysisConfig.censoringRule === 'maturity'}
                  onChange={(e) => handleAnalysisConfigChange('censoringRule', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Maturity
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="censoringRule"
                  value="observation_end"
                  checked={analysisConfig.censoringRule === 'observation_end'}
                  onChange={(e) => handleAnalysisConfigChange('censoringRule', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Observation End
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="radio"
                  name="censoringRule"
                  value="custom"
                  checked={analysisConfig.censoringRule === 'custom'}
                  onChange={(e) => handleAnalysisConfigChange('censoringRule', e.target.value)}
                  className="mr-2 accent-gray-600"
                />
                Custom
              </label>
            </div>
            {analysisConfig.censoringRule === 'custom' && (
              <div className="mt-2">
                <label className="block text-xs text-gray-700 mb-1">Custom Censoring (Months)</label>
                <input
                  type="number"
                  value={analysisConfig.customCensoringMonths}
                  onChange={(e) => handleAnalysisConfigChange('customCensoringMonths', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  min="1"
                  max="120"
                />
              </div>
            )}
          </div>

          {/* Confidence Intervals */}
          <div>
            <h3 className="text-xs font-medium text-gray-800 mb-3">Statistical Parameters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Confidence Level (%)</label>
                <input
                  type="number"
                  value={analysisConfig.confidenceLevel}
                  onChange={(e) => handleAnalysisConfigChange('confidenceLevel', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  min="80"
                  max="99"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Minimum Sample Size</label>
                <input
                  type="number"
                  value={analysisConfig.minSampleSize}
                  onChange={(e) => handleAnalysisConfigChange('minSampleSize', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  min="10"
                  max="1000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Significance Level</label>
                <input
                  type="number"
                  value={analysisConfig.significanceLevel}
                  onChange={(e) => handleAnalysisConfigChange('significanceLevel', parseFloat(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  min="0.01"
                  max="0.1"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            className="px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
            onClick={handleSaveAnalysisConfig}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Analysis Configuration"}
          </button>
        </div>
      </div>

      {message && <div className="mt-2 text-green-700 text-xs">{message}</div>}
      {error && <div className="mt-2 text-red-700 text-xs">{error}</div>}
    </div>
  );
}

export default Configuration;
