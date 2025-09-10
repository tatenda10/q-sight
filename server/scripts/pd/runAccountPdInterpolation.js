const { pdInterpolationAccountLevel } = require('../../controllers/ecl computations/pd computations/Pd_Interpolation');

async function run() {
  const mis_date = process.argv[2];
  if (!mis_date) {
    console.error('Usage: node runAccountPdInterpolation.js <mis_date>');
    process.exit(1);
  }
  console.log('Starting account-level PD interpolation for', mis_date);

  // Indicate still processing every 5 seconds
  let stillProcessing = true;
  const interval = setInterval(() => {
    if (stillProcessing) {
      console.log('Still processing...');
    }
  }, 5000);

  const result = await pdInterpolationAccountLevel(mis_date);
  stillProcessing = false;
  clearInterval(interval);

  if (result === '1') {
    console.log('Account-level PD interpolation successful.');
  } else {
    console.error('Account-level PD interpolation failed.');
  }
  console.log('Process finished.');
  process.exit(0);
}

run();
