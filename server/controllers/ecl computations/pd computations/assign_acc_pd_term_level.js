const pool = require('../../../config/database');

// Helper function to get the latest run key
const getLatestRunSkey = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        
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

// Main function to calculate PD for accounts
const calculatePDForAccounts = async (ficMisDate) => {
    try {
        // Get the latest run key first
        const latestRunKey = await getLatestRunSkey();
        if (!latestRunKey) {
            throw new Error('Could not get latest run key');
        }
        
        console.log(`Starting PD calculation for fic_mis_date=${ficMisDate} and run_key=${latestRunKey}`);
        
        // Process rating-based PDs
        await processRatingBasedPD(ficMisDate, latestRunKey);
        
        // Process delinquency-based PDs
        await processDelinquencyBasedPD(ficMisDate, latestRunKey);
        
        console.log(`PD calculation completed for fic_mis_date=${ficMisDate} and run_key=${latestRunKey}.`);
        return 1;
    } catch (error) {
        console.error(`Error during PD calculation: ${error.message}`);
        return 0;
    }
};

// Process rating-based PD values
const processRatingBasedPD = async (ficMisDate, latestRunKey) => {
    let connection = null;
    
    try {
        connection = await pool.getConnection();
        console.log('Starting PD calculation for Rating-Based Term Structures');
        
        // Add debug logging for PD lookup data
        const [pdKeysCheck] = await connection.query(`
            SELECT DISTINCT 
                v_pd_term_structure_id,
                v_cash_flow_bucket_id,
                COUNT(*) as count
            FROM fsi_pd_interpolated
            WHERE v_int_rating_code IS NOT NULL
            GROUP BY v_pd_term_structure_id, v_cash_flow_bucket_id
            ORDER BY v_pd_term_structure_id, v_cash_flow_bucket_id;
        `);
        console.log('Available PD buckets:', pdKeysCheck);
        
        // Check PD data availability
        const [pdData] = await connection.query(`
            SELECT COUNT(*) as count, 
                   COUNT(DISTINCT v_pd_term_structure_id) as term_structures,
                   COUNT(DISTINCT v_int_rating_code) as rating_codes
            FROM fsi_pd_interpolated;
        `);
        console.log('PD Data Summary:', pdData[0]);
        
        // Check if there are any rating-based accounts to process
        const [accountCheck] = await connection.query(`
            SELECT COUNT(*) AS count
            FROM fct_stage_determination sd
            JOIN ldn_pd_term_structure ts ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
            WHERE ts.v_pd_term_structure_type = 'R'
              AND sd.fic_mis_date = ?
              AND sd.n_run_key = ?
              AND sd.d_maturity_date IS NOT NULL;
        `, [ficMisDate, latestRunKey]);
        
        const ratingAccountCount = accountCheck[0].count;
        console.log(`Found ${ratingAccountCount} rating-based accounts to process`);
        
        if (ratingAccountCount === 0) {
            console.log('No rating-based accounts to process. Skipping.');
            return;
        }
        
        // Cache PD data for rating-based calculations
        console.log('Caching rating-based PD lookup data...');
        const [ratingPdData] = await connection.query(`
            SELECT 
                v_pd_term_structure_id, 
                v_int_rating_code, 
                v_cash_flow_bucket_id, 
                n_cumulative_default_prob
            FROM fsi_pd_interpolated
            WHERE v_int_rating_code IS NOT NULL
        `);
        
        // Create PD lookup map for faster access
        const ratingPdLookupMap = new Map();
        for (const row of ratingPdData) {
            const key = `${row.v_pd_term_structure_id}_${row.v_int_rating_code}_${row.v_cash_flow_bucket_id}`;
            ratingPdLookupMap.set(key, row.n_cumulative_default_prob);
        }
        
        console.log(`Cached ${ratingPdLookupMap.size} rating-based PD lookup values`);
        
        // Right after caching rating PD data
        console.log('Analyzing PD data distribution...');
        const bucketAnalysis = new Map();
        for (const row of ratingPdData) {
            const key = `${row.v_pd_term_structure_id}_${row.v_cash_flow_bucket_id}`;
            if (!bucketAnalysis.has(key)) {
                bucketAnalysis.set(key, { count: 0, ratings: new Set() });
            }
            const analysis = bucketAnalysis.get(key);
            analysis.count++;
            analysis.ratings.add(row.v_int_rating_code);
        }

        // Log bucket distribution
        console.log('PD Bucket Analysis:');
        for (const [key, analysis] of bucketAnalysis) {
            const [termStructure, bucket] = key.split('_');
            console.log(`Term Structure ${termStructure}, Bucket ${bucket}:`);
            console.log(`  Total PD values: ${analysis.count}`);
            console.log(`  Unique ratings: ${Array.from(analysis.ratings).join(', ')}`);
        }
        
        // Process in smaller batches with separate connections and transactions
        const batchSize = 250;
        const totalBatches = Math.ceil(ratingAccountCount / batchSize);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            // Create a fresh connection for each batch
            const batchConnection = await pool.getConnection();
            
            try {
                // Use READ COMMITTED isolation level
                await batchConnection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
                
                // Set a longer lock timeout for this connection (120 seconds)
                await batchConnection.query('SET innodb_lock_wait_timeout = 120');
                
                await batchConnection.beginTransaction();
                
                const offset = batch * batchSize;
                console.log(`Processing rating-based batch ${batch + 1}/${totalBatches}`);
                
                // Get account data for this batch with all needed info in one query
                const [accountBatch] = await batchConnection.query(`
                    SELECT 
                        sd.n_account_number,
                        sd.n_pd_term_structure_skey,
                        sd.n_credit_rating_code,
                        sd.d_maturity_date,
                        ts.v_pd_term_frequency_unit
                    FROM fct_stage_determination sd
                    JOIN ldn_pd_term_structure ts ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                    WHERE ts.v_pd_term_structure_type = 'R'
                    AND sd.fic_mis_date = ?
                    AND sd.n_run_key = ?
                    AND sd.d_maturity_date IS NOT NULL
                    LIMIT ? OFFSET ?
                `, [ficMisDate, latestRunKey, batchSize, offset]);
                
                if (accountBatch.length === 0) {
                    console.log(`No accounts in batch ${batch + 1}. Skipping.`);
                    await batchConnection.commit();
                    batchConnection.release();
                    continue;
                }
                
                console.log(`Found ${accountBatch.length} accounts in rating-based batch ${batch + 1}`);
                
                // Process in micro-batches with bulk updates
                const microBatchSize = 25;
                const microBatches = Math.ceil(accountBatch.length / microBatchSize);
                let totalUpdated = 0;
                
                for (let i = 0; i < microBatches; i++) {
                    const microAccounts = accountBatch.slice(i * microBatchSize, (i + 1) * microBatchSize);
                    const updateValues = [];
                    const updateParams = [];
                    
                    // Inside the account processing loop, add debugging:
                    for (const account of microAccounts) {
                        console.log(`Detailed processing for Account ${account.n_account_number}:`);
                        console.log(`Term Structure: ${account.n_pd_term_structure_skey}`);
                        console.log(`Credit Rating: ${account.n_credit_rating_code}`);
                        console.log(`Maturity Date: ${account.d_maturity_date}`);
                        console.log(`Term Frequency Unit: ${account.v_pd_term_frequency_unit}`);
                        
                        let bucketSize = 1;
                        switch (account.v_pd_term_frequency_unit) {
                            case 'M': bucketSize = 1; break;
                            case 'Q': bucketSize = 3; break;
                            case 'H': bucketSize = 6; break;
                            case 'Y': bucketSize = 12; break;
                        }
                        
                        // Calculate months to maturity with validation
                        const maturityDate = new Date(account.d_maturity_date);
                        const misDate = new Date(ficMisDate);
                        const monthsToMaturity = 
                            (maturityDate.getFullYear() - misDate.getFullYear()) * 12 + 
                            (maturityDate.getMonth() - misDate.getMonth());
                        
                        // Calculate buckets with detailed logging
                        const twelveMoBucket = Math.min(
                            Math.max(Math.ceil(monthsToMaturity / bucketSize), 1),
                            Math.ceil(12.0 / bucketSize)
                        );
                        
                        const lifetimeBucket = Math.ceil(monthsToMaturity / bucketSize);
                        
                        const twelveMonthKey = `${account.n_pd_term_structure_skey}_${account.n_credit_rating_code}_${twelveMoBucket}`;
                        const lifetimeKey = `${account.n_pd_term_structure_skey}_${account.n_credit_rating_code}_${lifetimeBucket}`;
                        
                        // Add detailed lookup diagnostics
                        console.log('PD Calculation Details:');
                        console.log(`Months to Maturity: ${monthsToMaturity}`);
                        console.log(`Bucket Size: ${bucketSize}`);
                        console.log(`12-Month Bucket: ${twelveMoBucket}`);
                        console.log(`Lifetime Bucket: ${lifetimeBucket}`);
                        console.log(`12-Month Key: ${twelveMonthKey}`);
                        console.log(`Lifetime Key: ${lifetimeKey}`);
                        
                        const twelveMonthPD = ratingPdLookupMap.get(twelveMonthKey);
                        const lifetimePD = ratingPdLookupMap.get(lifetimeKey);
                        
                        console.log(`12-Month PD Found: ${twelveMonthPD !== undefined}`);
                        console.log(`Lifetime PD Found: ${lifetimePD !== undefined}`);
                        console.log(`12-Month PD Value: ${twelveMonthPD}`);
                        console.log(`Lifetime PD Value: ${lifetimePD}`);

                        updateValues.push(`(?, ?, ?, ?, ?)`);
                        updateParams.push(
                            account.n_account_number, 
                            ficMisDate, 
                            latestRunKey, 
                            twelveMonthPD, 
                            lifetimePD
                        );
                    }
                    
                    if (updateValues.length > 0) {
                        try {
                            // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic, efficient updates
                            const [updateResult] = await batchConnection.query(`
                                INSERT INTO fct_stage_determination 
                                    (n_account_number, fic_mis_date, n_run_key, n_twelve_months_pd, n_lifetime_pd)
                                VALUES 
                                    ${updateValues.join(',')}
                                ON DUPLICATE KEY UPDATE 
                                    n_twelve_months_pd = VALUES(n_twelve_months_pd),
                                    n_lifetime_pd = VALUES(n_lifetime_pd)
                            `, updateParams);
                            
                            totalUpdated += updateResult.affectedRows;
                        } catch (updateError) {
                            console.warn(`Error in rating-based micro-batch ${i + 1}: ${updateError.message}`);
                            // Try individual updates as fallback
                            let individualUpdates = 0;
                            for (const account of microAccounts) {
                                try {
                                    // Calculate buckets and PD values again for individual update
                                    let bucketSize = 1;
                                    switch (account.v_pd_term_frequency_unit) {
                                        case 'M': bucketSize = 1; break;
                                        case 'Q': bucketSize = 3; break;
                                        case 'H': bucketSize = 6; break;
                                        case 'Y': bucketSize = 12; break;
                                    }
                                    
                                    const maturityDate = new Date(account.d_maturity_date);
                                    const misDate = new Date(ficMisDate);
                                    const monthsToMaturity = 
                                        (maturityDate.getFullYear() - misDate.getFullYear()) * 12 + 
                                        (maturityDate.getMonth() - misDate.getMonth());
                                    
                                    const twelveMoBucket = Math.min(
                                        Math.max(Math.ceil(monthsToMaturity / bucketSize), 1),
                                        Math.ceil(12.0 / bucketSize)
                                    );
                                    
                                    const lifetimeBucket = Math.ceil(monthsToMaturity / bucketSize);
                                    
                                    const twelveMonthKey = `${account.n_pd_term_structure_skey}_${account.n_credit_rating_code}_${twelveMoBucket}`;
                                    const lifetimeKey = `${account.n_pd_term_structure_skey}_${account.n_credit_rating_code}_${lifetimeBucket}`;
                                    
                                    const twelveMonthPD = ratingPdLookupMap.get(twelveMonthKey) || 0;
                                    const lifetimePD = ratingPdLookupMap.get(lifetimeKey) || 0;
                                    
                                    const [individualResult] = await batchConnection.query(`
                                        UPDATE fct_stage_determination
                                        SET n_twelve_months_pd = ?,
                                            n_lifetime_pd = ?
                                        WHERE n_account_number = ?
                                        AND fic_mis_date = ?
                                        AND n_run_key = ?
                                    `, [twelveMonthPD, lifetimePD, account.n_account_number, ficMisDate, latestRunKey]);
                                    
                                    if (individualResult.affectedRows > 0) {
                                        individualUpdates++;
                                    }
                                } catch (indError) {
                                    console.warn(`Failed to update rating account ${account.n_account_number}: ${indError.message}`);
                                }
                            }
                            
                            totalUpdated += individualUpdates;
                            console.log(`Recovered ${individualUpdates} accounts with individual updates`);
                        }
                    }
                    
                    // Commit after each micro-batch to prevent lock buildup
                    await batchConnection.commit();
                    await batchConnection.beginTransaction();
                    
                    // Small delay between micro-batches to reduce contention
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                await batchConnection.commit();
                console.log(`Rating-based batch ${batch + 1}: Updated ${totalUpdated} accounts`);
                
            } catch (batchError) {
                await batchConnection.rollback();
                console.error(`Error in rating-based batch ${batch + 1}:`, batchError);
            } finally {
                batchConnection.release();
            }
            
            // Delay between batches to reduce lock contention
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('PD values for Rating-Based Term Structures updated');
        
    } catch (error) {
        console.error(`Error processing rating-based PD: ${error.message}`);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Process delinquency-based PD values with extreme optimization
const processDelinquencyBasedPD = async (ficMisDate, latestRunKey) => {
    let connection = null;
    
    try {
        connection = await pool.getConnection();
        console.log('Starting PD calculation for Delinquency-Based Term Structures');
        
        // Quick check if there are any delinquency-based accounts to process
        const [accountCheck] = await connection.query(`
            SELECT COUNT(*) AS count
            FROM fct_stage_determination sd
            JOIN ldn_pd_term_structure ts ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
            WHERE ts.v_pd_term_structure_type = 'D'
              AND sd.fic_mis_date = ?
              AND sd.n_run_key = ?
              AND (sd.d_maturity_date IS NOT NULL OR sd.d_next_payment_date IS NOT NULL);
        `, [ficMisDate, latestRunKey]);
        
        const delinqAccountCount = accountCheck[0].count;
        console.log(`Found ${delinqAccountCount} delinquency-based accounts to process`);
        
        if (delinqAccountCount === 0) {
            console.log('No delinquency-based accounts to process. Skipping.');
            return;
        }

        // First, set PD of 1 for both 12-month and lifetime for accounts with 90+ days delinquency
        await connection.query(`
            UPDATE fct_stage_determination
            SET n_twelve_months_pd = 1,
                n_lifetime_pd = 1
            WHERE fic_mis_date = ?
            AND n_run_key = ?
            AND n_delinquent_days >= 90;
        `, [ficMisDate, latestRunKey]);
        
        // Check delinquency band data availability
        const [delqBandCheck] = await connection.query(`
            SELECT COUNT(*) as count
            FROM fsi_pd_interpolated
            WHERE v_delq_band_code IS NOT NULL;
        `);

        if (delqBandCheck[0].count === 0) {
            console.warn('Warning: No delinquency bands found in fsi_pd_interpolated');
            return; // Skip processing if no delinquency bands
        }
        
        // Cache PD data to avoid excessive lookups - do this once with optimized query
        console.log('Caching PD lookup data for delinquency-based calculation...');
        const [pdLookupData] = await connection.query(`
            SELECT 
                v_pd_term_structure_id, 
                v_delq_band_code, 
                v_cash_flow_bucket_id, 
                n_cumulative_default_prob
            FROM fsi_pd_interpolated
            WHERE v_delq_band_code IS NOT NULL
        `);
        
        // Create PD lookup map for faster access
        const pdLookupMap = new Map();
        for (const row of pdLookupData) {
            const key = `${row.v_pd_term_structure_id}_${row.v_delq_band_code}_${row.v_cash_flow_bucket_id}`;
            pdLookupMap.set(key, row.n_cumulative_default_prob);
        }
        
        console.log(`Cached ${pdLookupMap.size} delinquency-based PD lookup values`);
        
        // Prepare frequency unit bucket size conversion map
        const frequencyUnitMap = {
            'M': 1,  // Monthly
            'Q': 3,  // Quarterly
            'H': 6,  // Half-yearly
            'Y': 12  // Yearly
        };
        
        // Load all term structures at once
        const [termStructures] = await connection.query(`
            SELECT v_pd_term_structure_id, v_pd_term_frequency_unit
            FROM ldn_pd_term_structure
            WHERE v_pd_term_structure_type = 'D'
        `);
        
        const termStructureMap = new Map();
        for (const ts of termStructures) {
            termStructureMap.set(ts.v_pd_term_structure_id, ts.v_pd_term_frequency_unit);
        }
        
        // Much larger batch size with fewer connections
        const batchSize = 1000;
        const totalBatches = Math.ceil(delinqAccountCount / batchSize);
        
        // Use a single optimized connection for all batches
        const batchConnection = await pool.getConnection();
        
        try {
            // Set optimized connection settings once
            await batchConnection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
            await batchConnection.query('SET innodb_lock_wait_timeout = 300');
            await batchConnection.query('SET SESSION sort_buffer_size = 2097152'); // 2MB sort buffer
            await batchConnection.query('SET SESSION join_buffer_size = 4194304'); // 4MB join buffer
            
            for (let batch = 0; batch < totalBatches; batch++) {
                const offset = batch * batchSize;
                console.log(`Processing delinquency-based batch ${batch + 1}/${totalBatches}`);
                
                // Get all data for this batch with optimized query
                const [accountBatch] = await batchConnection.query(`
                    SELECT 
                        sd.n_account_number,
                        sd.n_pd_term_structure_skey,
                        sd.n_delq_band_code,
                        sd.d_maturity_date,
                        sd.d_next_payment_date,
                        sd.n_delinquent_days
                    FROM fct_stage_determination sd
                    JOIN ldn_pd_term_structure ts ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                    WHERE ts.v_pd_term_structure_type = 'D'
                    AND sd.fic_mis_date = ?
                    AND sd.n_run_key = ?
                    AND (sd.d_maturity_date IS NOT NULL OR sd.d_next_payment_date IS NOT NULL)
                    AND sd.n_delinquent_days < 90
                    LIMIT ? OFFSET ?
                `, [ficMisDate, latestRunKey, batchSize, offset]);
                
                if (accountBatch.length === 0) {
                    console.log(`No accounts in batch ${batch + 1}. Skipping.`);
                    continue;
                }
                
                console.log(`Found ${accountBatch.length} accounts in delinquency-based batch ${batch + 1}`);
                
                // Process all accounts in memory first
                const updateBatches = [];
                const misDate = new Date(ficMisDate);
                let currentBatch = [];
                
                for (const account of accountBatch) {
                    // Skip accounts without delinquency band code
                    if (!account.n_delq_band_code) continue;
                    
                    // Get bucket size for this term structure
                    const freqUnit = termStructureMap.get(account.n_pd_term_structure_skey);
                    const bucketSize = frequencyUnitMap[freqUnit] || 1;
                    
                    // Calculate months to maturity using maturity date or next payment date for lifetime PD
                    const maturityDate = new Date(account.d_maturity_date);
                    const misDate = new Date(ficMisDate);
                    
                    // For lifetime PD, use next payment date if maturity date is less than current date
                    let effectiveDate = maturityDate;
                    if (maturityDate < misDate && account.d_next_payment_date) {
                        effectiveDate = new Date(account.d_next_payment_date);
                    }
                    
                    const monthsToMaturity = 
                        (effectiveDate.getFullYear() - misDate.getFullYear()) * 12 + 
                        (effectiveDate.getMonth() - misDate.getMonth());
                    
                    // Calculate buckets
                    const twelveMoBucket = Math.min(
                        Math.max(Math.ceil(monthsToMaturity / bucketSize), 1),
                        Math.ceil(12.0 / bucketSize)
                    );
                    
                    const lifetimeBucket = Math.ceil(monthsToMaturity / bucketSize);
                    
                    // Get PD values from cached map
                    const twelveMonthKey = `${account.n_pd_term_structure_skey}_${account.n_delq_band_code}_${twelveMoBucket}`;
                    const lifetimeKey = `${account.n_pd_term_structure_skey}_${account.n_delq_band_code}_${lifetimeBucket}`;
                    
                    const twelveMonthPD = pdLookupMap.get(twelveMonthKey) || 0;
                    const lifetimePD = pdLookupMap.get(lifetimeKey) || 0;
                    
                    currentBatch.push([
                        account.n_account_number, 
                        ficMisDate, 
                        latestRunKey, 
                        twelveMonthPD, 
                        lifetimePD
                    ]);
                    
                    // Use larger micro-batches of 200 records
                    if (currentBatch.length >= 200) {
                        updateBatches.push([...currentBatch]);
                        currentBatch = [];
                    }
                }
                
                // Don't forget remaining items
                if (currentBatch.length > 0) {
                    updateBatches.push(currentBatch);
                }
                
                // Process all update batches in a single transaction
                await batchConnection.beginTransaction();
                
                try {
                    let totalUpdated = 0;
                    
                    for (const updateBatch of updateBatches) {
                        if (updateBatch.length === 0) continue;
                        
                        // Generate placeholders for VALUES clause
                        const placeholders = updateBatch.map(() => "(?,?,?,?,?)").join(",");
                        
                        // Flatten parameters
                        const params = updateBatch.flat();
                        
                        // Execute batch update
                        try {
                            const [updateResult] = await batchConnection.query(`
                                INSERT INTO fct_stage_determination 
                                    (n_account_number, fic_mis_date, n_run_key, n_twelve_months_pd, n_lifetime_pd)
                                VALUES 
                                    ${placeholders}
                                ON DUPLICATE KEY UPDATE 
                                    n_twelve_months_pd = VALUES(n_twelve_months_pd),
                                    n_lifetime_pd = VALUES(n_lifetime_pd)
                            `, params);
                            
                            totalUpdated += updateResult.affectedRows;
                        } catch (batchError) {
                            console.warn(`Error in micro-batch update: ${batchError.message}. Falling back to individual updates.`);
                            
                            // Fall back to smaller updates
                            const microBatchSize = 50;
                            for (let i = 0; i < updateBatch.length; i += microBatchSize) {
                                const microBatch = updateBatch.slice(i, i + microBatchSize);
                                const microPlaceholders = microBatch.map(() => "(?,?,?,?,?)").join(",");
                                const microParams = microBatch.flat();
                                
                                try {
                                    const [microResult] = await batchConnection.query(`
                                        INSERT INTO fct_stage_determination 
                                            (n_account_number, fic_mis_date, n_run_key, n_twelve_months_pd, n_lifetime_pd)
                                        VALUES 
                                            ${microPlaceholders}
                                        ON DUPLICATE KEY UPDATE 
                                            n_twelve_months_pd = VALUES(n_twelve_months_pd),
                                            n_lifetime_pd = VALUES(n_lifetime_pd)
                                    `, microParams);
                                    
                                    totalUpdated += microResult.affectedRows;
                                } catch (microError) {
                                    console.warn(`Error in micro-batch. Trying individual updates.`);
                                    
                                    // Ultimate fallback: individual updates
                                    for (const [accountNumber, ficMisDate, runKey, twelveMonthPD, lifetimePD] of microBatch) {
                                        try {
                                            const [indResult] = await batchConnection.query(`
                                                UPDATE fct_stage_determination
                                                SET n_twelve_months_pd = ?,
                                                    n_lifetime_pd = ?
                                                WHERE n_account_number = ?
                                                AND fic_mis_date = ?
                                                AND n_run_key = ?
                                            `, [twelveMonthPD, lifetimePD, accountNumber, ficMisDate, runKey]);
                                            
                                            if (indResult.affectedRows > 0) {
                                                totalUpdated++;
                                            }
                                        } catch (indError) {
                                            console.warn(`Failed update for delinq account ${accountNumber}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    await batchConnection.commit();
                    console.log(`Delinquency-based batch ${batch + 1}: Updated ${totalUpdated} accounts`);
                    
                } catch (batchError) {
                    await batchConnection.rollback();
                    console.error(`Error in delinquency-based batch ${batch + 1}:`, batchError);
                    // Continue with other batches
                }
            }
            
            console.log('PD values for Delinquency-Based Term Structures updated');
            
        } finally {
            batchConnection.release();
        }
        
    } catch (error) {
        console.error(`Error processing delinquency-based PD: ${error.message}`);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { calculatePDForAccounts };