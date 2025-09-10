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
const insertRatingsIntoDB = async (ratings, connection) => {
    const BATCH_SIZE = 1000;
    
    try {
        await connection.beginTransaction();

        // Delete existing records with matching date and party code combinations
        for (const rating of ratings) {
            await connection.query(
                'DELETE FROM ldn_customer_rating_detail WHERE fic_mis_date = ? AND v_party_cd = ?',
                [rating.FIC_MIS_DATE, rating.V_PARTY_CD]
            );
        }

        // Prepare batch insert query
        const insertQuery = `
            INSERT INTO ldn_customer_rating_detail 
            (fic_mis_date, v_party_cd, v_rating_code, v_purpose) 
            VALUES ?
        `;

        // Split ratings into chunks
        const ratingChunks = chunkArray(ratings, BATCH_SIZE);

        // Process each chunk
        for (const chunk of ratingChunks) {
            const values = chunk.map(rating => [
                rating.FIC_MIS_DATE,
                rating.V_PARTY_CD,
                rating.V_RATING_CODE,
                rating.V_PURPOSE
            ]);
            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
};

// Optimize file parsing for large files
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const ratings = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable._read = () => {};
        readable.push(buffer);
        readable.push(null);

        const parser = csvParser({
            skipLines: 0,
            headers: true,
            maxRows: 1000000,
        });

        readable
            .pipe(parser)
            .on('data', (row) => {
                ratings.push(row);
            })
            .on('end', () => {
                resolve(ratings);
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
        cellDates: true,
        dateNF: 'YYYY-MM-DD',
        raw: false
    });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    return xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'YYYY-MM-DD',
        defval: '',
        blankrows: false
    });
};

// Check for duplicates
const checkDuplicates = async (ratings, connection) => {
    const duplicates = [];
    const BATCH_SIZE = 1000;

    // Create chunks of date-party pairs
    const pairs = ratings.map(r => ({
        date: r.FIC_MIS_DATE,
        partyCode: r.V_PARTY_CD
    }));

    const chunks = chunkArray(pairs, BATCH_SIZE);

    for (const chunk of chunks) {
        const placeholders = chunk.map(() => '(fic_mis_date = ? AND v_party_cd = ?)').join(' OR ');
        const values = chunk.reduce((acc, pair) => [...acc, pair.date, pair.partyCode], []);

        const query = `
            SELECT fic_mis_date, v_party_cd 
            FROM ldn_customer_rating_detail 
            WHERE ${placeholders}
        `;

        const [existingRecords] = await connection.query(query, values);
        duplicates.push(...existingRecords);
    }

    return duplicates;
};

// Validate ratings
const validateRatings = (ratings) => {
    const validationErrors = [];
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

    ratings.forEach((rating, index) => {
        // Check for required fields
        if (!rating.FIC_MIS_DATE || !rating.V_PARTY_CD) {
            validationErrors.push(`Row ${index + 1}: FIC_MIS_DATE and V_PARTY_CD cannot be null`);
        }
        
        // Check date format
        if (rating.FIC_MIS_DATE && !dateFormatRegex.test(rating.FIC_MIS_DATE)) {
            validationErrors.push(`Row ${index + 1}: FIC_MIS_DATE must be in YYYY-MM-DD format. Found: ${rating.FIC_MIS_DATE}`);
        }

        // Check field lengths
        if (rating.V_PARTY_CD && rating.V_PARTY_CD.length > 50) {
            validationErrors.push(`Row ${index + 1}: V_PARTY_CD exceeds maximum length of 50 characters`);
        }
        if (rating.V_RATING_CODE && rating.V_RATING_CODE.length > 50) {
            validationErrors.push(`Row ${index + 1}: V_RATING_CODE exceeds maximum length of 50 characters`);
        }
        if (rating.V_PURPOSE && rating.V_PURPOSE.length > 50) {
            validationErrors.push(`Row ${index + 1}: V_PURPOSE exceeds maximum length of 50 characters`);
        }
    });

    return validationErrors;
};

// Upload and process file
const uploadRatingsFile = async (req, res) => {
    let connection;
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.time('File Processing');
        
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        let ratings = [];

        if (fileExtension === 'csv') {
            ratings = await parseCSV(file.buffer);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            ratings = parseExcel(file.buffer);
        } else {
            return res.status(400).json({ message: 'Unsupported file format' });
        }

        console.timeEnd('File Processing');
        console.time('Database Operations');

        console.log('Total records to process:', ratings.length);

        const validationErrors = validateRatings(ratings);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        connection = await db.getConnection();
        
        const duplicates = await checkDuplicates(ratings, connection);
        if (duplicates.length > 0) {
            return res.status(400).json({
                message: 'Duplicate records found',
                duplicates: duplicates,
                error: 'The following date and party code combinations already exist in the database'
            });
        }

        await insertRatingsIntoDB(ratings, connection);
        
        console.timeEnd('Database Operations');

        res.status(200).json({ 
            message: 'Ratings uploaded successfully',
            count: ratings.length
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

// Get all ratings with pagination
const getAllRatings = async (req, res) => {
    let connection;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        connection = await db.getConnection();
        
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM ldn_customer_rating_detail');
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        const [rows] = await connection.query(
            'SELECT * FROM ldn_customer_rating_detail ORDER BY fic_mis_date DESC LIMIT ? OFFSET ?',
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
        console.error('Error fetching ratings:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error fetching ratings', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    uploadRatingsFile,
    getAllRatings
};
