// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'skytrack-api',
      cwd: './packages/api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'skytrack-web',
      cwd: './packages/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'skytrack-cron',
      cwd: './packages/api',
      script: 'dist/cron/runner.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 0 * * *', // Restart at midnight
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  deploy: {
    production: {
      user: 'skytrack',
      host: '192.168.1.100',
      ref: 'origin/main',
      repo: 'git@github.com:m00nsp3ll/SkyTrack.git',
      path: '/home/skytrack/parasut',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run db:migrate && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
