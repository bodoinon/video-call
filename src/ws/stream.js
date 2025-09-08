/**
 * WebSocket Stream Handler Module
 * Handles real-time communication for video calling application
 * 
 * Features:
 * - Room-based video calling
 * - WebRTC signaling (SDP, ICE candidates)
 * - Real-time chat functionality
 * - Comprehensive error handling and validation
 * - Connection state management
 * - Rate limiting and spam protection
 */

const logger = require('../utils/logger');
const config = require('../config/config');

// Rate limiting for socket events
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX_EVENTS = 10; // Max events per window

/**
 * Check if socket is rate limited
 * @param {string} socketId - Socket ID
 * @param {string} event - Event name
 * @returns {boolean} True if rate limited
 */
const isRateLimited = (socketId, event) => {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
        rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }
    
    const limit = rateLimitMap.get(key);
    
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
        return false;
    }
    
    if (limit.count >= RATE_LIMIT_MAX_EVENTS) {
        return true;
    }
    
    limit.count++;
    return false;
};

/**
 * Validate room data
 * @param {Object} data - Room data
 * @returns {boolean} True if valid
 */
const validateRoomData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!data.room || typeof data.room !== 'string' || data.room.length === 0) {
        return false;
    }
    
    if (!data.socketId || typeof data.socketId !== 'string' || data.socketId.length === 0) {
        return false;
    }
    
    // Check room name length and characters
    if (data.room.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(data.room)) {
        return false;
    }
    
    return true;
};

/**
 * Validate SDP data
 * @param {Object} data - SDP data
 * @returns {boolean} True if valid
 */
const validateSDPData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!data.to || typeof data.to !== 'string') {
        return false;
    }
    
    if (!data.sender || typeof data.sender !== 'string') {
        return false;
    }
    
    if (!data.description || typeof data.description !== 'object') {
        return false;
    }
    
    if (!data.description.type || !['offer', 'answer'].includes(data.description.type)) {
        return false;
    }
    
    if (!data.description.sdp || typeof data.description.sdp !== 'string') {
        return false;
    }
    
    return true;
};

/**
 * Validate ICE candidate data
 * @param {Object} data - ICE candidate data
 * @returns {boolean} True if valid
 */
const validateICEData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!data.to || typeof data.to !== 'string') {
        return false;
    }
    
    if (!data.sender || typeof data.sender !== 'string') {
        return false;
    }
    
    // Candidate can be null for end-of-candidates
    if (data.candidate !== null && (!data.candidate || typeof data.candidate !== 'object')) {
        return false;
    }
    
    return true;
};

/**
 * Validate chat data
 * @param {Object} data - Chat data
 * @returns {boolean} True if valid
 */
const validateChatData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!data.room || typeof data.room !== 'string') {
        return false;
    }
    
    if (!data.sender || typeof data.sender !== 'string') {
        return false;
    }
    
    if (!data.msg || typeof data.msg !== 'string') {
        return false;
    }
    
    // Check message length
    if (data.msg.length === 0 || data.msg.length > 1000) {
        return false;
    }
    
    // Basic XSS protection
    if (/<script|javascript:|on\w+=/i.test(data.msg)) {
        return false;
    }
    
    return true;
};

/**
 * Get room size
 * @param {Object} socket - Socket instance
 * @param {string} room - Room name
 * @returns {number} Number of users in room
 */
const getRoomSize = (socket, room) => {
    try {
        const roomData = socket.adapter.rooms.get(room);
        return roomData ? roomData.size : 0;
    } catch (error) {
        logger.error('Error getting room size:', { room, error: error.message });
        return 0;
    }
};

/**
 * Main stream handler function
 * @param {Object} socket - Socket.IO socket instance
 */
const stream = (socket) => {
    logger.info('New socket connection established', { socketId: socket.id });
    
    // Track socket connection time
    const connectionTime = Date.now();
    
    // Handle room subscription
    socket.on('subscribe', (data) => {
        try {
            // Rate limiting check
            if (isRateLimited(socket.id, 'subscribe')) {
                logger.warn('Rate limited subscribe attempt', { socketId: socket.id });
                socket.emit('error', { message: 'Too many requests. Please slow down.' });
                return;
            }
            
            // Validate data
            if (!validateRoomData(data)) {
                logger.warn('Invalid room data received', { socketId: socket.id, data });
                socket.emit('error', { message: 'Invalid room data' });
                return;
            }
            
            // Check room size limit
            const currentRoomSize = getRoomSize(socket, data.room);
            if (currentRoomSize >= config.MAX_ROOM_SIZE) {
                logger.warn('Room size limit exceeded', { 
                    socketId: socket.id, 
                    room: data.room, 
                    currentSize: currentRoomSize 
                });
                socket.emit('error', { message: 'Room is full. Maximum capacity reached.' });
                return;
            }
            
            // Join room and socket ID
            socket.join(data.room);
            socket.join(data.socketId);
            
            logger.info('User joined room', { 
                socketId: socket.id, 
                room: data.room,
                roomSize: getRoomSize(socket, data.room)
            });
            
            // Inform other members in the room of new user's arrival
            if (socket.adapter.rooms.has(data.room)) {
                socket.to(data.room).emit('new user', { 
                    socketId: data.socketId,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            logger.error('Error in subscribe handler:', { 
                socketId: socket.id, 
                error: error.message,
                stack: error.stack 
            });
            socket.emit('error', { message: 'Internal server error' });
        }
    });
    
    // Handle new user start (WebRTC offer initiation)
    socket.on('newUserStart', (data) => {
        try {
            // Rate limiting check
            if (isRateLimited(socket.id, 'newUserStart')) {
                logger.warn('Rate limited newUserStart attempt', { socketId: socket.id });
                return;
            }
            
            // Validate data
            if (!data || !data.to || !data.sender) {
                logger.warn('Invalid newUserStart data', { socketId: socket.id, data });
                return;
            }
            
            logger.debug('New user start signal', { 
                socketId: socket.id, 
                target: data.to, 
                sender: data.sender 
            });
            
            socket.to(data.to).emit('newUserStart', { 
                sender: data.sender,
                timestamp: Date.now()
            });
            
        } catch (error) {
            logger.error('Error in newUserStart handler:', { 
                socketId: socket.id, 
                error: error.message 
            });
        }
    });
    
    // Handle SDP (Session Description Protocol) exchange
    socket.on('sdp', (data) => {
        try {
            // Rate limiting check
            if (isRateLimited(socket.id, 'sdp')) {
                logger.warn('Rate limited SDP attempt', { socketId: socket.id });
                return;
            }
            
            // Validate SDP data
            if (!validateSDPData(data)) {
                logger.warn('Invalid SDP data received', { socketId: socket.id, data });
                return;
            }
            
            logger.debug('SDP exchange', { 
                socketId: socket.id, 
                type: data.description.type,
                target: data.to,
                sender: data.sender
            });
            
            socket.to(data.to).emit('sdp', { 
                description: data.description, 
                sender: data.sender,
                timestamp: Date.now()
            });
            
        } catch (error) {
            logger.error('Error in SDP handler:', { 
                socketId: socket.id, 
                error: error.message 
            });
        }
    });
    
    // Handle ICE candidates exchange
    socket.on('ice candidates', (data) => {
        try {
            // Rate limiting check
            if (isRateLimited(socket.id, 'ice candidates')) {
                logger.warn('Rate limited ICE candidates attempt', { socketId: socket.id });
                return;
            }
            
            // Validate ICE candidate data
            if (!validateICEData(data)) {
                logger.warn('Invalid ICE candidate data received', { socketId: socket.id, data });
                return;
            }
            
            logger.debug('ICE candidates exchange', { 
                socketId: socket.id, 
                target: data.to,
                sender: data.sender,
                hasCandidate: !!data.candidate
            });
            
            socket.to(data.to).emit('ice candidates', { 
                candidate: data.candidate, 
                sender: data.sender,
                timestamp: Date.now()
            });
            
        } catch (error) {
            logger.error('Error in ICE candidates handler:', { 
                socketId: socket.id, 
                error: error.message 
            });
        }
    });
    
    // Handle chat messages
    socket.on('chat', (data) => {
        try {
            // Rate limiting check
            if (isRateLimited(socket.id, 'chat')) {
                logger.warn('Rate limited chat attempt', { socketId: socket.id });
                socket.emit('error', { message: 'Too many messages. Please slow down.' });
                return;
            }
            
            // Validate chat data
            if (!validateChatData(data)) {
                logger.warn('Invalid chat data received', { socketId: socket.id, data });
                socket.emit('error', { message: 'Invalid message format' });
                return;
            }
            
            logger.debug('Chat message sent', { 
                socketId: socket.id, 
                room: data.room,
                sender: data.sender,
                messageLength: data.msg.length
            });
            
            socket.to(data.room).emit('chat', { 
                sender: data.sender, 
                msg: data.msg,
                timestamp: Date.now()
            });
            
        } catch (error) {
            logger.error('Error in chat handler:', { 
                socketId: socket.id, 
                error: error.message 
            });
            socket.emit('error', { message: 'Failed to send message' });
        }
    });
    
    // Handle user leaving room
    socket.on('leaveRoom', (data) => {
        try {
            if (data && data.room) {
                socket.leave(data.room);
                socket.to(data.room).emit('userLeft', { 
                    socketId: socket.id,
                    timestamp: Date.now()
                });
                
                logger.info('User left room', { 
                    socketId: socket.id, 
                    room: data.room 
                });
            }
        } catch (error) {
            logger.error('Error in leaveRoom handler:', { 
                socketId: socket.id, 
                error: error.message 
            });
        }
    });
    
    // Handle socket disconnection
    socket.on('disconnect', (reason) => {
        const connectionDuration = Date.now() - connectionTime;
        
        logger.info('Socket disconnected', { 
            socketId: socket.id, 
            reason, 
            connectionDuration: `${connectionDuration}ms`
        });
        
        // Clean up rate limiting data
        const keysToDelete = [];
        for (const key of rateLimitMap.keys()) {
            if (key.startsWith(socket.id)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => rateLimitMap.delete(key));
        
        // Notify all rooms that user left
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('userLeft', { 
                    socketId: socket.id,
                    timestamp: Date.now()
                });
            }
        });
    });
    
    // Handle socket errors
    socket.on('error', (error) => {
        logger.error('Socket error:', { 
            socketId: socket.id, 
            error: error.message,
            stack: error.stack 
        });
    });
};

module.exports = stream;
