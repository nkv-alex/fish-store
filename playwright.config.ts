import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/order/cancelled",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/fish_store?schema=public",
    },
  },
});
