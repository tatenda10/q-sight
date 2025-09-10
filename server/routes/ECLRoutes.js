const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../config/database');
const router = express.Router();

/**
 * ECL (Expected Credit Loss) Calculation Process
 * 
 * This module defines the sequence and descriptions of scripts executed during the ECL calculation process.
 * The process follows IFRS 9 requirements and includes multiple stages from PD calculation through to final ECL values.
 * 
 * Process Flow:
 * 1. PD (Probability of Default) Calculations
 *    - Generate term structure matrices
 *    - Perform interpolation for missing values
 *    - Calculate final PD values for each account
 * 
 * 2. Stage Determination
 *    - Update run keys for new calculation
 *    - Insert and update stage determination data
 *    - Process delinquency information
 *    - Calculate EAD (Exposure at Default) with accruals
 * 
 * 3. Supporting Calculations
 *    - Update Effective Interest Rates (EIR)
 *    - Generate LGD (Loss Given Default) term structure
 * 
 * 4. Final ECL Calculation
 *    - Populate EAD values
 *    - Calculate final ECL using PD, LGD, and EAD
 * 
 * @typedef {Object} ScriptDescription
 * @property {string} path - The relative path to the script file
 * @property {string} description - Human-readable description of the script's purpose
 */

/** @type {Object.<string, string>} */
const SCRIPT_DESCRIPTIONS = {
  // PD Calculation Phase
  '../scripts/pd/runPdTermStructure.js': 'Generating PD Term Structure - Creates probability matrices for different time periods',
  '../scripts/pd/runPdInterpolation.js': 'Running PD Interpolation - Fills gaps in PD term structure using statistical methods',
  
  // Run Management
  '../scripts/runskey/runUpdateRunskey.js': 'Updating Run Keys - Manages calculation iterations and versioning',
  
  // Stage Determination Phase
  '../scripts/stage_determination/runInsertStageDetermination.js': 'Inserting Stage Determination Data - Prepares base data for IFRS 9 staging',
  '../scripts/stage_determination/runUpdateStage.js': 'Updating Account Stages - Assigns IFRS 9 stages (1, 2, or 3) to accounts',
  '../scripts/stage_determination/runUpdateStageDetermination.js': 'Updating Stage Determination - Refines stage assignments based on criteria',
  '../scripts/stage_determination/runUpdateDelinquencyBandCode.js': 'Updating Delinquency Band Codes - Classifies accounts by days past due',
  '../scripts/stage_determination/runUpdateStageDeterminationEADWithACCR.js': 'Updating EAD with Accruals - Calculates exposure including accrued interest',
  
  // Risk Parameter Calculations
  '../scripts/eir/runUpdateEIRUsingInterestRate.js': 'Updating Effective Interest Rates - Calculates discounting rates for future cash flows',
  '../scripts/lgd/runUpdateLGDForStageDeterminationTermStructure.js': 'Updating LGD Term Structure - Estimates recovery rates over time',
  '../scripts/pd/runCalculatePDForAccounts.js': 'Calculating PD for Accounts - Assigns final PD values to individual accounts',
  
  // ECL Computation Phase
  '../scripts/ecl/runPopulateEclSimpleEad.js': 'Populating ECL with Simple EAD - Prepares exposure values for ECL calculation',
  '../scripts/ecl/runCalculateecl.js': 'Calculating Final ECL Values - Combines PD, LGD, and EAD to compute final provisions'
};

// Script execution order
const SCRIPT_ORDER = Object.keys(SCRIPT_DESCRIPTIONS);

// Log the script order
console.log('ECL Script Execution Order:');
SCRIPT_ORDER.forEach((script, index) => {
    console.log(`${index + 1}. ${script} - ${SCRIPT_DESCRIPTIONS[script]}`);
});

// Helper function to get latest run key from dim_run table
const getLatestRunKey = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        const [rows] = await connection.query(`
            SELECT MAX(latest_run_skey) AS max_run_skey 
            FROM dim_run;
        `);

        if (rows && rows.length > 0 && rows[0].max_run_skey !== null) {
            return rows[0].max_run_skey;
        }

        console.error("No run key available in dim_run table");
        return null;
    } catch (error) {
        console.error(`Error fetching run key: ${error.message}`);
        return null;
    } finally {
        if (connection) connection.release();
    }
};

// Helper to run a script and return a promise
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Starting script execution: ${scriptPath} with args:`, args);
    
    // Set options to include the cwd (current working directory)
    const options = {
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '../../') // Set to project root
    };
    
    console.log(`Running script with cwd: ${options.cwd}`);
    
    const child = spawn('node', [scriptPath, ...args], options);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { 
      stdout += data.toString(); 
      console.log(`[${scriptPath}] stdout:`, data.toString());
    });
    
    child.stderr.on('data', (data) => { 
      stderr += data.toString(); 
      console.error(`[${scriptPath}] stderr:`, data.toString());
    });
    
    child.on('close', (code) => {
      console.log(`Script completed: ${scriptPath} with code ${code}`);
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({ success: false, output: stderr.trim() || 'Script execution failed' });
      }
    });
    
    child.on('error', (err) => {
      console.error(`Script error: ${scriptPath}`, err);
      reject(err);
    });
  });
}

// Helper function to upsert an ECL run record
async function upsertEclRun(runKey, date, status, approved = false) {
  let connection;
  try {
    connection = await db.getConnection();
    const query = 'INSERT INTO ecl_runs (run_key, date, status, approved) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, approved = ?';
    await connection.execute(query, [runKey, date, status, approved, status, approved]);
  } catch (err) {
    console.error('Error upserting ECL run record:', err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// GET /api/ecl/run-simple-ead/stream - SSE endpoint
router.get('/run-simple-ead/stream', (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400).end();
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Function to send updates to client
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial update
  sendEvent({ 
    step: 'Initializing ECL calculation process', 
    status: 'Info',
    output: `Starting calculation for date: ${date}`
  });

  // Create tmp directory if it doesn't exist
  const tmpDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (err) {
      sendEvent({ 
        step: 'Creating temporary directory', 
        status: 'Error',
        output: err.message 
      });
      res.end();
      return;
    }
  }

  // Progress file path
  const progressPath = path.join(tmpDir, `ecl-progress-${date}.json`);

  // Function to run all scripts in sequence
  const runAllScripts = async () => {
    const results = [];
    
    // Run scripts in order
    for (const scriptPath of SCRIPT_ORDER) {
      const scriptDesc = SCRIPT_DESCRIPTIONS[scriptPath];
      
      // Notify client that script is starting
      sendEvent({ 
        step: scriptDesc, 
        status: 'Running' 
      });
      
      try {
        // Run the script
        const fullScriptPath = path.join(__dirname, scriptPath);
        const result = await runScript(fullScriptPath, [date]);
        
        // Add to results and save progress
        const scriptResult = { 
          script: scriptPath, 
          step: scriptDesc,
          status: result.success ? 'Success' : 'Failed',
          output: result.output
        };
        
        results.push(scriptResult);
        
        // Save progress to file
        fs.writeFileSync(progressPath, JSON.stringify({ 
          date,
          progress: results 
        }, null, 2));
        
        // Send update to client
        sendEvent(scriptResult);
        
        // If script failed, stop the process
        if (!result.success) {
          sendEvent({ 
            step: 'ECL calculation stopped due to error', 
            status: 'Error',
            output: `Failed at step: ${scriptDesc}`
          });
          res.end();
          return;
        }
      } catch (err) {
        // Handle any exceptions
        const errorResult = { 
          script: scriptPath,
          step: scriptDesc,
          status: 'Error',
          output: err.message
        };
        
        results.push(errorResult);
        
        // Save error progress
        fs.writeFileSync(progressPath, JSON.stringify({ 
          date,
          progress: results 
        }, null, 2));
        
        // Send error to client
        sendEvent(errorResult);
        sendEvent({ 
          step: 'ECL calculation failed', 
          status: 'Error',
          output: `Exception occurred: ${err.message}`
        });
        
        res.end();
        return;
      }
    }
    
    // All scripts completed successfully
    sendEvent({ 
      step: 'ECL calculation completed successfully', 
      status: 'Success',
      output: 'All calculations have been performed and results saved to the database.'
    });
    
    res.end();
  };

  // Start the process
  (async () => {
    const initialRunKey = await getLatestRunKey();
    if (!initialRunKey) {
        sendEvent({ 
            step: 'ECL calculation failed', 
            status: 'Error',
            output: 'Failed to get initial run key from dim_run table'
        });
        res.end();
        return;
    }
    await upsertEclRun(initialRunKey, date, 'Running', false);
    try {
      await runAllScripts();
      // Get the latest run key after all scripts have completed
      const finalRunKey = await getLatestRunKey();
      if (!finalRunKey) {
          throw new Error('Failed to get final run key after completion');
      }
      await upsertEclRun(finalRunKey, date, 'Success', false);
    } catch (err) {
      console.error('Unhandled error in ECL calculation:', err);
      sendEvent({ 
        step: 'ECL calculation failed', 
        status: 'Error',
        output: `Unexpected error: ${err.message}`
      });
      const errorRunKey = await getLatestRunKey();
      if (errorRunKey) {
          await upsertEclRun(errorRunKey, date, 'Failed', false);
      }
    }
  })();

  // Handle client disconnect
  req.on('close', () => {
    // Client disconnected, but we'll let the scripts continue running
    console.log('Client disconnected, but ECL calculation will continue');
  });
});

// GET /api/ecl/progress/:date - Endpoint to get current progress
router.get('/progress/:date', (req, res) => {
  const { date } = req.params;
  const progressPath = path.join(__dirname, `../../tmp/ecl-progress-${date}.json`);
  
  if (!fs.existsSync(progressPath)) {
    return res.json({ progress: [], message: 'No progress file found' });
  }
  
  try {
    const content = fs.readFileSync(progressPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read progress file', message: err.message });
  }
});

// POST /api/ecl/run-simple-ead - Non-streaming version for backwards compatibility
router.post('/run-simple-ead', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const results = [];
  const tmpDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const initialRunKey = await getLatestRunKey();
  if (!initialRunKey) {
    return res.status(500).json({ error: 'Failed to get initial run key from dim_run table' });
  }
  await upsertEclRun(initialRunKey, date, 'Running', false);

  for (const scriptPath of SCRIPT_ORDER) {
    console.log(`Running script: ${scriptPath}`);
    try {
      const fullScriptPath = path.join(__dirname, scriptPath);
      const result = await runScript(fullScriptPath, [date]);
      const scriptResult = { 
        script: scriptPath, 
        step: SCRIPT_DESCRIPTIONS[scriptPath],
        ...result 
      };
      
      results.push(scriptResult);
      
      // Save progress after each stage
      fs.writeFileSync(
        path.join(tmpDir, `ecl-progress-${date}.json`),
        JSON.stringify({ date, progress: results }, null, 2)
      );

      if (!result.success) {
        console.log('Script failed:', scriptPath);
        const errorRunKey = await getLatestRunKey();
        if (errorRunKey) {
          await upsertEclRun(errorRunKey, date, 'Failed', false);
        }
        return res.status(500).json({ 
          error: `Failed at ${SCRIPT_DESCRIPTIONS[scriptPath]}`, 
          results 
        });
      }
    } catch (err) {
      results.push({ 
        script: scriptPath, 
        step: SCRIPT_DESCRIPTIONS[scriptPath],
        success: false, 
        output: err.message 
      });
      
      fs.writeFileSync(
        path.join(tmpDir, `ecl-progress-${date}.json`),
        JSON.stringify({ date, progress: results }, null, 2)
      );
      
      const errorRunKey = await getLatestRunKey();
      if (errorRunKey) {
        await upsertEclRun(errorRunKey, date, 'Failed', false);
      }
      return res.status(500).json({ 
        error: `Exception at ${SCRIPT_DESCRIPTIONS[scriptPath]}`, 
        results 
      });
    }
  }

  console.log('All scripts completed');
  const finalRunKey = await getLatestRunKey();
  if (!finalRunKey) {
    return res.status(500).json({ error: 'Failed to get final run key after completion' });
  }
  await upsertEclRun(finalRunKey, date, 'Success', false);
  res.json({ success: true, results });
});

// POST /api/ecl/approve/:runKey - Endpoint to approve/unapprove an ECL run
router.post('/approve/:runKey', async (req, res) => {
  const { runKey } = req.params;
  const { approved } = req.body; // true or false
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (approved) {
      // First, get the date of the run we're trying to approve
      const [runDate] = await connection.execute(
        'SELECT DATE(date) as run_date FROM ecl_runs WHERE run_key = ?',
        [runKey]
      );

      if (runDate.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Run not found' 
        });
      }

      const date = runDate[0].run_date;

      // Unapprove any existing approved runs for this date
      await connection.execute(
        'UPDATE ecl_runs SET approved = 0 WHERE DATE(date) = DATE(?) AND run_key != ? AND approved = 1',
        [date, runKey]
      );
    }

    // Now approve/unapprove the specified run
    await connection.execute(
      'UPDATE ecl_runs SET approved = ? WHERE run_key = ?',
      [approved, runKey]
    );

    await connection.commit();
    res.json({ 
      success: true, 
      message: approved ? 
        'ECL run approved and other runs for the same date unapproved' : 
        'ECL run unapproved' 
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error updating ECL run approval status:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error updating ECL run approval status',
      error: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/ecl/runs/by-date/:date - Get run key for a specific date
router.get('/runs/by-date/:date', async (req, res) => {
  const { date } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `
      SELECT 
        run_key,
        DATE_FORMAT(date, '%Y-%m-%d') as date,
        status,
        approved
      FROM ecl_runs
      WHERE DATE(date) = DATE(?)
        AND approved = 1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [rows] = await connection.execute(query, [date]);
    
    // Log for debugging
    console.log('Run by date query result:', { date, rows });
    
    if (rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: 'No approved run found for the specified date' 
      });
      return;
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error fetching run by date:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching run by date',
      error: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;