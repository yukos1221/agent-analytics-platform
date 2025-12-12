# CI/CD Pipeline Documentation

This document explains the CI/CD pipeline configuration, quality gates, and how it aligns with the project specifications.

**Spec References:**

- [docs/05-development-deployment-v1.2.md](./05-development-deployment-v1.2.md) §8 (CI/CD Pipeline)
- [docs/06-testing-specification.md](./06-testing-specification.md) §1.5 (MVP Test Suite)
- [docs/07-implementation-plan.md](./07-implementation-plan.md) (Phase 1 Completion Checklist)

## Overview

The CI pipeline enforces quality gates for all code changes, ensuring the codebase maintains high standards while supporting rapid development for a small team.

**Pipeline Goals:**

- **Fast feedback:** Complete pipeline runs in < 10 minutes
- **Quality gates:** All tests must pass before merge
- **Cost-effective:** Optimized for GitHub Actions free tier
- **Phase 1 focused:** Simple, reliable, no complex deployment strategies

## CI Workflow Structure

The CI pipeline (`.github/workflows/ci.yml`) consists of the following jobs:

```
┌─────────────────────────────────────────────────────────────┐
│                    CI Pipeline (Phase 1)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. lint-and-typecheck  ────────────────────────┐          │
│     • ESLint + Prettier                          │          │
│     • TypeScript type checking                   │          │
│                                                   │          │
│  2. unit-and-integration-tests  ────────────────┼──┐        │
│     • Unit tests (Vitest)                        │  │        │
│     • Integration tests (critical paths)         │  │        │
│                                                   │  │        │
│  3. contract-tests  ─────────────────────────────┼──┼──┐    │
│     • OpenAPI contract validation                 │  │  │    │
│     • All MVP endpoints                          │  │  │    │
│                                                   │  │  │    │
│  4. build  ───────────────────────────────────────┼──┼──┼──┐ │
│     • Build verification                         │  │  │  │ │
│     • Turborepo caching                          │  │  │  │ │
│                                                   │  │  │  │ │
│  5. e2e-tests  ───────────────────────────────────┼──┼──┼──┼─┤
│     • Playwright E2E (3 critical flows)          │  │  │  │ │
│     • Required for main branch                    │  │  │  │ │
│                                                   │  │  │  │ │
└───────────────────────────────────────────────────┴──┴──┴──┴─┘
```

## Job Details

### 1. Lint & Type Check (`lint-and-typecheck`)

**Purpose:** Catch code quality issues early

**Runs:**

- `pnpm lint` - ESLint and Prettier checks
- `pnpm type-check` - TypeScript compilation check

**When:** Always runs on all branches and PRs

**Failure Impact:** Blocks merge (required quality gate)

**Spec Alignment:** Dev/Deploy Spec §14.3: "Lint (ESLint, Prettier)" and "Type check (TypeScript)"

### 2. Unit & Integration Tests (`unit-and-integration-tests`)

**Purpose:** Validate business logic and critical integration paths

**Runs:**

- `pnpm test` - Runs all Vitest tests (unit + integration)

**Coverage Target:** 80% for MVP (per Testing Spec §1.5)

**When:** Always runs after lint/type-check passes

**Failure Impact:** Blocks merge (required quality gate)

**Spec Alignment:**

- Testing Spec §1.5: "UNIT TESTS - TARGET: 80% Coverage"
- Testing Spec §1.5: "INTEGRATION TESTS - TARGET: Critical Paths"

### 3. Contract Tests (`contract-tests`)

**Purpose:** Ensure API implementation matches OpenAPI specification

**Runs:**

- `pnpm --filter @repo/api test:contract` - OpenAPI contract validation

**Scope:** All MVP endpoints:

- `POST /v1/events`
- `GET /v1/metrics/overview`
- Error response validation

**Setup:** Requires PostgreSQL (Docker) and database migrations

**When:** Always runs after lint/type-check passes

**Failure Impact:** Blocks merge (required quality gate)

**Spec Alignment:** Testing Spec §1.5: "CONTRACT TESTS (OpenAPI) - TARGET: 100% Endpoints"

### 4. Build Verification (`build`)

**Purpose:** Ensure all packages build successfully

**Runs:**

- `pnpm build` - Builds all packages using Turborepo

**Optimization:** Uses Turborepo caching for faster builds

**When:** Always runs after lint/type-check passes

**Failure Impact:** Blocks merge (required quality gate)

**Spec Alignment:** Dev/Deploy Spec §14.3: "Build verification"

### 5. E2E Tests (`e2e-tests`)

**Purpose:** Validate critical user flows end-to-end

**Runs:**

- `pnpm test:e2e:mvp` - Playwright tests for 3 critical flows

**Coverage:** 3 critical MVP flows:

1. Dashboard metrics display
2. Sessions list/detail (if implemented)
3. Date range filter updates

**Setup:** Requires PostgreSQL, database migrations, API server, Dashboard server

**When:**

- **Required:** Main branch and PRs to main
- **Optional:** Feature branches (can skip via workflow_dispatch)

**Failure Impact:** Blocks merge to main (required quality gate)

**Spec Alignment:** Testing Spec §1.5: "E2E TESTS (Playwright) - TARGET: 3 Critical Flows"

## Quality Gates

### Required for All PRs

These jobs **must pass** before code can be merged:

1. ✅ Lint & Type Check
2. ✅ Unit & Integration Tests
3. ✅ Contract Tests
4. ✅ Build Verification

### Required for Main Branch

In addition to the above, these are **required for main branch**:

5. ✅ E2E Tests (3 critical flows)

### Optional for Feature Branches

- E2E Tests can be skipped on feature branches for faster feedback (use `workflow_dispatch` with `run_e2e=false`)

## Phase 1 vs Phase 2+ Differences

| Feature               | Phase 1 (MVP)                                                      | Phase 2+                                             |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| **Test Coverage**     | Unit (80%), Contract (100%), Integration (critical), E2E (3 flows) | Unit (85%+), Full integration suite, E2E (20+ flows) |
| **CI Speed**          | < 10 minutes                                                       | < 5 minutes (optimized)                              |
| **Deployment**        | Manual (Vercel + AWS CDK)                                          | Automated (preview deployments)                      |
| **Blue-Green**        | ❌ Not implemented                                                 | ✅ Blue-green deployments                            |
| **Canary**            | ❌ Not implemented                                                 | ✅ Canary releases                                   |
| **Rollback**          | Manual                                                             | ✅ Automatic rollback                                |
| **Coverage Reports**  | Manual                                                             | ✅ Automated upload                                  |
| **Security Scanning** | ❌ Not implemented                                                 | ✅ CodeQL, dependency scanning                       |
| **Performance Tests** | ❌ Not implemented                                                 | ✅ Load testing in CI                                |

## Phase 1 Explicitly NOT Implemented

The following features are **deferred to Phase 2+**:

- ❌ **Preview deployments** - Manual deployment for MVP
- ❌ **Blue-green deployments** - Acceptable downtime for MVP
- ❌ **Canary releases** - Not needed at MVP scale
- ❌ **Automatic rollback** - Manual rollback acceptable
- ❌ **Code coverage upload** - Manual coverage checks
- ❌ **Security scanning (CodeQL)** - Manual security review
- ❌ **Performance testing** - Basic benchmarks only
- ❌ **Multi-environment promotion** - Direct to production

## Running CI Locally

### Run All Quality Gates

```bash
# Lint & type check
pnpm lint
pnpm type-check

# Unit & integration tests
pnpm test

# Contract tests
pnpm --filter @repo/api test:contract

# Build verification
pnpm build

# E2E tests (requires DB setup)
pnpm --filter @repo/dashboard test:e2e:mvp
```

### Pre-Commit Checks

Use Turborepo to run checks in parallel:

```bash
# Run lint, type-check, and tests
pnpm turbo run lint type-check test

# Run everything
pnpm turbo run lint type-check test build
```

## Troubleshooting

### Issue: Contract tests fail with "API server not found"

**Solution:** Contract tests spin up the API server internally. Ensure:

- PostgreSQL is running (Docker)
- Database migrations are applied
- `DATABASE_URL` is set correctly

### Issue: E2E tests timeout

**Solution:**

1. Check that both API and Dashboard servers start successfully
2. Verify PostgreSQL is ready before tests run
3. Increase timeout in `playwright.config.ts` if needed

### Issue: Build fails with Turborepo cache issues

**Solution:** Clear Turborepo cache:

```bash
pnpm turbo clean
pnpm build
```

### Issue: Tests pass locally but fail in CI

**Solution:**

1. Check environment variables are set in CI
2. Verify database setup matches local environment
3. Check for timing issues (add appropriate waits)

## CI Performance

**Target:** Complete pipeline in < 10 minutes

**Optimizations:**

- pnpm caching (via `setup-node` action)
- Turborepo caching for builds
- Parallel job execution
- Docker layer caching for PostgreSQL

**Current Performance:**

- Lint & Type Check: ~2 minutes
- Unit & Integration Tests: ~3 minutes
- Contract Tests: ~4 minutes (includes DB setup)
- Build: ~2 minutes
- E2E Tests: ~5 minutes (includes DB + servers)

**Total:** ~16 minutes (with some parallelization)

## Related Documentation

- [Testing Specification](./06-testing-specification.md) - Detailed test requirements
- [Development & Deployment](./05-development-deployment-v1.2.md) - Infrastructure and deployment
- [Implementation Plan](./07-implementation-plan.md) - Phase 1 completion checklist

## Support

For CI/CD issues:

1. Check workflow logs in GitHub Actions
2. Review test artifacts (Playwright reports, etc.)
3. Verify environment variables are set correctly
4. Compare with local test runs
