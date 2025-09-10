const { populateFctReportingLines } = require('../../controllers/ecl computations/ecl/populateecl');

async function run() {
  const args = process.argv.slice(2);
 

  const [ficMisDate] = args;
  const eclMethod = 'simple_ead';

  try {
    console.log(`Starting ECL population for fic_mis_date=${ficMisDate} using ECL method=${eclMethod}...`);
    const result = await populateFctReportingLines(ficMisDate, eclMethod);
    
    if (result === '1') {
      console.log(`Successfully populated FCT_Reporting_Lines for fic_mis_date=${ficMisDate} using ECL method=${eclMethod}.`);
      process.exit(0);
    } else {
      console.error(`Failed to populate FCT_Reporting_Lines for fic_mis_date=${ficMisDate}.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error running populateFctReportingLines: ${error.message}`);
    process.exit(1);
  }
}

run();