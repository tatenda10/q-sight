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

  return (
    <div className="w-full bg-white ">
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
      {message && <div className="mt-2 text-green-700 text-xs">{message}</div>}
      {error && <div className="mt-2 text-red-700 text-xs">{error}</div>}
    </div>
  );
}

export default Configuration;
