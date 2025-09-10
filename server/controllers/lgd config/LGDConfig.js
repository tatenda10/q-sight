const db = require('../../config/database');
const logger = require('../../config/logger');

// Controller to add a new LGD term structure
const addLGDTermStructure = async (req, res) => {
    const { lgdTermStructureId, lgdTermStructureName, lgdPercent, ficMisDate } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO ldn_lgd_term_structure 
            (v_lgd_term_structure_id, v_lgd_term_structure_name, n_lgd_percent, fic_mis_date)
            VALUES (?, ?, ?, ?)`;

        await connection.execute(query, [lgdTermStructureId, lgdTermStructureName, lgdPercent, ficMisDate]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD term structure added successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in addLGDTermStructure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add LGD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to get all LGD term structures
const getLGDTermStructures = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const query = `SELECT * FROM ldn_lgd_term_structure`;
        const [rows] = await connection.execute(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        logger.error('Error in getLGDTermStructures:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve LGD term structures',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to update an LGD term structure
const updateLGDTermStructure = async (req, res) => {
    const { lgdTermStructureId, lgdPercent, ficMisDate } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `
            UPDATE ldn_lgd_term_structure 
            SET n_lgd_percent = ?, fic_mis_date = ?
            WHERE v_lgd_term_structure_id = ?`;

        await connection.execute(query, [lgdPercent, ficMisDate, lgdTermStructureId]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD term structure updated successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in updateLGDTermStructure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update LGD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to delete an LGD term structure
const deleteLGDTermStructure = async (req, res) => {
    const { lgdTermStructureId } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `DELETE FROM ldn_lgd_term_structure WHERE v_lgd_term_structure_id = ?`;
        await connection.execute(query, [lgdTermStructureId]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD term structure deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in deleteLGDTermStructure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete LGD term structure',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    addLGDTermStructure,
    getLGDTermStructures,
    updateLGDTermStructure,
    deleteLGDTermStructure
};
