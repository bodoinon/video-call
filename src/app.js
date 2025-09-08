/**
 * Video Call Application Backend Server
 * Production-ready Node.js server with WebRTC signaling support
 * 
 * Features:
 * - WebSocket-based signaling for WebRTC connections
 * - Room-based video calling
 * - Real-time chat functionality
 * - Production-ready error handling and logging
 * - Security middleware and rate limiting
 * - Health monitoring endpoints
 * - Graceful shutdown handling
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const favicon = require('serve-favicon');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// Import custom modules
const stream = require('./ws/stream');
const logger = require('./utils/logger');
const config = require('./config/config');

// Initialize Express application
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with production settings
const io = socketIo(server, {
    cors: {
        origin: config.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://stackpath.bootstrapcdn.com", "https://use.fontawesome.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.rawgit.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            mediaSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Request logging
if (config.NODE_ENV === 'production') {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
} else {
    app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(favicon(path.join(__dirname, 'favicon.ico')));
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.status(200).json({
        service: 'Video Call Server',
        status: 'operational',
        timestamp: new Date().toISOString(),
        activeConnections: io.engine.clientsCount,
        rooms: Array.from(io.sockets.adapter.rooms.keys()).length
    });
});

// Main application route
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        logger.error('Error serving main page:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    
    if (res.headersSent) {
        return next(error);
    }
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: config.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : error.message,
        timestamp: new Date().toISOString()
    });
});

// Socket.IO connection handling with error management
io.of('/stream').on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);
    
    // Handle connection errors
    socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Clean up rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('userLeft', { socketId: socket.id });
            }
        });
    });
    
    // Apply stream handling
    stream(socket);
});

// Server error handling
server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = config.PORT || 3000;
const HOST = config.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    logger.info(`Video Call Server running on ${HOST}:${PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`CORS Origin: ${config.CORS_ORIGIN}`);
});

// Export for testing
module.exports = { app, server, io };