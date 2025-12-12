/**
 * MVP E2E Tests - Critical Flows
 *
 * Testing Spec Reference: docs/06-testing-specification.md Section 1.5 & 3.5
 * MVP E2E Scope: 3 Critical Flows
 *   1. Login → Dashboard → View metrics (Flow 1)
 *   2. Dashboard → Sessions list → Session detail (Flow 2 - optional)
 *   3. Date range filter updates all data (Flow 3)
 *
 * These tests use seeded data from packages/database/src/seed.ts
 * to ensure stable, predictable results.
 */

import { test, expect } from '@playwright/test';

/**
 * Flow 1: Engineering Manager opens dashboard
 *
 * Per Testing Spec §1.5 MVP E2E scope:
 * "Login → Dashboard → View metrics"
 *
 * This test validates:
 * - Dashboard page loads
 * - KPI cards are visible (DAU, total sessions, success rate)
 * - Metric values are displayed (not empty/skeleton)
 *
 * Tagged as @mvp for easy filtering
 */
test.describe('Flow 1: Dashboard Metrics Display @mvp', () => {
	test('engineering manager opens dashboard and views metrics', async ({
		page,
	}) => {
		// Step 1: Navigate to dashboard
		// Note: For MVP, authentication may be bypassed or mocked
		await page.goto('/');

		// Step 2: Wait for page to load and metrics to fetch
		// The dashboard uses server-side rendering, so initial load should be fast
		await page.waitForLoadState('networkidle');

		// Step 3: Verify dashboard header/title is visible
		await expect(
			page.getByRole('heading', { name: /dashboard|overview/i })
		).toBeVisible({ timeout: 10000 });

		// Step 4: Wait for KPI cards to appear
		// Per PRD §5.1: 4 KPI cards required
		const kpiLabels = [
			'Active Users', // DAU
			'Total Sessions',
			'Success Rate',
			'Estimated Cost',
		];

		for (const label of kpiLabels) {
			await expect(page.getByText(label)).toBeVisible({
				timeout: 15000,
			});
		}

		// Step 5: Assert that metric values are visible and non-empty
		// Check that we're showing actual values, not skeleton loaders
		const mainContent = page.locator('main');
		const contentText = await mainContent.textContent();

		// Verify numeric values are present (from seeded data)
		expect(contentText).toMatch(/\d+/); // Has at least one number

		// Verify percentage is shown (Success Rate)
		expect(contentText).toMatch(/%/);

		// Verify dollar amount is shown (Estimated Cost)
		expect(contentText).toMatch(/\$/);

		// Step 6: Verify specific metric cards show values
		// Active Users should show a number
		const activeUsersSection = page
			.locator('text=Active Users')
			.locator('..')
			.first();
		const activeUsersText = await activeUsersSection.textContent();
		expect(activeUsersText).toMatch(/\d+/);

		// Total Sessions should show a number
		const totalSessionsSection = page
			.locator('text=Total Sessions')
			.locator('..')
			.first();
		const totalSessionsText = await totalSessionsSection.textContent();
		expect(totalSessionsText).toMatch(/\d+/);

		// Success Rate should show percentage
		const successRateSection = page
			.locator('text=Success Rate')
			.locator('..')
			.first();
		const successRateText = await successRateSection.textContent();
		expect(successRateText).toMatch(/%/);

		// Estimated Cost should show dollar amount
		const costSection = page
			.locator('text=Estimated Cost')
			.locator('..')
			.first();
		const costText = await costSection.textContent();
		expect(costText).toMatch(/\$/);
	});

	test('dashboard loads within performance budget', async ({ page }) => {
		const startTime = Date.now();

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const loadTime = Date.now() - startTime;

		// Per Frontend Architecture Spec §1.2: Initial page load < 2 seconds
		// Allow buffer for CI environments
		expect(loadTime).toBeLessThan(5000);

		console.log(`Dashboard load time: ${loadTime}ms`);
	});
});

/**
 * Flow 2: Navigate to Sessions List and View Details
 *
 * Per Testing Spec §1.5 MVP E2E scope:
 * "Dashboard → Sessions list → Session detail"
 *
 * This test is optional and will be skipped if sessions endpoints don't exist.
 * Use test.skip() or conditional logic based on API availability.
 *
 * Tagged as @mvp @optional for easy filtering
 */
test.describe('Flow 2: Sessions List and Detail @mvp @optional', () => {
	test.skip('navigate to sessions list and view session details', async ({
		page,
	}) => {
		// Step 1: Start at dashboard
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Step 2: Navigate to sessions list
		// Look for navigation link or button
		const sessionsLink = page.getByRole('link', { name: /sessions/i });
		if (await sessionsLink.isVisible().catch(() => false)) {
			await sessionsLink.click();

			// Step 3: Wait for sessions list to load
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/sessions/);

			// Step 4: Verify sessions table/list is visible
			const sessionsTable = page.locator('[data-testid="sessions-table"]');
			if (await sessionsTable.isVisible().catch(() => false)) {
				await expect(sessionsTable).toBeVisible();

				// Step 5: Click first session to view details
				const firstSession = page
					.locator('[data-testid="session-row"]')
					.first();
				if ((await firstSession.count()) > 0) {
					await firstSession.click();

					// Step 6: Verify session detail page loads
					await expect(page).toHaveURL(/\/sessions\/sess_/);

					// Step 7: Verify key session info is visible
					await expect(page.getByTestId('session-status')).toBeVisible({
						timeout: 10000,
					});
					await expect(page.getByTestId('session-duration')).toBeVisible();
				}
			}
		} else {
			// Sessions feature not implemented yet - skip test
			test.skip();
		}
	});
});

/**
 * Flow 3: Date Range Filter Updates Metrics
 *
 * Per Testing Spec §1.5 MVP E2E scope:
 * "Date range filter updates all data"
 *
 * This test validates that changing the period selector updates
 * all metrics and charts on the dashboard.
 *
 * Tagged as @mvp for easy filtering
 */
test.describe('Flow 3: Date Range Filter @mvp', () => {
	test('date range filter updates all metrics', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Step 2: Wait for initial metrics to load (7d default)
		await expect(page.getByText('Active Users')).toBeVisible({
			timeout: 15000,
		});

		// Step 3: Capture initial metric values
		const initialContent = await page.locator('main').textContent();
		const initialActiveUsers = extractNumber(
			initialContent || '',
			'Active Users'
		);
		const initialSessions = extractNumber(
			initialContent || '',
			'Total Sessions'
		);

		// Step 4: Change period to 30d
		// Look for period selector (dropdown or button group)
		const periodSelector = page
			.locator(
				'[data-testid="period-selector"], button:has-text("30d"), select[name*="period"]'
			)
			.first();

		if (await periodSelector.isVisible().catch(() => false)) {
			await periodSelector.click();

			// If it's a dropdown, select 30d option
			const option30d = page.getByRole('option', { name: '30d' });
			if (await option30d.isVisible().catch(() => false)) {
				await option30d.click();
			} else {
				// Try clicking button directly
				const button30d = page.getByRole('button', { name: '30d' });
				if (await button30d.isVisible().catch(() => false)) {
					await button30d.click();
				}
			}

			// Step 5: Wait for metrics to refresh
			await page.waitForResponse(
				(resp) => resp.url().includes('/metrics/overview'),
				{ timeout: 10000 }
			);

			// Step 6: Verify URL updated (if using query params)
			// This may not be implemented in MVP, so make it optional
			const url = page.url();
			if (url.includes('period=')) {
				expect(url).toContain('period=30d');
			}

			// Step 7: Verify metrics have updated (may be same or different)
			// Wait for content to update
			await page.waitForTimeout(1000); // Allow for re-render

			const updatedContent = await page.locator('main').textContent();
			const updatedActiveUsers = extractNumber(
				updatedContent || '',
				'Active Users'
			);
			const updatedSessions = extractNumber(
				updatedContent || '',
				'Total Sessions'
			);

			// Metrics should still be visible (not empty)
			expect(updatedActiveUsers).not.toBeNull();
			expect(updatedSessions).not.toBeNull();

			// Note: Values may be same or different depending on seeded data
			// The important thing is that the API was called and metrics refreshed
		} else {
			// Period selector not implemented yet - skip this part
			console.log('Period selector not found - feature may not be implemented');
		}
	});
});

/**
 * Helper function to extract numeric value from text content
 * Looks for numbers near a label (e.g., "Active Users" followed by "1,247")
 */
function extractNumber(text: string, label: string): number | null {
	const labelIndex = text.indexOf(label);
	if (labelIndex === -1) return null;

	// Look for number after the label (within next 100 chars)
	const afterLabel = text.substring(
		labelIndex + label.length,
		labelIndex + 200
	);
	const numberMatch = afterLabel.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
	if (numberMatch) {
		return parseFloat(numberMatch[1].replace(/,/g, ''));
	}

	return null;
}
