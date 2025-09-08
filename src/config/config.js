/**
 * Application Configuration Module
 * Centralized configuration management with environment-based settings
 * 
 * This module handles all application configuration including:
 * - Environment variables with fallback defaults
 * - Security settings
 * - Server configuration
 * - CORS and networking settings
 */

const path = require('path');

// Environment configuration
const config = {
    // Application Environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Server Configuration
    PORT: parseInt(process.env.PORT) || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    
    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    
    // Security Settings
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Socket.IO Configuration
    SOCKET_PING_TIMEOUT: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    SOCKET_PING_INTERVAL: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    SOCKET_MAX_BUFFER_SIZE: parseInt(process.env.SOCKET_MAX_BUFFER_SIZE) || 1e6, // 1MB
    
    // Logging Configuration
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || path.join(__dirname, '../logs/app.log'),
    
    // SSL/TLS Configuration (for production)
    SSL_CERT_PATH: process.env.SSL_CERT_PATH,
    SSL_KEY_PATH: process.env.SSL_KEY_PATH,
    
    // Database Configuration (if needed in future)
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Redis Configuration (for scaling)
    REDIS_URL: process.env.REDIS_URL,
    
    // Monitoring and Health Check
    HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
    
    // File Upload Configuration
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
    
    // Session Configuration
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    
    // WebRTC Configuration
    ICE_SERVERS: process.env.ICE_SERVERS ? JSON.parse(process.env.ICE_SERVERS) : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ],
    
    // Room Configuration
    MAX_ROOM_SIZE: parseInt(process.env.MAX_ROOM_SIZE) || 10,
    ROOM_TIMEOUT: parseInt(process.env.ROOM_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
    
    // Performance Configuration
    CLUSTER_MODE: process.env.CLUSTER_MODE === 'true',
    WORKER_PROCESSES: parseInt(process.env.WORKER_PROCESSES) || require('os').cpus().length,
    
    // Development vs Production specific settings
    isDevelopment: () => config.NODE_ENV === 'development',
    isProduction: () => config.NODE_ENV === 'production',
    isTest: () => config.NODE_ENV === 'test'
};

// Validation function to ensure required configuration
const validateConfig = () => {
    const required = ['PORT', 'HOST'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    // Validate port range
    if (config.PORT < 1 || config.PORT > 65535) {
        throw new Error(`Invalid port number: ${config.PORT}. Must be between 1 and 65535.`);
    }
    
    // Validate rate limit settings
    if (config.RATE_LIMIT_MAX_REQUESTS < 1) {
        throw new Error('Rate limit max requests must be greater than 0');
    }
    
    // Validate room size
    if (config.MAX_ROOM_SIZE < 2 || config.MAX_ROOM_SIZE > 50) {
        throw new Error('Max room size must be between 2 and 50');
    }
    
    return true;
};

// Initialize configuration validation
try {
    validateConfig();
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
}

// Export configuration
module.exports = config;
