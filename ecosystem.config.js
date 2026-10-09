module.exports = {
  apps: [
    {
      name: 'crm-front-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3020',
      env: {
        NODE_ENV: 'production',
        PORT: 3020,
      },
    },
  ],
};
