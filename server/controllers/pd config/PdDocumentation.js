const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Create the necessary tables for PD documentation
 * @returns {Promise<boolean>} Success status
 */
const createPdDocumentationTables = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Create pd_documentation table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        version VARCHAR(10) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_date DATETIME NOT NULL,
        authorized_by VARCHAR(100),
        authorized_date DATETIME,
        status ENUM('draft', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create pd_documentation_history table for version tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        documentation_id INT NOT NULL,
        content TEXT NOT NULL,
        version VARCHAR(10) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_date DATETIME NOT NULL,
        authorized_by VARCHAR(100),
        authorized_date DATETIME,
        status ENUM('draft', 'pending_approval', 'approved', 'rejected') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documentation_id) REFERENCES pd_documentation(id)
      );
    `);

    // Create pd_documentation_approvers table for managing who can approve
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation_approvers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role)
      );
    `);

    await connection.commit();
    logger.info('Successfully created PD documentation tables');
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error(`Error creating PD documentation tables: ${error.message}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Save new PD documentation
 * @param {string} content - The HTML content of the documentation
 * @param {string} version - Version number of the documentation
 * @param {string} createdBy - User who created the documentation
 * @param {string} [authorizedBy=null] - User who authorized the documentation
 * @returns {Promise<number>} The ID of the saved documentation
 */
const savePdDocumentation = async (req, res) => {
  let connection;
  try {
    const { content, version, createdBy, authorizedBy } = req.body;
    connection = await db.getConnection();
    await connection.beginTransaction();

    const now = new Date();
    const status = authorizedBy ? 'approved' : 'pending_approval';

    const [result] = await connection.query(`
      INSERT INTO pd_documentation 
      (content, version, created_by, created_date, authorized_by, authorized_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [content, version, createdBy, now, authorizedBy, authorizedBy ? now : null, status]);

    await connection.commit();
    logger.info(`PD documentation saved successfully with ID: ${result.insertId}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Documentation saved successfully',
      documentationId: result.insertId 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error(`Error saving PD documentation: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get the latest approved PD documentation
 * @returns {Promise<Object|null>} The latest documentation or null if none exists
 */
const getLatestPdDocumentation = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT * FROM pd_documentation 
      WHERE status = 'approved' 
      ORDER BY version DESC, created_date DESC 
      LIMIT 1
    `);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No approved documentation found' 
      });
    }
    
    return res.status(200).json({ success: true, documentation: rows[0] });
  } catch (error) {
    logger.error(`Error getting latest PD documentation: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get all versions of PD documentation
 * @returns {Promise<Array>} Array of all documentation versions
 */
const getAllPdDocumentationVersions = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT * FROM pd_documentation 
      ORDER BY version DESC, created_date DESC
    `);
    
    return res.status(200).json({ success: true, versions: rows });
  } catch (error) {
    logger.error(`Error getting all PD documentation versions: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get a specific version of PD documentation by ID
 * @param {number} id - The ID of the documentation to retrieve
 * @returns {Promise<Object|null>} The documentation or null if not found
 */
const getPdDocumentationById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT * FROM pd_documentation 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No documentation found with ID: ${id}` 
      });
    }
    
    return res.status(200).json({ success: true, documentation: rows[0] });
  } catch (error) {
    logger.error(`Error getting PD documentation by ID: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Update the status of a PD documentation
 * @param {number} id - The ID of the documentation to update
 * @param {string} status - The new status (draft, pending_approval, approved, rejected)
 * @param {string} authorizedBy - User who is authorizing the documentation
 * @returns {Promise<boolean>} Success status
 */
const updatePdDocumentationStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { status, authorizedBy, approvers } = req.body;
    
    if (!status || !authorizedBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: status and authorizedBy are required' 
      });
    }
    
    if (!['draft', 'pending_approval', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: draft, pending_approval, approved, rejected' 
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const now = new Date();
    
    // Update documentation status and authorized by
    await connection.query(`
      UPDATE pd_documentation 
      SET status = ?, authorized_by = ?, authorized_date = ?
      WHERE id = ?
    `, [status, authorizedBy, now, id]);

    // Update approvers if provided
    if (approvers && Array.isArray(approvers)) {
      // First remove existing approvers
      await connection.query(`
        DELETE FROM pd_documentation_approvers 
        WHERE documentation_id = ?
      `, [id]);

      // Then insert new approvers
      if (approvers.length > 0) {
        const values = approvers.map(approver => [id, approver.userId, approver.role]);
        await connection.query(`
          INSERT INTO pd_documentation_approvers 
          (documentation_id, user_id, role) 
          VALUES ?
        `, [values]);
      }
    }

    await connection.commit();
    return res.status(200).json({ 
      success: true, 
      message: `Documentation status updated to ${status}` 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error(`Error updating PD documentation status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createPdDocumentationTables,
  savePdDocumentation,
  getLatestPdDocumentation,
  getAllPdDocumentationVersions,
  getPdDocumentationById,
  updatePdDocumentationStatus
};
