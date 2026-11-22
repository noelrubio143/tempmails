module.exports = {
  apps: [
    {
      name: "astrxymail",
      script: "pnpm",
      args: "start -p 3000",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_memory_restart: "600M",
      autorestart: true,
    },
  ],
}
