import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright Configuration for E2E Tests
 *
 * Testing Spec Reference: docs/06-testing-specification.md §12.1
 * Tool: Playwright 1.40.x
 */
export default defineConfig({
	// Test directory
	testDir: './tests/e2e',

	// Test file pattern
	testMatch: '**/*.spec.ts',

	// Maximum time one test can run
	timeout: 30 * 1000,

	// Expect timeout
	expect: {
		timeout: 10 * 1000,
	},

	// Run tests in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		...(process.env.CI ? [['github'] as const] : []),
	],

	// Shared settings for all projects
	use: {
		// Base URL for all tests
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

		// Collect trace on failure
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'on-first-retry',
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		// Add more browsers for Phase 2:
		// {
		//   name: 'firefox',
		//   use: { ...devices['Desktop Firefox'] },
		// },
		// {
		//   name: 'webkit',
		//   use: { ...devices['Desktop Safari'] },
		// },
	],

	// Output folder for test artifacts
	outputDir: 'test-results/',

	// Run local dev server before starting the tests
	webServer: [
		// API server (required for dashboard to fetch metrics)
		{
			command: 'pnpm --filter @repo/api dev',
			url: 'http://localhost:3001/health',
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: path.resolve(__dirname, '../../'),
		},
		// Dashboard server
		{
			command: 'pnpm dev',
			url: 'http://localhost:3000',
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000, // 2 minutes for build
			stdout: 'pipe',
			stderr: 'pipe',
		},
	],

	// Global setup: Seed database before running tests
	globalSetup: './tests/setup-e2e.ts',
});
