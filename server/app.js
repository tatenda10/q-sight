const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const swaggerUI = require('swagger-ui-express')
const specs = require('./config/swagger.js')
const db = require('./config/database.js')
const {defaultLimiter } = require('./middleware/rateLimiter')
const logger = require('./config/logger')

// Import routes
const userRoutes = require('./routes/userRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const rolesRoutes = require('./routes/roles.js')
const productRoutes = require('./routes/productRoutes.js')
const classificationMeasurementRoutes = require('./routes/ClassificationMeasurementRoutes.js')
const customerInfoRoutes = require('./routes/CustomerInfoRoutes.js')
const loanContractsRoutes = require('./routes/LoanContractsRoutes.js')
const cashflowProjectionsRoutes = require('./routes/cashflow-projections.js')
const stagingRoutes = require('./routes/StagingRoutes.js')
const pdTermStructureRoutes = require('./routes/PdTermStructureRoutes.js')
const productSegmentRoutes = require('./routes/ProductSegmentRoutes.js')
const pdTermStructureDTLRoutes = require('./routes/PdTermStructureDTL.js')
const lgdConfigRoutes = require('./routes/LGDConfig.js')
const ECLRoutes = require('./routes/ECLRoutes.js')
const stageReassignmentRoutes = require('./routes/stageReassignment.js')
const EclConfigRoutes = require('./routes/EclConfigRoutes.js');
const GetECLDataRoutes = require('./routes/GetECLDataRoutes.js');
const EclAnalysisReportRoutes = require('./routes/reports/ECLAnalysisReport.js');
const pdDocumentationRoutes = require('./routes/pdDocumentation');
const EclRunRoutes = require('./routes/ecl/ECLRunRoutes.js');
const ECLAnalysisRoutes = require('./routes/ecl/EclAnalysisRoutes.js');
const termStructureReportRoutes = require('./routes/reports/termStructureReport.js');
const dashboardRoutes = require('./routes/dashboard/DashboardRoutes.js');
const pitpdRoutes = require('./routes/pitpdRoutes');

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Apply rate limiting to all routes
app.use(defaultLimiter)

// Basic route for API health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' })
})

// Swagger Documentation
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs))

// Test database connection
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    logger.info('Successfully connected to MySQL database');
    connection.release();
  } catch (error) {
    logger.error('Error connecting to the database:', error.message);
    process.exit(1);
  }
};

// Initialize database connection
testConnection();

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/products', productRoutes)
app.use('/api/classification-measurement', classificationMeasurementRoutes)
app.use('/api/customer-info', customerInfoRoutes)
app.use('/api/loan-contracts', loanContractsRoutes)
app.use('/api/cashflow-projections', cashflowProjectionsRoutes)
app.use('/api/staging', stagingRoutes)
app.use('/api/pd-term-structures', pdTermStructureRoutes)
app.use('/api/product-segments', productSegmentRoutes)
app.use('/api/pd-term-structure-dtl', pdTermStructureDTLRoutes)
app.use('/api/lgd-config', lgdConfigRoutes)
app.use('/api/ecl', ECLRoutes)
app.use('/api/staging/reassignment', stageReassignmentRoutes)
app.use('/api/ecl-config', EclConfigRoutes)
app.use('/api/ecl-data', GetECLDataRoutes)
app.use('/api/ecl-analysis-report', EclAnalysisReportRoutes)
app.use('/api/pd-documentation', pdDocumentationRoutes)
app.use('/api/ecl/', EclRunRoutes)
app.use('/api/ecl/analysis', ECLAnalysisRoutes)
app.use('/api/term-structure-report', termStructureReportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/pitpd', pitpdRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 