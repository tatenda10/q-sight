const { pd_term_structure } = require('../../controllers/ecl computations/pd computations/Pd_term_structure');

// Get fic_mis_date from command line arguments
const fic_mis_date = process.argv[2];

if (!fic_mis_date) {
  console.error('Usage: node runPdTermStructure.js <fic_mis_date>');
  process.exit(1);
}

(async () => {
  try {
    await pd_term_structure(fic_mis_date);
    console.log(`pd_term_structure updated successfully for fic_mis_date: ${fic_mis_date}`);
    process.exit(0); // <--- Add this line
  } catch (error) {
    console.error('Error running pd_term_structure:', error);
    process.exit(1);
  }
})();