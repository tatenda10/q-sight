const db = require('../../config/database');

/**
 * Get PD Comparison Report data
 * Compares average PD from ECL data vs PD term structure details
 */
const getPDComparisonReport = async (req, res) => {
    let connection;
    try {
        const { runKey, reportingDate } = req.query;

        if (!runKey || !reportingDate) {
            return res.status(400).json({
                success: false,
                error: 'Run Key and Reporting Date are required'
            });
        }

        connection = await db.getConnection();

        // 1. Get average PD from ECL data (fct_reporting_lines) - using COALESCE like ECL Analysis report
        const eclPdQuery = `
            SELECT 
                n_pd_term_structure_name as segment_name,
                n_delq_band_code as delinquency_band,
                AVG(COALESCE(n_pd_percent, n_twelve_months_pd, n_lifetime_pd)) as average_pd,
                COUNT(DISTINCT n_account_number) as account_count,
                SUM(n_exposure_at_default_ncy) as total_ead
            FROM fct_reporting_lines
            WHERE n_run_key = ? 
            AND fic_mis_date = ?
            AND n_pd_term_structure_name IS NOT NULL
            AND n_delq_band_code IS NOT NULL
            AND (n_pd_percent IS NOT NULL OR n_twelve_months_pd IS NOT NULL OR n_lifetime_pd IS NOT NULL)
            GROUP BY n_pd_term_structure_name, n_delq_band_code
            ORDER BY n_pd_term_structure_name, n_delq_band_code
        `;

        const [eclPdData] = await connection.query(eclPdQuery, [runKey, reportingDate]);
        
        console.log('ECL PD Data count:', eclPdData.length);
        console.log('ECL PD Data sample:', eclPdData.slice(0, 3));
        console.log('ECL segment names:', [...new Set(eclPdData.map(r => r.segment_name))]);
        console.log('ECL delinquency bands:', [...new Set(eclPdData.map(r => r.delinquency_band))]);
        
        if (eclPdData.length === 0) {
            console.log('No ECL PD data found for runKey:', runKey, 'date:', reportingDate);
            
            // Check what run keys are available
            const availableRunKeysQuery = `
                SELECT DISTINCT n_run_key, fic_mis_date 
                FROM fct_reporting_lines 
                WHERE fic_mis_date = ?
                ORDER BY n_run_key DESC 
                LIMIT 10
            `;
            const [availableRunKeys] = await connection.query(availableRunKeysQuery, [reportingDate]);
            console.log('Available run keys for date:', availableRunKeys);
        }

        // 2. Get PD from PD Term Structure Details - using correct table names and field mapping
        const pdTermStructureQuery = `
            SELECT 
                pts.v_pd_term_structure_id,
                fsi.v_prod_segment as segment_name,
                fsi.v_prod_type,
                fsi.v_prod_desc,
                ptd.v_credit_risk_basis_cd as delinquency_band,
                ptd.n_pd_percent as term_structure_pd,
                ptd.fic_mis_date
            FROM ldn_pd_term_structure_dtl ptd
            JOIN ldn_pd_term_structure pts ON ptd.v_pd_term_structure_id = pts.v_pd_term_structure_id
            JOIN fsi_product_segment fsi ON pts.v_pd_term_structure_name = fsi.segment_id
            WHERE ptd.fic_mis_date = ?
            ORDER BY fsi.v_prod_segment, ptd.v_credit_risk_basis_cd
        `;
        
        // Also check what dates are available in PD Term Structure
        const availableDatesQuery = `
            SELECT DISTINCT fic_mis_date 
            FROM ldn_pd_term_structure_dtl 
            ORDER BY fic_mis_date DESC 
            LIMIT 10
        `;
        const [availableDates] = await connection.query(availableDatesQuery);
        console.log('Available PD Term Structure dates:', availableDates);
        
        // Check what's actually in the PD Term Structure tables
        const checkStructureQuery = `
            SELECT 
                pts.v_pd_term_structure_id,
                fsi.v_prod_segment,
                ptd.v_credit_risk_basis_cd,
                ptd.n_pd_percent,
                ptd.fic_mis_date
            FROM ldn_pd_term_structure_dtl ptd
            JOIN ldn_pd_term_structure pts ON ptd.v_pd_term_structure_id = pts.v_pd_term_structure_id
            JOIN fsi_product_segment fsi ON pts.v_pd_term_structure_name = fsi.segment_id
            ORDER BY ptd.fic_mis_date DESC, fsi.v_prod_segment, ptd.v_credit_risk_basis_cd
            LIMIT 10
        `;
        const [structureSample] = await connection.query(checkStructureQuery);
        console.log('PD Term Structure sample data:', structureSample);
        
        // Check if there's any data for the specific date
        const checkSpecificDateQuery = `
            SELECT 
                pts.v_pd_term_structure_id,
                fsi.v_prod_segment,
                ptd.v_credit_risk_basis_cd,
                ptd.n_pd_percent,
                ptd.fic_mis_date
            FROM ldn_pd_term_structure_dtl ptd
            JOIN ldn_pd_term_structure pts ON ptd.v_pd_term_structure_id = pts.v_pd_term_structure_id
            JOIN fsi_product_segment fsi ON pts.v_pd_term_structure_name = fsi.segment_id
            WHERE ptd.fic_mis_date = ?
            ORDER BY fsi.v_prod_segment, ptd.v_credit_risk_basis_cd
        `;
        const [specificDateData] = await connection.query(checkSpecificDateQuery, [reportingDate]);
        console.log(`PD Term Structure data for ${reportingDate}:`, specificDateData);

        const [pdTermStructureData] = await connection.query(pdTermStructureQuery, [reportingDate]);
        
        console.log('PD Term Structure Data count:', pdTermStructureData.length);
        console.log('PD Term Structure Data sample:', pdTermStructureData.slice(0, 3));
        console.log('PD Term Structure segment names:', [...new Set(pdTermStructureData.map(r => r.segment_name))]);
        console.log('PD Term Structure delinquency bands:', [...new Set(pdTermStructureData.map(r => r.delinquency_band))]);
        
        if (pdTermStructureData.length === 0) {
            console.log('No PD Term Structure data found for date:', reportingDate);
            
            // Try to get the most recent available date
            const mostRecentDateQuery = `
                SELECT MAX(fic_mis_date) as most_recent_date
                FROM ldn_pd_term_structure_dtl
            `;
            const [mostRecentResult] = await connection.query(mostRecentDateQuery);
            const mostRecentDate = mostRecentResult[0]?.most_recent_date;
            
            if (mostRecentDate) {
                console.log('Trying with most recent date:', mostRecentDate);
                const [fallbackData] = await connection.query(pdTermStructureQuery, [mostRecentDate]);
                console.log('Fallback PD Term Structure Data count:', fallbackData.length);
                if (fallbackData.length > 0) {
                    console.log('Using fallback data from:', mostRecentDate);
                    // Use the fallback data
                    pdTermStructureData.push(...fallbackData);
                }
            }
        }

        // 3. Get delinquency band details
        const delinquencyBandsQuery = `
            SELECT 
                n_delq_band_code as band_code,
                v_delq_band_desc as band_description,
                n_delq_lower_value as lower_value,
                n_delq_upper_value as upper_value,
                v_amrt_term_unit as term_unit
            FROM dim_delinquency_band
            ORDER BY n_delq_lower_value
        `;

        const [delinquencyBands] = await connection.query(delinquencyBandsQuery);

        // 4. Get product segments
        const productSegmentsQuery = `
            SELECT 
                segment_id,
                v_prod_segment,
                v_prod_type,
                v_prod_desc
            FROM fsi_product_segment
            ORDER BY v_prod_segment
        `;

        const [productSegments] = await connection.query(productSegmentsQuery);
        
        console.log('Product Segments count:', productSegments.length);
        console.log('Product Segments sample:', productSegments.slice(0, 3));
        console.log('Delinquency Bands count:', delinquencyBands.length);
        console.log('Delinquency Bands sample:', delinquencyBands.slice(0, 3));

        // 5. Create comparison matrix
        console.log('Creating comparison matrix...');
        const comparisonMatrix = createComparisonMatrix(
            eclPdData,
            pdTermStructureData,
            productSegments,
            delinquencyBands
        );
        console.log('Comparison matrix sample:', comparisonMatrix[0]);

        // 6. Calculate summary statistics
        const summaryStats = calculateSummaryStats(comparisonMatrix);

        // Check if we have any data
        if (eclPdData.length === 0 && pdTermStructureData.length === 0) {
            return res.json({
                success: false,
                error: 'No data found for the specified run key and date. Please check if the data exists in the database.',
                data: {
                    comparisonMatrix: [],
                    summaryStats: {
                        totalSegments: 0,
                        totalComparisons: 0,
                        averageVariance: 0,
                        highVarianceCount: 0,
                        lowVarianceCount: 0,
                        highVariancePercent: 0,
                        lowVariancePercent: 0,
                        segmentStats: []
                    },
                    delinquencyBands,
                    productSegments,
                    reportDate: reportingDate,
                    runKey: runKey
                }
            });
        }
        
        // Log summary of what we found
        console.log('=== PD COMPARISON REPORT SUMMARY ===');
        console.log('ECL Data records:', eclPdData.length);
        console.log('PD Term Structure records:', pdTermStructureData.length);
        console.log('Product Segments:', productSegments.length);
        console.log('Delinquency Bands:', delinquencyBands.length);
        console.log('=====================================');

        res.json({
            success: true,
            data: {
                comparisonMatrix,
                summaryStats,
                delinquencyBands,
                productSegments,
                reportDate: reportingDate,
                runKey: runKey
            }
        });

    } catch (error) {
        console.error('Error in getPDComparisonReport:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Create comparison matrix combining ECL PD and Term Structure PD data
 */
function createComparisonMatrix(eclPdData, pdTermStructureData, productSegments, delinquencyBands) {
    const matrix = [];

    productSegments.forEach(segment => {
        const segmentData = {
            segment_id: segment.segment_id,
            segment_name: segment.v_prod_segment,
            segment_type: segment.v_prod_type,
            segment_description: segment.v_prod_desc,
            delinquencyBands: []
        };

        delinquencyBands.forEach(band => {
            // Find ECL PD data for this segment and band
            const eclPdRecord = eclPdData.find(record => 
                record.segment_name === segment.v_prod_segment && 
                record.delinquency_band === band.band_code
            );

            // Find Term Structure PD data for this segment and band
            const termStructureRecord = pdTermStructureData.find(record => 
                record.segment_name === segment.v_prod_segment && 
                record.delinquency_band === band.band_code
            );
            
            // Debug logging for first segment and band
            if (segment.segment_id === 1 && band.band_code === 'Active') {
                console.log(`Debug for segment ${segment.v_prod_segment}, band ${band.band_code}:`);
                console.log('ECL Record:', eclPdRecord);
                console.log('Term Structure Record:', termStructureRecord);
                console.log('Available ECL segments:', [...new Set(eclPdData.map(r => r.segment_name))]);
                console.log('Available Term Structure segments:', [...new Set(pdTermStructureData.map(r => r.segment_name))]);
                console.log('Available ECL delinquency bands:', [...new Set(eclPdData.map(r => r.delinquency_band))]);
                console.log('Available Term Structure delinquency bands:', [...new Set(pdTermStructureData.map(r => r.delinquency_band))]);
            }

            const bandData = {
                band_code: band.band_code,
                band_description: band.band_description,
                lower_value: band.lower_value,
                upper_value: band.upper_value,
                term_unit: band.term_unit,
                ecl_pd: eclPdRecord ? parseFloat(eclPdRecord.average_pd) : 0,
                term_structure_pd: termStructureRecord ? parseFloat(termStructureRecord.term_structure_pd) : 0,
                account_count: eclPdRecord ? parseInt(eclPdRecord.account_count) : 0,
                total_ead: eclPdRecord ? parseFloat(eclPdRecord.total_ead) : 0,
                pd_difference: 0,
                pd_variance_percent: 0
            };

            // Calculate differences
            if (bandData.ecl_pd > 0 && bandData.term_structure_pd > 0) {
                bandData.pd_difference = bandData.ecl_pd - bandData.term_structure_pd;
                bandData.pd_variance_percent = ((bandData.pd_difference / bandData.term_structure_pd) * 100);
            }

            segmentData.delinquencyBands.push(bandData);
        });

        matrix.push(segmentData);
    });

    return matrix;
}

/**
 * Calculate summary statistics for the comparison
 */
function calculateSummaryStats(comparisonMatrix) {
    let totalSegments = comparisonMatrix.length;
    let totalBands = 0;
    let totalAccounts = 0;
    let totalEAD = 0;
    let totalComparisons = 0;
    let totalVariance = 0;
    let highVarianceCount = 0;
    let lowVarianceCount = 0;

    const segmentStats = [];

    comparisonMatrix.forEach(segment => {
        let segmentComparisons = 0;
        let segmentVariance = 0;
        let segmentHighVariance = 0;
        let segmentLowVariance = 0;

        segment.delinquencyBands.forEach(band => {
            totalBands++;
            totalAccounts += band.account_count;
            totalEAD += band.total_ead;

            if (band.ecl_pd > 0 && band.term_structure_pd > 0) {
                totalComparisons++;
                totalVariance += Math.abs(band.pd_variance_percent);
                segmentComparisons++;
                segmentVariance += Math.abs(band.pd_variance_percent);

                if (Math.abs(band.pd_variance_percent) > 20) {
                    highVarianceCount++;
                    segmentHighVariance++;
                } else if (Math.abs(band.pd_variance_percent) <= 5) {
                    lowVarianceCount++;
                    segmentLowVariance++;
                }
            }
        });

        segmentStats.push({
            segment_name: segment.segment_name,
            comparisons: segmentComparisons,
            average_variance: segmentComparisons > 0 ? (segmentVariance / segmentComparisons) : 0,
            high_variance_count: segmentHighVariance,
            low_variance_count: segmentLowVariance
        });
    });

    return {
        totalSegments,
        totalBands,
        totalAccounts,
        totalEAD,
        totalComparisons,
        averageVariance: totalComparisons > 0 ? (totalVariance / totalComparisons) : 0,
        highVarianceCount,
        lowVarianceCount,
        highVariancePercent: totalComparisons > 0 ? ((highVarianceCount / totalComparisons) * 100) : 0,
        lowVariancePercent: totalComparisons > 0 ? ((lowVarianceCount / totalComparisons) * 100) : 0,
        segmentStats
    };
}

module.exports = {
    getPDComparisonReport
};
