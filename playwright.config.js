const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both backend and frontend before running UI tests.
  // Each server is started in order; Playwright waits for the port to be available.
  webServer: [
    {
      command: 'cd backend && npm start',
      port: 5000,
      timeout: 30000,
      reuseExistingServer: true,
      env: {
        NODE_ENV: 'development',
        PORT: '5000',
        JWT_SECRET: 'queuecare-jwt-secret-key-2024-dev',
        FRONTEND_URL: 'http://localhost:3000',
      },
    },
    {
      command: 'cd frontend && npm run dev',
      port: 3000,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
});
