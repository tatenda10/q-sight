const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Define custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({
        fillExcept: ['timestamp', 'level', 'message']
    }),
    winston.format.json()
);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define level colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Add colors to Winston
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
    levels,
    format: logFormat,
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        // HTTP logs
        new winston.transports.File({
            filename: path.join(logDir, 'http.log'),
            level: 'http',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        })
    ]
});

// Add console transport in development environment
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(
                info => `${info.timestamp} ${info.level}: ${info.message}`
            )
        )
    }));
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: message => logger.http(message.trim())
};

module.exports = logger; 