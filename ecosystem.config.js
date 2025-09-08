/**
 * PM2 Ecosystem Configuration
 * Production-ready process management configuration
 * 
 * This file configures PM2 for running the video call application
 * in production with clustering, monitoring, and auto-restart capabilities.
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'video-call-server',
      
      // Application script
      script: 'src/app.js',
      
      // Number of instances (use 'max' for all CPU cores)
      instances: 'max',
      
      // Execution mode
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'info'
      },
      
      // Production environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'info',
        CORS_ORIGIN: 'https://yourdomain.com'
      },
      
      // Auto restart configuration
      autorestart: true,
      
      // Watch for file changes (disabled in production)
      watch: false,
      
      // Maximum memory usage before restart (in MB)
      max_memory_restart: '1G',
      
      // Error file path
      error_file: './logs/err.log',
      
      // Output file path
      out_file: './logs/out.log',
      
      // Log file path
      log_file: './logs/combined.log',
      
      // Log date format
      time: true,
      
      // Log rotation
      log_type: 'json',
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Wait ready
      wait_ready: true,
      
      // Listen timeout
      listen_timeout: 10000,
      
      // Restart delay
      restart_delay: 4000,
      
      // Max restart attempts
      max_restarts: 10,
      
      // Min uptime before considering restart
      min_uptime: '10s',
      
      // Cron restart (optional - restart daily at 2 AM)
      // cron_restart: '0 2 * * *',
      
      // Source map support
      source_map_support: true,
      
      // Node arguments
      node_args: '--max-old-space-size=1024',
      
      // Ignore watch patterns
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        'coverage'
      ],
      
      // Environment specific configurations
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      }
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:username/video-call-app.git',
      path: '/var/www/video-call-app',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:username/video-call-app.git',
      path: '/var/www/video-call-app-staging',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
