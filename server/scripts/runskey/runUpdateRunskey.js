const { updateRunskey } = require('../../controllers/ecl computations/runskey/Runskey');

// Get fic_mis_date from command line arguments
const fic_mis_date = process.argv[2];

if (!fic_mis_date) {
  console.error('Usage: node runUpdateRunskey.js <fic_mis_date>');
  process.exit(1);
}

(async () => {
  try {
    await updateRunskey(fic_mis_date);
    console.log(`Runskey updated successfully for fic_mis_date: ${fic_mis_date}`);
    process.exit(0); // <--- Add this line
  } catch (error) {
    console.error('Error running updateRunskey:', error);
    process.exit(1);
  }
})(); 