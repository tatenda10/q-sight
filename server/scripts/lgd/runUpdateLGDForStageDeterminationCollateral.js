const { updateLGDForStageDeterminationCollateral } = require('../../controllers/ecl computations/lgd/calculate_lgd');

const runUpdateLGDForStageDeterminationCollateral = async (misDate) => {
    console.log(`Running updateLGDForStageDeterminationCollateral for fic_mis_date: ${misDate}`);
    const result = await updateLGDForStageDeterminationCollateral(misDate);
    if (result === 1) {
        console.log('LGD update for collateral completed successfully.');
    } else {
        console.log('LGD update for collateral failed.');
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
runUpdateLGDForStageDeterminationCollateral(misDate);
