const db = require('../../config/database');
const moment = require('moment');

const searchAccounts = async (req, res) => {
    const { accountNumber, runKey, misDate, stage } = req.query;
    let connection;
    
    try {
        connection = await db.getConnection();
        
        let query = `
            SELECT 
                n_account_number,
                n_run_key,
                fic_mis_date,
                n_curr_ifrs_stage_skey,
                n_stage_descr,
                n_carrying_amount_ncy,
                n_delinquent_days
            FROM fct_reporting_lines
            WHERE 1=1
        `;
        
        const params = [];
        
        if (accountNumber) {
            query += ` AND n_account_number LIKE ?`;
            params.push(`%${accountNumber}%`);
        }
        
        if (runKey) {
            query += ` AND n_run_key = ?`;
            params.push(runKey);
        }
        
        if (misDate) {
            // Format date as YYYY-MM-DD in UTC to match the date as seen in the local timezone
            // This handles the timezone offset properly
            const searchDate = moment.utc(misDate).format('YYYY-MM-DD');
            query += ` AND DATE(CONVERT_TZ(fic_mis_date, '+00:00', @@session.time_zone)) = ?`;
            params.push(searchDate);
        }
        
        if (stage) {
            query += ` AND n_curr_ifrs_stage_skey = ?`;
            params.push(stage);
        }
        
        query += ` ORDER BY n_account_number LIMIT 1000`;
        
        const [results] = await connection.query(query, params);
        
        // Format dates in response for consistency with the frontend
        const formattedResults = results.map(record => ({
            ...record,
            fic_mis_date: moment(record.fic_mis_date).format('YYYY-MM-DD')
        }));
        
        res.json({
            success: true,
            data: formattedResults
        });
        
    } catch (error) {
        console.error('Error searching accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search accounts',
            details: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const reassignStage = async (req, res) => {
    console.log('Received stage reassignment request:', req.body);
    const { accountSelections, newStage, reason, runKey, misDate } = req.body;
    let connection;

    try {
        // Validate input
        if (!accountSelections || !Array.isArray(accountSelections) || accountSelections.length === 0) {
            console.log('Invalid accountSelections:', accountSelections);
            return res.status(400).json({
                success: false,
                error: 'Please select at least one account',
                details: { accountSelections }
            });
        }

        // Extract account numbers from selections
        const accountNumbers = accountSelections.map(selection => selection.accountNumber);

        if (!newStage || ![1, 2, 3].includes(Number(newStage))) {
            console.log('Invalid stage value:', newStage);
            return res.status(400).json({
                success: false,
                error: 'Invalid stage. Stage must be 1, 2, or 3',
                details: { providedStage: newStage }
            });
        }

        if (!reason || reason.trim().length === 0) {
            console.log('Missing reason');
            return res.status(400).json({
                success: false,
                error: 'Please provide a reason for stage reassignment',
                details: { providedReason: reason }
            });
        }

        if (!runKey || !misDate) {
            console.log('Missing runKey or misDate:', { runKey, misDate });
            return res.status(400).json({
                success: false,
                error: 'Run key and MIS date are required',
                details: { runKey, misDate }
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Handle date with proper timezone conversion
        if (!moment(misDate).isValid()) {
            console.error('Invalid date format:', { misDate });
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Please use YYYY-MM-DD format.',
                details: { providedDate: misDate }
            });
        }

        // Format date considering timezone differences between UTC storage and local display
        const formattedMisDate = moment(misDate).format('YYYY-MM-DD');
        console.log('Using formatted MIS date:', formattedMisDate);

        // Fix: Use timezone conversion for consistent comparison
        const verifyQuery = `
            SELECT 
                n_account_number,
                n_curr_ifrs_stage_skey,
                n_carrying_amount_ncy,
                n_prod_name
            FROM fct_reporting_lines 
            WHERE n_account_number IN (?)
            AND n_run_key = ?
            AND DATE(CONVERT_TZ(fic_mis_date, '+00:00', @@session.time_zone)) = ?
        `;       

        const [existingAccounts] = await connection.query(verifyQuery, [accountNumbers, runKey, formattedMisDate]);
        if (existingAccounts.length !== accountNumbers.length) {
            const foundAccounts = existingAccounts.map(row => row.n_account_number);
            const missingAccounts = accountNumbers.filter(acc => !foundAccounts.includes(acc));
            
            console.log('Account validation failed:', {
                requestedAccounts: accountNumbers,
                foundAccounts,
                missingAccounts,
                runKey,
                requestedDate: misDate,
                formattedDate: formattedMisDate
            });
            
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Some account numbers were not found',
                details: { missingAccounts }
            });
        }

        // Fix: Use timezone conversion for consistent comparison
        const updateQuery = `
            UPDATE fct_reporting_lines 
            SET 
                n_curr_ifrs_stage_skey = ?,
                n_prev_ifrs_stage_skey = n_curr_ifrs_stage_skey,
                n_stage_descr = CONCAT('Stage ', ?),
                n_target_ifrs_stage_skey = ?
            WHERE n_account_number IN (?)
            AND n_run_key = ?
            AND DATE(CONVERT_TZ(fic_mis_date, '+00:00', @@session.time_zone)) = ?
        `;
        const [updateResult] = await connection.query(updateQuery, [
            newStage,
            newStage,
            newStage,
            accountNumbers,
            runKey,
            formattedMisDate        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Stage reassignment completed successfully',
            details: {
                accountsUpdated: updateResult.affectedRows,
                newStage,
                runKey,
                misDate: formattedMisDate, // Use the formatted date in the response
                totalAmount: existingAccounts.reduce((sum, acc) => sum + Number(acc.n_carrying_amount_ncy), 0)
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in stage reassignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reassign stages',
            details: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const getStageOverrides = async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        
        // Fix: Use moment.js for consistent date formatting in queries
        const query = `
            SELECT DISTINCT
                frl.n_account_number,
                frl.n_run_key,
                frl.fic_mis_date,
                frl.n_curr_ifrs_stage_skey as current_stage,
                frl.n_prev_ifrs_stage_skey as previous_stage,
                frl.n_stage_descr,
                frl.n_carrying_amount_ncy,
                al.created_at as override_date,
                al.user_id as override_user,
                al.action_description as override_reason,
                JSON_UNQUOTE(JSON_EXTRACT(al.old_values, '$.stage')) as old_stage,
                JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '$.stage')) as new_stage,
                JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '$.amount')) as override_amount
            FROM fct_reporting_lines frl
            JOIN audit_logs al ON 
                al.action_type = 'STAGE_UPDATE' AND 
                al.entity_type = 'ACCOUNT' AND 
                al.entity_id = frl.n_account_number AND
                JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '$.run_key')) = frl.n_run_key AND
                DATE(CONVERT_TZ(frl.fic_mis_date, '+00:00', @@session.time_zone)) = DATE(JSON_UNQUOTE(JSON_EXTRACT(al.new_values, '$.mis_date')))
            ORDER BY al.created_at DESC
        `;

        const [overrides] = await connection.query(query);

        res.json({
            success: true,
            data: overrides
        });

    } catch (error) {
        console.error('Error fetching stage overrides:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stage overrides',
            details: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    searchAccounts,
    reassignStage,
    getStageOverrides
};