---
description: Repository Information Overview
alwaysApply: true
---

# Agent Analytics Platform - Repository Information

## Summary

A full-stack TypeScript monorepo for an AI agent analytics platform. Uses Turborepo with Next.js dashboard frontend (apps/dashboard), Hono API backend (apps/api), PostgreSQL database with Drizzle ORM migrations, shared UI components, and shared utilities. Built for spec-driven development with comprehensive testing (Vitest unit tests, Playwright E2E tests).

## Repository Structure

- **apps/api**: Node.js backend API server using Hono framework
- **apps/dashboard**: Next.js 14 frontend application with App Router
- **packages/database**: Drizzle ORM schema and migration management
- **packages/ui**: React component library (Radix UI based, Tailwind styled)
- **packages/shared**: TypeScript utilities and shared types
- **specs/**: OpenAPI specifications and machine-readable contracts
- **docs/**: Product requirements, system design, API specs, testing specs
- **.github/**: GitHub workflows and configurations

## Technology Stack

**Language & Runtime**:
- TypeScript 5.3
- Node.js 20.0.0+
- pnpm 8.14.0+ (package manager)

**Monorepo Management**:
- Turborepo 1.11.0 with pipeline caching

**Frontend** (apps/dashboard):
- Next.js 14.1 (App Router)
- React 18.3
- TailwindCSS 3.4
- Radix UI (dialog, dropdown, select, tabs, slot)
- React Hook Form 7.49
- React Query (@tanstack/react-query) 5.17
- Zod 3.22 (validation)
- NextAuth 5.0.0-beta

**Backend** (apps/api):
- Hono 4.0 (lightweight HTTP framework)
- Zod 3.22 (validation)
- esbuild (bundler, Node 20 target)
- tsx (TypeScript execution)

**Database** (packages/database):
- Drizzle ORM 0.29 (migrations and schema management)
- postgres driver 3.4 (PostgreSQL client)
- drizzle-kit 0.20 (CLI tools)

**Testing**:
- Vitest 1.2-1.6 (unit tests, Node environment)
- Playwright 1.41 (E2E tests, Chromium browser)
- @testing-library/react 14.1, @testing-library/jest-dom 6.2
- jsdom 24.0 (DOM simulation)

**Linting & Type Checking**:
- ESLint 8.56 with TypeScript support
- TypeScript compiler (tsc --noEmit)

## Dependencies

**Root DevDependencies**:
- typescript, eslint, @typescript-eslint/eslint-plugin, turbo

**API Main Dependencies**:
- hono, @hono/node-server, @hono/zod-validator, zod

**Dashboard Main Dependencies**:
- next, react, react-dom, @tanstack/react-query, recharts, zustand

**UI Package**:
- Peer dependencies: react, react-dom
- Export of Radix UI components and Tailwind utilities

**Database Package**:
- drizzle-orm, postgres, drizzle-kit

## Build & Installation

**Install Dependencies**:
```bash
pnpm install
```

**Root Scripts** (via Turborepo):
```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all packages and apps
pnpm lint         # Lint entire monorepo
pnpm type-check   # Type-check all packages
pnpm test         # Run all unit tests
pnpm clean        # Clean build artifacts and node_modules
```

**API Build** (apps/api):
```bash
pnpm dev          # Start with tsx watch
pnpm build        # ESBuild bundle to dist/
```

**Dashboard Build** (apps/dashboard):
```bash
pnpm dev          # Next.js dev server on port 3000
pnpm build        # Next.js production build
pnpm start        # Serve production build
```

**Database Migrations** (packages/database):
```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio UI
```

## Main Entry Points

**API**: `apps/api/src/index.ts` — Hono server listening on PORT (default 3001), health check at `/health`, API routes at `/v1/*`

**Dashboard**: `apps/dashboard/app/page.tsx` — Next.js root page, layout at `app/layout.tsx`

**Database Schema**: `packages/database/src/schema.ts` — Drizzle ORM table definitions

## Testing

**Unit Tests** (Vitest):
- API: `apps/api/tests/**/*.test.ts` (unit tests + integration tests folder)
- Dashboard: `apps/dashboard/tests/unit/**/*.test.ts`
- Configuration: vitest.config.ts per app
- Coverage: HTML reports in coverage/ directory
- Run: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

**E2E Tests** (Playwright):
- Location: `apps/dashboard/tests/e2e/**/*.spec.ts`
- Configuration: `apps/dashboard/playwright.config.ts`
- Browsers: Chromium (Chrome/Edge)
- Artifacts: test-results/, playwright-report/
- Run: `pnpm test:e2e`, `pnpm test:e2e:ui`
- Setup file: `apps/dashboard/tests/setup.ts`

## Environment Configuration

- **API**: `apps/api/.env.example` — PORT, DATABASE_URL, API_URL
- **Dashboard**: Environment variables from turbo.json (NEXT_PUBLIC_*, API_URL)
- **Database**: DATABASE_URL required for migrations and Drizzle Studio

## Project Specifications

Development is spec-driven. Key documents:
- `docs/01-product-requirements.md` — Feature requirements
- `docs/03-api-specification-v1.2.md` — REST API contract
- `docs/04-frontend-architecture-v1.1.md` — UI/UX patterns
- `docs/06-testing-specification.md` — Testing standards
- `specs/openapi.mvp.v1.yaml` — OpenAPI schema (single source of truth)
