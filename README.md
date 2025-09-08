# Video Call Application - Production Ready Backend

A robust, production-ready video calling application built with Node.js, Express, Socket.IO, and WebRTC. This application supports multi-user video calls, screen sharing, real-time chat, and recording capabilities with enterprise-grade security and reliability.

## 🚀 Features

### Core Functionality
- **Multi-user Video Calling**: Support for up to 10 users per room
- **Screen Sharing**: Share your screen with other participants
- **Real-time Chat**: Text messaging during video calls
- **Recording**: Record video calls or screen sharing sessions
- **Room Management**: Create and join video call rooms

### Production Features
- **Security**: CORS protection, rate limiting, input validation, XSS protection
- **Error Handling**: Comprehensive error handling and logging
- **Monitoring**: Health check endpoints and performance metrics
- **Scalability**: Cluster mode support and Redis integration ready
- **Docker Support**: Containerized deployment with Docker
- **SSL/TLS**: HTTPS support for secure connections

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Modern web browser with WebRTC support
- For production: SSL certificate (recommended)

## 🛠️ Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Video-Call-App-NodeJS-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Create a room or join an existing one
   - Share the room link with others

### Production Deployment

#### Option 1: Direct Deployment

1. **Install dependencies**
   ```bash
   npm ci --only=production
   ```

2. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export CORS_ORIGIN=https://yourdomain.com
   ```

3. **Start the server**
   ```bash
   npm start
   ```

#### Option 2: Docker Deployment

1. **Build Docker image**
   ```bash
   npm run docker:build
   ```

2. **Run container**
   ```bash
   npm run docker:run
   ```

#### Option 3: PM2 Process Manager (Recommended for Production)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 ecosystem file**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'video-call-server',
       script: 'src/app.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Application environment |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `MAX_ROOM_SIZE` | `10` | Maximum users per room |
| `LOG_LEVEL` | `info` | Logging level |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Rate limit per window |

### Security Configuration

The application includes several security features:

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Validates all incoming data
- **XSS Protection**: Prevents cross-site scripting

## 📊 Monitoring and Health Checks

### Health Check Endpoints

- `GET /health` - Basic health check
- `GET /api/status` - Detailed service status

### Example Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  },
  "version": "1.0.0"
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Logging

Logs are written to `src/logs/app.log` and include:
- HTTP requests
- WebSocket events
- Error messages
- Performance metrics
- Application lifecycle events

## 🚀 Deployment on VPS

### Ubuntu/Debian VPS Setup

1. **Update system**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone and setup application**
   ```bash
   git clone <your-repo>
   cd video-call-app
   npm ci --only=production
   ```

5. **Configure firewall**
   ```bash
   sudo ufw allow 3000
   sudo ufw allow 80
   sudo ufw allow 443
   ```

6. **Setup SSL with Let's Encrypt** (recommended)
   ```bash
   sudo apt install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

7. **Start application**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **WebRTC Connection Issues**
   - Ensure HTTPS is enabled in production
   - Check firewall settings
   - Verify STUN servers are accessible

2. **Socket.IO Connection Problems**
   - Check CORS configuration
   - Verify proxy settings
   - Ensure WebSocket support

3. **Performance Issues**
   - Monitor memory usage
   - Check CPU utilization
   - Review log files for errors

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
npm start
```

## 📚 API Documentation

### WebSocket Events

#### Client to Server Events

- `subscribe` - Join a room
- `newUserStart` - Initiate WebRTC connection
- `sdp` - Send SDP offer/answer
- `ice candidates` - Send ICE candidates
- `chat` - Send chat message
- `leaveRoom` - Leave current room

#### Server to Client Events

- `new user` - New user joined room
- `userLeft` - User left room
- `sdp` - Receive SDP offer/answer
- `ice candidates` - Receive ICE candidates
- `chat` - Receive chat message
- `error` - Error message

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error messages

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Update dependencies**
   ```bash
   npm update
   ```

2. **Check for security vulnerabilities**
   ```bash
   npm audit
   npm audit fix
   ```

3. **Monitor logs**
   ```bash
   pm2 logs video-call-server
   ```

4. **Restart application**
   ```bash
   pm2 restart video-call-server
   ```

## 🏗️ Architecture

The application follows a modular architecture:

```
src/
├── app.js              # Main application entry point
├── config/
│   └── config.js       # Configuration management
├── utils/
│   └── logger.js       # Logging utility
├── ws/
│   └── stream.js       # WebSocket event handlers
└── assets/             # Static assets
```

This architecture ensures:
- Separation of concerns
- Easy testing and maintenance
- Scalable codebase
- Production-ready structure

## 🎯 Quick Start Commands

```bash
# Development
npm run dev

# Production
npm start

# Docker
npm run docker:build
npm run docker:run

# Health Check
npm run health

# View Logs
npm run logs

# Clean Logs
npm run clean
```