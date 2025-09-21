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
                frl.n_pd_term_structure_name as segment,
                SUM(IFNULL(frl.n_12m_ecl_ncy, 0)) as amount,
                COUNT(DISTINCT frl.n_account_number) as account_count
            FROM fct_reporting_lines frl
            WHERE frl.fic_mis_date = ? 
            AND frl.n_run_key = ?
            AND frl.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY frl.n_curr_ifrs_stage_skey, frl.n_pd_term_structure_name
            ORDER BY frl.n_curr_ifrs_stage_skey, frl.n_pd_term_structure_name;
        `;        // Get new financial assets (accounts present in end date but not in start date)
        const newAssetsQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                e.n_pd_term_structure_name as segment,
                SUM(e.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines e
            LEFT JOIN fct_reporting_lines s ON e.n_account_number = s.n_account_number 
                AND s.fic_mis_date = ? AND s.n_run_key = ?
            WHERE e.fic_mis_date = ?
            AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            AND s.n_account_number IS NULL
            GROUP BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name
            ORDER BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name;
        `;

        // Get stage transfer losses (movements to higher risk stages)
        const stageTransferLossesQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as from_stage,
                e.n_curr_ifrs_stage_skey as to_stage,
                s.n_pd_term_structure_name as segment,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey > s.n_curr_ifrs_stage_skey
            AND s.n_curr_ifrs_stage_skey IN (1, 2)
            AND e.n_curr_ifrs_stage_skey IN (2, 3)
            GROUP BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name
            ORDER BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name;
        `;

        // Get stage transfer gains (movements to lower risk stages)
        const stageTransferGainsQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as from_stage,
                e.n_curr_ifrs_stage_skey as to_stage,
                s.n_pd_term_structure_name as segment,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_curr_ifrs_stage_skey < s.n_curr_ifrs_stage_skey
            AND s.n_curr_ifrs_stage_skey IN (2, 3)
            AND e.n_curr_ifrs_stage_skey IN (1, 2)
            GROUP BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name
            ORDER BY s.n_curr_ifrs_stage_skey, e.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name;
        `;

        // Get derecognized assets (accounts present in start date but not in end date)
        const derecognizedAssetsQuery = `
            SELECT 
                s.n_curr_ifrs_stage_skey as stage,
                s.n_pd_term_structure_name as segment,
                SUM(s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT s.n_account_number) as account_count
            FROM fct_reporting_lines s
            LEFT JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number 
                AND e.fic_mis_date = ? AND e.n_run_key = ?
            WHERE s.fic_mis_date = ?
            AND s.n_run_key = ?
            AND s.n_curr_ifrs_stage_skey IN (1, 2, 3)
            AND e.n_account_number IS NULL
            GROUP BY s.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name
            ORDER BY s.n_curr_ifrs_stage_skey, s.n_pd_term_structure_name;
        `;

        // Get closing balances
        const closingBalanceQuery = `
            SELECT 
                frl.n_curr_ifrs_stage_skey as stage,
                frl.n_pd_term_structure_name as segment,
                SUM(frl.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT frl.n_account_number) as account_count
            FROM fct_reporting_lines frl
            WHERE frl.fic_mis_date = ? 
            AND frl.n_run_key = ?
            AND frl.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY frl.n_curr_ifrs_stage_skey, frl.n_pd_term_structure_name
            ORDER BY frl.n_curr_ifrs_stage_skey, frl.n_pd_term_structure_name;
        `;

        // Get ECL increases due to credit deterioration (for accounts present in both dates)
        const eclIncreaseQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                e.n_pd_term_structure_name as segment,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_12m_ecl_ncy > s.n_12m_ecl_ncy
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name
            ORDER BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name;
        `;

        // Get ECL decreases due to credit appreciation (for accounts present in both dates)
        const eclDecreaseQuery = `
            SELECT 
                e.n_curr_ifrs_stage_skey as stage,
                e.n_pd_term_structure_name as segment,
                SUM(e.n_12m_ecl_ncy - s.n_12m_ecl_ncy) as amount,
                COUNT(DISTINCT e.n_account_number) as account_count
            FROM fct_reporting_lines s
            JOIN fct_reporting_lines e ON s.n_account_number = e.n_account_number
            WHERE s.fic_mis_date = ? AND s.n_run_key = ?
            AND e.fic_mis_date = ? AND e.n_run_key = ?
            AND e.n_12m_ecl_ncy < s.n_12m_ecl_ncy
            AND e.n_curr_ifrs_stage_skey IN (1, 2, 3)
            GROUP BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name
            ORDER BY e.n_curr_ifrs_stage_skey, e.n_pd_term_structure_name;
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

        // Log results for debugging (removed for production)

        // Process and format results
        const formatStageResults = (results) => {
            const stageMap = {
                1: { amount: 0, account_count: 0, segments: {} },
                2: { amount: 0, account_count: 0, segments: {} },
                3: { amount: 0, account_count: 0, segments: {} }
            };
            
            if (Array.isArray(results[0])) {
                results[0].forEach(row => {
                    if (row.stage && [1, 2, 3].includes(Number(row.stage))) {
                        const stage = row.stage;
                        const segment = row.segment || 'Unknown';
                        
                        // Add to stage totals
                        stageMap[stage].amount += parseFloat(row.amount) || 0;
                        stageMap[stage].account_count += parseInt(row.account_count) || 0;
                        
                        // Add to segment breakdown
                        if (!stageMap[stage].segments[segment]) {
                            stageMap[stage].segments[segment] = { amount: 0, account_count: 0 };
                        }
                        stageMap[stage].segments[segment].amount += parseFloat(row.amount) || 0;
                        stageMap[stage].segments[segment].account_count += parseInt(row.account_count) || 0;
                    }
                });
            }
            return stageMap;
        };

        const processTransfers = (results) => {
            if (!Array.isArray(results[0])) {
                return [];
            }

            // Aggregate transfers by from_stage and to_stage only (not by segment)
            // This will combine all segments for the same transfer type
            const transferMap = {};
            
            results[0].forEach(row => {
                const key = `${row.from_stage}-${row.to_stage}`;
                
                if (!transferMap[key]) {
                    transferMap[key] = {
                        from_stage: parseInt(row.from_stage) || 0,
                        to_stage: parseInt(row.to_stage) || 0,
                        amount: 0,
                        account_count: 0
                    };
                }
                
                transferMap[key].amount += parseFloat(row.amount) || 0;
                transferMap[key].account_count += parseInt(row.account_count) || 0;
            });

            return Object.values(transferMap);
        };

        // Calculate totals for each section
        const calculateTotal = (stageMap) => {
            return {
                amount: Object.values(stageMap).reduce((sum, stage) => sum + (stage.amount || 0), 0),
                account_count: Object.values(stageMap).reduce((sum, stage) => sum + (stage.account_count || 0), 0)
            };
        };

        // Get unique segments from all data
        const getUniqueSegments = (results) => {
            const segments = new Set();
            results.forEach(resultSet => {
                if (Array.isArray(resultSet[0])) {
                    resultSet[0].forEach(row => {
                        if (row.segment) {
                            segments.add(row.segment);
                        }
                    });
                }
            });
            return Array.from(segments).sort();
        };

        // Get unique segments
        const uniqueSegments = getUniqueSegments([
            openingBalances, newAssets, stageTransferLosses, 
            stageTransferGains, derecognizedAssets, 
            eclIncreases, eclDecreases, closingBalances
        ]);

        // Format final response
        const formattedOpening = formatStageResults(openingBalances);
        
        const response = {
            segments: uniqueSegments,
            opening_balance: {
                stages: formattedOpening,
                total: calculateTotal(formattedOpening)
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
            },
            stage_transfer_gains: {
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
