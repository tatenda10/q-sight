const db = require('../../config/database');
const logger = require('../../config/logger');

// Controller to add a new LGD collateral entry
const addLgdCollateral = async (req, res) => {
    const { ficMisDate, vCustRefCode, vCcyCode, cash, guaranteesCorporate, guaranteesPersonal, insurance, landAndBuildings, floatingChargeDebenture, notarialBond, generalHaircuts, projectSpecificHaircuts, total } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO lgd_collateral 
            (fic_mis_date, v_cust_ref_code, v_ccy_code, cash, guarantees_corporate, guarantees_personal, insurance, land_and_buildings, floating_charge_debenture, notarial_bond, general_haircuts, project_specific_haircuts, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await connection.execute(query, [ficMisDate, vCustRefCode, vCcyCode, cash, guaranteesCorporate, guaranteesPersonal, insurance, landAndBuildings, floatingChargeDebenture, notarialBond, generalHaircuts, projectSpecificHaircuts, total]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD collateral added successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in addLgdCollateral:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add LGD collateral',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to get all LGD collateral entries
const getLgdCollaterals = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const query = `SELECT * FROM lgd_collateral`;
        const [rows] = await connection.execute(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        logger.error('Error in getLgdCollaterals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve LGD collaterals',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to update an LGD collateral entry
const updateLgdCollateral = async (req, res) => {
    const { ficMisDate, vCustRefCode, vCcyCode, cash, guaranteesCorporate, guaranteesPersonal, insurance, landAndBuildings, floatingChargeDebenture, notarialBond, generalHaircuts, projectSpecificHaircuts, total } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `
            UPDATE lgd_collateral 
            SET v_ccy_code = ?, cash = ?, guarantees_corporate = ?, guarantees_personal = ?, insurance = ?, land_and_buildings = ?, floating_charge_debenture = ?, notarial_bond = ?, general_haircuts = ?, project_specific_haircuts = ?, total = ?
            WHERE fic_mis_date = ? AND v_cust_ref_code = ?`;

        await connection.execute(query, [vCcyCode, cash, guaranteesCorporate, guaranteesPersonal, insurance, landAndBuildings, floatingChargeDebenture, notarialBond, generalHaircuts, projectSpecificHaircuts, total, ficMisDate, vCustRefCode]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD collateral updated successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in updateLgdCollateral:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update LGD collateral',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Controller to delete an LGD collateral entry
const deleteLgdCollateral = async (req, res) => {
    const { ficMisDate, vCustRefCode } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `DELETE FROM lgd_collateral WHERE fic_mis_date = ? AND v_cust_ref_code = ?`;
        await connection.execute(query, [ficMisDate, vCustRefCode]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'LGD collateral deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Error in deleteLgdCollateral:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete LGD collateral',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    addLgdCollateral,
    getLgdCollaterals,
    updateLgdCollateral,
    deleteLgdCollateral
};
