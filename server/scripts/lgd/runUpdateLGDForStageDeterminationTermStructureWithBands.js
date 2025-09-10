const { updateLGDForStageDeterminationTermStructureWithBands } = require('../../controllers/ecl computations/lgd/calculate_lgd');

const runUpdateLGDForStageDeterminationTermStructureWithBands = async (ficMisDate) => {
    console.log(`Running updateLGDForStageDeterminationTermStructureWithBands for fic_mis_date: ${ficMisDate}`);
    const result = await updateLGDForStageDeterminationTermStructureWithBands(ficMisDate);
    if (result === 1) {
        console.log('LGD update for term structure with bands completed successfully.');
        process.exit(0); // Ensures the script exits on success
    } else {
        console.log('LGD update for term structure with bands failed.');
        process.exit(1); // Ensures the script exits on failure
    }
};

// Get the date from command-line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Please provide the fic_mis_date as an argument in the format YYYY-MM-DD.');
    process.exit(1);
}

const misDate = args[0];

// Run the script
runUpdateLGDForStageDeterminationTermStructureWithBands(misDate);
