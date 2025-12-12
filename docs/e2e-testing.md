# E2E Testing Guide

This document explains how to run and maintain E2E tests for the AI Agent Analytics Platform.

**Testing Spec Reference:** [docs/06-testing-specification.md](./06-testing-specification.md) Section 3.5

## Overview

E2E tests use Playwright to test critical user flows through the full application stack (frontend + API + database).

**MVP Scope:** 3 critical flows (per Testing Spec §1.5)

1. **Flow 1:** Engineering Manager opens dashboard → views metrics
2. **Flow 2:** Navigate to sessions list → view session details (optional if endpoints exist)
3. **Flow 3:** Date range filter updates all metrics

**Phase 2+:** Full E2E suite (20+ flows)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL running (for test database)
- API server can start (port 3001)
- Dashboard server can start (port 3000)

### Running E2E Tests Locally

```bash
# 1. Ensure database is running and seeded
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/analytics_test"
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed

# 2. Run E2E tests (starts servers automatically)
cd apps/dashboard
pnpm test:e2e

# Or with UI mode (interactive)
pnpm test:e2e:ui
```

### Running Specific Tests

```bash
# Run only MVP flows (tagged with @mvp)
pnpm test:e2e:mvp

# Run specific test file
pnpm test:e2e tests/e2e/mvp-flows.spec.ts

# Run with specific tag
pnpm test:e2e --grep "Flow 1"

# Skip optional tests (Flow 2)
pnpm test:e2e --grep "@mvp" --grep-invert "@optional"

# Run in headed mode (see browser)
pnpm test:e2e --headed
```

## Test Structure

### Test Files

- `apps/dashboard/tests/e2e/mvp-flows.spec.ts` - MVP critical flows
- `apps/dashboard/tests/e2e/dashboard.spec.ts` - Additional dashboard tests

### Test Setup

- `apps/dashboard/tests/setup-e2e.ts` - Global setup (runs before all tests)
  - Runs database migrations
  - Seeds database with test data
  - Ensures API server is ready

### Configuration

- `apps/dashboard/playwright.config.ts` - Playwright configuration
  - Starts API server (port 3001)
  - Starts Dashboard server (port 3000)
  - Configures test timeouts and retries
  - Sets up test artifacts (screenshots, videos, traces)

## MVP E2E Flows

### Flow 1: Dashboard Metrics Display

**User Story:** Engineering Manager opens dashboard and views key metrics

**Test Steps:**

1. Navigate to dashboard (`/`)
2. Wait for page to load
3. Verify KPI cards are visible:
   - Active Users (DAU)
   - Total Sessions
   - Success Rate
   - Estimated Cost
4. Assert metric values are displayed (not empty/skeleton)
5. Verify numeric values, percentages, and dollar amounts are present

**Test File:** `tests/e2e/mvp-flows.spec.ts` → `Flow 1: Dashboard Metrics Display`

**Data Requirements:**

- Uses seeded data from `packages/database/src/seed.ts`
- Requires events and sessions to be present in database
- Metrics are calculated from seeded events

### Flow 2: Sessions List and Detail (Optional)

**User Story:** User navigates to sessions list and views session details

**Status:** Optional - skipped if sessions endpoints don't exist

**Test Steps:**

1. Start at dashboard
2. Navigate to sessions list (`/sessions`)
3. Verify sessions table/list is visible
4. Click first session
5. Verify session detail page loads
6. Verify key session info is visible (status, duration, events)

**Test File:** `tests/e2e/mvp-flows.spec.ts` → `Flow 2: Sessions List and Detail`

**Note:** This test uses `test.skip()` if sessions feature is not implemented.

### Flow 3: Date Range Filter

**User Story:** User changes date range and all metrics update

**Test Steps:**

1. Navigate to dashboard
2. Capture initial metric values (default: 7d)
3. Change period to 30d
4. Wait for metrics to refresh
5. Verify metrics have updated (API was called)

**Test File:** `tests/e2e/mvp-flows.spec.ts` → `Flow 3: Date Range Filter`

## Test Data

E2E tests use **seeded data** from `packages/database/src/seed.ts` to ensure:

- **Stability:** Tests produce consistent results
- **Speed:** No need to generate data during tests
- **Predictability:** Known data makes assertions reliable

### Seeded Data Includes:

- **2 Organizations:** `acme123`, `org_test`
- **3 API Keys:** For testing authentication
- **11 Sessions:** Across different time periods (1d, 7d, 30d)
- **21 Events:** With metadata for metrics calculation

### Reseeding Data

If tests fail due to data issues, reseed:

```bash
# Clear and reseed
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/analytics_test"
pnpm --filter @repo/database db:rollback --steps 999 --force || true
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed
```

## CI Integration

E2E tests run in CI on:

- **Main branch:** Always runs
- **Pull requests:** Runs automatically
- **Other branches:** Can be skipped (optional)

### CI Job: `e2e`

The CI workflow includes an `e2e` job that:

1. Sets up PostgreSQL (Docker)
2. Runs migrations
3. Seeds database
4. Installs Playwright browsers
5. Runs E2E tests
6. Uploads test artifacts (reports, screenshots)

### Skipping E2E Tests in CI

E2E tests can be skipped for fast pipelines:

```bash
# Skip E2E tests by not running the job
# Or set environment variable
SKIP_E2E=true pnpm test
```

## Test Stability

### Best Practices

1. **Use seeded data** - Don't create data during tests
2. **Wait for network idle** - Ensure API calls complete
3. **Use explicit waits** - `waitForLoadState('networkidle')`
4. **Avoid flaky selectors** - Use text content or data-testid
5. **Retry on failure** - Playwright retries automatically in CI

### Common Issues

**Issue:** Tests fail with "element not found"

- **Solution:** Increase timeout or add explicit wait

**Issue:** Metrics show 0 or empty values

- **Solution:** Ensure database is seeded before running tests

**Issue:** API server not starting

- **Solution:** Check DATABASE_URL is set correctly

**Issue:** Tests timeout

- **Solution:** Check that both API and Dashboard servers start successfully

## Debugging

### View Test Execution

```bash
# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run with debug mode
PWDEBUG=1 pnpm test:e2e
```

### View Test Artifacts

After test runs, check:

- `playwright-report/` - HTML test report
- `test-results/` - Screenshots, videos, traces
- `tests/e2e/screenshots/` - Manual screenshots

### Debug Failed Tests

1. Check Playwright HTML report: `pnpm exec playwright show-report`
2. View screenshots in `test-results/`
3. Check video recordings (if enabled)
4. Review trace files for step-by-step execution

## Performance

### Test Execution Time

- **Flow 1:** ~5-10 seconds
- **Flow 2:** ~10-15 seconds (if implemented)
- **Flow 3:** ~8-12 seconds
- **Total MVP suite:** ~25-40 seconds

### Optimization Tips

1. **Run tests in parallel** (disabled in CI for stability)
2. **Reuse server instances** (enabled locally)
3. **Skip optional tests** if features not implemented
4. **Use fast selectors** (text content > CSS selectors)

## Phase 1 vs Phase 2 Differences

| Feature                 | Phase 1 (MVP)              | Phase 2+                       |
| ----------------------- | -------------------------- | ------------------------------ |
| **Test Coverage**       | 3 critical flows           | 20+ flows                      |
| **Browsers**            | Chromium only              | Chromium, Firefox, WebKit      |
| **CI Integration**      | Optional, runs on main/PRs | Required, runs on all branches |
| **Test Execution**      | Manual setup (seeded data) | Automated with testcontainers  |
| **Visual Testing**      | Screenshots only           | Visual regression testing      |
| **Performance Testing** | Basic load time checks     | Full performance benchmarks    |
| **Cross-Browser**       | ❌ Not tested              | ✅ Full cross-browser suite    |

### Phase 1 (Current) Scope

**3 Critical Flows:**

1. ✅ Dashboard metrics display
2. ⚠️ Sessions list/detail (optional, skipped if not implemented)
3. ✅ Date range filter updates

**Characteristics:**

- Uses seeded data for stability
- Runs on Chromium only
- Optional in CI (can be skipped)
- Focus on core user journeys

### Phase 2+ Extensions

**Additional Flows:**

- Authentication flow (login/logout)
- Multi-tenant isolation
- Advanced filtering
- Export functionality
- Settings pages
- Real-time updates
- Error handling flows
- Mobile responsive flows

**Infrastructure:**

- Cross-browser testing (Firefox, Safari)
- Visual regression testing
- Performance benchmarking
- Automated test data generation
- Testcontainers for full stack isolation

### Cross-Browser Testing

**Currently:** Chromium only  
**Phase 2+:** Add Firefox and WebKit

### Visual Regression

**Phase 2+:** Add screenshot comparison tests with percy.io or similar

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
psql -h localhost -U postgres -d analytics_test -c "SELECT 1"

# Verify DATABASE_URL
echo $DATABASE_URL
```

### Port Conflicts

If ports 3000 or 3001 are in use:

```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Or use different ports
PLAYWRIGHT_BASE_URL=http://localhost:3002 pnpm test:e2e
```

### Playwright Browser Issues

```bash
# Reinstall browsers
pnpm exec playwright install --with-deps chromium

# Clear browser cache
rm -rf ~/.cache/ms-playwright
```

## Related Documentation

- [Testing Specification](./06-testing-specification.md) - Full testing strategy
- [Frontend Architecture](./04-frontend-architecture-v1.1.md) - Dashboard structure
- [Implementation Plan](./07-implementation-plan.md) - Phase 1 vs Phase 2 testing

## Support

For issues or questions:

1. Check test logs in `playwright-report/`
2. Review test artifacts (screenshots, videos)
3. Verify database is seeded correctly
4. Ensure both API and Dashboard servers start successfully
