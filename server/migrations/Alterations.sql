-- First, drop the existing unique constraint
ALTER TABLE ldn_customer_info DROP INDEX unique_party_id;

-- Then, add a composite unique constraint
ALTER TABLE ldn_customer_info ADD CONSTRAINT unique_party_mis_date UNIQUE (v_party_id, fic_mis_date);


CREATE INDEX idx_run_date ON fct_reporting_lines(n_run_key, fic_mis_date);

-- Index for term structure grouping
CREATE INDEX idx_term_structure ON fct_reporting_lines(n_pd_term_structure_name);

-- Combined index for all the main filtering and grouping columns
CREATE INDEX idx_term_structure_combined ON fct_reporting_lines(
    n_run_key, 
    fic_mis_date, 
    n_pd_term_structure_name, 
    n_delq_band_code
);