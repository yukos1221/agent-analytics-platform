/**
 * E2E Tests: Dashboard Overview
 *
 * Testing Spec Reference: docs/06-testing-specification.md §3.5
 * MVP E2E Scope: 3 Critical Flows
 *   1. Login → Dashboard → View metrics (this test)
 *   2. Dashboard → Sessions list → Session detail
 *   3. Date range filter updates all data
 *
 * This test covers Flow #1: Dashboard metrics display
 */

import { test, expect } from '@playwright/test';

// =============================================================================
// SMOKE TEST - Minimal sanity check per Testing Spec MVP scope
// Simple, stable, high-value scenario for CI/CD gating
// =============================================================================
test.describe('Smoke Test', () => {
    /**
     * Minimal Smoke Test
     *
     * This is the simplest possible E2E test that validates:
     * 1. Dashboard page loads
     * 2. KPI cards appear
     * 3. Metric values are rendered
     * 4. Screenshot for visual verification
     *
     * Per Testing Spec §1.5: MVP E2E tests should be "simple, stable, high-value"
     * This test can run in < 10 seconds and catches major regressions.
     */
    test('dashboard loads with KPI metrics', async ({ page }) => {
        // Step 1: Open dashboard page (will redirect to /dashboard)
        await page.goto('/', { waitUntil: 'networkidle' });

        // Wait for redirect to /dashboard
        await page.waitForURL('**/dashboard**', { timeout: 10000 });

        // Step 2: Wait for API call to complete
        await page
            .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                timeout: 30000,
            })
            .catch(() => {
                // API call may have already completed, continue
            });

        // Step 3: Wait for KPI cards to appear (4 cards per PRD §5.1)
        // Look for the KPI card titles which are always present
        await expect(page.getByText('Active Users')).toBeVisible({
            timeout: 20000,
        });
        await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Success Rate')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Estimated Cost')).toBeVisible({ timeout: 10000 });

        // Step 3: Assert metric values are rendered (not empty/skeleton)
        // Check that main content area contains numeric values
        const mainContent = page.locator('main');
        const contentText = await mainContent.textContent();

        // Metrics should show numbers (e.g., "1,247", "95.5%", "$1,234.56")
        expect(contentText).toMatch(/\d+/); // Has at least one number
        expect(contentText).toMatch(/%/); // Success Rate shows percentage
        expect(contentText).toMatch(/\$/); // Estimated Cost shows dollar

        // Step 4: Take screenshot for visual verification
        await page.screenshot({
            path: 'tests/e2e/screenshots/smoke-test-dashboard.png',
            fullPage: true,
        });
    });
});

// =============================================================================
// DETAILED TESTS - Additional coverage for development
// =============================================================================
test.describe('Dashboard Overview', () => {
    test.describe('KPI Metrics Display', () => {
        test('displays dashboard with KPI cards', async ({ page }) => {
            // Navigate to dashboard (will redirect to /dashboard)
            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Wait for dashboard to load (page title)
            await expect(page).toHaveTitle(/Dashboard|AI Agent Analytics/i);

            // Wait for API call
            await page
                .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                    timeout: 30000,
                })
                .catch(() => {});

            // Wait for KPI cards container to be visible
            // The MetricGrid renders 4 cards in a grid
            const metricsGrid = page.locator('[class*="grid"]').first();
            await expect(metricsGrid).toBeVisible({ timeout: 15000 });

            // Take screenshot of initial load
            await page.screenshot({
                path: 'tests/e2e/screenshots/dashboard-initial.png',
                fullPage: true,
            });
        });

        test('KPI cards display metric values', async ({ page }) => {
            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Wait for API call
            await page
                .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                    timeout: 30000,
                })
                .catch(() => {});

            // Wait for metrics to load (not skeleton)
            // Look for the metric cards with actual values
            await page.waitForSelector('text=/Active Users|Total Sessions/i', {
                timeout: 20000,
            });

            // Verify all 4 KPI cards are present (per PRD §5.1)
            // 1. Active Users (DAU)
            const activeUsersCard = page.getByText('Active Users');
            await expect(activeUsersCard).toBeVisible();

            // 2. Total Sessions
            const totalSessionsCard = page.getByText('Total Sessions');
            await expect(totalSessionsCard).toBeVisible();

            // 3. Success Rate
            const successRateCard = page.getByText('Success Rate');
            await expect(successRateCard).toBeVisible();

            // 4. Estimated Cost
            const costCard = page.getByText('Estimated Cost');
            await expect(costCard).toBeVisible();

            // Take screenshot after metrics load
            await page.screenshot({
                path: 'tests/e2e/screenshots/dashboard-with-metrics.png',
                fullPage: true,
            });
        });

        test('KPI cards show numeric values', async ({ page }) => {
            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Wait for API call
            await page
                .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                    timeout: 30000,
                })
                .catch(() => {});

            // Wait for page to stabilize
            await page.waitForLoadState('networkidle');

            // Look for numeric values in the page
            // Active Users should show a number like "1,247"
            const numberPattern = /\d{1,3}(,\d{3})*(\.\d+)?/;

            // Find elements that contain numeric values
            const metricsSection = page.locator('main');

            // Get text content and verify it contains numbers
            const pageText = await metricsSection.textContent();

            // Verify we have numeric content (metrics loaded)
            expect(pageText).toMatch(numberPattern);

            // Verify percentage is shown (Success Rate has %)
            expect(pageText).toMatch(/%/);

            // Verify dollar amount is shown (Cost has $)
            expect(pageText).toMatch(/\$/);
        });

        test('dashboard shows trend indicators when comparison enabled', async ({ page }) => {
            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Wait for API call
            await page
                .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                    timeout: 30000,
                })
                .catch(() => {});

            // Wait for metrics to load
            await page.waitForLoadState('networkidle');

            // Look for trend indicators (up/down arrows or percentage changes)
            // The MetricCard component shows +X.X% or -X.X% with trend icons
            const trendPattern = /[+-]?\d+\.?\d*%/;
            const pageText = await page.locator('main').textContent();

            // Verify trend percentages are shown (compare=true by default)
            expect(pageText).toMatch(trendPattern);

            // Take final screenshot
            await page.screenshot({
                path: 'tests/e2e/screenshots/dashboard-with-trends.png',
                fullPage: true,
            });
        });
    });

    test.describe('Dashboard Layout', () => {
        test('displays header and sidebar navigation', async ({ page }) => {
            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Verify header is present
            const header = page.locator('header');
            await expect(header).toBeVisible({ timeout: 10000 });

            // Verify sidebar navigation is present
            const sidebar = page.locator('aside, nav').first();
            await expect(sidebar).toBeVisible();

            // Verify navigation links exist
            // Use getByRole to avoid ambiguity with page heading
            await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
        });

        test('page loads within performance budget', async ({ page }) => {
            // Start performance measurement
            const startTime = Date.now();

            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Wait for main content to be visible
            await page.waitForSelector('main', { state: 'visible', timeout: 10000 });

            const loadTime = Date.now() - startTime;

            // Per PRD: Initial page load < 2 seconds
            // Allow some buffer for CI environments
            expect(loadTime).toBeLessThan(5000);

            console.log(`Dashboard load time: ${loadTime}ms`);
        });
    });

    test.describe('Error States', () => {
        test('shows error message when API fails', async ({ page }) => {
            // Mock API to return error
            await page.route('**/v1/metrics/overview**', (route) => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: {
                            code: 'SRV_INTERNAL_ERROR',
                            message: 'Internal server error',
                        },
                        request_id: 'req_test123',
                    }),
                });
            });

            await page.goto('/', { waitUntil: 'networkidle' });

            // Wait for redirect
            await page.waitForURL('**/dashboard**', { timeout: 10000 });

            // Should show error state
            const errorMessage = page.getByText(/failed|error/i);
            await expect(errorMessage).toBeVisible({ timeout: 10000 });

            await page.screenshot({
                path: 'tests/e2e/screenshots/dashboard-error-state.png',
                fullPage: true,
            });
        });
    });
});

/**
 * Critical Flow #1: View Dashboard Metrics
 *
 * This test validates the complete user journey for viewing metrics
 * as defined in Testing Spec §1.5 MVP E2E scope
 */
test.describe('Critical Flow: View Metrics', () => {
    test('user can view dashboard metrics successfully', async ({ page }) => {
        // Step 1: Navigate to dashboard (will redirect to /dashboard)
        await page.goto('/', { waitUntil: 'networkidle' });

        // Wait for redirect
        await page.waitForURL('**/dashboard**', { timeout: 10000 });

        // Step 2: Wait for API call to complete
        await page
            .waitForResponse((response) => response.url().includes('/v1/metrics/overview'), {
                timeout: 30000,
            })
            .catch(() => {});

        // Step 3: Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Step 4: Verify dashboard header is visible
        await expect(page.getByRole('heading', { name: /dashboard|overview/i })).toBeVisible({
            timeout: 10000,
        });

        // Step 5: Verify KPI cards are present
        const kpiLabels = ['Active Users', 'Total Sessions', 'Success Rate', 'Estimated Cost'];

        for (const label of kpiLabels) {
            await expect(page.getByText(label)).toBeVisible({ timeout: 15000 });
        }

        // Step 6: Verify metrics have values (not loading/skeleton)
        // Check that we're not showing skeleton state
        const skeletons = page.locator('[class*="skeleton"]');
        const skeletonCount = await skeletons.count();

        // After load, should have minimal skeletons visible
        expect(skeletonCount).toBeLessThan(4);

        // Step 7: Capture final state
        await page.screenshot({
            path: 'tests/e2e/screenshots/critical-flow-view-metrics.png',
            fullPage: true,
        });

        // Test passed - user successfully viewed dashboard metrics
    });
});
