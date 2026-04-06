module.exports = {
  apps: [
    {
      name: "merlin-api",
      script: "dist/server.js",
      cwd: "/usr/src/app",
      instances: 1,
      autorestart: false,
      watch: false,
      max_restarts: 3,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
