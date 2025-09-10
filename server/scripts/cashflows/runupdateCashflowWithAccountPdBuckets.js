const { updateCashflowWithAccountPdBuckets } = require('../../controllers/cashflow projections/UpdateCashflowwithPdBuckets');

async function run() {
  const fic_mis_date = process.argv[2];
  if (!fic_mis_date) {
    console.error('Usage: node runupdateCashflowWithAccountPdBuckets.js <fic_mis_date>');
    process.exit(1);
  }
  console.log('Starting update of cashflow with account PD buckets for', fic_mis_date);

  // Indicate still processing every 5 seconds
  let stillProcessing = true;
  const interval = setInterval(() => {
    if (stillProcessing) {
      console.log('Still processing...');
    }
  }, 5000);

  const result = await updateCashflowWithAccountPdBuckets(fic_mis_date);
  stillProcessing = false;
  clearInterval(interval);

  if (result === 1) {
    console.log('Cashflow with account PD buckets update successful.');
  } else {
    console.error('Cashflow with account PD buckets update failed.');
  }
  console.log('Process finished.');
  process.exit(0);
}

run();
