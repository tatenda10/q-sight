// runPopulateCashflows.js

const { insertCashFlowData } = require('../../controllers/cashflow projections/InsertCashflows');

async function run() { 
  const fic_mis_date = process.argv[2];
  if (!fic_mis_date) {
    console.error('Usage: node runPopulateCashflows.js <fic_mis_date>');
    process.exit(1);
  }
  console.log('Starting cashflow population for', fic_mis_date);

  // Indicate still processing every 5 seconds
  let stillProcessing = true;
  const interval = setInterval(() => {
    if (stillProcessing) {
      console.log('Still processing...');
    }
  }, 5000);

  const result = await insertCashFlowData(fic_mis_date);
  stillProcessing = false;
  clearInterval(interval);

  if (result === '1') {
    console.log('Cashflow population successful.');
    process.exit(0)
  } else {
    console.error('Cashflow population failed.');
  }
  console.log('Process finished.');
  process.exit(0);
}

run();