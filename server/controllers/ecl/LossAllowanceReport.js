const db = require('../../config/database');

const getLossAllowanceReport = async (req, res) => {
    const { startDate, endDate, startRunKey, endRunKey } = req.query;
    let connection;

    // Validate required parameters
    if (!startDate || !endDate || !startRunKey || !endRunKey) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters: startDate, endDate, startRunKey, and endRunKey are required'
        });
    }

    try {
        connection = await db.getConnection();

        // First verify if data exists for the given dates and run keys
        const verifyDataQuery = `
            SELECT 
                fic_mis_date,
                n_run_key,
                COUNT(*) as record_count,
                COUNT(DISTINCT n_curr_ifrs_stage_skey) as stage_count
            FROM fct_reporting_lines
            WHERE (fic_mis_date = ? AND n_run_key = ?)
               OR (fic_mis_date = ? AND n_run_key = ?)
            GROUP BY fic_mis_date, n_run_key;
        `;

        const [dataVerification] = await connection.query(verifyDataQuery, [
            startDate, startRunKey,
            endDate, endRunKey
        ]);

        if (!dataVerification || dataVerification.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No data found for the specified dates and run keys',
                details: { startDate, endDate, startRunKey, endRunKey }
            });
        }

        // Log data verification results
        console.log('Data verification results:', JSON.stringify(dataVerification, null, 2));
        
        // Get opening balances with debug logging
        const openingBalanceQuery = `
            SELECT 
                frl.n_curr_ifrs_stage_skey as stage,
                SUM(IFNULL(frl.n_12m_ecl_ncy, 0)) as amount,
                COUNT(DISTINCT frl.n_account_number) as account_count
            FROM fct_reporting_lines frl
            WHERE frl.fic_mis_date = ? 
            AND frl.n_run_key = ?
            AND frl.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY frl.n_curr_ifrs_stage_skey
            ORDER BY frl.n_curr_ifrs_stage_skey;
        `;        // Get new financial assets (accounts present in end date but not in start date)
        const newAssetsQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                SUM(e.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines e
            LEFT JOIN fct_reporting_lines s ON e.n_account_number = s.n_account_number 
                AND s.fic_mis_date = ? AND s.n_run_key = ?
            WHERE e.fic_mis_date = ?
            AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            AND s.n_account_number IS NULL
            GROUP BY e.n_curr_ifrs_stage_skey
            ORDER BY e.n_curr_ifrs_stage_skey;
        `;

        // Get stage transfer losses (movements to higher risk stages)
        const stageTransferLossesQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as from_stage,
                e.n_curr_ifrs_stage_skey as to_stage,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey > s.n_curr_ifrs_stage_skey
            AND s.n_curr_ifrs_stage_skey IN (1, 2)
            AND e.n_curr_ifrs_stage_skey IN (2, 3)
            GROUP BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey
            ORDER BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey;
        `;

        // Get stage transfer gains (movements to lower risk stages)
        const stageTransferGainsQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as from_stage,
                e.n_curr_ifrs_stage_skey as to_stage,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey < s.n_curr_ifrs_stage_skey
            AND s.n_curr_ifrs_stage_skey IN (2, 3)
            AND e.n_curr_ifrs_stage_skey IN (1, 2)
            GROUP BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey
            ORDER BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey;
        `;

        // Get derecognized assets (accounts present in start date but not in end date)
        const derecognizedAssetsQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as stage,
                SUM(s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT s.n_account_number) as account_count
            FROM fct_reporting_lines s
            LEFT JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number 
                AND e.fic_mis_date = ? AND e.n_run_key = ?
            WHERE s.fic_mis_date = ?
            AND s.n_run_key = ?
            AND s.n_curr_ifrs_stage_skey IN (1, 2, 3)
            AND e.n_account_number IS NULL
            GROUP BY s.n_curr_ifrs_stage_skey
            ORDER BY s.n_curr_ifrs_stage_skey;
        `;

        // Get closing balances
        const closingBalanceQuery = `
            SELECT 
                frl.n_curr_ifrs_stage_skey as stage,
                SUM(frl.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT frl.n_account_number) as account_count
            FROM fct_reporting_lines frl
            WHERE frl.fic_mis_date = ? 
            AND frl.n_run_key = ?
            AND frl.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY frl.n_curr_ifrs_stage_skey
            ORDER BY frl.n_curr_ifrs_stage_skey;
        `;

        // Get ECL increases due to credit deterioration (for accounts present in both dates)
        const eclIncreaseQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_12m_ecl_ncy > s.n_12m_ecl_ncy
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY e.n_curr_ifrs_stage_skey
            ORDER BY e.n_curr_ifrs_stage_skey;
        `;

        // Get ECL decreases due to credit appreciation (for accounts present in both dates)
        const eclDecreaseQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_12m_ecl_ncy < s.n_12m_ecl_ncy
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY e.n_curr_ifrs_stage_skey
            ORDER BY e.n_curr_ifrs_stage_skey;
        `;

        // Execute all queries in parallel for better performance
        const [
            openingBalances,
            newAssets,
            stageTransferLosses,
            stageTransferGains,
            derecognizedAssets,
            closingBalances,
            eclIncreases,
            eclDecreases
        ] = await Promise.all([
            connection.query(openingBalanceQuery, [startDate, startRunKey]),
            connection.query(newAssetsQuery, [startDate, startRunKey, endDate, endRunKey]),
            connection.query(stageTransferLossesQuery, [startDate, startRunKey, endDate, endRunKey]),
            connection.query(stageTransferGainsQuery, [startDate, startRunKey, endDate, endRunKey]),
            connection.query(derecognizedAssetsQuery, [endDate, endRunKey, startDate, startRunKey]),
            connection.query(closingBalanceQuery, [endDate, endRunKey]),
            connection.query(eclIncreaseQuery, [startDate, startRunKey, endDate, endRunKey]),
            connection.query(eclDecreaseQuery, [startDate, startRunKey, endDate, endRunKey])
        ]);

        // Log results for debugging
        console.log('Query results:', {
            openingBalances: openingBalances[0],
            newAssets: newAssets[0],
            stageTransferLosses: stageTransferLosses[0],
            stageTransferGains: stageTransferGains[0],
            derecognizedAssets: derecognizedAssets[0],
            closingBalances: closingBalances[0],
            eclIncreases: eclIncreases[0],
            eclDecreases: eclDecreases[0]
        });

        // Process and format results
        const formatStageResults = (results) => {
            const stageMap = {
                1: { amount: 0, account_count: 0 },
                2: { amount: 0, account_count: 0 },
                3: { amount: 0, account_count: 0 }
            };
            
            if (Array.isArray(results[0])) {
                results[0].forEach(row => {
                    if (row.stage && [1, 2, 3].includes(Number(row.stage))) {
                        stageMap[row.stage] = {
                            amount: parseFloat(row.amount) || 0,
                            account_count: parseInt(row.account_count) || 0
                        };
                    }
                });
            }
            
            return stageMap;
        };

        const processTransfers = (results) => {
            if (!Array.isArray(results[0])) {
                return [];
            }

            return results[0].map(row => ({
                from_stage: parseInt(row.from_stage) || 0,
                to_stage: parseInt(row.to_stage) || 0,
                amount: parseFloat(row.amount) || 0,
                account_count: parseInt(row.account_count) || 0
            }));
        };

        // Calculate totals for each section
        const calculateTotal = (stageMap) => {
            return {
                amount: Object.values(stageMap).reduce((sum, stage) => sum + (stage.amount || 0), 0),
                account_count: Object.values(stageMap).reduce((sum, stage) => sum + (stage.account_count || 0), 0)
            };
        };

        // Format final response
        const response = {
            opening_balance: {
                stages: formatStageResults(openingBalances),
                total: calculateTotal(formatStageResults(openingBalances))
            },
            new_assets: {
                stages: formatStageResults(newAssets),
                total: calculateTotal(formatStageResults(newAssets))
            },
            stage_transfer_losses: {
                transfers: processTransfers(stageTransferLosses),
                total: {
                    amount: processTransfers(stageTransferLosses)
                        .reduce((sum, transfer) => sum + (transfer.amount || 0), 0),
                    account_count: processTransfers(stageTransferLosses)
                        .reduce((sum, transfer) => sum + (transfer.account_count || 0), 0)
                }
            },            stage_transfer_gains: {
                transfers: processTransfers(stageTransferGains),
                total: {
                    amount: processTransfers(stageTransferGains)
                        .reduce((sum, transfer) => sum + (transfer.amount || 0), 0),
                    account_count: processTransfers(stageTransferGains)
                        .reduce((sum, transfer) => sum + (transfer.account_count || 0), 0)
                }
            },
            derecognized_assets: {
                stages: formatStageResults(derecognizedAssets),
                total: calculateTotal(formatStageResults(derecognizedAssets))
            },
            ecl_increases: {
                stages: formatStageResults(eclIncreases),
                total: calculateTotal(formatStageResults(eclIncreases))
            },
            ecl_decreases: {
                stages: formatStageResults(eclDecreases),
                total: calculateTotal(formatStageResults(eclDecreases))
            },
            closing_balance: {
                stages: formatStageResults(closingBalances),
                total: calculateTotal(formatStageResults(closingBalances))
            }
        };

        res.json({
            success: true, 
            data: response,
            metadata: {
                startDate,
                endDate,
                startRunKey,
                endRunKey
            }
        });
    } catch (err) {
        console.error('Error generating loss allowance report:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate loss allowance report',
            details: err.message 
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getLossAllowanceReport
};
