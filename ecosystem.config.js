// PM2 process manager config for VPS
module.exports = {
  apps: [{
    name: 'dawn-bot',
    script: 'server/index.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 3178,
    },
    // Restart if memory exceeds 500MB
    max_memory_restart: '500M',
    // Auto restart on crash
    autorestart: true,
    // Keep logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './data/pm2-error.log',
    out_file: './data/pm2-out.log',
  }]
};
