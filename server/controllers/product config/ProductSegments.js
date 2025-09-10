const db = require('../../config/database');

// Create a new product segment
const createProductSegment = async (req, res) => {
    let conn;
    try {
        conn = await db.getConnection();
        const { prodSegment, prodType, prodDesc } = req.body;
        const createdBy = 'sysadmin'; // Default since there's no users table

        const [result] = await conn.execute(
            `INSERT INTO fsi_product_segment 
            (v_prod_segment, v_prod_type, v_prod_desc, created_by) 
            VALUES (?, ?, ?, ?)`,
            [prodSegment, prodType, prodDesc, createdBy]
        );

        if (result.affectedRows) {
            return res.status(201).json({
                success: true,
                message: 'Product segment created successfully',
                data: {
                    segment_id: result.insertId,
                    v_prod_segment: prodSegment,
                    v_prod_type: prodType,
                    v_prod_desc: prodDesc,
                    created_by: createdBy
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Failed to create product segment'
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Product segment and type combination already exists'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error creating product segment',
            error: error.message
        });
    } finally {
        if (conn) conn.release();
    }
};

// Get all product segments
const getProductSegments = async (req, res) => {
    let conn;
    try {
        conn = await db.getConnection();

        const [rows] = await conn.execute(
            'SELECT * FROM fsi_product_segment ORDER BY segment_id DESC'
        );

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving product segments',
            error: error.message
        });
    } finally {
        if (conn) conn.release();
    }
};

// Get a single product segment by ID
const getProductSegmentById = async (req, res) => {
    let conn;
    try {
        conn = await db.getConnection();
        const { segmentId } = req.params;

        const [rows] = await conn.execute(
            'SELECT * FROM fsi_product_segment WHERE segment_id = ?',
            [segmentId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Product segment not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error retrieving product segment',
            error: error.message
        });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    createProductSegment,
    getProductSegments,
    getProductSegmentById
};
