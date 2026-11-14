import { defineConfig, devices } from "@playwright/test";

// Chromium only: this suite covers a handful of golden-path regressions, not
// cross-browser compatibility, so extra browser downloads/runs would only
// add time without adding signal.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    // See .claude/inspector/lib.mjs: lets environments without the matching
    // browser download use a preinstalled Chromium instead.
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
