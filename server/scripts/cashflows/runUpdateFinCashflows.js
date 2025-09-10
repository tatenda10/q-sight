const { updateFinancialCashFlow } = require('../../controllers/cashflow projections/UpdateFinancialCashflows');

async function run() {
  const fic_mis_date = process.argv[2];
  if (!fic_mis_date) {
    console.error('Usage: node runUpdateFinCashflows.js <fic_mis_date>');
    process.exit(1);
  }
  console.log('Starting update of financial cashflows for', fic_mis_date);

  // Indicate still processing every 5 seconds
  let stillProcessing = true;
  const interval = setInterval(() => {
    if (stillProcessing) {
      console.log('Still processing...');
    }
  }, 5000);

  const result = await updateFinancialCashFlow(fic_mis_date);
  stillProcessing = false;
  clearInterval(interval);

  if (result === '1') {
    console.log('Financial cashflow update successful.');
  } else {
    console.error('Financial cashflow update failed.');
  }
  console.log('Process finished.');
  process.exit(0);
}

run();
