/**
 * Authentication Setup for E2E Tests
 *
 * This setup file authenticates a test user and saves the authentication state
 * so all tests can reuse it without logging in each time.
 *
 * Testing Spec Reference: docs/06-testing-specification.md §12.1
 */

import { test as setup, expect } from '@playwright/test';

// Path relative to the config file location (apps/dashboard)
// This path is resolved relative to the playwright.config.ts location
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in test credentials
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'admin123');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for authentication to complete and redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Verify we're on the dashboard (authentication succeeded)
    await expect(page).toHaveURL(/\/dashboard/);

    // Save authentication state (cookies, localStorage, etc.)
    await page.context().storageState({ path: authFile });
});
