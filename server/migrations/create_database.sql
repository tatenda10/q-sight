-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ifrs9_db;
USE ifrs9_db;

-- Financial Instrument Table
CREATE TABLE IF NOT EXISTS Ldn_Financial_Instrument (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_account_number VARCHAR(255) NOT NULL,
    v_cust_ref_code VARCHAR(50),
    v_prod_code VARCHAR(50),
    n_curr_interest_rate DECIMAL(5,2) NOT NULL,
    n_interest_changing_rate DECIMAL(5,4),
    v_interest_freq_unit VARCHAR(50),
    v_interest_payment_type VARCHAR(50),
    v_day_count_ind VARCHAR(7) DEFAULT '30/365',
    v_management_fee_rate DECIMAL(5,2),
    n_wht_percent DECIMAL(10,2),
    n_effective_interest_rate DECIMAL(5,2),
    n_accrued_interest DECIMAL(10,2),
    d_start_date DATE,
    d_last_payment_date DATE,
    d_next_payment_date DATE,
    d_maturity_date DATE NOT NULL,
    v_amrt_repayment_type VARCHAR(50),
    v_amrt_term_unit VARCHAR(50),
    n_eop_curr_prin_bal DECIMAL(10,2),
    n_eop_int_bal DECIMAL(10,2),
    n_eop_bal DECIMAL(10,2) NOT NULL,
    n_curr_payment_recd DECIMAL(10,2),
    n_collateral_amount DECIMAL(10,2),
    n_delinquent_days INT,
    n_pd_percent DECIMAL(5,2),
    n_lgd_percent DECIMAL(5,2),
    v_ccy_code VARCHAR(10),
    v_loan_type VARCHAR(50),
    m_fees DECIMAL(5,2),
    v_m_fees_term_unit VARCHAR(1),
    v_lob_code VARCHAR(50),
    v_lv_code VARCHAR(50),
    v_country_id VARCHAR(50),
    v_credit_rating_code VARCHAR(50),
    v_org_credit_score DECIMAL(5,2),
    v_curr_credit_score DECIMAL(5,2),
    v_acct_rating_movement DECIMAL(5,2),
    v_collateral_type VARCHAR(50),
    v_loan_desc VARCHAR(255),
    v_account_classification_cd VARCHAR(50),
    v_gaap_code VARCHAR(50),
    v_branch_code VARCHAR(50),
    UNIQUE KEY unique_account_date (fic_mis_date, v_account_number)
);

-- Customer Rating Detail Table
CREATE TABLE IF NOT EXISTS Ldn_Customer_Rating_Detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_party_cd VARCHAR(50),
    v_rating_code VARCHAR(50),
    v_purpose VARCHAR(50),
    UNIQUE KEY unique_party_date (fic_mis_date, v_party_cd)
);

-- Bank Product Info Table
CREATE TABLE IF NOT EXISTS Ldn_Bank_Product_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE NOT NULL,
    v_prod_code VARCHAR(50),
    v_prod_name VARCHAR(100),
    v_prod_type VARCHAR(50),
    v_prod_group VARCHAR(50),
    v_prod_group_desc VARCHAR(255),
    v_prod_segment VARCHAR(100),
    v_balance_sheet_category VARCHAR(50),
    v_balance_sheet_category_desc VARCHAR(255),
    v_prod_type_desc VARCHAR(255),
    v_prod_desc VARCHAR(50),
    UNIQUE KEY unique_prod_code (v_prod_code)
);

-- First, drop the tables if they exist (in reverse order to avoid foreign key conflicts)
DROP TABLE IF EXISTS Ldn_PD_Term_Structure_Dtl;
DROP TABLE IF EXISTS Ldn_PD_Term_Structure;
DROP TABLE IF EXISTS FSI_Product_Segment;

-- Create tables in correct order with proper constraints
CREATE TABLE IF NOT EXISTS FSI_Product_Segment (
    segment_id INT AUTO_INCREMENT PRIMARY KEY,
    v_prod_segment VARCHAR(255),
    v_prod_type VARCHAR(255),
    v_prod_desc VARCHAR(255),
    created_by INT,
    UNIQUE KEY unique_segment_type (v_prod_segment, v_prod_type)
);

CREATE TABLE IF NOT EXISTS Ldn_PD_Term_Structure (
    id INT AUTO_INCREMENT,
    v_pd_term_structure_id VARCHAR(100) NOT NULL,
    v_pd_term_structure_name INT,
    v_pd_term_structure_desc VARCHAR(50),
    v_pd_term_frequency_unit CHAR(1),
    v_pd_term_structure_type CHAR(1),
    fic_mis_date DATE,
    created_by INT,
    PRIMARY KEY (id),
    CONSTRAINT uk_pd_term_structure_id UNIQUE (v_pd_term_structure_id),
    CONSTRAINT fk_product_segment 
        FOREIGN KEY (v_pd_term_structure_name) 
        REFERENCES FSI_Product_Segment(segment_id)
);

CREATE TABLE IF NOT EXISTS Ldn_PD_Term_Structure_Dtl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    v_pd_term_structure_id VARCHAR(100) NOT NULL,
    fic_mis_date DATE,
    v_credit_risk_basis_cd VARCHAR(100),
    n_pd_percent DECIMAL(5,4),
    created_by INT,
    CONSTRAINT uk_structure_risk UNIQUE (v_pd_term_structure_id, fic_mis_date, v_credit_risk_basis_cd),
    CONSTRAINT fk_pd_term_structure 
        FOREIGN KEY (v_pd_term_structure_id) 
        REFERENCES Ldn_PD_Term_Structure(v_pd_term_structure_id)
);

-- Stage Determination Table
CREATE TABLE IF NOT EXISTS FCT_Stage_Determination (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    n_account_number VARCHAR(50),
    d_acct_start_date DATE,
    d_last_payment_date DATE,
    d_next_payment_date DATE,
    d_maturity_date DATE,
    n_acct_classification INT,
    n_cust_ref_code VARCHAR(50),
    n_partner_name VARCHAR(50),
    n_party_type VARCHAR(50),
    n_curr_interest_rate DECIMAL(11,6),
    n_effective_interest_rate DECIMAL(15,11),
    n_lgd_percent DECIMAL(15,11),
    n_pd_percent DECIMAL(15,4),
    n_stage_descr VARCHAR(50),
    UNIQUE KEY unique_account_date (fic_mis_date, n_account_number)
);

-- Credit Rating to Stage Mapping Table
CREATE TABLE IF NOT EXISTS FSI_CreditRating_Stage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_rating VARCHAR(50),
    stage VARCHAR(10),
    created_by INT,
    UNIQUE KEY unique_credit_rating (credit_rating)
);

-- DPD Stage Mapping Table
CREATE TABLE IF NOT EXISTS FSI_DPD_Stage_Mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_frequency VARCHAR(50),
    stage_1_threshold INT,
    stage_2_threshold INT,
    stage_3_threshold INT,
    created_by INT
);

-- Function Execution Status Table
CREATE TABLE IF NOT EXISTS FunctionExecutionStatus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    process_id INT,
    function_id INT,
    execution_start_date DATETIME,
    execution_end_date DATETIME,
    duration TIME,
    execution_order INT,
    reporting_date DATE,
    status VARCHAR(20) DEFAULT 'Pending',
    created_by INT,
    process_run_id VARCHAR(50),
    run_count INT,
    UNIQUE KEY unique_execution_process (execution_start_date, process_run_id, function_id)
);

-- Customer Info Table
CREATE TABLE IF NOT EXISTS Ldn_Customer_Info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE NOT NULL,
    v_party_id VARCHAR(50),
    v_partner_name VARCHAR(50),
    v_party_type VARCHAR(50),
    UNIQUE KEY unique_party_id (v_party_id)
);

-- PD Interpolated Table
CREATE TABLE IF NOT EXISTS FSI_PD_Interpolated (
    id INT AUTO_INCREMENT PRIMARY KEY,
    v_pd_term_structure_id VARCHAR(100),
    fic_mis_date DATE,
    v_int_rating_code VARCHAR(20),
    v_delq_band_code VARCHAR(20),
    v_pd_term_structure_type VARCHAR(3),
    n_pd_percent DECIMAL(15,11),
    n_per_period_default_prob DECIMAL(15,11),
    n_cumulative_default_prob DECIMAL(15,11),
    v_cash_flow_bucket_id INT,
    v_cash_flow_bucket_unit VARCHAR(1)
);

-- PD Account Interpolated Table
CREATE TABLE IF NOT EXISTS FSI_PD_Account_Interpolated (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_account_number VARCHAR(50),
    n_pd_percent DECIMAL(10,6),
    n_per_period_default_prob DECIMAL(10,6),
    n_cumulative_default_prob DECIMAL(10,6),
    v_cash_flow_bucket_id INT,
    v_cash_flow_bucket_unit VARCHAR(1),
    UNIQUE KEY unique_account_bucket (fic_mis_date, v_account_number, v_cash_flow_bucket_id)
);

-- LGD Term Structure Table
CREATE TABLE IF NOT EXISTS Ldn_LGD_Term_Structure (
    v_lgd_term_structure_id BIGINT PRIMARY KEY,
    v_lgd_term_structure_name INT,
    v_lgd_term_structure_desc VARCHAR(50),
    n_lgd_percent DECIMAL(5,4),
    fic_mis_date DATE,
    created_by INT,
    FOREIGN KEY (v_lgd_term_structure_name) REFERENCES FSI_Product_Segment(segment_id),
    UNIQUE KEY unique_term_structure_date (v_lgd_term_structure_id, fic_mis_date)
);

-- LGD Collateral Table
CREATE TABLE IF NOT EXISTS LgdCollateral (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE NOT NULL,
    v_cust_ref_code VARCHAR(50) NOT NULL,
    v_ccy_code VARCHAR(50),
    cash DECIMAL(18,2),
    guarantees_corporate DECIMAL(18,2),
    guarantees_personal DECIMAL(18,2),
    insurance DECIMAL(18,2),
    land_and_buildings DECIMAL(18,2),
    floating_charge_debenture DECIMAL(18,2),
    notarial_bond DECIMAL(18,2),
    general_haircuts DECIMAL(18,2),
    project_specific_haircuts DECIMAL(18,2),
    total DECIMAL(18,2),
    UNIQUE KEY lgd_collateral_pk (v_cust_ref_code, fic_mis_date)
);

-- Exchange Rate Table
CREATE TABLE IF NOT EXISTS Ldn_Exchange_Rate (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_from_ccy_code VARCHAR(3),
    v_to_ccy_code VARCHAR(3),
    n_exchange_rate DECIMAL(15,6),
    d_last_updated DATE
);

-- Expected Cashflow Table
CREATE TABLE IF NOT EXISTS FSI_Expected_Cashflow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_account_number VARCHAR(50),
    n_cash_flow_bucket INT,
    d_cash_flow_date DATE,
    n_principal_payment DECIMAL(20,2),
    n_interest_payment DECIMAL(20,2),
    n_cash_flow_amount DECIMAL(20,2),
    n_balance DECIMAL(20,2),
    n_accrued_interest DECIMAL(22,3),
    n_exposure_at_default DECIMAL(22,3),
    V_CASH_FLOW_TYPE VARCHAR(10),
    management_fee_added DECIMAL(20,2),
    V_CCY_CODE VARCHAR(3),
    UNIQUE KEY unique_cashflow (fic_mis_date, v_account_number, d_cash_flow_date)
);

-- Payment Schedule Table
CREATE TABLE IF NOT EXISTS Ldn_Payment_Schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE NOT NULL,
    v_account_number VARCHAR(50) NOT NULL,
    d_payment_date DATE NOT NULL,
    n_principal_payment_amt DECIMAL(22,3),
    n_interest_payment_amt DECIMAL(22,3),
    n_amount DECIMAL(22,3),
    v_payment_type_cd VARCHAR(20),
    UNIQUE KEY unique_payment (fic_mis_date, v_account_number, d_payment_date)
);

-- Recovery Cashflow Table
CREATE TABLE IF NOT EXISTS Ldn_Recovery_Cashflow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_account_number VARCHAR(50),
    d_cash_flow_date DATE,
    n_cash_flow_amount DECIMAL(20,2),
    V_CASH_FLOW_TYPE VARCHAR(10),
    V_CCY_CODE VARCHAR(3),
    UNIQUE KEY unique_recovery (fic_mis_date, v_account_number, d_cash_flow_date)
);

-- Financial Cash Flow Calculation Table
CREATE TABLE IF NOT EXISTS fsi_Financial_Cash_Flow_Cal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    n_run_skey BIGINT NOT NULL DEFAULT 1,
    v_account_number VARCHAR(20) NOT NULL,
    d_cash_flow_date DATE NOT NULL,
    fic_mis_date DATE NOT NULL,
    n_principal_run_off DECIMAL(22,3),
    n_interest_run_off DECIMAL(22,3),
    n_cash_flow_bucket_id INT,
    n_cash_flow_amount DECIMAL(22,3),
    n_cumulative_loss_rate DECIMAL(15,11),
    n_expected_cash_flow_rate DECIMAL(15,11),
    n_discount_rate DECIMAL(15,11),
    n_discount_factor DECIMAL(15,11),
    n_expected_cash_flow DECIMAL(22,3),
    n_effective_interest_rate DECIMAL(15,11),
    n_lgd_percent DECIMAL(15,11),
    n_expected_cash_flow_pv DECIMAL(22,3),
    n_exposure_at_default DECIMAL(22,3),
    n_forward_expected_loss DECIMAL(22,3),
    n_forward_expected_loss_pv DECIMAL(22,3),
    v_ccy_code VARCHAR(3),
    n_cash_shortfall DECIMAL(22,3),
    n_cash_shortfall_pv DECIMAL(22,3),
    UNIQUE KEY unique_cashflow_cal (v_account_number, d_cash_flow_date, fic_mis_date, n_run_skey)
);

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_account_number ON Ldn_Financial_Instrument;
DROP INDEX IF EXISTS idx_fic_mis_date ON Ldn_Financial_Instrument;
DROP INDEX IF EXISTS idx_party_cd ON Ldn_Customer_Rating_Detail;
DROP INDEX IF EXISTS idx_prod_code ON Ldn_Bank_Product_Info;
DROP INDEX IF EXISTS idx_stage_account ON FCT_Stage_Determination;
DROP INDEX IF EXISTS idx_lgd_cust_ref ON LgdCollateral;
DROP INDEX IF EXISTS idx_exchange_rate_date ON Ldn_Exchange_Rate;
DROP INDEX IF EXISTS idx_cashflow_account ON FSI_Expected_Cashflow;
DROP INDEX IF EXISTS idx_payment_account ON Ldn_Payment_Schedule;
DROP INDEX IF EXISTS idx_reporting_account ON FCT_Reporting_Lines;
DROP INDEX IF EXISTS idx_recovery_account ON Ldn_Acct_Recovery_Detail;

CREATE INDEX idx_account_number ON Ldn_Financial_Instrument(v_account_number);
CREATE INDEX idx_fic_mis_date ON Ldn_Financial_Instrument(fic_mis_date);
CREATE INDEX idx_party_cd ON Ldn_Customer_Rating_Detail(v_party_cd);
CREATE INDEX idx_prod_code ON Ldn_Bank_Product_Info(v_prod_code);
CREATE INDEX idx_stage_account ON FCT_Stage_Determination(n_account_number);
CREATE INDEX idx_lgd_cust_ref ON LgdCollateral(v_cust_ref_code);
CREATE INDEX idx_exchange_rate_date ON Ldn_Exchange_Rate(fic_mis_date);
CREATE INDEX idx_cashflow_account ON FSI_Expected_Cashflow(v_account_number);
CREATE INDEX idx_payment_account ON Ldn_Payment_Schedule(v_account_number);
CREATE INDEX idx_reporting_account ON FCT_Reporting_Lines(n_account_number);
CREATE INDEX idx_recovery_account ON Ldn_Acct_Recovery_Detail(v_account_number);

-- Add these tables to your existing SQL file

-- FSI LLFP APP PREFERENCES Table
CREATE TABLE IF NOT EXISTS FSI_LLFP_APP_PREFERENCES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pd_interpolation_method VARCHAR(100) DEFAULT 'NL-POISSON',
    n_pd_model_proj_cap INT DEFAULT 25,
    interpolation_level VARCHAR(20) DEFAULT 'TERM_STRUCTURE',
    created_by INT
);

-- Collateral LGD Table
CREATE TABLE IF NOT EXISTS CollateralLGD (
    id INT AUTO_INCREMENT PRIMARY KEY,
    can_calculate_lgd BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DimExchangeRateConf Table
CREATE TABLE IF NOT EXISTS DimExchangeRateConf (
    id INT AUTO_INCREMENT PRIMARY KEY,
    EXCHANGE_RATE_API_KEY VARCHAR(255),
    use_on_exchange_rates BOOLEAN DEFAULT FALSE,
    use_latest_exchange_rates BOOLEAN DEFAULT FALSE,
    created_by INT
);

-- Fsi Interest Method Table
CREATE TABLE IF NOT EXISTS Fsi_Interest_Method (
    id INT AUTO_INCREMENT PRIMARY KEY,
    v_interest_method VARCHAR(50),
    description TEXT,
    created_by INT,
    UNIQUE KEY unique_interest_method (v_interest_method)
);

-- Table Metadata Table
CREATE TABLE IF NOT EXISTS TableMetadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50),
    description TEXT,
    table_type VARCHAR(10) DEFAULT 'OTHER',
    UNIQUE KEY unique_table_name (table_name)
);

-- System Function Table
CREATE TABLE IF NOT EXISTS SystemFunction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    function_name VARCHAR(255),
    description TEXT,
    UNIQUE KEY unique_function_name (function_name)
);

-- Process Table
CREATE TABLE IF NOT EXISTS Process (
    id INT AUTO_INCREMENT PRIMARY KEY,
    process_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE KEY unique_process_name (process_name)
);

-- Run Process Table
CREATE TABLE IF NOT EXISTS RunProcess (
    id INT AUTO_INCREMENT PRIMARY KEY,
    process_id INT,
    function_id INT,
    order_num INT,
    created_by INT,
    FOREIGN KEY (process_id) REFERENCES Process(id),
    FOREIGN KEY (function_id) REFERENCES SystemFunction(id)
);

-- Log Table
CREATE TABLE IF NOT EXISTS Log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    function_name VARCHAR(50),
    log_level VARCHAR(50),
    message TEXT,
    status VARCHAR(10) DEFAULT 'SUCCESS'
);

-- Currency Code Table
CREATE TABLE IF NOT EXISTS CurrencyCode (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(3),
    description VARCHAR(100),
    UNIQUE KEY unique_currency_code (code)
);

-- Reporting Currency Table
CREATE TABLE IF NOT EXISTS ReportingCurrency (
    id INT AUTO_INCREMENT PRIMARY KEY,
    currency_code_id INT,
    FOREIGN KEY (currency_code_id) REFERENCES CurrencyCode(id)
);

-- ECL Method Table
CREATE TABLE IF NOT EXISTS ECLMethod (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(50) DEFAULT 'forward_exposure',
    uses_discounting BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT
);

-- Report Column Config Table
CREATE TABLE IF NOT EXISTS ReportColumnConfig (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(20) DEFAULT 'default_report',
    selected_columns JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT
);

-- Cooling Period Definition Table
CREATE TABLE IF NOT EXISTS CoolingPeriodDefinition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    v_amrt_term_unit CHAR(1),
    n_cooling_period_days INT,
    created_by INT
);

-- Dim Delinquency Band Table
CREATE TABLE IF NOT EXISTS Dim_Delinquency_Band (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE DEFAULT CURDATE(),
    n_delq_band_code VARCHAR(20),
    v_delq_band_desc VARCHAR(20),
    n_delq_lower_value INT UNSIGNED,
    n_delq_upper_value INT UNSIGNED,
    v_amrt_term_unit CHAR(1),
    created_by INT,
    UNIQUE KEY unique_delq_band_code (n_delq_band_code)
);

-- Credit Rating Code Band Table
CREATE TABLE IF NOT EXISTS Credit_Rating_Code_Band (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    v_rating_code VARCHAR(10),
    v_rating_desc VARCHAR(100),
    created_by INT,
    UNIQUE KEY unique_rating_code (v_rating_code)
);

-- Dim Run Table
CREATE TABLE IF NOT EXISTS Dim_Run (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    latest_run_skey BIGINT DEFAULT 1
);

-- FSI CUMULATIVE PD Table
CREATE TABLE IF NOT EXISTS FSICUMULATIVEPD (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    n_segment_skey VARCHAR(100),
    n_prod_type VARCHAR(100),
    v_combined_group VARCHAR(100),
    v_credit_risk_basis_cd VARCHAR(50),
    n_cumulative_pd DECIMAL(10,6),
    transition_date DATE,
    FOREIGN KEY (n_segment_skey) REFERENCES Ldn_PD_Term_Structure(v_pd_term_structure_id)
);

-- Add additional indexes for new tables
CREATE INDEX idx_process_name ON Process(process_name);
CREATE INDEX idx_function_name ON SystemFunction(function_name);
CREATE INDEX idx_log_timestamp ON Log(timestamp);
CREATE INDEX idx_currency_code ON CurrencyCode(code);

-- FCT Reporting Lines Table
CREATE TABLE IF NOT EXISTS FCT_Reporting_Lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    n_run_key BIGINT,
    fic_mis_date DATE,
    n_account_number VARCHAR(50),
    d_acct_start_date DATE,
    d_last_payment_date DATE,
    d_next_payment_date DATE,
    d_maturity_date DATE,
    n_acct_classification INT,
    n_cust_ref_code VARCHAR(50),
    n_partner_name VARCHAR(50),
    n_party_type VARCHAR(50),
    n_accrual_basis_code VARCHAR(7),
    n_curr_interest_rate DECIMAL(11,6),
    n_effective_interest_rate DECIMAL(15,11),
    v_interest_freq_unit VARCHAR(1),
    v_interest_method VARCHAR(5),
    n_accrued_interest DECIMAL(22,3),
    n_rate_chg_min DECIMAL(10,6),
    v_ccy_code VARCHAR(3),
    n_carrying_amount_ncy DECIMAL(22,3),
    n_carrying_amount_rcy DECIMAL(22,3),
    n_exposure_at_default_ncy DECIMAL(22,3),
    n_exposure_at_default_rcy DECIMAL(22,3),
    n_pv_of_cash_flows DECIMAL(22,3),
    n_write_off_amount DECIMAL(22,3),
    n_expected_recovery DECIMAL(22,3),
    n_lifetime_ecl_ncy DECIMAL(22,3),
    n_lifetime_ecl_rcy DECIMAL(22,3),
    n_12m_ecl_ncy DECIMAL(22,3),
    n_12m_ecl_rcy DECIMAL(22,3),
    n_lgd_percent DECIMAL(15,11),
    n_pd_percent DECIMAL(15,4),
    n_twelve_months_orig_pd DECIMAL(15,11),
    n_lifetime_orig_pd DECIMAL(15,11),
    n_twelve_months_pd DECIMAL(15,11),
    n_lifetime_pd DECIMAL(15,11),
    n_pd_term_structure_skey BIGINT,
    n_pd_term_structure_name VARCHAR(50),
    n_pd_term_structure_desc VARCHAR(50),
    n_12m_pd_change DECIMAL(22,3),
    v_amrt_repayment_type VARCHAR(50),
    n_remain_no_of_pmts BIGINT,
    n_amrt_term INT,
    v_amrt_term_unit VARCHAR(1),
    n_delinquent_days INT,
    n_delq_band_code VARCHAR(50),
    n_stage_descr VARCHAR(50),
    n_curr_ifrs_stage_skey BIGINT,
    n_prev_ifrs_stage_skey BIGINT,
    d_cooling_start_date DATE,
    n_target_ifrs_stage_skey BIGINT,
    n_in_cooling_period_flag BOOLEAN DEFAULT FALSE,
    n_cooling_period_duration INT,
    n_country VARCHAR(50),
    n_segment_skey BIGINT,
    n_prod_segment VARCHAR(255),
    n_prod_code VARCHAR(50),
    n_prod_name VARCHAR(50),
    n_prod_type VARCHAR(50),
    n_prod_desc VARCHAR(255),
    n_credit_rating_code VARCHAR(50),
    n_org_credit_score DECIMAL(5,2),
    n_curr_credit_score INT,
    n_acct_rating_movement INT,
    n_party_rating_movement INT,
    n_conditionally_cancel_flag INT,
    n_collateral_amount DECIMAL(22,3),
    n_loan_type VARCHAR(50),
    UNIQUE KEY unique_fct_reporting_lines (fic_mis_date, n_account_number, n_run_key)
);

-- Account Recovery Detail Table
CREATE TABLE IF NOT EXISTS Ldn_Acct_Recovery_Detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    v_account_number VARCHAR(50),
    fic_mis_date DATE,
    d_recovery_date DATE,
    v_recovery_type_code VARCHAR(20),
    n_prin_recovery_amt DECIMAL(22,3),
    n_int_recovery_amt DECIMAL(22,3),
    n_charge_recovery_amt DECIMAL(22,3),
    v_recovery_stage_code VARCHAR(20),
    n_cost_case_filed DECIMAL(22,3),
    v_iso_currency_cd VARCHAR(3),
    v_lv_code VARCHAR(20),
    n_recovery_income_amt DECIMAL(22,3),
    v_data_source_code VARCHAR(20),
    UNIQUE KEY unique_recovery_detail (v_account_number, fic_mis_date, d_recovery_date)
);

-- Add Expected Cashflow Table (Ldn_Expected_Cashflow)
CREATE TABLE IF NOT EXISTS Ldn_Expected_Cashflow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fic_mis_date DATE,
    v_account_number VARCHAR(50),
    d_cash_flow_date DATE,
    n_cash_flow_amount DECIMAL(20,2),
    V_CASH_FLOW_TYPE VARCHAR(10),
    V_CCY_CODE VARCHAR(3),
    UNIQUE KEY unique_expected_cashflow (fic_mis_date, v_account_number, d_cash_flow_date)
);

-- Add index for the new table
CREATE INDEX idx_expected_cashflow_account ON Ldn_Expected_Cashflow(v_account_number); 