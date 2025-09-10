const db = require('../../config/database');
const logger = require('../../config/logger');

const addTermStructureDetails = async (req, res) => {
    const { termStructureId, details } = req.body;
    const connection = await db.getConnection();
    console.log(termStructureId, details);
    try {
        await connection.beginTransaction();

        const detailQuery = `
            INSERT INTO ldn_pd_term_structure_dtl 
            (v_pd_term_structure_id, fic_mis_date, v_credit_risk_basis_cd,
            n_pd_percent)
            VALUES (?, ?, ?, ?)`;

        for (const detail of details) {
            await connection.execute(detailQuery, [
                termStructureId,
                detail.ficMisDate,
                detail.creditRiskBasisCd,
                detail.pdPercent
            ]);
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'PD term structure details added successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in addTermStructureDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add PD term structure details',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get details for a specific PD term structure
const getTermStructureDetails = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const query = `
            SELECT * FROM ldn_pd_term_structure_dtl
            ORDER BY v_pd_term_structure_id`;

        const [rows] = await connection.execute(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        logger.error('Error in getTermStructureDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve PD term structure details',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Update details for a PD term structure
const updateTermStructureDetails = async (req, res) => {
    const { termStructureId, details } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Delete existing details
        await connection.execute(
            'DELETE FROM ldn_pd_term_structure_dtl WHERE v_pd_term_structure_id = ?',
            [termStructureId]
        );

        // Insert new details
        const detailQuery = `
            INSERT INTO ldn_pd_term_structure_dtl 
            (v_pd_term_structure_id, fic_mis_date, v_credit_risk_basis_cd,
            n_pd_percent)
            VALUES (?, ?, ?, ?)`;

        for (const detail of details) {
            await connection.execute(detailQuery, [
                termStructureId,
                detail.ficMisDate,
                detail.creditRiskBasisCd,
                detail.pdPercent
            ]);
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'PD term structure details updated successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in updateTermStructureDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update PD term structure details',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    addTermStructureDetails,
    getTermStructureDetails,
    updateTermStructureDetails
};
