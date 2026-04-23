require('dotenv').config()

const port = process.env.VITE_PORT || 5173

module.exports = {
  apps: [
    {
      name: 'synthetic-dashboard',
      script: 'npx',
      args: `vite preview --port ${port} --host 0.0.0.0`,
    },
  ],
}
