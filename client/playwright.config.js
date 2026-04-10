import { defineConfig, devices } from '@playwright/test';

const RENDER_API = 'https://quota-leave-management-software.onrender.com';

const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1';
// Use localhost (not 127.0.0.1) so Origin matches backend CORS `localhost` check before redeploy
const previewURL = 'http://localhost:4173';
const baseURL =
  usePreview
    ? previewURL
    : process.env.PLAYWRIGHT_BASE_URL ||
      'https://quota-leave-management-software-fia.vercel.app';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  ...(usePreview
    ? {
        webServer: {
          command: 'npm run build && npx vite preview --host localhost --port 4173',
          url: previewURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            ...process.env,
            PLAYWRIGHT_PREVIEW_API: RENDER_API,
          },
        },
      }
    : {}),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: {} }],
});
