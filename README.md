# AI Agent Analytics Platform

## Project Summary

**AI Agent Analytics Dashboard** — an analytics platform for monitoring and analyzing AI agent usage in cloud environments. The platform provides organizations with complete visibility into usage metrics, performance, cost, and security of AI development tools.

The platform is designed for **Engineering Managers**, **CTOs**, **Lead Developers**, and other technical leaders who need to make data-driven decisions about AI agent usage. Key features include: real-time metrics, detailed session analysis, multi-tenancy, date and organization filtering, and performance trend visualization.

The project is built on principles of **spec-driven development** and **AI-first workflow**: all implementation strictly follows specifications (OpenAPI, Product Requirements, System Design), and code is generated iteratively using AI assistants to ensure specification compliance.

## Tech Stack

-   **Monorepo**: Turborepo + pnpm
-   **API** (`apps/api`): Node.js 20+ + Hono + Drizzle ORM + PostgreSQL
-   **Dashboard** (`apps/dashboard`): Next.js 14 App Router + React Query + TanStack Table + Tailwind CSS
-   **Database**: PostgreSQL (Drizzle ORM for migrations and schema) - _optional, falls back to in-memory store_
-   **Testing**: Vitest (unit/integration), Playwright (E2E)
-   **OpenAPI**: `specs/openapi.mvp.v1.yaml` (+ automatic SDK generation)

## Spec-Driven / AI-First Development

The project follows **spec-driven development** principles: all implementation strictly adheres to specifications stored in the repository.

### Specifications

-   `docs/01-product-requirements.md` — Product requirements
-   `docs/02-system-architecture.md` — System architecture
-   `docs/03-api-specification-v1.2.md` — REST API contract
-   `docs/04-frontend-architecture-v1.1.md` — UI/UX patterns
-   `docs/05-development-deployment-v1.2.md` — Development and deployment
-   `docs/06-testing-specification.md` — Testing standards
-   `docs/07-implementation-plan.md` — Implementation plan
-   `specs/openapi.mvp.v1.yaml` — OpenAPI schema (single source of truth)

### AI-First Workflow

Code is generated iteratively using AI assistants that follow specifications. Each implementation is validated against:

-   OpenAPI schema (contract tests)
-   Product Requirements
-   System Design
-   Testing Specification

For more details on the development process, see `/docs/07-implementation-plan.md`.

## How to Run

### Prerequisites

-   Node.js 20+
-   pnpm 8+

**Note**: PostgreSQL is optional. The application works out of the box with an in-memory event store. PostgreSQL is only needed for persistent data storage.

### Quick Start

```bash
# Install dependencies
pnpm install

# Start API and Dashboard (works without database!)
pnpm dev

# Or run separately:
pnpm dev --filter api      # API at http://localhost:3001
pnpm dev --filter dashboard # Dashboard at http://localhost:3000
```

The application will run with an in-memory event store by default. Data will be lost on server restart, but this is perfect for quick local development and testing.

## Environment Variables

Environment variables are **optional**. The application uses sensible defaults:

-   **API**: Runs on port `3001` by default
-   **Dashboard**: Connects to `http://localhost:3001` by default
-   **Database**: Uses in-memory store if `DATABASE_URL` is not set

### Optional: Custom Configuration

If you need custom configuration, you can create `.env.local` files:

**`apps/api/.env.local`** (optional):

```bash
# Database (optional - app works without it)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/analytics

# API Configuration (optional)
PORT=3001

# Authentication (optional, for development)
JWT_HS256_SECRET=dev-secret-change-in-production
```

**`apps/dashboard/.env.local`** (optional):

```bash
# API Endpoint (optional)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## How to Run Tests

```bash
# All tests (unit + integration)
pnpm test

# Contract tests (OpenAPI validation)
pnpm --filter @repo/api test:contract

# E2E tests (Playwright)
pnpm --filter @repo/dashboard test:e2e
```

**Note**: Unit and integration tests use in-memory stores and don't require a database. E2E tests may require a database connection (see test setup files).

## Demo Flows

### 1. Login → Dashboard → Metrics Overview

1. Open `http://localhost:3000`
2. Log in with test credentials (if authentication is configured)
3. The Dashboard home page displays metrics:
    - Total Sessions
    - Active Users
    - Success Rate
    - Estimated Cost
4. Metrics update in real-time based on data from the store (in-memory or database)

### 2. Dashboard → Sessions → Session Detail

1. Navigate to **Sessions** section from the navigation
2. View the sessions table with filters:
    - By date (date range picker)
    - By status (success, error, cancelled)
3. Click on any session to view details:
    - Event timeline
    - Performance metrics
    - Logs and errors (if any)

### 3. Change Date Range → Metrics Update

1. On the Dashboard or Sessions page, use the **Date Range Picker**
2. Select a different period (e.g., last 7 days instead of today)
3. All metrics and charts automatically update:
    - Aggregated metric cards
    - Timeseries charts
    - Session tables
4. Filters are saved in the URL for easy sharing

## MVP Limitations & Simplifications

This MVP version includes several intentional simplifications to enable rapid prototyping and demonstration. These are **not production-ready** patterns and would need to be addressed for real-world deployment:

### Data Storage

-   **In-memory event store**: Events are stored in memory by default and lost on server restart. PostgreSQL is optional and can be enabled via `DATABASE_URL`.
-   **No persistent caching**: Metrics are computed on-demand without Redis or persistent cache layers.
-   **Limited scalability**: Designed for single-instance deployment, not distributed systems.

### Security & Configuration

-   **Hardcoded secrets**: Some configuration values (like JWT secrets) have default values for development convenience. In production, these should be:
    -   Stored in secure secret management systems (AWS Secrets Manager, HashiCorp Vault, etc.)
    -   Rotated regularly
    -   Never committed to version control
-   **Simplified authentication**: Basic JWT and API key authentication implemented. Missing:
    -   Token refresh mechanisms
    -   Advanced rate limiting per user/org
    -   SSO/SAML integration
    -   Multi-factor authentication

### Infrastructure

-   **Single-region**: No multi-region deployment or data replication.
-   **No CDN**: Static assets served directly from application servers.
-   **Basic error handling**: Standard error responses without advanced retry logic or circuit breakers.
-   **No monitoring**: Missing production observability (APM, distributed tracing, alerting).

### Features Deferred to Phase 2+

-   Real-time WebSocket updates
-   Advanced filtering and search
-   Data export functionality
-   User and team management UI
-   Custom date range picker
-   Visual regression testing
-   Cross-browser testing (Firefox, Safari)

**For production deployment**, these limitations would need to be addressed with proper infrastructure, security practices, and feature implementation. See `docs/07-implementation-plan.md` for the full roadmap.

---

**Note**: This is an MVP version of the platform. For a complete feature list and roadmap, see the documentation in the `docs/` folder.
