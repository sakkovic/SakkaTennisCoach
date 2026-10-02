import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests: a real browser clicks through every public and admin flow.
 *
 * They run against a separate production build in DEMO MODE (in-memory data, port 3100),
 * so they never touch the real Supabase database or send real emails. The Supabase
 * variables are set to empty strings on purpose: Next.js does not override variables
 * that already exist, so `.env.local` cannot switch this copy to the real database.
 *
 *   npm run test:e2e
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // one shared in-memory database: run in order
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome", // the installed Google Chrome, no browser download
    locale: "en-GB",
    timezoneId: "Africa/Tunis",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DEMO_MODE: "true",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_ANON_KEY: "",
      RESEND_API_KEY: "",
    },
  },
});
