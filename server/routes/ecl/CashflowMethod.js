const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const router = express.Router();

// Script mapping with readable descriptions
const SCRIPT_DESCRIPTIONS = {
  '../scripts/pd/runPdTermStructure.js': 'Generating PD Term Structure',
  '../scripts/pd/runPdInterpolation.js': 'Running PD Interpolation',
  '../scripts/runskey/runUpdateRunskey.js': 'Updating Run Keys',
  '../scripts/stage_determination/runInsertStageDetermination.js': 'Inserting Stage Determination Data',
  '../scripts/stage_determination/runUpdateStage.js': 'Updating Account Stages',
  '../scripts/stage_determination/runUpdateStageDetermination.js': 'Updating Stage Determination',
  '../scripts/stage_determination/runUpdateStageDeterminationEADWithACCR.js': 'Updating EAD with Accruals',
  '../scripts/eir/runUpdateEIRUsingInterestRate.js': 'Updating Effective Interest Rates',
  '../scripts/lgd/runUpdateLGDForStageDeterminationTermStructure.js': 'Updating LGD Term Structure',
  '../scripts/pd/runCalculatePDForAccounts.js': 'Calculating PD for Accounts',
  '../scripts/ecl/runPopulateEclSimpleEad.js': 'Populating ECL with Simple EAD',
  '../scripts/ecl/runCalculateecl.js': 'Calculating Final ECL Values'
};

// Script execution order
const SCRIPT_ORDER = Object.keys(SCRIPT_DESCRIPTIONS);

// Helper to run a script and return a promise
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { 
      stdout += data.toString(); 
    });
    
    child.stderr.on('data', (data) => { 
      stderr += data.toString(); 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({ success: false, output: stderr.trim() || 'Script execution failed' });
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
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
  runAllScripts().catch(err => {
    console.error('Unhandled error in ECL calculation:', err);
    sendEvent({ 
      step: 'ECL calculation failed', 
      status: 'Error',
      output: `Unexpected error: ${err.message}`
    });
    res.end();
  });

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
      
      return res.status(500).json({ 
        error: `Exception at ${SCRIPT_DESCRIPTIONS[scriptPath]}`, 
        results 
      });
    }
  }

  console.log('All scripts completed');
  res.json({ success: true, results });
});

module.exports = router;