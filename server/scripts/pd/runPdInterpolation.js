const { performInterpolation } = require('../../controllers/ecl computations/pd computations/Interpolation');

async function runPdInterpolation(misDate) {
    try {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(misDate)) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
        }

        console.log(`Starting PD interpolation for date: ${misDate}`);

        const result = await performInterpolation(misDate);

        if (result === '1') {
            console.log('PD interpolation completed successfully');
        } else {
            console.log('PD interpolation failed');
        }

        return result;
    } catch (error) {
        console.error('Error during PD interpolation:', error.message);
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

    runPdInterpolation(misDate)
        .then(result => {
            console.log(`Execution completed with status: ${result}`);
            process.exit(result === '1' ? 0 : 1);
        })
        .catch(error => {
            console.error('Execution failed:', error);
            process.exit(1);
        });
}

module.exports = runPdInterpolation; 