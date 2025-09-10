const { format } = require('date-fns');
const db = require('../../../config/database');

// Helper function to get projection year
const getProjectionYear = (startDate, bucket, bucketUnit) => {
  const date = new Date(startDate);
  switch (bucketUnit) {
    case 'M':
      date.setMonth(date.getMonth() + bucket);
      break;
    case 'Q':
      date.setMonth(date.getMonth() + (3 * bucket));
      break;
    case 'H':
      date.setMonth(date.getMonth() + (6 * bucket));
      break;
    case 'Y':
      date.setFullYear(date.getFullYear() + bucket);
      break;
  }
  return date.getFullYear();
};

// Main interpolation function
const performInterpolation = async (misDate) => {
  const startTime = process.hrtime();
  console.log('Starting performInterpolation function...');
  const connection = await db.getConnection();
  console.log('Database connection established');

  const logTimeElapsed = (operation) => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
    console.log(`${operation} - Time elapsed: ${milliseconds.toFixed(2)}ms`);
  };

  try {
    // Get application preferences
    console.log('Fetching application preferences...');
    const [preferences] = await connection.execute(
      'SELECT pd_interpolation_method, n_pd_model_proj_cap FROM fsi_llfp_app_preferences where status=1 limit 1'
    );
    logTimeElapsed('Preferences fetch');

    if (!preferences || preferences.length === 0) {
      console.error('No active preferences found in fsi_llfp_app_preferences');
      return '0';
    }

    const pdInterpolationMethod = preferences[0]?.pd_interpolation_method || 'NL-POISSON';
    const pdModelProjCap = preferences[0]?.n_pd_model_proj_cap;
    console.log('Using interpolation method:', pdInterpolationMethod);
    console.log('Using projection cap:', pdModelProjCap);

    // Clear previous interpolated results
    console.log('Clearing previous interpolated results for date:', misDate);
    await connection.execute('DELETE FROM fsi_pd_interpolated WHERE fic_mis_date = ?', [misDate]);
    logTimeElapsed('Clear previous results');

    // Get term structure details
    console.log('Fetching term structure details...');
    const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');
    const [termStructureDetails] = await connection.execute(
      `SELECT 
        v_pd_term_structure_id,
        DATE_FORMAT(fic_mis_date, '%Y-%m-%d') as fic_mis_date,
        v_pd_term_frequency_unit,
        n_pd_percent,
        v_credit_risk_basis_cd,
        COALESCE(v_pd_term_structure_type, 'R') as v_pd_term_structure_type
      FROM ldn_pd_term_structure_dtl 
      WHERE DATE(fic_mis_date) = ?`,
      [formattedMisDate]
    );
    logTimeElapsed('Term structure details fetch');

    if (!termStructureDetails || termStructureDetails.length === 0) {
      console.error('No term structure details found for date:', misDate);
      return '0';
    }

    // Process in batches of 5
    const batchSize = 5;
    console.log(`Processing ${termStructureDetails.length} records in batches of ${batchSize}`);

    for (let i = 0; i < termStructureDetails.length; i += batchSize) {
      const batchStartTime = process.hrtime();
      const batch = termStructureDetails.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(termStructureDetails.length/batchSize)}`);
      
      try {
        await Promise.all(batch.map(detail => {
          console.log(`Processing detail for structure ID: ${detail.v_pd_term_structure_id}`);
          return processInterpolation(connection, detail, pdModelProjCap, pdInterpolationMethod);
        }));
        const [batchSeconds, batchNanoseconds] = process.hrtime(batchStartTime);
        const batchMilliseconds = (batchSeconds * 1000) + (batchNanoseconds / 1000000);
        console.log(`Batch ${Math.floor(i/batchSize) + 1} completed in ${batchMilliseconds.toFixed(2)}ms`);
      } catch (batchError) {
        console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        throw batchError;
      }
    }

    logTimeElapsed('All processing completed');
    return '1';
  } catch (error) {
    console.error('Error in performInterpolation:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    return '0';
  } finally {
    connection.release();
    const [totalSeconds, totalNanoseconds] = process.hrtime(startTime);
    const totalMilliseconds = (totalSeconds * 1000) + (totalNanoseconds / 1000000);
    console.log(`Total execution time: ${totalMilliseconds.toFixed(2)}ms`);
  }
};

// Process individual interpolation
const processInterpolation = async (connection, detail, pdModelProjCap, pdInterpolationMethod) => {
  console.log(`Starting processInterpolation for detail:`, {
    structureId: detail.v_pd_term_structure_id,
    frequency: detail.v_pd_term_frequency_unit,
    pdPercent: detail.n_pd_percent
  }); 

  const bucketLength = detail.v_pd_term_frequency_unit;
  let bucketFrequency, cashFlowBucketUnit;

  switch (bucketLength) {
    case 'M':
      bucketFrequency = 12;
      cashFlowBucketUnit = 'M';
      break;
    case 'H':
      bucketFrequency = 2;
      cashFlowBucketUnit = 'H';
      break;
    case 'Q':
      bucketFrequency = 4;
      cashFlowBucketUnit = 'Q';
      break;
    default:
      bucketFrequency = 1;
      cashFlowBucketUnit = 'Y';
  }

  console.log('Calculated bucket parameters:', {
    bucketFrequency,
    cashFlowBucketUnit
  });

  try {
    switch (pdInterpolationMethod) {
      case 'NL-POISSON':
        console.log('Using Poisson interpolation method');
        await interpolatePoisson(connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit);
        break;
      case 'NL-GEOMETRIC':
        console.log('Using Geometric interpolation method');
        await interpolateGeometric(connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit);
        break;
      case 'NL-ARITHMETIC':
        console.log('Using Arithmetic interpolation method');
        await interpolateArithmetic(connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit);
        break;
      case 'EXPONENTIAL_DECAY':
        console.log('Using Exponential Decay interpolation method');
        await interpolateExponentialDecay(connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit);
        break;
      default:
        console.error('Unknown interpolation method:', pdInterpolationMethod);
        throw new Error(`Unknown interpolation method: ${pdInterpolationMethod}`);
    }
    console.log('Interpolation completed successfully for detail:', detail.v_pd_term_structure_id);
  } catch (error) {
    console.error('Error in processInterpolation:', error);
    throw error;
  }
};

// Poisson interpolation
const interpolatePoisson = async (connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit) => {
  console.log('Starting Poisson interpolation with detail:', {
    v_pd_term_structure_id: detail.v_pd_term_structure_id,
    fic_mis_date: detail.fic_mis_date,
    v_pd_term_structure_type: detail.v_pd_term_structure_type,
    v_credit_risk_basis_cd: detail.v_credit_risk_basis_cd,
    n_pd_percent: detail.n_pd_percent
  });

  const periods = bucketFrequency * pdModelProjCap;
  let pdPercent = parseFloat(detail.n_pd_percent);
  let cumulativePd = 0;
  const epsilon = 1e-6;
  pdPercent = Math.min(Math.max(pdPercent, epsilon), 1 - epsilon);

  // Prepare bulk insert array
  const bulkInsertValues = [];
  const bulkInsertParams = [];

  for (let bucket = 1; bucket <= periods; bucket++) {
    const marginalPd = 1 - Math.exp(Math.log(1 - pdPercent) / bucketFrequency);
    cumulativePd = 1 - (1 - cumulativePd) * (1 - marginalPd);
    const projYear = getProjectionYear(detail.fic_mis_date, bucket, cashFlowBucketUnit);

    bulkInsertValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    bulkInsertParams.push(
      detail.v_pd_term_structure_id,
      format(new Date(detail.fic_mis_date), 'yyyy-MM-dd'),
      projYear,
      detail.v_pd_term_structure_type === 'R' ? detail.v_credit_risk_basis_cd : null,
      detail.v_pd_term_structure_type === 'D' ? detail.v_credit_risk_basis_cd : null,
      detail.v_pd_term_structure_type || 'R',  // Default to 'R' if undefined
      detail.n_pd_percent,
      marginalPd,
      cumulativePd,
      cumulativePd,
      bucket,
      cashFlowBucketUnit
    );
  }

  try {
    // Single bulk insert query
    await connection.execute(`
      INSERT INTO fsi_pd_interpolated (
        v_pd_term_structure_id, fic_mis_date, projection_year, v_int_rating_code,
        v_delq_band_code, v_pd_term_structure_type, n_pd_percent,
        n_per_period_default_prob, n_cumulative_default_prob,
        n_cumulative_default_prob_base, v_cash_flow_bucket_id,
        v_cash_flow_bucket_unit
      ) VALUES ${bulkInsertValues.join(',')}
    `, bulkInsertParams);
  } catch (error) {
    console.error('Error with bulk insert:', error);
    throw error;
  }
};

// Geometric interpolation
const interpolateGeometric = async (connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit) => {
  const periods = bucketFrequency * pdModelProjCap;
  let pdPercent = parseFloat(detail.n_pd_percent);
  let cumulativePd = 0;

  for (let bucket = 1; bucket <= periods; bucket++) {
    const marginalPd = Math.pow(1 + pdPercent, 1 / bucketFrequency) - 1;
    cumulativePd = 1 - (1 - cumulativePd) * (1 - marginalPd);

    const projYear = getProjectionYear(detail.v_pd_term_structure_id.fic_mis_date, bucket, cashFlowBucketUnit);

    try {
      await connection.execute(`
        INSERT INTO fsi_pd_interpolated (
          v_pd_term_structure_id, fic_mis_date, projection_year, v_int_rating_code,
          v_delq_band_code, v_pd_term_structure_type, n_pd_percent,
          n_per_period_default_prob, n_cumulative_default_prob,
          n_cumulative_default_prob_base, v_cash_flow_bucket_id,
          v_cash_flow_bucket_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        detail.v_pd_term_structure_id,
        detail.fic_mis_date,
        projYear,
        detail.v_pd_term_structure_type === 'R' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type === 'D' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type,
        detail.n_pd_percent,
        marginalPd,
        cumulativePd,
        cumulativePd,
        bucket,
        cashFlowBucketUnit
      ]);
    } catch (error) {
      throw error;
    }
  }
};

// Arithmetic interpolation
const interpolateArithmetic = async (connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit) => {
  const periods = bucketFrequency * pdModelProjCap;
  let pdPercent = parseFloat(detail.n_pd_percent);
  let cumulativePd = 0;
  const marginalPd = pdPercent / bucketFrequency;

  for (let bucket = 1; bucket <= periods; bucket++) {
    cumulativePd = 1 - (1 - cumulativePd) * (1 - marginalPd);

    const projYear = getProjectionYear(detail.v_pd_term_structure_id.fic_mis_date, bucket, cashFlowBucketUnit);

    try {
      await connection.execute(`
        INSERT INTO fsi_pd_interpolated (
          v_pd_term_structure_id, fic_mis_date, projection_year, v_int_rating_code,
          v_delq_band_code, v_pd_term_structure_type, n_pd_percent,
          n_per_period_default_prob, n_cumulative_default_prob,
          n_cumulative_default_prob_base, v_cash_flow_bucket_id,
          v_cash_flow_bucket_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        detail.v_pd_term_structure_id,
        detail.fic_mis_date,
        projYear,
        detail.v_pd_term_structure_type === 'R' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type === 'D' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type,
        detail.n_pd_percent,
        marginalPd,
        cumulativePd,
        cumulativePd,
        bucket,
        cashFlowBucketUnit
      ]);
    } catch (error) {
      throw error;
    }
  }
};

// Exponential decay interpolation
const interpolateExponentialDecay = async (connection, detail, bucketFrequency, pdModelProjCap, cashFlowBucketUnit) => {
  const periods = bucketFrequency * pdModelProjCap;
  let pdPercent = parseFloat(detail.n_pd_percent);

  // Adjust pdPercent based on bucket unit
  if (cashFlowBucketUnit === 'Q') {
    pdPercent = 1 - Math.pow(1 - pdPercent, 1/4);
  } else if (cashFlowBucketUnit === 'H') {
    pdPercent = 1 - Math.pow(1 - pdPercent, 1/2);
  } else if (cashFlowBucketUnit === 'M') {
    pdPercent = 1 - Math.pow(1 - pdPercent, 1/12);
  }

  let cumulativePd = 0;
  let populationRemaining = 1;

  for (let bucket = 1; bucket <= periods && populationRemaining > 0; bucket++) {
    const marginalPd = Number((populationRemaining * pdPercent).toFixed(4));
    populationRemaining = Number((populationRemaining - marginalPd).toFixed(4));
    cumulativePd = Number((cumulativePd + marginalPd).toFixed(4));

    const projYear = getProjectionYear(detail.v_pd_term_structure_id.fic_mis_date, bucket, cashFlowBucketUnit);

    try {
      await connection.execute(`
        INSERT INTO fsi_pd_interpolated (
          v_pd_term_structure_id, fic_mis_date, projection_year, v_int_rating_code,
          v_delq_band_code, v_pd_term_structure_type, n_pd_percent,
          n_per_period_default_prob, n_cumulative_default_prob,
          n_cumulative_default_prob_base, v_cash_flow_bucket_id,
          v_cash_flow_bucket_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        detail.v_pd_term_structure_id,
        detail.fic_mis_date,
        projYear,
        detail.v_pd_term_structure_type === 'R' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type === 'D' ? detail.v_credit_risk_basis_cd : null,
        detail.v_pd_term_structure_type,
        detail.n_pd_percent,
        marginalPd,
        cumulativePd,
        cumulativePd,
        bucket,
        cashFlowBucketUnit
      ]);
    } catch (error) {
      throw error;
    }
  }
};

module.exports = {
  performInterpolation,
  processInterpolation,
  interpolatePoisson,
  interpolateGeometric,
  interpolateArithmetic,
  interpolateExponentialDecay
};
