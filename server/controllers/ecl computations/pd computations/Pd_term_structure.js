const db = require('../../../config/database');

const pd_term_structure = async(fic_mis_date) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    // Update only records that need to be updated
    await connection.execute(
      `UPDATE ldn_pd_term_structure_dtl 
       SET fic_mis_date = ? 
       WHERE fic_mis_date IS NULL OR fic_mis_date != ?`,
      [fic_mis_date, fic_mis_date]
    );
    
    console.log("pd_term_structure_dtl updated successfully");
    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating pd_term_structure:', error);
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

module.exports = {
  pd_term_structure
}