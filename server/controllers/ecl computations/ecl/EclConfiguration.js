const fs = require('fs');
const path = require('path');

// Path to store selected columns
const CONFIG_PATH = path.join(__dirname, 'ecl_columns_config.json');

// Default columns (all columns from fct_reporting_lines, as provided)
const ALL_COLUMNS = [
  "id","n_run_key","fic_mis_date","n_account_number","d_acct_start_date","d_last_payment_date","d_next_payment_date","d_maturity_date","n_acct_classification","n_cust_ref_code","n_partner_name","n_party_type","n_accrual_basis_code","n_curr_interest_rate","n_effective_interest_rate","v_interest_freq_unit","v_interest_method","n_accrued_interest","n_rate_chg_min","v_ccy_code","n_carrying_amount_ncy","n_carrying_amount_rcy","n_exposure_at_default_ncy","n_exposure_at_default_rcy","n_pv_of_cash_flows","n_write_off_amount","n_expected_recovery","n_lifetime_ecl_ncy","n_lifetime_ecl_rcy","n_12m_ecl_ncy","n_12m_ecl_rcy","n_lgd_percent","n_pd_percent","n_twelve_months_orig_pd","n_lifetime_orig_pd","n_twelve_months_pd","n_lifetime_pd","n_pd_term_structure_skey","n_pd_term_structure_name","n_pd_term_structure_desc","n_12m_pd_change","v_amrt_repayment_type","n_remain_no_of_pmts","n_amrt_term","v_amrt_term_unit","n_delinquent_days","n_delq_band_code","n_stage_descr","n_curr_ifrs_stage_skey","n_prev_ifrs_stage_skey","d_cooling_start_date","n_target_ifrs_stage_skey","n_in_cooling_period_flag","n_cooling_period_duration","n_country","n_segment_skey","n_prod_segment","n_prod_code","n_prod_name","n_prod_type","n_prod_desc","n_credit_rating_code","n_org_credit_score","n_curr_credit_score","n_acct_rating_movement","n_party_rating_movement","n_conditionally_cancel_flag","n_collateral_amount","n_loan_type"
];

// Helper to read config
function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return ALL_COLUMNS;
  }
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const json = JSON.parse(data);
    if (Array.isArray(json.columns)) return json.columns;
    return ALL_COLUMNS;
  } catch {
    return ALL_COLUMNS;
  }
}

// Helper to write config
function writeConfig(columns) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ columns }, null, 2));
}

// Controller: Get selected columns
exports.getColumns = (req, res) => {
  const columns = readConfig();
  res.json({ columns });
};

// Controller: Set selected columns
exports.setColumns = (req, res) => {
  const { columns } = req.body;
  if (!Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ error: 'columns must be a non-empty array' });
  }
  // Optionally, validate columns are in ALL_COLUMNS
  const invalid = columns.filter(col => !ALL_COLUMNS.includes(col));
  if (invalid.length > 0) {
    return res.status(400).json({ error: 'Invalid columns: ' + invalid.join(', ') });
  }
  writeConfig(columns);
  res.json({ success: true, columns });
};

// Controller: Reset to all columns
exports.resetColumns = (req, res) => {
  writeConfig(ALL_COLUMNS);
  res.json({ success: true, columns: ALL_COLUMNS });
};
