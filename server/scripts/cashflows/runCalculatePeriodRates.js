const { calculateDiscountFactors } = require('../../controllers/cashflow projections/Period_Discount_Rates');

async function run() {
  const fic_mis_date = process.argv[2];
  if (!fic_mis_date) {
    console.error('Usage: node runCalculatePeriodRates.js <fic_mis_date>');
    process.exit(1);
  }
  console.log('Starting calculation of period discount rates for', fic_mis_date);

  // Indicate still processing every 5 seconds
  let stillProcessing = true;
  const interval = setInterval(() => {
    if (stillProcessing) {
      console.log('Still processing...');
    }
  }, 5000);

  const result = await calculateDiscountFactors(fic_mis_date);
  stillProcessing = false;
  clearInterval(interval);

  if (result === 1) {
    console.log('Period discount rate calculation successful.');
    process.exit(0)
  } else {
    console.error('Period discount rate calculation failed.');
  }
  console.log('Process finished.');
  process.exit(0);
}

run();
