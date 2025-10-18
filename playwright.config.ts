// playwright.config.ts (корень репо)
import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
    testDir: path.join(__dirname, "tests"),
    use: { baseURL: "http://localhost:3000" },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "pnpm --filter web dev",
        cwd: __dirname,
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
