import { defineConfig, devices } from "@playwright/test"
import { baseConfig } from "../../reference/realworld-spec/specs/e2e/playwright.base"

export default defineConfig({
  ...baseConfig,
  testDir: "../../reference/realworld-spec/specs/e2e",
  fullyParallel: true,
  retries: 2,
  workers: process.env.CI ? 1 : 4,
  use: {
    ...baseConfig.use,
    baseURL: "http://localhost:5173",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
})
