const { updateStageDetermination } = require('../../controllers/ecl computations/stgae determination/UpdateStageDetermination');

async function runUpdateStageDetermination(misDate) {
    const startTime = process.hrtime();
    console.log('Starting Stage Determination Update process...');

    try {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(misDate)) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
        }

        console.log(`Processing Stage Determination Update for date: ${misDate}`);

        const result = await updateStageDetermination(misDate);

        if (result === '1') {
            console.log('Stage Determination Update completed successfully');
        } else {
            console.log('Stage Determination Update failed');
        }

        // Calculate and log total execution time
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const totalMilliseconds = (seconds * 1000) + (nanoseconds / 1000000);
        console.log(`Total execution time: ${totalMilliseconds.toFixed(2)}ms`);

        return result;

    } catch (error) {
        console.error('Error during Stage Determination Update:', error.message);
        throw error;
    }
}

// If running directly from command line
if (require.main === module) {
    const misDate = process.argv[2];
    if (!misDate) {
        console.error('Please provide a date in YYYY-MM-DD format');
        process.exit(1);
    }

    runUpdateStageDetermination(misDate)
        .then(result => {
            console.log(`Execution completed with status: ${result}`);
            process.exit(result === '1' ? 0 : 1);
        })
        .catch(error => {
            console.error('Execution failed:', error);
            process.exit(1);
        });
}

module.exports = runUpdateStageDetermination;
