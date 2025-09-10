const { getConnection } = require('../../../config/database');

// Helper: Fetch preferences from FSI_LLFP_APP_PREFERENCES
async function getPreferences(connection) {
  const [rows] = await connection.query('SELECT * FROM FSI_LLFP_APP_PREFERENCES LIMIT 1');
  if (!rows.length) {
    console.error('No preferences found in FSI_LLFP_APP_PREFERENCES.');
    return null;
  }
  return rows[0];
}

// Helper: Get account-level PD details for the date
async function getAccountPdDetails(connection, mis_date) {
  const [rows] = await connection.query('SELECT * FROM Ldn_PD_Term_Structure_Dtl WHERE fic_mis_date = ?', [mis_date]);
  return rows;
}

// Main: Perform PD interpolation at the account level
async function pdInterpolationAccountLevel(mis_date) {
  const connection = await getConnection();
  try {
    if (!mis_date) throw new Error('mis_date is required');
    const preferences = await getPreferences(connection);
    if (!preferences) return '0';

    const pd_interpolation_method = preferences.pd_interpolation_method || 'NL-POISSON';
    const pd_model_proj_cap = preferences.n_pd_model_proj_cap;
    const bucket_length = preferences.llfp_bucket_length;
    let bucket_frequency, cash_flow_bucket_unit;
    if (bucket_length === 'M') {
      bucket_frequency = 12;
      cash_flow_bucket_unit = 'M';
    } else if (bucket_length === 'H') {
      bucket_frequency = 6;
      cash_flow_bucket_unit = 'H';
    } else if (bucket_length === 'Q') {
      bucket_frequency = 3;
      cash_flow_bucket_unit = 'Q';
    } else {
      bucket_frequency = 1;
      cash_flow_bucket_unit = 'Y';
    }

    // Fetch all account PD details for this mis_date
    const details = await getAccountPdDetails(connection, mis_date);
    if (!details.length) {
      console.error(`No term structure details found for mis_date ${mis_date}.`);
      return '0';
    }

    // Log the details fetched for PD interpolation
    console.log('PD Interpolation Query Results:');
    console.log('Total rows:', details.length);

    // Log distribution of term structures and buckets
    const termStructures = new Set();
    const buckets = new Set();
    details.forEach(detail => {
        termStructures.add(detail.v_pd_term_structure_id);
        buckets.add(detail.v_cash_flow_bucket_id);
    });

    console.log('Unique Term Structures:', Array.from(termStructures));
    console.log('Unique Buckets:', Array.from(buckets).sort((a, b) => a - b));

    // For each account, run interpolation and update/insert as needed
    for (const detail of details) {
      await processAccountInterpolation(connection, detail, bucket_frequency, pd_model_proj_cap, pd_interpolation_method, cash_flow_bucket_unit);
    }

    console.log('PD interpolation at account level completed.');
    return '1';
  } catch (e) {
    console.error('Error during account-level PD interpolation:', e.message);
    return '0';
  } finally {
    connection.release();
  }
}

// Process PD interpolation for a given account-level PD detail
async function processAccountInterpolation(connection, detail, bucket_frequency, pd_model_proj_cap, pd_interpolation_method, cash_flow_bucket_unit) {
  const credit_risk_band = detail.v_credit_risk_basis_cd;
  const fic_mis_date = detail.fic_mis_date;
  const account_number = detail.v_account_number;
  console.log(`Processing interpolation for account: ${account_number}, credit risk band: ${credit_risk_band}`);

  // Delete existing records for this account/date
  await connection.query('DELETE FROM FSI_PD_Interpolated WHERE fic_mis_date = ? AND v_account_number = ?', [fic_mis_date, account_number]);

    // Select interpolation method
  let interpolatedBuckets = [];
  const max_bucket = bucket_frequency;
  const pd_percent = detail.n_pd_percent || 0;

  switch (pd_interpolation_method) {
    case 'NL-POISSON':
      interpolatedBuckets = interpolatePoissonAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit);
      break;
    case 'GEOMETRIC':
      interpolatedBuckets = interpolateGeometricAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit);
      break;
    case 'ARITHMETIC':
      interpolatedBuckets = interpolateArithmeticAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit);
      break;
    case 'EXPONENTIAL_DECAY':
      interpolatedBuckets = interpolateExponentialDecayAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit);
      break;
    default:
      console.warn(`Unknown interpolation method: ${pd_interpolation_method}, skipping.`);
      return;
  }

  // Insert interpolated results into FSI_PD_Interpolated
  for (const bucket of interpolatedBuckets) {
    await connection.query(
      'INSERT INTO FSI_PD_Interpolated (fic_mis_date, v_account_number, v_cash_flow_bucket_id, n_cumulative_default_prob, v_amrt_term_unit) VALUES (?, ?, ?, ?, ?)',
      [detail.fic_mis_date, account_number, bucket.bucket_id, bucket.cum_pd, cash_flow_bucket_unit]
    );
    console.log(`Inserted: account=${account_number}, bucket=${bucket.bucket_id}, cum_pd=${bucket.cum_pd}`);
  }

  // Log the interpolation results
  console.log('PD Interpolation Result:');
  console.log(`  Term Structure: ${detail.v_pd_term_structure_id}`);
  console.log(`  Rating: ${detail.v_internal_rating}`);
  console.log(`  Bucket: ${detail.v_cash_flow_bucket_id}`);
  console.log(`  Found PD Value: ${detail.n_pd_value}`);
}

// Poisson interpolation for account-level PD
function interpolatePoissonAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit) {
  const buckets = [];
  const lambda = pd_percent;
  for (let k = 1; k <= max_bucket; k++) {
    // Poisson CDF: 1 - exp(-lambda * (k / max_bucket))
    const t = k / max_bucket;
    const cum_pd = 1 - Math.exp(-lambda * t);
    buckets.push({ bucket_id: k, cum_pd });
  }
  return buckets;
}

// Geometric interpolation for account-level PD
function interpolateGeometricAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit) {
  const buckets = [];
  const p = pd_percent / max_bucket;
  let cum_pd = 0;
  for (let k = 1; k <= max_bucket; k++) {
    cum_pd = 1 - Math.pow(1 - p, k);
    buckets.push({ bucket_id: k, cum_pd });
  }
  return buckets;
}

// Arithmetic interpolation for account-level PD
function interpolateArithmeticAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit) {
  const buckets = [];
  const increment = pd_percent / max_bucket;
  let cum_pd = 0;
  for (let k = 1; k <= max_bucket; k++) {
    cum_pd += increment;
    buckets.push({ bucket_id: k, cum_pd: Math.min(cum_pd, 1) });
  }
  return buckets;
}

// Exponential Decay interpolation for account-level PD
function interpolateExponentialDecayAccount(detail, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit) {
  const buckets = [];
  const decay = 0.05; // Example decay factor, adjust as needed
  let cum_pd = 0;
  for (let k = 1; k <= max_bucket; k++) {
    cum_pd = pd_percent * (1 - Math.exp(-decay * k));
    buckets.push({ bucket_id: k, cum_pd: Math.min(cum_pd, 1) });
  }
  return buckets;
}


module.exports = { pdInterpolationAccountLevel };
