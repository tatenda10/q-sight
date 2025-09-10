/**
 * Script to run ECL calculations
 * 
 * This script can be executed from the command line to run ECL calculations
 * for a specific date and optionally with a specific method.
 * 
 * Usage:
 *   node runCalculateecl.js [date] [method]
 * 
 * Examples:
 *   node runCalculateecl.js 2023-12-31
 *   node runCalculateecl.js 2023-12-31 forward_exposure
 *   node runCalculateecl.js 2023-12-31 cash_flow
 *   node runCalculateecl.js 2023-12-31 simple_ead
 */

const { calculateEclBasedOnMethod } = require('../../controllers/ecl computations/ecl/Calculateecl');

// Get command line arguments
const args = process.argv.slice(2);
const fic_mis_date = args[0];
const method_name =  'simple_ead';

// Validate input
if (!fic_mis_date) {
  console.error('Error: Missing required parameter: date');
  console.log('Usage: node runCalculateecl.js [date] [method]');
  console.log('Examples:');
  console.log('  node runCalculateecl.js 2023-12-31');
  console.log('  node runCalculateecl.js 2023-12-31 forward_exposure');
  process.exit(1);
}

// Validate date format (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(fic_mis_date)) {
  console.error(`Error: Invalid date format: ${fic_mis_date}`);
  console.log('Date must be in YYYY-MM-DD format (e.g., 2023-12-31)');
  process.exit(1);
}

// Validate method if provided
const validMethods = ['forward_exposure', 'cash_flow', 'simple_ead'];
if (method_name && !validMethods.includes(method_name)) {
  console.error(`Error: Invalid method: ${method_name}`);
  console.log('Valid methods are: forward_exposure, cash_flow, simple_ead');
  process.exit(1);
}

// Run the ECL calculation
async function runEclCalculation() {
  console.log(`Starting ECL calculation for date: ${fic_mis_date}${method_name ? `, method: ${method_name}` : ''}`);
  
  try {
    const result = await calculateEclBasedOnMethod(fic_mis_date, method_name);
    
    if (result === '1') {
      console.log('ECL calculation completed successfully.');
      process.exit(0)
    } else {
      console.error('ECL calculation failed.');


      process.exit(1);
    }
  } catch (error) {
    console.error(`Error running ECL calculation: ${error.message}`);
    process.exit(1);
  }
}

// Execute the calculation
runEclCalculation();
