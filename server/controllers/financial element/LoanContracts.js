const db = require('../../config/database');
const multer = require('multer');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');

// Add the missing dateFormatRegex constant
const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

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
const insertLoansIntoDB = async (loans, connection) => {
    const BATCH_SIZE = 1000;
    
    try {
        await connection.beginTransaction();

        // Delete existing records with matching date and account number combinations
        for (const loan of loans) {
            await connection.query(
                'DELETE FROM ldn_financial_instrument WHERE fic_mis_date = ? AND v_account_number = ?',
                [loan.FIC_MIS_DATE, loan.V_ACCOUNT_NUMBER]
            );
        }

        // Prepare batch insert query
        const insertQuery = `
            INSERT INTO ldn_financial_instrument (
                fic_mis_date, v_account_number, v_cust_ref_code, v_prod_code,
                n_curr_interest_rate, n_interest_changing_rate, v_interest_freq_unit,
                v_interest_payment_type, v_day_count_ind, v_management_fee_rate,
                n_wht_percent, n_effective_interest_rate, n_accrued_interest,
                d_start_date, d_last_payment_date, d_next_payment_date, d_maturity_date,
                v_amrt_repayment_type, v_amrt_term_unit, n_eop_curr_prin_bal,
                n_eop_int_bal, n_eop_bal, n_curr_payment_recd, n_collateral_amount,
                n_delinquent_days, n_pd_percent, n_lgd_percent, v_ccy_code,
                v_loan_type, m_fees, v_m_fees_term_unit, v_lob_code,
                v_lv_code, v_country_id, v_credit_rating_code, v_org_credit_score,
                v_curr_credit_score, v_acct_rating_movement, v_collateral_type,
                v_loan_desc, v_account_classification_cd, v_gaap_code, v_branch_code,
                v_product_class, v_model_segment
            ) VALUES ?
        `;

        // Split loans into chunks
        const loanChunks = chunkArray(loans, BATCH_SIZE);

        // Process each chunk
        for (const chunk of loanChunks) {
            const values = chunk.map(loan => [
                loan.FIC_MIS_DATE,
                loan.V_ACCOUNT_NUMBER,
                loan.V_CUST_REF_CODE,
                loan.V_PROD_CODE,
                loan.N_CURR_INTEREST_RATE !== undefined && loan.N_CURR_INTEREST_RATE !== '' ? 
                    parseFloat(loan.N_CURR_INTEREST_RATE) : null,
                loan.N_INTEREST_CHANGING_RATE ? parseFloat(loan.N_INTEREST_CHANGING_RATE) : null,
                loan.V_INTEREST_FREQ_UNIT,
                loan.V_INTEREST_PAYMENT_TYPE,
                loan.V_DAY_COUNT_IND,
                loan.V_MANAGEMENT_FEE_RATE,
                loan.N_WHT_PERCENT,
                loan.N_EFFECTIVE_INTEREST_RATE,
                loan.N_ACCRUED_INTEREST,
                loan.D_START_DATE,
                loan.D_LAST_PAYMENT_DATE,
                loan.D_NEXT_PAYMENT_DATE,
                loan.D_MATURITY_DATE,
                loan.V_AMRT_REPAYMENT_TYPE,
                loan.V_AMRT_TERM_UNIT,
                loan.N_EOP_CURR_PRIN_BAL,
                loan.N_EOP_INT_BAL,
                loan.N_EOP_BAL,
                loan.N_CURR_PAYMENT_RECD,
                loan.N_COLLATERAL_AMOUNT,
                loan.N_DELINQUENT_DAYS,
                loan.N_PD_PERCENT,
                loan.N_LGD_PERCENT,
                loan.V_CCY_CODE,
                loan.V_LOAN_TYPE,
                loan.M_FEES,
                loan.V_M_FEES_TERM_UNIT,
                loan.V_LOB_CODE,
                loan.V_LV_CODE,
                loan.V_COUNTRY_ID,
                loan.V_CREDIT_RATING_CODE,
                loan.V_ORG_CREDIT_SCORE,
                loan.V_CURR_CREDIT_SCORE,
                loan.V_ACCT_RATING_MOVEMENT,
                loan.V_COLLATERAL_TYPE,
                loan.V_LOAN_DESC,
                loan.V_ACCOUNT_CLASSIFICATION_CD,
                loan.V_GAAP_CODE,
                loan.V_BRANCH_CODE,
                loan.V_PRODUCT_CLASS,
                loan.V_MODEL_SEGMENT
            ]);
            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
};

// Update the validateLoans function
const validateLoans = (loans) => {
    const validationErrors = [];

    loans.forEach((loan, index) => {
        const rowNum = index + 2;

        // Check required fields (removing N_CURR_INTEREST_RATE from required fields)
        if (!loan.FIC_MIS_DATE || !loan.V_ACCOUNT_NUMBER) {
            validationErrors.push(`Row ${rowNum}: FIC_MIS_DATE and V_ACCOUNT_NUMBER cannot be null`);
        }

        // Validate required numeric fields (removing N_CURR_INTEREST_RATE)
        const requiredNumericFields = {
            'N_INTEREST_CHANGING_RATE': 4
        };

        // Move N_CURR_INTEREST_RATE to optional numeric fields
        const optionalNumericFields = {
            'N_CURR_INTEREST_RATE': 6,  // Changed from 2 to 4 decimal places
            'N_WHT_PERCENT': 2,
            'N_EFFECTIVE_INTEREST_RATE': 2,
            'N_ACCRUED_INTEREST': 2,
            'N_EOP_INT_BAL': 2,
            'N_EOP_BAL': 2,
            'N_CURR_PAYMENT_RECD': 2,
            'N_COLLATERAL_AMOUNT': 2,
            'N_PD_PERCENT': 2,
            'N_LGD_PERCENT': 2
        };

        // Validate optional numeric fields (only if they have a value)
        Object.entries(optionalNumericFields).forEach(([field, precision]) => {
            const value = loan[field];
            
            // Skip validation if field is empty or null
            if (value === undefined || value === null || value === '') {
                return;
            }

            // Only validate if a value is provided
            if (value !== null && value !== '') {
                // Convert and validate numeric value
                const numValue = typeof value === 'string' ? 
                    parseFloat(value.replace(/,/g, '')) : 
                    parseFloat(value);

                if (isNaN(numValue)) {
                    validationErrors.push(`Row ${rowNum}: ${field} must be a valid number when provided`);
                    return;
                }

                // Validate decimal precision only if it's a number
                const decimalStr = numValue.toString();
                const decimalParts = decimalStr.split('.');
                if (decimalParts.length > 1 && decimalParts[1].length > precision) {
                    validationErrors.push(`Row ${rowNum}: ${field} cannot have more than ${precision} decimal places`);
                }
            }
        });

        // Validate required string fields
        const requiredStringFields = {
            'V_ACCOUNT_NUMBER': 255,
            'V_PROD_CODE': 255,
            'V_CCY_CODE': 255,
            'V_BRANCH_CODE': 255,
        };
        Object.entries(requiredStringFields).forEach(([field, maxLength]) => {
            const value = loan[field];
            if (!value || value.trim() === '') {
                validationErrors.push(`Row ${rowNum}: ${field} cannot be null or empty`);
            } else if (value.length > maxLength) {
                validationErrors.push(`Row ${rowNum}: ${field} exceeds maximum length of ${maxLength} characters`);
            }
        });

        // Validate dates
        const dateFields = ['FIC_MIS_DATE', 'D_START_DATE', 'D_LAST_PAYMENT_DATE', 'D_NEXT_PAYMENT_DATE', 'D_MATURITY_DATE'];
        dateFields.forEach(field => {
            if (loan[field] && !dateFormatRegex.test(loan[field])) {
                validationErrors.push(`Row ${rowNum}: ${field} must be in YYYY-MM-DD format`);
            }
        });
    });

    return validationErrors;
};

// Helper function to validate decimal values
const isValidDecimal = (value, precision) => {
    if (!value || value === '') return true; // Allow null or empty values
    
    // Convert string to number and handle comma-separated values
    const numValue = typeof value === 'string' ? 
        parseFloat(value.replace(/,/g, '')) : 
        parseFloat(value);

    if (isNaN(numValue)) return false;

    // Check decimal places
    const decimalStr = numValue.toString();
    const decimalParts = decimalStr.split('.');
    if (decimalParts.length > 1) {
        return decimalParts[1].length <= precision;
    }
    
    return true;
};

// Check for duplicates
const checkDuplicates = async (loans, connection) => {
    const duplicates = [];
    const BATCH_SIZE = 1000;

    const pairs = loans.map(l => ({
        date: l.FIC_MIS_DATE,
        accountNumber: l.V_ACCOUNT_NUMBER
    }));

    const chunks = chunkArray(pairs, BATCH_SIZE);

    for (const chunk of chunks) {
        const placeholders = chunk.map(() => '(fic_mis_date = ? AND v_account_number = ?)').join(' OR ');
        const values = chunk.reduce((acc, pair) => [...acc, pair.date, pair.accountNumber], []);

        const query = `
            SELECT fic_mis_date, v_account_number 
            FROM ldn_financial_instrument 
            WHERE ${placeholders}
        `;

        const [existingRecords] = await connection.query(query, values);
        duplicates.push(...existingRecords);
    }

    return duplicates;
};

// Add this helper function at the top of your file
const formatDate = (dateString) => {
    if (!dateString) return null;
    
    try {
        // Remove any potential whitespace
        dateString = dateString.trim();
        
        // Check if date is already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // Handle MM/DD/YYYY format
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const [month, day, year] = parts;
                if (month && day && year) {
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            }
        }

        // If all else fails, try to parse as date object
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return null;
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return null;
    }
};

// Update the headerMapping to include more variations
const headerMapping = {
    // Date fields
    'FIC_MIS_DATE': ['FIC_MIS_DATE', 'FIC MIS DATE', 'FICMISDATE', 'MIS DATE', '_0'],
    'D_START_DATE': ['D_START_DATE', 'START DATE', 'STARTDATE', 'START_DATE'],
    'D_LAST_PAYMENT_DATE': ['D_LAST_PAYMENT_DATE', 'LAST PAYMENT DATE', 'LASTPAYMENTDATE', 'LAST_PAYMENT_DATE'],
    'D_NEXT_PAYMENT_DATE': ['D_NEXT_PAYMENT_DATE', 'NEXT PAYMENT DATE', 'NEXTPAYMENTDATE', 'NEXT_PAYMENT_DATE'],
    'D_MATURITY_DATE': ['D_MATURITY_DATE', 'MATURITY DATE', 'MATURITYDATE', 'MATURITY_DATE'],
    
    // Required fields with position-based fallbacks
    'V_ACCOUNT_NUMBER': ['V_ACCOUNT_NUMBER', 'ACCOUNT NUMBER', 'ACCOUNT NO', 'ACCT NO', 'ACCOUNTNUMBER', '_3'],
    'V_PROD_CODE': ['V_PROD_CODE', 'PRODUCT CODE', 'PROD CODE', 'PRODCODE', '_2'],
    'V_CCY_CODE': ['V_CCY_CODE', 'CURRENCY CODE', 'CCY', 'CURRENCY', '_1'],
    'V_BRANCH_CODE': ['V_BRANCH_CODE', 'BRANCH CODE', 'BRANCH', 'BRANCHCODE', '_7'],

    // Numeric fields
    'N_CURR_INTEREST_RATE': ['N_CURR_INTEREST_RATE', 'CURRENT INTEREST RATE', 'CURR INTEREST RATE', 'INTEREST RATE', 'INTERESTRATE', '_13'],
    'N_INTEREST_CHANGING_RATE': ['N_INTEREST_CHANGING_RATE', 'INTEREST CHANGING RATE', 'CHANGINGRATE', '_15'],
    'N_EOP_CURR_PRIN_BAL': ['N_EOP_CURR_PRIN_BAL', 'EOP CURRENT PRINCIPAL BALANCE', 'PRINCIPAL BALANCE', 'PRINBAL', '_24'],
    'N_EOP_BAL': ['N_EOP_BAL', 'EOP BALANCE', 'BALANCE', 'EOPBAL', '_26'],

    // New fields
    'V_PRODUCT_CLASS': ['V_PRODUCT_CLASS', 'PRODUCT CLASS', 'PRODUCTCLASS', 'PRODUCT_CLASS'],
    'V_MODEL_SEGMENT': ['V_MODEL_SEGMENT', 'MODEL SEGMENT', 'MODELSEGMENT', 'MODEL_SEGMENT']
};

// Update parseCSV function with better error handling and debugging
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const loans = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable._read = () => {};
        readable.push(buffer);
        readable.push(null);

        let headers = null;
        let columnMap = {};
        let rowCount = 0;

        const parser = csvParser({
            skipLines: 0,
            headers: true,
            maxRows: 1000000,
        });

        readable
            .pipe(parser)
            .on('headers', (headerRow) => {
                console.log('Original headers:', headerRow);
                headers = headerRow;

                // Create position-based fallback headers
                const fallbackHeaders = headerRow.map((_, index) => `_${index}`);
                
                // Combine original and fallback headers
                headerRow.forEach((header, index) => {
                    const standardHeader = Object.entries(headerMapping).find(([_, possibleNames]) => 
                        possibleNames.includes(header.trim().toUpperCase()) || 
                        possibleNames.includes(fallbackHeaders[index])
                    );
                    
                    if (standardHeader) {
                        columnMap[header] = standardHeader[0];
                        console.log(`Mapped ${header} to ${standardHeader[0]}`);
                    } else {
                        console.log(`No mapping found for header: ${header}`);
                    }
                });

                console.log('Final column mapping:', columnMap);
            })
            .on('data', (row) => {
                rowCount++;
                const mappedRow = {};
                
                // Initialize required fields
                mappedRow.FIC_MIS_DATE = null;
                mappedRow.V_ACCOUNT_NUMBER = null;
                
                // Initialize numeric fields with 0
                Object.keys(headerMapping).forEach(field => {
                    if (field.startsWith('N_')) {
                        mappedRow[field] = 0;
                    }
                });

                // Map values from the CSV
                Object.entries(row).forEach(([csvHeader, value]) => {
                    const standardField = columnMap[csvHeader];
                    if (standardField) {
                        if (standardField.startsWith('N_')) {
                            value = value ? value.toString().replace(/,/g, '').trim() : '0';
                            value = value === '' ? '0' : value;
                            value = parseFloat(value);
                            if (isNaN(value)) value = 0;
                        } else if (standardField.startsWith('D_') || standardField === 'FIC_MIS_DATE') {
                            value = formatDate(value);
                        } else {
                            value = value ? value.trim() : null;
                        }
                        mappedRow[standardField] = value;
                    }
                });

                // Debug log for first few rows
                if (rowCount <= 3) {
                    console.log(`Row ${rowCount} mapped data:`, {
                        FIC_MIS_DATE: mappedRow.FIC_MIS_DATE,
                        V_ACCOUNT_NUMBER: mappedRow.V_ACCOUNT_NUMBER,
                        N_CURR_INTEREST_RATE: mappedRow.N_CURR_INTEREST_RATE
                    });
                }

                loans.push(mappedRow);
            })
            .on('end', () => {
                console.log(`Processed ${loans.length} records`);
                if (loans.length > 0) {
                    console.log('First row sample:', loans[0]);
                }
                resolve(loans);
            })
            .on('error', (error) => {
                console.error('Error parsing CSV:', error);
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
    
    // Parse Excel data
    const data = xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'YYYY-MM-DD',
        defval: '',
        blankrows: false
    });

    // Convert all field names to uppercase to match our expected format
    return data.map(row => {
        const upperCaseRow = {};
        Object.keys(row).forEach(key => {
            upperCaseRow[key.toUpperCase()] = row[key];
        });
        return upperCaseRow;
    });
};

// Upload and process file
const uploadLoansFile = async (req, res) => {
    let connection;
    let validationErrors = []; // Move this to function scope
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.time('File Processing');
        
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        let loans = [];

        if (fileExtension === 'csv') {
            loans = await parseCSV(file.buffer);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            loans = parseExcel(file.buffer);
        } else {
            return res.status(400).json({ message: 'Unsupported file format' });
        }

        console.timeEnd('File Processing');
        console.time('Database Operations');

        console.log('Total records to process:', loans.length);

        validationErrors = validateLoans(loans);
        if (validationErrors.length > 0) {
            console.log('Validation errors found:', JSON.stringify(validationErrors, null, 2));
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors[0], // Return the first error object with detailed information
                totalRecords: loans.length,
                failedValidations: validationErrors[0].affectedRows.length,
                summary: {
                    totalRows: loans.length,
                    failedRows: validationErrors[0].affectedRows.length,
                    successfulRows: loans.length - validationErrors[0].affectedRows.length
                }
            });
        }

        connection = await db.getConnection();
        
        const duplicates = await checkDuplicates(loans, connection);
        if (duplicates.length > 0) {
            return res.status(400).json({
                message: 'Duplicate records found',
                duplicates: duplicates,
                error: 'The following date and account number combinations already exist in the database'
            });
        }

        await insertLoansIntoDB(loans, connection);
        
        console.timeEnd('Database Operations');

        res.status(200).json({ 
            message: 'Loans uploaded successfully',
            count: loans.length
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ 
            message: 'Error processing file', 
            error: error.message,
            details: validationErrors.length > 0 ? validationErrors[0] : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Get loans by date and optional account number
const getAllLoans = async (req, res) => {
    let connection;
    try {
        const { fic_mis_date, v_account_number } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        if (!fic_mis_date) {
            return res.status(400).json({
                status: 'error',
                message: 'fic_mis_date is required'
            });
        }

        connection = await db.getConnection();
        
        let queryParams = [fic_mis_date];
        let whereClause = 'WHERE fic_mis_date = ?';
        
        if (v_account_number) {
            whereClause += ' AND v_account_number LIKE ?';
            queryParams.push(`%${v_account_number}%`);
        }

        // Use a more efficient COUNT query
        const [countResult] = await connection.query(
            `SELECT COUNT(1) as total 
             FROM ldn_financial_instrument USE INDEX (idx_fic_mis_date)
             ${whereClause}`,
            queryParams
        );

        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        // Main query with SELECT *
        const [rows] = await connection.query(
            `SELECT * 
             FROM ldn_financial_instrument USE INDEX (idx_fic_mis_date)
             ${whereClause}
             ORDER BY v_account_number 
             LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        // Stream the response if it's large
        if (rows.length > 500) {
            res.setHeader('Transfer-Encoding', 'chunked');
        }

        res.status(200).json({
            status: 'success',
            data: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords,
                recordsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            },
            filters: {
                fic_mis_date,
                v_account_number: v_account_number || null
            }
        });

    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error fetching loans', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Add a new function to get distinct dates
const getDistinctDates = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        
        const [rows] = await connection.query(
            `SELECT DISTINCT fic_mis_date 
             FROM ldn_financial_instrument 
             ORDER BY fic_mis_date DESC`
        );

        res.status(200).json({
            status: 'success',
            data: rows.map(row => row.fic_mis_date)
        });

    } catch (error) {
        console.error('Error fetching distinct dates:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error fetching dates', 
            error: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    uploadLoansFile,
    getAllLoans,
    getDistinctDates
};
