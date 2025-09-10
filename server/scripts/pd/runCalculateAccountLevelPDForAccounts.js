const { calculateAccountLevelPDForAccounts } = require('../../controllers/ecl computations/pd computations/assign_acc_pd_level');

const runCalculateAccountLevelPDForAccounts = async (ficMisDate) => {
    console.log(`Running calculateAccountLevelPDForAccounts for fic_mis_date: ${ficMisDate}`);
    const result = await calculateAccountLevelPDForAccounts(ficMisDate);
    if (result === 1) {
        console.log('Account-level PD calculation completed successfully.');
    } else {
        console.log('Account-level PD calculation failed.');
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
runCalculateAccountLevelPDForAccounts(ficMisDate);