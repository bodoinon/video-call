#!/bin/bash

# Video Call Application Deployment Script
# Production-ready deployment automation for VPS deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="video-call-server"
APP_DIR="/var/www/video-call-app"
SERVICE_USER="www-data"
NODE_VERSION="18"
PM2_VERSION="latest"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if running on Ubuntu/Debian
    if ! command -v apt-get &> /dev/null; then
        log_error "This script is designed for Ubuntu/Debian systems"
        exit 1
    fi
    
    # Check available disk space (minimum 1GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
        log_error "Insufficient disk space. At least 1GB required."
        exit 1
    fi
    
    log_success "System requirements check passed"
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    log_success "System packages updated"
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js ${NODE_VERSION}..."
    
    # Remove existing Node.js if present
    sudo apt remove -y nodejs npm || true
    
    # Install Node.js from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    log_success "Node.js ${NODE_VER} and npm ${NPM_VER} installed"
}

# Install PM2
install_pm2() {
    log_info "Installing PM2 process manager..."
    sudo npm install -g pm2@${PM2_VERSION}
    
    # Setup PM2 startup script
    sudo pm2 startup systemd -u $USER --hp $HOME
    log_success "PM2 installed and configured"
}

# Install Nginx
install_nginx() {
    log_info "Installing Nginx..."
    sudo apt install -y nginx
    
    # Enable and start Nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log_success "Nginx installed and started"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Install UFW if not present
    sudo apt install -y ufw
    
    # Configure firewall rules
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw --force enable
    
    log_success "Firewall configured"
}

# Create application directory
create_app_directory() {
    log_info "Creating application directory..."
    
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$SERVICE_USER $APP_DIR
    sudo chmod 755 $APP_DIR
    
    log_success "Application directory created: $APP_DIR"
}

# Deploy application
deploy_app() {
    log_info "Deploying application..."
    
    # Copy application files
    cp -r . $APP_DIR/
    cd $APP_DIR
    
    # Install dependencies
    npm ci --only=production
    
    # Create necessary directories
    mkdir -p src/logs src/uploads
    
    # Set proper permissions
    sudo chown -R $USER:$SERVICE_USER $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    log_success "Application deployed successfully"
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/video-call-app > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL configuration (will be updated by Let's Encrypt)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/video-call-app /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    log_success "Nginx configured successfully"
}

# Start application with PM2
start_application() {
    log_info "Starting application with PM2..."
    
    cd $APP_DIR
    
    # Start the application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Show PM2 status
    pm2 status
    
    log_success "Application started successfully"
}

# Install SSL certificate (Let's Encrypt)
install_ssl() {
    log_info "Installing SSL certificate with Let's Encrypt..."
    
    # Install Certbot
    sudo apt install -y certbot python3-certbot-nginx
    
    # Get domain name
    read -p "Enter your domain name (or press Enter to skip SSL setup): " DOMAIN_NAME
    
    if [ ! -z "$DOMAIN_NAME" ]; then
        # Update Nginx configuration with domain
        sudo sed -i "s/server_name _;/server_name $DOMAIN_NAME;/g" /etc/nginx/sites-available/video-call-app
        
        # Reload Nginx
        sudo systemctl reload nginx
        
        # Obtain SSL certificate
        sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
        
        log_success "SSL certificate installed for $DOMAIN_NAME"
    else
        log_warning "SSL setup skipped. You can run 'sudo certbot --nginx' later to set up SSL."
    fi
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up basic monitoring..."
    
    # Install htop for system monitoring
    sudo apt install -y htop
    
    # Create monitoring script
    cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash
echo "=== Video Call Server Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== System Resources ==="
echo "Memory Usage:"
free -h
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "=== Application Health ==="
curl -s http://localhost:3000/health | jq . || echo "Health check failed"
EOF
    
    chmod +x $APP_DIR/monitor.sh
    
    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    log_info "Starting Video Call Application deployment..."
    
    check_root
    check_requirements
    update_system
    install_nodejs
    install_pm2
    install_nginx
    configure_firewall
    create_app_directory
    deploy_app
    configure_nginx
    start_application
    install_ssl
    setup_monitoring
    
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "1. Access your application at: http://$(curl -s ifconfig.me) or https://yourdomain.com"
    echo "2. Monitor your application: pm2 monit"
    echo "3. View logs: pm2 logs $APP_NAME"
    echo "4. Check status: pm2 status"
    echo "5. Run monitoring script: $APP_DIR/monitor.sh"
    echo ""
    log_warning "Don't forget to:"
    echo "- Update your domain DNS to point to this server"
    echo "- Configure your firewall rules if needed"
    echo "- Set up regular backups"
    echo "- Monitor system resources"
}

# Run main function
main "$@"
