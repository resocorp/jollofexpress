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
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
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
      restart_delay: 5000, // Wait 5 seconds before restarting
      max_restarts: 10,    // Max 10 restarts within 1 minute
      min_uptime: 10000,   // Consider stable after 10 seconds
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/print-worker-error.log',
      out_file: './logs/print-worker-out.log',
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
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPO_URL',
      path: '/home/deploy/jollofexpress',
      'post-deploy': 
        'npm install && ' +
        'npm run build && ' +
        'pm2 reload ecosystem.config.js --env production && ' +
        'pm2 save',
    },
  },
};
