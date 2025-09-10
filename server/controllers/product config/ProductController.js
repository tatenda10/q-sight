const db = require('../../config/database');
const multer = require('multer');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Upload and process file
const uploadProductFile = async (req, res) => {
    let connection;
    try {
        const file = req.file;
        if (!file) {
            console.log('No file uploaded in request');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('Processing file:', {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        });

        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        let products = [];

        if (fileExtension === 'csv') {
            console.log('Processing CSV file');
            products = await parseCSV(file.buffer);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            console.log('Processing Excel file');
            products = parseExcel(file.buffer);
        } else {
            console.log('Unsupported file format:', fileExtension);
            return res.status(400).json({ message: 'Unsupported file format' });
        }

        console.log('Total records to process:', products.length);
        console.log('Sample record:', products[0]);

        // Validate data format
        const validationErrors = validateProducts(products);
        if (validationErrors.length > 0) {
            console.log('Validation errors:', validationErrors);
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        connection = await db.getConnection();
        console.log('Database connection established');
        
        // Check for duplicates
        const duplicates = await checkDuplicates(products, connection);
        if (duplicates.length > 0) {
            console.log('Duplicate records found:', duplicates);
            return res.status(400).json({
                message: 'Duplicate records found',
                duplicates: duplicates,
                error: 'The following date and product code combinations already exist in the database'
            });
        }

        console.log('Validation complete - proceeding with database insertion');
        await insertProductsIntoDB(products, connection);
        console.log('Database insertion completed successfully');

        res.status(200).json({ 
            message: 'Products uploaded successfully',
            count: products.length
        });
    } catch (error) {
        console.error('Error processing file:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        res.status(500).json({ 
            message: 'Error processing file', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
            console.log('Database connection released');
        }
    }
};

// Parse CSV file
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const products = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable._read = () => {}; 
        readable.push(buffer);
        readable.push(null);

        console.log('Starting CSV parsing');

        readable
            .pipe(csvParser())
            .on('data', (row) => {
                // Convert date format if needed
                if (row.FIC_MIS_DATE || row.fic_mis_date) {
                    const originalDate = row.FIC_MIS_DATE || row.fic_mis_date;
                    const formattedDate = formatDate(originalDate);
                    // Ensure we have both uppercase and lowercase versions
                    row.FIC_MIS_DATE = formattedDate;
                    row.fic_mis_date = formattedDate;
                    
                    if (originalDate !== formattedDate) {
                        console.log('Date formatted:', { original: originalDate, formatted: formattedDate });
                    }
                }
                products.push(row);
            })
            .on('end', () => {
                console.log('CSV parsing completed. Records parsed:', products.length);
                resolve(products);
            })
            .on('error', (error) => {
                console.error('Error parsing CSV:', error);
                reject(error);
            });
    });
};

// Parse Excel file
const parseExcel = (buffer) => {
    console.log('Starting Excel parsing');
    const workbook = xlsx.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
    });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log('Excel sheet info:', {
        sheetName,
        range: sheet['!ref']
    });

    const products = xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: null
    });

    console.log('Excel parsing completed. Records parsed:', products.length);
    console.log('Sample record before normalization:', products[0]);

    // Format dates in the parsed data and normalize field names
    const normalizedProducts = products.map(product => {
        // Create a new object with both uppercase and lowercase keys
        const normalizedProduct = {};
        
        // Process each key in the original object
        Object.keys(product).forEach(key => {
            const value = product[key];
            const lowercaseKey = key.toLowerCase();
            
            // Store both lowercase and uppercase versions
            normalizedProduct[lowercaseKey] = value;
            normalizedProduct[key.toUpperCase()] = value;
            
            // Format date if needed
            if (lowercaseKey === 'fic_mis_date' || key.toUpperCase() === 'FIC_MIS_DATE') {
                const formattedDate = formatDate(value);
                normalizedProduct['fic_mis_date'] = formattedDate;
                normalizedProduct['FIC_MIS_DATE'] = formattedDate;
            }
        });
        
        return normalizedProduct;
    });

    console.log('Sample record after normalization:', normalizedProducts[0]);
    return normalizedProducts;
};

// Helper function to format dates
const formatDate = (date) => {
    if (!date) {
        console.log('Null date received in formatDate');
        return null;
    }
    
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // If it's a Date object or string that needs formatting
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        console.log('Invalid date received:', date);
        return null;
    }

    const formatted = d.toISOString().split('T')[0];
    console.log('Date formatted:', { original: date, formatted });
    return formatted;
};

// Validate products
const validateProducts = (products) => {
    console.log('Starting product validation');
    const validationErrors = [];
    // Define field mappings (uppercase to lowercase)
    const requiredFields = ['FIC_MIS_DATE', 'V_PROD_CODE', 'V_PROD_NAME', 'V_PROD_TYPE'];
    const requiredFieldsLower = requiredFields.map(field => field.toLowerCase());

    products.forEach((product, index) => {
        // Check required fields (checking both uppercase and lowercase)
        requiredFields.forEach((field, fieldIndex) => {
            const lowerField = requiredFieldsLower[fieldIndex];
            // Check if either uppercase or lowercase version exists
            if (!product[field] && !product[lowerField]) {
                const error = `Row ${index + 1}: ${field} is required`;
                console.log('Validation error:', error);
                validationErrors.push(error);
            }
        });

        // Check date format (checking both uppercase and lowercase)
        const dateField = product.FIC_MIS_DATE || product.fic_mis_date;
        if (dateField && !/^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
            const error = `Row ${index + 1}: FIC_MIS_DATE must be in YYYY-MM-DD format. Found: ${dateField}`;
            console.log('Validation error:', error);
            validationErrors.push(error);
        }

        // Check field lengths (checking both uppercase and lowercase)
        const prodCode = product.V_PROD_CODE || product.v_prod_code;
        if (prodCode && prodCode.length > 50) {
            const error = `Row ${index + 1}: V_PROD_CODE exceeds maximum length of 50 characters`;
            console.log('Validation error:', error);
            validationErrors.push(error);
        }
        
        const prodName = product.V_PROD_NAME || product.v_prod_name;
        if (prodName && prodName.length > 255) {
            const error = `Row ${index + 1}: V_PROD_NAME exceeds maximum length of 255 characters`;
            console.log('Validation error:', error);
            validationErrors.push(error);
        }
    });

    console.log('Validation completed. Errors found:', validationErrors.length);
    return validationErrors;
};

// Helper function to insert products into the database
const insertProductsIntoDB = async (products, connection) => {
    try {
        console.log('Starting database insertion');
        await connection.beginTransaction();
        console.log('Transaction begun');

        const query = `INSERT INTO Ldn_Bank_Product_Info 
                      (fic_mis_date, v_prod_code, v_prod_name, v_prod_type, 
                       v_prod_type_desc, v_prod_segment) 
                      VALUES (?, ?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE
                      v_prod_name = VALUES(v_prod_name),
                      v_prod_type = VALUES(v_prod_type),
                      v_prod_type_desc = VALUES(v_prod_type_desc),
                      v_prod_segment = VALUES(v_prod_segment)`;

        for (const product of products) {
            console.log('Inserting product:', {
                FIC_MIS_DATE: product.FIC_MIS_DATE || product.fic_mis_date,
                V_PROD_CODE: product.V_PROD_CODE || product.v_prod_code,
                V_PROD_NAME: product.V_PROD_NAME || product.v_prod_name
            });
            
            await connection.query(query, [
                product.FIC_MIS_DATE || product.fic_mis_date,
                product.V_PROD_CODE || product.v_prod_code,
                product.V_PROD_NAME || product.v_prod_name,
                product.V_PROD_TYPE || product.v_prod_type,
                product.V_PROD_TYPE_DESC || product.v_prod_type_desc || null,
                product.V_PROD_SEGMENT || product.v_prod_segment || null
            ]);
        }

        await connection.commit();
        console.log('Transaction committed successfully');
    } catch (error) {
        console.error('Error during database insertion:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        await connection.rollback();
        console.log('Transaction rolled back due to error');
        throw error;
    }
};

// Get all products with pagination
const getAllProducts = async (req, res) => {
    let connection;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        connection = await db.getConnection();
        
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM Ldn_Bank_Product_Info');
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        const [rows] = await connection.query(
            'SELECT * FROM Ldn_Bank_Product_Info ORDER BY fic_mis_date DESC LIMIT ? OFFSET ?',
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
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error fetching products', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Check for duplicates
const checkDuplicates = async (products, connection) => {
    console.log('Checking for duplicates');
    const duplicates = [];
    
    // Extract all date and code combinations from new products
    const dateCodePairs = products.map(p => ({
        date: p.FIC_MIS_DATE,
        code: p.V_PROD_CODE
    }));

    console.log('Checking for duplicates with pairs:', dateCodePairs.slice(0, 3));

    // Create placeholders for the SQL IN clause
    const placeholders = dateCodePairs.map(() => '(fic_mis_date = ? AND v_prod_code = ?)').join(' OR ');
    
    // Flatten the values array for the query
    const values = dateCodePairs.reduce((acc, pair) => {
        acc.push(pair.date, pair.code);
        return acc;
    }, []);

    // Check for existing records
    const query = `
        SELECT fic_mis_date, v_prod_code 
        FROM Ldn_Bank_Product_Info 
        WHERE ${placeholders}
    `;

    console.log('Executing duplicate check query');
    const [existingRecords] = await connection.query(query, values);
    console.log('Duplicate check results:', existingRecords);

    // If any records found, they are duplicates
    if (existingRecords.length > 0) {
        existingRecords.forEach(record => {
            duplicates.push({
                fic_mis_date: record.fic_mis_date,
                v_prod_code: record.v_prod_code
            });
        });
    }

    console.log('Duplicate check completed. Found:', duplicates.length);
    return duplicates;
};

// Export the functions
module.exports = {
    uploadProductFile,
    getAllProducts
};
