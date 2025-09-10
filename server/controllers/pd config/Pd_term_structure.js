const logger = require('../../config/logger');
const  db  = require('../../config/database');

/**
 * Create a new PD term structure
 */
const createTermStructure = async (req, res) => {
    const { 
        termStructureId,
        termStructureName, 
        termStructureDesc, 
        termFrequencyUnit, // M, Q, H, Y
        termStructureType, // R or D
        ficMisDate 
    } = req.body;

    const connection = await db.getConnection();
    
    try {
        const query = `
            INSERT INTO ldn_pd_term_structure 
            (v_pd_term_structure_id, v_pd_term_structure_name, v_pd_term_structure_desc,
            v_pd_term_frequency_unit, v_pd_term_structure_type, fic_mis_date,
            created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await connection.execute(query, [
            termStructureId,
            termStructureName,
            termStructureDesc,
            termFrequencyUnit,
            termStructureType,
            ficMisDate,
            req.user.username
        ]);

        res.status(200).json({
            success: true,
            message: 'PD term structure created successfully',
            data: { termStructureId: termStructureId }
        });
    } catch (error) {
        logger.error('Error in createTermStructure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create PD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Get all PD term structures
 */
const getTermStructures = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const query = `
            SELECT 
                ts.v_pd_term_structure_id,
                ts.v_pd_term_structure_name,
                ts.v_pd_term_frequency_unit,
                ts.v_pd_term_structure_type,
                DATE_FORMAT(ts.fic_mis_date, '%Y-%m-%d') as fic_mis_date,
                ps.segment_id,
                ps.v_prod_segment,
                ps.v_prod_type,
                ps.v_prod_desc
            FROM ldn_pd_term_structure ts
            INNER JOIN fsi_product_segment ps ON ts.v_pd_term_structure_name = ps.segment_id
            ORDER BY ts.id DESC`;

        const [rows] = await connection.execute(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        logger.error('Error in getTermStructures:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve PD term structures',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Update a PD term structure
 */
const updateTermStructure = async (req, res) => {
    const { 
        termStructureId,
        termStructureName, 
        termStructureDesc, 
        termFrequencyUnit,
        termStructureType,
        ficMisDate 
    } = req.body;

    const connection = await db.getConnection();
    
    try {
        const query = `
            UPDATE ldn_pd_term_structure 
            SET v_pd_term_structure_name = ?,
                v_pd_term_structure_desc = ?,
                v_pd_term_frequency_unit = ?,
                v_pd_term_structure_type = ?,
                fic_mis_date = ?,
                d_modified_date = CURRENT_TIMESTAMP,
                v_modified_by = ?
            WHERE v_pd_term_structure_id = ?`;

        const [result] = await connection.execute(query, [
            termStructureName,
            termStructureDesc,
            termFrequencyUnit,
            termStructureType,
            ficMisDate,
            req.user.username,
            termStructureId
        ]);

        res.status(200).json({
            success: true,
            message: 'PD term structure updated successfully'
        });
    } catch (error) {
        logger.error('Error in updateTermStructure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update PD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Get a specific PD term structure by ID
 */
const getTermStructureById = async (req, res) => {
    const { termStructureId } = req.params;
    const connection = await db.getConnection();
    
    try {
        const query = `
            SELECT ts.*, 
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'creditRiskBasisCd', tsd.v_credit_risk_basis_cd,
                           'pdPercent', tsd.n_pd_percent
                       )
                   ) as details
            FROM ldn_pd_term_structure ts
            LEFT JOIN ldn_pd_term_structure_dtl tsd 
                ON ts.v_pd_term_structure_id = tsd.v_pd_term_structure_id
            WHERE ts.v_pd_term_structure_id = ?
            GROUP BY ts.v_pd_term_structure_id`;

        const [rows] = await connection.execute(query, [termStructureId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'PD term structure not found'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        logger.error('Error in getTermStructureById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve PD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    createTermStructure,
    getTermStructures,
    updateTermStructure,
    getTermStructureById
}; 