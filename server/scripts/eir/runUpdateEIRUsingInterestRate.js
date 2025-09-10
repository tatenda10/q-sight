const { updateEIRUsingInterestRate } = require('../../controllers/ecl computations/eir/update_eir_using_interest_rate');

const runUpdateEIRUsingInterestRate = async (ficMisDate) => {
    console.log(`Running updateEIRUsingInterestRate for fic_mis_date: ${ficMisDate}`);
    const result = await updateEIRUsingInterestRate(ficMisDate);
    if (result === 1) {
        console.log('EIR update completed successfully.');
        process.exit(0); // Ensures the script exits on success
    } else {
        console.log('EIR update failed.');
        process.exit(1); // Ensures the script exits on failure
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
runUpdateEIRUsingInterestRate(ficMisDate);
