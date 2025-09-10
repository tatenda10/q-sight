const { updateStageDeterminationEADWithACCR } = require('../../controllers/ecl computations/stgae determination/update_stage_determination_EAD_w_ACCR');

const runUpdateStageDeterminationEADWithACCR = async (ficMisDate) => {
    console.log(`Running updateStageDeterminationEADWithACCR for fic_mis_date: ${ficMisDate}`);
    const result = await updateStageDeterminationEADWithACCR(ficMisDate);
    if (result === 1) {
        console.log('Update completed successfully.');
        process.exit(0); // Ensure the process exits successfully
    } else {
        console.log('Update failed.');
        process.exit(1); // Exit with error
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
runUpdateStageDeterminationEADWithACCR(ficMisDate);