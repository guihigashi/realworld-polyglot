import { defineConfig, devices } from "@playwright/test"
import { baseConfig } from "../../reference/realworld-spec/specs/e2e/playwright.base"

export default defineConfig({
  ...baseConfig,
  testDir: "../../reference/realworld-spec/specs/e2e",
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
