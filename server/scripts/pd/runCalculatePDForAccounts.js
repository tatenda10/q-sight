const { calculatePDForAccounts } = require('../../controllers/ecl computations/pd computations/assign_acc_pd_term_level');

const runCalculatePDForAccounts = async (ficMisDate) => {
    console.log(`Running calculatePDForAccounts for fic_mis_date: ${ficMisDate}`);
    const result = await calculatePDForAccounts(ficMisDate);
    if (result === 1) {
        console.log('PD calculation completed successfully.');
        process.exit(0); // Ensure the script exits on success
    } else {
        console.log('PD calculation failed.');
        process.exit(1); // Ensure the script exits on failure
    }
};

// Get the date from command-line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Please provide the fic_mis_date as an argument in the format YYYY-MM-DD.');
    process.exit(1);
}

const ficMisDate = args[0];

// Run the script
runCalculatePDForAccounts(ficMisDate);