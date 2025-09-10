const { getConnection } = require('../../config/database');
const { calculateCashFlowsForLoanObject } = require('../../controllers/cashflow projections/ExpectedCashflowProjection');
const moment = require('moment');

async function run(fic_mis_date) {
  console.time('Execution Time');
  const connection = await getConnection();
  try {
    if (!fic_mis_date) {
      throw new Error('fic_mis_date argument required (YYYY-MM-DD)');
    }

    const [loans] = await connection.query(
      'SELECT * FROM ldn_financial_instrument WHERE fic_mis_date = ?',
      [fic_mis_date]
    );

    if (!loans.length) {
      console.log(`No loans found for date ${fic_mis_date}`);
      return;
    }

    let processed = 0;
    let errors = [];

    for (const loan of loans) {
      try {
        await calculateCashFlowsForLoanObject(connection, loan);
        processed++;
        console.log(`Processed cashflows for account: ${loan.v_account_number}`);
      } catch (err) {
        errors.push({ account: loan.v_account_number, error: err.message });
        console.error(`Error processing account ${loan.v_account_number}: ${err.message}`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`Processed ${processed} accounts for ${fic_mis_date}`);

    if (errors.length) {
      console.log('Errors:');
      errors.forEach(e => console.log(`${e.account}: ${e.error}`));
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    connection.release();
    console.timeEnd('Execution Time');
    process.exit(0);
  }
}

// Usage: node runCalculateExpectedCashflows.js 2025-04-22
const fic_mis_date = process.argv[2];
run(fic_mis_date);
