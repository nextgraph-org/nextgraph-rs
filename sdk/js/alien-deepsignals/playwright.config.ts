import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "src/test/frontend/playwright",
    timeout: 60_000,
    expect: {
        timeout: 5_000,
    },
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: "http://127.0.0.1:4322",
        trace: "on-first-retry",
        headless: true,
    },
    webServer: {
        command:
            "pnpm astro dev --root src/test/frontend/astro-app --port 4322 --host 127.0.0.1",
        url: "http://127.0.0.1:4322",
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 8_000,
    },
    projects: [
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
    ],
});
