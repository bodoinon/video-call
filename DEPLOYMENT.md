# Video Call Application - Deployment Guide

## 🚀 Quick Start

### For Development
```bash
npm install
npm run dev
```

### For Production
```bash
# Option 1: Direct deployment
npm ci --only=production
npm start

# Option 2: Automated deployment script
chmod +x deploy.sh
./deploy.sh

# Option 3: Docker deployment
npm run docker:build
npm run docker:run
```

## 📋 Production Checklist

### ✅ Security Features Implemented
- [x] **Helmet.js** - Security headers protection
- [x] **CORS** - Cross-origin resource sharing control
- [x] **Rate Limiting** - Prevents abuse and DoS attacks
- [x] **Input Validation** - Validates all incoming data
- [x] **XSS Protection** - Prevents cross-site scripting
- [x] **Content Security Policy** - Restricts resource loading

### ✅ Reliability Features Implemented
- [x] **Error Handling** - Comprehensive error handling and logging
- [x] **Graceful Shutdown** - Proper cleanup on termination
- [x] **Health Checks** - Monitoring endpoints
- [x] **Logging System** - Structured logging with multiple levels
- [x] **Process Management** - PM2 cluster mode support

### ✅ Performance Features Implemented
- [x] **Compression** - Gzip compression for responses
- [x] **Static File Caching** - Optimized asset delivery
- [x] **Cluster Mode** - Multi-process support
- [x] **Memory Management** - Automatic restart on memory limits

### ✅ Monitoring Features Implemented
- [x] **Health Endpoints** - `/health` and `/api/status`
- [x] **Performance Metrics** - Memory, CPU, uptime tracking
- [x] **Connection Monitoring** - Active connections and rooms
- [x] **Log Rotation** - Automatic log management

## 🔧 Configuration

### Environment Variables
Copy `env.example` to `.env` and configure:

```bash
# Essential settings
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# Security settings
RATE_LIMIT_MAX_REQUESTS=100
MAX_ROOM_SIZE=10

# Logging
LOG_LEVEL=info
LOG_FILE=src/logs/app.log
```

### PM2 Configuration
The `ecosystem.config.js` file provides:
- Cluster mode with all CPU cores
- Auto-restart on crashes
- Memory limit monitoring
- Log rotation
- Environment-specific settings

## 🌐 VPS Deployment

### Automated Deployment
Run the deployment script for a complete setup:

```bash
./deploy.sh
```

This script will:
1. Update system packages
2. Install Node.js 18
3. Install PM2 process manager
4. Install and configure Nginx
5. Setup firewall rules
6. Deploy the application
7. Configure SSL with Let's Encrypt
8. Setup monitoring

### Manual Deployment Steps

1. **System Setup**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx ufw
   ```

2. **Install PM2**
   ```bash
   sudo npm install -g pm2
   sudo pm2 startup systemd -u $USER --hp $HOME
   ```

3. **Deploy Application**
   ```bash
   git clone <your-repo>
   cd video-call-app
   npm ci --only=production
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

4. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/video-call-app
   # Add configuration from README.md
   sudo ln -s /etc/nginx/sites-available/video-call-app /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. **Setup SSL**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## 🔍 Monitoring

### Health Checks
- **Basic Health**: `curl http://localhost:3000/health`
- **Detailed Status**: `curl http://localhost:3000/api/status`

### PM2 Monitoring
```bash
pm2 status          # Show process status
pm2 monit           # Real-time monitoring
pm2 logs            # View logs
pm2 restart all     # Restart all processes
```

### System Monitoring
```bash
htop                # System resource usage
df -h               # Disk usage
free -h             # Memory usage
netstat -tlnp       # Network connections
```

## 🛠️ Maintenance

### Regular Tasks
```bash
# Update dependencies
npm update

# Security audit
npm audit
npm audit fix

# Restart application
pm2 restart video-call-server

# View logs
pm2 logs --lines 100

# Clean old logs
npm run clean
```

### Backup Strategy
1. **Application Code**: Git repository
2. **Configuration**: Environment files
3. **Logs**: Regular log rotation
4. **SSL Certificates**: Let's Encrypt auto-renewal

## 🚨 Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   pm2 logs video-call-server
   node src/app.js  # Test direct execution
   ```

2. **WebRTC Connection Issues**
   - Check HTTPS configuration
   - Verify firewall settings
   - Test STUN servers

3. **High Memory Usage**
   ```bash
   pm2 restart video-call-server
   # Check for memory leaks in logs
   ```

4. **Nginx Errors**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

### Debug Mode
```bash
export LOG_LEVEL=debug
pm2 restart video-call-server
pm2 logs --lines 50
```

## 📊 Performance Optimization

### Server Optimization
- Use SSD storage for better I/O performance
- Enable HTTP/2 in Nginx
- Configure proper caching headers
- Use CDN for static assets

### Application Optimization
- Monitor memory usage with PM2
- Use cluster mode for multi-core utilization
- Implement connection pooling
- Optimize database queries (if applicable)

## 🔒 Security Best Practices

1. **Regular Updates**
   - Keep system packages updated
   - Update Node.js and npm regularly
   - Monitor security advisories

2. **Access Control**
   - Use SSH keys instead of passwords
   - Implement fail2ban for SSH protection
   - Regular security audits

3. **Network Security**
   - Configure firewall rules properly
   - Use HTTPS everywhere
   - Implement rate limiting

4. **Application Security**
   - Validate all inputs
   - Use secure headers
   - Regular dependency audits

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx/HAProxy)
- Implement Redis for session sharing
- Use CDN for static assets
- Database clustering (if applicable)

### Vertical Scaling
- Increase server resources
- Optimize application code
- Use PM2 cluster mode
- Monitor performance metrics

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Test with debug mode enabled
4. Create GitHub issue with details

## 🎯 Success Metrics

After deployment, verify:
- [ ] Application starts successfully
- [ ] Health checks return 200 OK
- [ ] WebRTC connections work
- [ ] Chat functionality works
- [ ] Screen sharing works
- [ ] SSL certificate is valid
- [ ] Monitoring is active
- [ ] Logs are being written
- [ ] PM2 is managing processes
- [ ] Nginx is proxying correctly
