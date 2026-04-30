/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // Next.js Application
      name: 'jollofexpress',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: './.env.local', // Load environment variables from .env.local
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // Baileys WhatsApp Service
      name: 'whatsapp-service',
      script: './scripts/baileys-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: 10000,
      // Give the graceful-shutdown handler time to flush the Signal auth
      // store before SIGKILL — interrupted writes desync the ratchet.
      kill_timeout: 10000,
      env_file: './.env.local',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
      },
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // Print Queue Worker
      name: 'print-worker',
      script: './scripts/print-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 10000, // Wait 10 seconds before restarting
      max_restarts: 0,      // Never stop restarting (0 = unlimited)
      min_uptime: 10000,    // Consider stable after 10 seconds
      env_file: './.env.local', // Load environment variables from .env.local
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/print-worker-error.log',
      out_file: './logs/print-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // Feedback Request Worker — prompts customers for a rating 45+ min
      // after order completion; AI records replies via submit_feedback tool.
      name: 'feedback-worker',
      script: './scripts/feedback-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 10000,
      max_restarts: 0,
      min_uptime: 10000,
      env_file: './.env.local',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/feedback-worker-error.log',
      out_file: './logs/feedback-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // Tracking Worker — polls driver locations for active deliveries so
      // the geofence (nearby notify / arrival / auto-complete on exit) runs
      // even when the admin batch-map UI isn't open.
      name: 'tracking-worker',
      script: './scripts/tracking-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 10000,
      max_restarts: 0,
      min_uptime: 10000,
      env_file: './.env.local',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/tracking-worker-error.log',
      out_file: './logs/tracking-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  /**
   * Deployment Configuration (optional)
   * 
   * To deploy from local machine to server:
   *   pm2 deploy ecosystem.config.js production setup
   *   pm2 deploy ecosystem.config.js production
   */
  deploy: {
    production: {
      user: 'deploy',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/master',
      repo: 'https://github.com/resocorp/jollofexpress.git',
      path: '/home/deploy/jollofexpress',
      'post-deploy': 
        'npm install && ' +
        'npm run build && ' +
        'pm2 reload ecosystem.config.js --env production && ' +
        'pm2 save',
    },
  },
};
