const { getConnection} = require('../../config/database');

const getClassificationMeasurement = async (req, res) => {
    let connection;
    try {
        // Get pagination parameters from query, default to first page with 10 items
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        connection = await getConnection();
        
        // Get total count of records
        const [countResult] = await connection.query(
            'SELECT COUNT(*) as total FROM ldn_Product_Classification'
        );
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        // Get paginated records
        const query = `
            SELECT * FROM ldn_Product_Classification 
            ORDER BY id DESC 
            LIMIT ? OFFSET ?
        `;
        const [rows] = await connection.query(query, [limit, offset]);

        res.status(200).json({
            status: 'success',
            data: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords,
                recordsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching classifications:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching classifications',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const addClassificationMeasurement = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
    const { name, description } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Name is required'
            });
        }

        const query = 'INSERT INTO ldn_Product_Classification (name, description) VALUES (?, ?)';
        const [result] = await connection.query(query, [name, description]);
        
        res.status(201).json({
            status: 'success',
            message: 'Classification measurement added successfully',
            data: {
                id: result.insertId,
                name,
                description
            }
        });
    } catch (error) {
        console.error('Error adding classification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error adding classification measurement',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const updateClassificationMeasurement = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const { id, classification, measurement } = req.body;

        // Validate required fields
        if (!id || !classification || !measurement) {
            return res.status(400).json({
                status: 'error',
                message: 'ID, classification, and measurement are required'
            });
        }

        const query = `
            UPDATE ldn_Product_Classification 
            SET classification = ?, measurement = ? 
            WHERE id = ?
        `;
        
        const [result] = await connection.query(query, [
            classification,
            measurement,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Record not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Classification and measurement updated successfully',
            data: { 
                id, 
                classification, 
                measurement 
            }
        });
    } catch (error) {
        console.error('Error updating classification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error updating classification and measurement',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const deleteClassificationMeasurement = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
    const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                status: 'error',
                message: 'ID is required'
            });
        }

        const query = 'DELETE FROM ldn_Product_Classification WHERE id = ?';
    const [result] = await connection.query(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Classification measurement not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Classification measurement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting classification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting classification measurement',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getClassificationMeasurement,
    addClassificationMeasurement,
    updateClassificationMeasurement,
    deleteClassificationMeasurement
};
