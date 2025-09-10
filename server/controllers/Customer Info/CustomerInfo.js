const db = require('../../config/database');
const multer = require('multer');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to chunk array into smaller arrays
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

// Modified insert function to use batch operations
const insertCustomersIntoDB = async (customers, connection) => {
    const BATCH_SIZE = 1000; // Adjust based on your needs
    
    try {
        // Begin transaction
        await connection.beginTransaction();

        // Prepare batch insert query with ON DUPLICATE KEY UPDATE
        const insertQuery = `
            INSERT INTO ldn_customer_info 
            (fic_mis_date, v_party_id, v_partner_name, v_party_type) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
            v_partner_name = VALUES(v_partner_name),
            v_party_type = VALUES(v_party_type)
        `;

        // Split customers into chunks
        const customerChunks = chunkArray(customers, BATCH_SIZE);

        // Process each chunk
        for (const chunk of customerChunks) {
            const values = chunk.map(customer => [
                customer.FIC_MIS_DATE,
                customer.V_PARTY_ID,
                customer.V_PARTNER_NAME,
                customer.V_PARTY_TYPE
            ]);
            await connection.query(insertQuery, [values]);
        }

        // Commit transaction
        await connection.commit();
    } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        throw error;
    }
};

// Optimize file parsing for large files
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const customers = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable._read = () => {};
        readable.push(buffer);
        readable.push(null);

        const parser = csvParser({
            skipLines: 0,
            headers: true,
            maxRows: 1000000, // Adjust based on your needs
        });

        readable
            .pipe(parser)
            .on('data', (row) => {
                customers.push(row);
            })
            .on('end', () => {
                resolve(customers);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

// Optimize Excel parsing
const parseExcel = (buffer) => {
    const workbook = xlsx.read(buffer, { 
        type: 'buffer',
        cellDates: true, // Properly handle dates
        dateNF: 'YYYY-MM-DD', // Format dates
        raw: false
    });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Use sheet_to_json with optimized options
    return xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'YYYY-MM-DD',
        defval: '', // Default value for empty cells
        blankrows: false // Skip empty rows
    });
};

// Optimize duplicate checking
const checkDuplicates = async (customers, connection) => {
    const BATCH_SIZE = 1000;
    const duplicates = [];
    
    // Process in batches to avoid query size limitations
    const customerChunks = chunkArray(customers, BATCH_SIZE);

    for (const chunk of customerChunks) {
        const query = `
            SELECT DISTINCT v_party_id, fic_mis_date 
            FROM ldn_customer_info 
            WHERE (v_party_id, fic_mis_date) IN (
                ${chunk.map(() => '(?, ?)').join(',')}
            )
        `;

        // Flatten the array of [partyId, misDate] pairs for the query
        const queryParams = chunk.flatMap(customer => [
            customer.V_PARTY_ID,
            customer.FIC_MIS_DATE
        ]);

        const [existingRecords] = await connection.query(query, queryParams);
        duplicates.push(...existingRecords.map(record => ({
            v_party_id: record.v_party_id,
            fic_mis_date: record.fic_mis_date
        })));
    }

    return duplicates;
};

// Modify the main upload function to include progress tracking
const uploadCustomerFile = async (req, res) => {
    let connection;
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.time('File Processing'); // Add timing
        
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        let customers = [];

        if (fileExtension === 'csv') {
            customers = await parseCSV(file.buffer);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            customers = parseExcel(file.buffer);
        } else {
            return res.status(400).json({ message: 'Unsupported file format' });
        }

        console.timeEnd('File Processing');
        console.time('Database Operations');

        console.log('Total records to process:', customers.length);

        const validationErrors = validateCustomers(customers);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        connection = await db.getConnection();
        
        const duplicates = await checkDuplicates(customers, connection);
        if (duplicates.length > 0) {
            return res.status(400).json({
                message: 'Duplicate records found',
                duplicates: duplicates,
                error: 'The following party IDs with their respective MIS dates already exist in the database'
            });
        }

        await insertCustomersIntoDB(customers, connection);
        
        console.timeEnd('Database Operations');

        res.status(200).json({ 
            message: 'Customers uploaded successfully',
            count: customers.length
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ 
            message: 'Error processing file', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Validate customers
const validateCustomers = (customers) => {
    const validationErrors = [];
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

    customers.forEach((customer, index) => {
        // Check for required fields
        if (!customer.FIC_MIS_DATE || !customer.V_PARTY_ID) {
            validationErrors.push(`Row ${index + 1}: FIC_MIS_DATE and V_PARTY_ID cannot be null`);
        }
        
        // Check date format
        if (customer.FIC_MIS_DATE && !dateFormatRegex.test(customer.FIC_MIS_DATE)) {
            validationErrors.push(`Row ${index + 1}: FIC_MIS_DATE must be in YYYY-MM-DD format. Found: ${customer.FIC_MIS_DATE}`);
        }

        // Check field lengths
        if (customer.V_PARTY_ID && customer.V_PARTY_ID.length > 50) {
            validationErrors.push(`Row ${index + 1}: V_PARTY_ID exceeds maximum length of 50 characters`);
        }
       
        if (customer.V_PARTY_TYPE && customer.V_PARTY_TYPE.length > 50) {
            validationErrors.push(`Row ${index + 1}: V_PARTY_TYPE exceeds maximum length of 50 characters`);
        }
    });

    return validationErrors;
};

// Get all customers with pagination
const getAllCustomers = async (req, res) => {
    let connection;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        connection = await db.getConnection();
        
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM ldn_customer_info');
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        const [rows] = await connection.query(
            'SELECT * FROM ldn_customer_info ORDER BY fic_mis_date DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

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
        console.error('Error fetching customers:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error fetching customers', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    uploadCustomerFile,
    getAllCustomers
};
