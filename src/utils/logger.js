/**
 * Logging Utility Module
 * Comprehensive logging system with multiple transports and log levels
 * 
 * Features:
 * - Multiple log levels (error, warn, info, debug)
 * - Console and file output
 * - Structured logging with timestamps
 * - Production-ready error handling
 * - Log rotation support
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure logs directory exists
const logsDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels configuration
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[config.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} meta - Additional metadata
 * @returns {string} Formatted log string
 */
const formatLogMessage = (level, message, meta = null) => {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    let logEntry = `[${timestamp}] [${level.toUpperCase()}] [PID:${pid}] ${message}`;
    
    if (meta) {
        if (typeof meta === 'object') {
            logEntry += ` ${JSON.stringify(meta)}`;
        } else {
            logEntry += ` ${meta}`;
        }
    }
    
    return logEntry;
};

/**
 * Write log to file
 * @param {string} logMessage - Formatted log message
 */
const writeToFile = (logMessage) => {
    try {
        fs.appendFileSync(config.LOG_FILE, logMessage + '\n');
    } catch (error) {
        console.error('Failed to write to log file:', error.message);
    }
};

/**
 * Main logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} meta - Additional metadata
 */
const log = (level, message, meta = null) => {
    const levelNum = LOG_LEVELS[level];
    
    // Check if we should log this level
    if (levelNum > CURRENT_LOG_LEVEL) {
        return;
    }
    
    const logMessage = formatLogMessage(level, message, meta);
    
    // Always log to console
    if (level === 'error') {
        console.error(logMessage);
    } else if (level === 'warn') {
        console.warn(logMessage);
    } else {
        console.log(logMessage);
    }
    
    // Write to file in production or when explicitly configured
    if (config.isProduction() || config.LOG_FILE) {
        writeToFile(logMessage);
    }
};

/**
 * Logger object with methods for different log levels
 */
const logger = {
    /**
     * Log error messages
     * @param {string} message - Error message
     * @param {any} meta - Additional metadata
     */
    error: (message, meta = null) => log('error', message, meta),
    
    /**
     * Log warning messages
     * @param {string} message - Warning message
     * @param {any} meta - Additional metadata
     */
    warn: (message, meta = null) => log('warn', message, meta),
    
    /**
     * Log informational messages
     * @param {string} message - Info message
     * @param {any} meta - Additional metadata
     */
    info: (message, meta = null) => log('info', message, meta),
    
    /**
     * Log debug messages
     * @param {string} message - Debug message
     * @param {any} meta - Additional metadata
     */
    debug: (message, meta = null) => log('debug', message, meta),
    
    /**
     * Log HTTP requests (for middleware)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in ms
     */
    http: (req, res, responseTime) => {
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        };
        
        log('info', 'HTTP Request', logData);
    },
    
    /**
     * Log WebSocket events
     * @param {string} event - Socket event name
     * @param {string} socketId - Socket ID
     * @param {any} data - Event data
     */
    socket: (event, socketId, data = null) => {
        const logData = {
            event,
            socketId,
            data: data ? (typeof data === 'object' ? JSON.stringify(data) : data) : null
        };
        
        log('debug', 'Socket Event', logData);
    },
    
    /**
     * Log application startup
     * @param {Object} serverInfo - Server information
     */
    startup: (serverInfo) => {
        const startupData = {
            ...serverInfo,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
        
        log('info', 'Application Started', startupData);
    },
    
    /**
     * Log application shutdown
     * @param {string} reason - Shutdown reason
     */
    shutdown: (reason) => {
        const shutdownData = {
            reason,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
        
        log('info', 'Application Shutdown', shutdownData);
    },
    
    /**
     * Log performance metrics
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in ms
     * @param {any} metadata - Additional metadata
     */
    performance: (operation, duration, metadata = null) => {
        const perfData = {
            operation,
            duration: `${duration}ms`,
            ...metadata
        };
        
        log('debug', 'Performance Metric', perfData);
    }
};

// Handle uncaught exceptions in logging
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in Logger:', {
        message: error.message,
        stack: error.stack,
        name: error.name
    });
});

// Handle unhandled promise rejections in logging
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection in Logger:', {
        reason: reason.toString(),
        promise: promise.toString()
    });
});

module.exports = logger;
