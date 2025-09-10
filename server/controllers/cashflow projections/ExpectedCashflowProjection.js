const { getConnection } = require('../../config/database');
const moment = require('moment');


function cleanNumber(val) {
  if (typeof val === 'string') {
    val = val.replace(/[^0-9.-]+/g, '');
  }
  const num = Number(val);
  return isNaN(num) ? 0 : Number(num.toFixed(8)); // up to 8 decimals
}

const createBulkCashFlows = async (connection, cashflows) => {
  if (cashflows.length === 0) return;

  const values = cashflows.map(cf => [
    cf.fic_mis_date,
    cf.v_account_number,
    cf.n_cashflow_bucket,
    cf.d_cashflow_date,
    cleanNumber(cf.n_principal_component),
    cleanNumber(cf.n_interest_component),
    cleanNumber(cf.n_total_component),
    cleanNumber(cf.n_closing_balance)
  ]);

  await connection.query(`
    INSERT INTO FSI_Expected_Cashflow 
    (fic_mis_date, v_account_number, n_cashflow_bucket, d_cashflow_date, 
    n_principal_component, n_interest_component, n_total_component, n_closing_balance)
    VALUES ?`, [values]);
};



const getPaymentInterval = (v_amrt_term_unit, day_count_ind) => {
  switch (day_count_ind) {
    case '30/360':
      return getIntervalFor30_360(v_amrt_term_unit);
    case '30/365':
      return getIntervalFor30_365(v_amrt_term_unit);
    default:
      return moment.duration(30, 'days');
  }
};

const getIntervalFor30_360 = (v_amrt_term_unit) => {
  switch (v_amrt_term_unit) {
    case 'D': return moment.duration(1, 'days');
    case 'W': return moment.duration(1, 'weeks');
    case 'M': return moment.duration(30, 'days');
    case 'Q': return moment.duration(90, 'days');
    case 'H': return moment.duration(180, 'days');
    case 'Y': return moment.duration(360, 'days');
    default: return moment.duration(30, 'days');
  }
};

const getIntervalFor30_365 = (v_amrt_term_unit) => {
  switch (v_amrt_term_unit) {
    case 'D': return moment.duration(1, 'days');
    case 'W': return moment.duration(1, 'weeks');
    case 'M': return moment.duration(30, 'days');
    case 'Q': return moment.duration(91, 'days');
    case 'H': return moment.duration(182, 'days');
    case 'Y': return moment.duration(365, 'days');
    default: return moment.duration(30, 'days');
  }
};

// Add this enum for cash flow types
const CASH_FLOW_TYPES = {
  PRINCIPAL: 'P',
  INTEREST: 'I',
  MIXED: 'M',
  MANAGEMENT_FEE: 'F'
};

// Helper function to calculate cashflows for a single loan object
const calculateCashFlowsForLoanObject = async (connection, loan, interestMethod) => {
  await connection.query(
    'DELETE FROM FSI_Expected_Cashflow WHERE fic_mis_date = ? AND v_account_number = ?',
    [loan.fic_mis_date, loan.v_account_number]
  );

  const [paymentScheduleRows] = await connection.query(`
    SELECT * FROM Ldn_Payment_Schedule 
    WHERE v_account_number = ? AND fic_mis_date = ? 
    ORDER BY d_payment_date LIMIT 1000`,
    [loan.v_account_number, loan.fic_mis_date]
  );

  let balance = loan.n_eop_bal || 0;
  const startingBalance = balance;
  let currentDate = moment(loan.d_next_payment_date);
  const maturityDate = moment(loan.d_maturity_date);

  if (!currentDate.isValid() || !maturityDate.isValid()) {
    throw new Error('Invalid date values in loan data');
  }

  const paymentInterval = getPaymentInterval(loan.v_amrt_term_unit, loan.v_day_count_ind);
  if (paymentInterval.asDays() === 0) throw new Error('Invalid payment interval');

  let cashflowBucket = 1;
  const cashflows = [];

  if (paymentScheduleRows.length > 0) {
    for (const schedule of paymentScheduleRows) {
      const principalPayment = schedule.n_principal_payment_amt || 0;
      const interestPayment = calculateInterestPayment(
        balance,
        loan.n_curr_interest_rate,
        loan.v_day_count_ind,
        currentDate,
        moment(schedule.d_payment_date)
      );
      const totalPayment = principalPayment + interestPayment;
      if (cashflowBucket < paymentScheduleRows.length || balance - principalPayment >= 0) {
        balance -= principalPayment;
      }
      cashflows.push({
        fic_mis_date: loan.fic_mis_date,
        v_account_number: loan.v_account_number,
        n_cashflow_bucket: cashflowBucket,
        d_cashflow_date: moment(schedule.d_payment_date).format('YYYY-MM-DD'),
        n_principal_component: principalPayment,
        n_interest_component: interestPayment,
        n_total_component: totalPayment,
        n_closing_balance: balance
      });
      currentDate = moment(schedule.d_payment_date);
      cashflowBucket += 1;
    }
  } else {
    const totalPeriods = Math.ceil(maturityDate.diff(currentDate, 'days') / paymentInterval.asDays());
    const fixedPrincipalPayment = startingBalance / totalPeriods;
    while (currentDate.isSameOrBefore(maturityDate)) {
      const nextPaymentDate = moment(currentDate).add(paymentInterval);
      const interestPayment = calculateInterestPayment(
        balance,
        loan.n_curr_interest_rate,
        loan.v_day_count_ind,
        currentDate,
        nextPaymentDate
      );
      let principalPayment = currentDate.isSame(maturityDate) ? balance : fixedPrincipalPayment;
      const totalPayment = principalPayment + interestPayment;
      if (balance - principalPayment >= 0 || currentDate.isSame(maturityDate)) {
        balance -= principalPayment;
      }
      cashflows.push({
        fic_mis_date: loan.fic_mis_date,
        v_account_number: loan.v_account_number,
        n_cashflow_bucket: cashflowBucket,
        d_cashflow_date: currentDate.format('YYYY-MM-DD'),
        n_principal_component: principalPayment,
        n_interest_component: interestPayment,
        n_total_component: totalPayment,
        n_closing_balance: balance
      });
      currentDate = nextPaymentDate;
      cashflowBucket += 1;
    }
  }

  await createBulkCashFlows(connection, cashflows);
};

// New controller: calculate cashflows for all accounts for a fic_mis_date
const calculateCashFlowsForDate = async (req, res) => {
  const connection = await getConnection();
  const { fic_mis_date } = req.body;

  if (!fic_mis_date) {
    return res.status(400).json({ success: false, message: 'Missing fic_mis_date' });
  }

  try {
    const [loans] = await connection.query(
      'SELECT * FROM ldn_financial_instrument WHERE fic_mis_date = ?',
      [fic_mis_date]
    );

    if (!loans.length) {
      return res.status(404).json({ success: false, message: 'No loans found for this date' });
    }

    const interestMethod = await getInterestMethod(connection);
    
    // Import p-limit dynamically
    const pLimitModule = await import('p-limit');
    const limit = pLimitModule.default(10); // Limit concurrency to 10

    let processed = 0;
    const errors = [];

    const tasks = loans.map(loan =>
      limit(async () => {
        try {
          await calculateCashFlowsForLoanObject(connection, loan, interestMethod);
          processed++;
        } catch (err) {
          errors.push({ account: loan.v_account_number, error: err.message });
        }
      })
    );

    await Promise.all(tasks);

    return res.json({
      success: true,
      message: `Processed ${processed} accounts for ${fic_mis_date}`,
      errors
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};
// (Keep original calculateCashFlowsForLoan for single-account use)
const calculateCashFlowsForLoan = async (req, res) => {
  const connection = await getConnection();
  const { fic_mis_date, v_account_number } = req.body;

  try {
    // Input validation
    if (!fic_mis_date || !v_account_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fic_mis_date and v_account_number'
      });
    }

    // First check if loan exists
    const [loans] = await connection.query(
      'SELECT * FROM ldn_financial_instrument WHERE fic_mis_date = ? AND v_account_number = ?',
      [fic_mis_date, v_account_number]
    );
      console.log(loans);
    if (!loans.length) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const loan = loans[0];

    // Validate required loan data
    if (!loan.d_next_payment_date || !loan.d_maturity_date) {
      return res.status(400).json({
        success: false,
        message: 'Invalid loan data: missing payment dates'
      });
    }

    // Delete existing cashflows for this loan before calculating new ones
    await connection.query(
      'DELETE FROM FSI_Expected_Cashflow WHERE fic_mis_date = ? AND v_account_number = ?',
      [fic_mis_date, v_account_number]
    );

    // Set a reasonable timeout for the calculation
    const calculationTimeout = setTimeout(() => {
      throw new Error('Calculation timeout exceeded');
    }, 30000); // 30 seconds timeout

    // Fetch the payment schedule
    const [paymentScheduleRows] = await connection.query(`
      SELECT * FROM Ldn_Payment_Schedule 
      WHERE v_account_number = ? AND fic_mis_date = ? 
      ORDER BY d_payment_date
      LIMIT 1000`, // Added limit for safety
      [loan.v_account_number, loan.fic_mis_date]
    );

    let balance = loan.n_eop_bal || 0;
    const startingBalance = balance;
    let currentDate = moment(loan.d_next_payment_date);
    const maturityDate = moment(loan.d_maturity_date);

    // Validate dates
    if (!currentDate.isValid() || !maturityDate.isValid()) {
      clearTimeout(calculationTimeout);
      return res.status(400).json({
        success: false,
        message: 'Invalid date values in loan data'
      });
    }

    const fixedInterestRate = loan.n_curr_interest_rate || 0;
    const withholdingTax = loan.n_wht_percent || 0;
    const managementFeeRate = loan.v_management_fee_rate || 0;
    const v_amrt_term_unit = loan.v_amrt_term_unit;
    const repaymentType = loan.v_amrt_repayment_type;
    const v_day_count_ind = loan.v_day_count_ind;

    const interestMethod = await getInterestMethod(connection);
    const paymentInterval = getPaymentInterval(v_amrt_term_unit, v_day_count_ind);

    if (paymentInterval.asDays() === 0) {
      throw new Error('Invalid payment interval: days cannot be zero');
    }

    let periods = Math.floor(moment(loan.d_maturity_date).diff(currentDate, 'days') / paymentInterval.asDays()) + 1;
    if (periods <= 0) {
      throw new Error("Invalid periods calculation: 'periods' must be greater than zero");
    }

    let cashflowBucket = 1;

    if (paymentScheduleRows.length > 0) {
      // Using payment schedule
      for (const schedule of paymentScheduleRows) {
        const principalPayment = schedule.n_principal_payment_amt || 0;
        const interestPayment = calculateInterestPayment(
          balance,
          loan.n_curr_interest_rate,
          loan.v_day_count_ind,
          currentDate,
          moment(schedule.d_payment_date)
        );
        
        const totalPayment = principalPayment + interestPayment;
        
        // Don't allow negative balance except for the last payment
        if (cashflowBucket < paymentScheduleRows.length || balance - principalPayment >= 0) {
        balance -= principalPayment;
        }

        await createCashFlow(
          connection,
          loan,
          cashflowBucket,
          moment(schedule.d_payment_date).format('YYYY-MM-DD'),
          principalPayment,
          interestPayment,
          totalPayment,
          balance
        );

        currentDate = moment(schedule.d_payment_date);
        cashflowBucket += 1;
      }
    } else {
      // Manual calculation
      const totalPeriods = Math.ceil(maturityDate.diff(currentDate, 'days') / paymentInterval.asDays());
      const fixedPrincipalPayment = startingBalance / totalPeriods;

      while (currentDate.isSameOrBefore(maturityDate)) {
        const nextPaymentDate = moment(currentDate).add(paymentInterval);
        const interestPayment = calculateInterestPayment(
          balance,
          loan.n_curr_interest_rate,
          loan.v_day_count_ind,
          currentDate,
          nextPaymentDate
        );

        let principalPayment = 0;
        if (currentDate.isSame(maturityDate)) {
          principalPayment = balance; // Pay remaining balance on maturity
        } else {
          principalPayment = fixedPrincipalPayment;
        }

        const totalPayment = principalPayment + interestPayment;

        if (balance - principalPayment >= 0 || currentDate.isSame(maturityDate)) {
        balance -= principalPayment;
        }

        await createCashFlow(
          connection,
          loan,
          cashflowBucket,
          currentDate.format('YYYY-MM-DD'),
          principalPayment,
          interestPayment,
          totalPayment,
          balance
        );

        currentDate = nextPaymentDate;
        cashflowBucket += 1;
      }
    }

    clearTimeout(calculationTimeout);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Cashflow projections calculated successfully',
      data: {
        account_number: v_account_number,
        mis_date: fic_mis_date,
        total_cashflows: cashflowBucket - 1
      }
    });

  } catch (err) {
    console.error('Cashflow calculation error:', err);
    return res.status(500).json({
      success: false,
      message: `Error calculating cashflows: ${err.message}`,
      details: {
        account_number: v_account_number,
        mis_date: fic_mis_date
      }
    });
  } finally {
    connection.release();
  }
};

const getInterestMethod = async (connection) => {
  const [rows] = await connection.query('SELECT * FROM Fsi_Interest_Method LIMIT 1');
  return rows.length > 0 ? rows[0] : { v_interest_method: 'Amortized' };
};

// Modify the createCashFlow function to include accrued interest and cash flow type
const createCashFlow = async (
  connection,
  loan,
  cashflowBucket,
  cashflowDate,
  principalPayment,
  interestPayment,
  totalPayment,
  closingBalance
) => {
  // Use the same cleanNumber utility as above
  const cleanedPrincipal = cleanNumber(principalPayment);
  const cleanedInterest = cleanNumber(interestPayment);
  const cleanedTotal = cleanNumber(cleanedPrincipal + cleanedInterest);
  const cleanedBalance = cleanNumber(closingBalance);
  
  // Calculate accrued interest - FIXED CALCULATION
  let accruedInterest = 0;
  
  // For the first payment, use the loan start date or next payment date
  if (cashflowBucket === 1) {
    const startDate = loan.d_start_date || loan.d_next_payment_date;
    if (startDate) {
      const daysSinceStart = moment(cashflowDate).diff(moment(startDate), 'days');
      const dayCountFactor = loan.v_day_count_ind === '30/360' ? 360 : 365;
      accruedInterest = cleanedBalance * (loan.n_curr_interest_rate / 100) * (daysSinceStart / dayCountFactor);
    }
  } else {
    // For subsequent payments, use the previous payment date
    const previousPaymentDate = moment(cashflowDate).subtract(getPaymentInterval(loan.v_amrt_term_unit, loan.v_day_count_ind));
    const daysSinceLastPayment = moment(cashflowDate).diff(previousPaymentDate, 'days');
    const dayCountFactor = loan.v_day_count_ind === '30/360' ? 360 : 365;
    accruedInterest = cleanedBalance * (loan.n_curr_interest_rate / 100) * (daysSinceLastPayment / dayCountFactor);
  }
  
  const cleanedAccruedInterest = cleanNumber(accruedInterest);
  console.log(`Accrued interest for bucket ${cashflowBucket}: ${cleanedAccruedInterest}`);

  // Check if the n_accrued_interest column exists in the table
  try {
    await connection.query(`
      INSERT INTO FSI_Expected_Cashflow (
        fic_mis_date,
        v_account_number,
        n_cashflow_bucket,
        d_cashflow_date,
        n_principal_component,
        n_interest_component,
        n_total_component,
        n_closing_balance,
        n_accrued_interest,
        v_cash_flow_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loan.fic_mis_date,
        loan.v_account_number,
        cashflowBucket,
        cashflowDate,
        cleanedPrincipal,
        cleanedInterest,
        cleanedTotal,
        cleanedBalance,
        cleanedAccruedInterest,
        'M' // Mixed cash flow type
      ]
    );
  } catch (error) {
    // If the column doesn't exist, try without it
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('n_accrued_interest column not found, adding it to the table');
      try {
        // Add the column to the table
        await connection.query(`
          ALTER TABLE FSI_Expected_Cashflow 
          ADD COLUMN n_accrued_interest DECIMAL(18,2) DEFAULT 0.00,
          ADD COLUMN v_cash_flow_type VARCHAR(10) DEFAULT 'M'
        `);
        
        // Try the insert again
        await connection.query(`
          INSERT INTO FSI_Expected_Cashflow (
            fic_mis_date,
            v_account_number,
            n_cashflow_bucket,
            d_cashflow_date,
            n_principal_component,
            n_interest_component,
            n_total_component,
            n_closing_balance,
            n_accrued_interest,
            v_cash_flow_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loan.fic_mis_date,
            loan.v_account_number,
            cashflowBucket,
            cashflowDate,
            cleanedPrincipal,
            cleanedInterest,
            cleanedTotal,
            cleanedBalance,
            cleanedAccruedInterest,
            'M' // Mixed cash flow type
          ]
        );
      } catch (alterError) {
        console.error('Error altering table:', alterError);
        // Fall back to insert without the new columns
        await connection.query(`
          INSERT INTO FSI_Expected_Cashflow (
            fic_mis_date,
            v_account_number,
            n_cashflow_bucket,
            d_cashflow_date,
            n_principal_component,
            n_interest_component,
            n_total_component,
            n_closing_balance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loan.fic_mis_date,
            loan.v_account_number,
            cashflowBucket,
            cashflowDate,
            cleanedPrincipal,
            cleanedInterest,
            cleanedTotal,
            cleanedBalance
          ]
        );
      }
    } else {
      throw error;
    }
  }
};

const calculateManagementFee = (loan, currentDate, balance, managementFeeRate, withholdingTax) => {
  const managementFeeDay = loan.d_start_date.getDate();
  const managementFeeMonth = loan.d_start_date.getMonth();
  const managementFeeDate = new Date(currentDate.year(), managementFeeMonth, managementFeeDay);

  let managementFeeNet = 0;
  if (moment(currentDate).isSame(managementFeeDate, 'month') && moment(currentDate).isSame(managementFeeDate, 'year')) {
    managementFeeNet = balance * managementFeeRate;
    const whtManagementFee = managementFeeNet * withholdingTax;
    managementFeeNet -= whtManagementFee;
  }

  return managementFeeNet;
};

// Add this helper function for interest calculation
const calculateInterestPayment = (balance, interestRate, dayCountInd, startDate, endDate) => {
  const dayCountFactor = dayCountInd === '30/360' ? 360 : 365;
  const days = endDate.diff(startDate, 'days');
  return balance * (interestRate / 100) * (days / dayCountFactor);
};

const getCashFlows = async (req, res) => {
  const connection = await getConnection();
  try {
    const { fic_mis_date, v_account_number } = req.query;

    // Input validation
    if (!fic_mis_date || !v_account_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: fic_mis_date and v_account_number'
      });
    }

    // First get loan details
    const [loans] = await connection.query(
      'SELECT * FROM ldn_financial_instrument WHERE fic_mis_date = ? AND v_account_number = ?',
      [fic_mis_date, v_account_number]
    );

    if (!loans.length) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Get cashflows
    const [cashflows] = await connection.query(`
      SELECT 
        fic_mis_date,
        v_account_number,
        n_cashflow_bucket as n_cash_flow_bucket,
        DATE_FORMAT(d_cashflow_date, '%Y-%m-%d') as d_cash_flow_date,
        ROUND(n_principal_component, 2) as n_principal_payment,
        ROUND(n_interest_component, 2) as n_interest_payment,
        ROUND(n_total_component, 2) as n_cash_flow_amount,
        ROUND(n_closing_balance, 2) as n_balance,
        ROUND(n_accrued_interest, 2) as n_accrued_interest,
        COALESCE(v_cash_flow_type, 'M') as v_cash_flow_type,
        COALESCE(v_ccy_code, 'USD') as v_ccy_code
      FROM FSI_Expected_Cashflow 
      WHERE fic_mis_date = ? 
      AND v_account_number = ?
      ORDER BY n_cashflow_bucket
    `, [fic_mis_date, v_account_number]);

    if (!cashflows.length) {
      return res.status(404).json({
        success: false,
        message: 'No cashflows found for this loan'
      });
    }

    // Calculate summary
    const summary = {
      total_cashflows: cashflows.length,
      total_principal: cashflows.reduce((sum, cf) => sum + Number(cf.n_principal_payment), 0),
      total_interest: cashflows.reduce((sum, cf) => sum + Number(cf.n_interest_payment), 0),
      total_amount: cashflows.reduce((sum, cf) => sum + Number(cf.n_cash_flow_amount), 0),
      total_accrued_interest: cashflows.reduce((sum, cf) => sum + Number(cf.n_accrued_interest), 0),
      currency: cashflows[0].v_ccy_code,
      start_date: cashflows[0].d_cash_flow_date,
      end_date: cashflows[cashflows.length - 1].d_cash_flow_date
    };

    return res.json({
      success: true,
      data: {
        loan: {
          fic_mis_date,
          v_account_number,
          currency: loans[0].v_ccy_code,
          loan_amount: loans[0].n_eop_bal
        },
        summary,
        cashflows
      }
    });

  } catch (error) {
    console.error('Error fetching cashflows:', error);
    return res.status(500).json({
      success: false,
      message: `Error fetching cashflows: ${error.message}`
    });
  } finally {
    connection.release();
  }
};

module.exports = { 
  calculateCashFlowsForLoan,
  calculateCashFlowsForDate,
  getCashFlows,
  getPaymentInterval,
  calculateCashFlowsForLoanObject,
  getIntervalFor30_360,
  getIntervalFor30_365 
};
