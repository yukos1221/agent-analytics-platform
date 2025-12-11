# AI Agent Analytics Platform - Development & Deployment Specification

**Version:** 1.2.0  
**Status:** Technical Specification  
**Last Updated:** December 2025  
**Authors:** Technical Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [MVP Infrastructure vs Hardening](#2-mvp-infrastructure-vs-hardening)
3. [Monorepo Architecture](#3-monorepo-architecture)
4. [Project Structure](#4-project-structure)
5. [Local Development Environment](#5-local-development-environment)
6. [Code Quality & Standards](#6-code-quality--standards)
7. [Testing Strategy](#7-testing-strategy)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Environment Management](#9-environment-management)
10. [Secrets Management](#10-secrets-management)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Database Management & Migrations](#12-database-management--migrations)
13. [Monitoring & Observability](#13-monitoring--observability)
14. [Developer Onboarding](#14-developer-onboarding)

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the development workflow, tooling, and deployment infrastructure for the AI Agent Analytics Platform. It provides a comprehensive guide for setting up development environments, maintaining code quality, and deploying to production.

### 1.2 Goals

| Goal | Target | Measure |
|------|--------|---------|
| **Developer Velocity** | < 5 min from clone to running | Onboarding time |
| **Build Speed** | < 2 min for full build | CI pipeline duration |
| **Test Speed** | < 5 min for full test suite | CI pipeline duration |
| **Deploy Speed** | < 10 min to production | Deployment duration |
| **Zero Downtime** | 100% availability during deploys | Uptime monitoring |

### 1.3 Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monorepo Tool** | Turborepo | Fast, simple, excellent caching |
| **Package Manager** | pnpm | Disk efficient, fast, strict |
| **Local Services** | Docker Compose | Standard, reproducible, easy |
| **AWS Emulation** | LocalStack | Comprehensive AWS emulation |
| **CI/CD** | GitHub Actions | Native integration, generous free tier |
| **Deployment** | Vercel + AWS CDK | Vercel for frontend, CDK for backend |
| **IaC** | AWS CDK (TypeScript) | Type-safe, familiar language |

---

## 2. MVP Infrastructure vs Hardening

### 14.1 Infrastructure Phasing Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Infrastructure Development Phases                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: MVP Infrastructure (Weeks 1-6)                                    │
│  ═══════════════════════════════════════                                    │
│  Goal: Get to production with minimal viable infrastructure                 │
│  • Single region (us-east-1)                                               │
│  • Basic CI/CD (lint, test, deploy)                                        │
│  • Docker Compose for local development                                     │
│  • Manual database migrations                                               │
│  • Basic monitoring (CloudWatch)                                           │
│  • Simple secrets (env vars + Secrets Manager)                             │
│                                                                             │
│  Phase 2: Hardening (Weeks 7-12)                                           │
│  ════════════════════════════════                                          │
│  Goal: Production-ready reliability                                        │
│  • Automated database migrations in CI                                     │
│  • Preview deployments for PRs                                             │
│  • Full test coverage gates                                                │
│  • Enhanced monitoring & alerting                                          │
│  • Blue-green deployments                                                  │
│  • Rollback automation                                                     │
│                                                                             │
│  Phase 3: Scale & Enterprise (Weeks 13+)                                   │
│  ═══════════════════════════════════════                                   │
│  Goal: Enterprise-grade operations                                         │
│  • Multi-region deployment                                                 │
│  • Full DR automation                                                      │
│  • SOC 2 compliance tooling                                                │
│  • Advanced observability (APM, tracing)                                   │
│  • Cost optimization                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Infrastructure Components by Phase

| Component | Phase 1 (MVP) | Phase 2 (Hardening) | Phase 3 (Scale) |
|-----------|:-------------:|:-------------------:|:---------------:|
| **Development Environment** |||||
| Docker Compose | ✅ | ✅ | ✅ |
| LocalStack | ✅ Basic | ✅ Full | ✅ |
| Hot reload | ✅ | ✅ | ✅ |
| Dev database seeding | ✅ Manual | ✅ Automated | ✅ |
| **CI/CD Pipeline** |||||
| Lint + Type check | ✅ | ✅ | ✅ |
| Unit tests | ✅ | ✅ | ✅ |
| Integration tests | ❌ | ✅ | ✅ |
| E2E tests | ❌ | ✅ | ✅ |
| Preview deployments | ❌ | ✅ | ✅ |
| Auto-merge (Dependabot) | ❌ | ✅ | ✅ |
| Security scanning (CodeQL) | ❌ | ✅ | ✅ |
| **Deployment** |||||
| Vercel (frontend) | ✅ | ✅ | ✅ |
| AWS CDK (backend) | ✅ Basic | ✅ Full | ✅ |
| Blue-green deploy | ❌ | ✅ | ✅ |
| Canary releases | ❌ | ❌ | ✅ |
| Rollback automation | ❌ | ✅ | ✅ |
| **Database** |||||
| Aurora PostgreSQL | ✅ Single | ✅ + Read replica | ✅ Global |
| ClickHouse Cloud | ✅ Dev tier | ✅ Production | ✅ Dedicated |
| Migration rollbacks | ✅ Manual | ✅ Automated | ✅ |
| **Monitoring** |||||
| CloudWatch basics | ✅ | ✅ | ✅ |
| Custom dashboards | ❌ | ✅ | ✅ |
| Alerting | ❌ | ✅ Slack | ✅ PagerDuty |
| APM/Tracing | ❌ | ❌ | ✅ Datadog |
| Log aggregation | ✅ CloudWatch | ✅ | ✅ + Search |
| **Security** |||||
| HTTPS everywhere | ✅ | ✅ | ✅ |
| Secrets Manager | ✅ Basic | ✅ Rotation | ✅ |
| WAF | ❌ | ✅ | ✅ |
| VPC isolation | ✅ | ✅ | ✅ |
| Audit logging | ❌ | ❌ | ✅ |

### 14.3 MVP Infrastructure Decisions

**What We Build for MVP:**

```yaml
# MVP Infrastructure Checklist

Local Development:
  ✅ Docker Compose with Postgres, ClickHouse, Redis
  ✅ LocalStack for basic AWS services (Kinesis, S3)
  ✅ pnpm workspaces + Turborepo
  ✅ Hot reload for all services
  ❌ Full AWS service emulation (use mocks)

CI Pipeline:
  ✅ GitHub Actions
  ✅ Lint (ESLint, Prettier)
  ✅ Type check (TypeScript)
  ✅ Unit tests (Vitest)
  ✅ Build verification
  ❌ Integration tests (manual for MVP)
  ❌ E2E tests (manual for MVP)
  ❌ Preview deployments

Production Infrastructure:
  ✅ Vercel for Next.js dashboard
  ✅ AWS Lambda for API (via CDK)
  ✅ Aurora PostgreSQL (db.r6g.medium, single instance)
  ✅ ClickHouse Cloud (Development tier)
  ✅ ElastiCache Redis (cache.t3.small)
  ✅ Kinesis (4 shards)
  ❌ Multi-AZ (single AZ acceptable for MVP)
  ❌ Read replicas
  ❌ Blue-green deployment

Monitoring:
  ✅ CloudWatch Logs
  ✅ CloudWatch basic metrics
  ✅ Health check endpoints
  ❌ Custom dashboards
  ❌ Alerting (manual monitoring)
  ❌ APM/Distributed tracing
```

**What We Defer:**

| Deferred Item | Reason | Phase |
|---------------|--------|-------|
| Preview deployments | Nice-to-have for small team | Phase 2 |
| E2E tests in CI | Can test manually initially | Phase 2 |
| Blue-green deploys | Acceptable downtime for MVP | Phase 2 |
| Multi-AZ databases | Cost vs. risk tradeoff | Phase 2 |
| Read replicas | Not needed at MVP scale | Phase 2 |
| APM/Tracing | CloudWatch sufficient initially | Phase 3 |
| WAF | Can add post-launch | Phase 2 |
| Audit logging | Not required for MVP compliance | Phase 3 |

### 14.4 Estimated Infrastructure Costs

| Component | MVP (Phase 1) | Hardening (Phase 2) | Scale (Phase 3) |
|-----------|---------------|---------------------|-----------------|
| **Vercel** | $0 (Hobby) | $20/mo (Pro) | $50+/mo (Team) |
| **Aurora PostgreSQL** | ~$60/mo | ~$150/mo | ~$400+/mo |
| **ClickHouse Cloud** | ~$50/mo | ~$200/mo | ~$500+/mo |
| **ElastiCache** | ~$25/mo | ~$50/mo | ~$150+/mo |
| **Kinesis** | ~$50/mo | ~$100/mo | ~$200+/mo |
| **Lambda** | ~$10/mo | ~$30/mo | ~$100+/mo |
| **Other AWS** | ~$30/mo | ~$100/mo | ~$300+/mo |
| **Total** | **~$225/mo** | **~$650/mo** | **~$1,700+/mo** |

*Costs are estimates and will vary based on usage.*

### 14.5 MVP to Production Checklist

```markdown
## Pre-Launch Checklist (MVP)

### Infrastructure
- [ ] Aurora PostgreSQL provisioned and accessible
- [ ] ClickHouse Cloud workspace created
- [ ] Redis cluster running
- [ ] Kinesis stream created with 4 shards
- [ ] Lambda functions deployed
- [ ] API Gateway configured
- [ ] Vercel project connected to repo

### Security
- [ ] All secrets in AWS Secrets Manager
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured correctly
- [ ] API authentication working
- [ ] Rate limiting enabled

### Monitoring
- [ ] CloudWatch log groups created
- [ ] Health check endpoints responding
- [ ] Basic alarms configured (5xx errors, high latency)

### Database
- [ ] Schema migrations applied
- [ ] Seed data loaded (if needed)
- [ ] Backup configured
- [ ] Connection pooling configured

### DNS & Certificates
- [ ] Custom domain configured
- [ ] SSL certificates provisioned
- [ ] DNS records created

### Testing
- [ ] Smoke tests passing
- [ ] Manual E2E testing complete
- [ ] Load test completed (basic)
```

---

## 3. Monorepo Architecture

### 14.1 Tool Comparison

| Criteria | Turborepo | Nx | Lerna | pnpm Workspaces |
|----------|-----------|-----|-------|-----------------|
| **Build Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Learning Curve** | Low | High | Low | Very Low |
| **Remote Caching** | ✅ Built-in | ✅ Built-in | ❌ | ❌ |
| **Task Orchestration** | ✅ Excellent | ✅ Excellent | ⚠️ Basic | ⚠️ Basic |
| **Dependency Graph** | ✅ Automatic | ✅ Automatic | ⚠️ Manual | ⚠️ Manual |
| **Configuration** | Minimal | Extensive | Minimal | Minimal |
| **Ecosystem** | Growing | Mature | Legacy | Native |
| **Bundle Size** | Small | Large | Small | None |

**Decision: Turborepo + pnpm**

Rationale:
- **Turborepo**: Minimal configuration, excellent caching, fast builds, perfect for small teams
- **pnpm**: Disk-efficient, strict dependency resolution, faster than npm/yarn
- Both integrate seamlessly and are actively maintained by Vercel

### 14.2 Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "VERCEL_URL"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["NEXT_PUBLIC_*", "API_URL"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "env": ["CI"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "outputs": ["playwright-report/**"],
      "env": ["CI", "PLAYWRIGHT_*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 14.3 pnpm Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'infrastructure/*'
```

```json
// .npmrc
auto-install-peers=true
strict-peer-dependencies=false
link-workspace-packages=true
prefer-workspace-packages=true
```

### 14.4 Workspace Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Monorepo Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────── apps/ ───────────────────────────┐           │
│  │                                                              │           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │           │
│  │  │  dashboard   │  │     api      │  │     docs     │      │           │
│  │  │  (Next.js)   │  │   (Lambda)   │  │  (Docusaurus)│      │           │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │           │
│  │         │                 │                                  │           │
│  └─────────┼─────────────────┼──────────────────────────────────┘           │
│            │                 │                                              │
│            │    Depends On   │                                              │
│            ▼                 ▼                                              │
│  ┌─────────────────────── packages/ ───────────────────────────┐           │
│  │                                                              │           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │           │
│  │  │     ui       │  │   shared     │  │   sdk        │      │           │
│  │  │ (Components) │  │   (Types)    │  │ (Agent SDK)  │      │           │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │           │
│  │                                                              │           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │           │
│  │  │   config     │  │    eslint    │  │  typescript  │      │           │
│  │  │  (Configs)   │  │   (Rules)    │  │   (TSConfig) │      │           │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │           │
│  │                                                              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────── infrastructure/ ─────────────────────────┐           │
│  │                                                              │           │
│  │  ┌──────────────┐  ┌──────────────┐                        │           │
│  │  │     cdk      │  │   terraform  │                        │           │
│  │  │  (AWS CDK)   │  │  (Optional)  │                        │           │
│  │  └──────────────┘  └──────────────┘                        │           │
│  │                                                              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Structure

### 14.1 Complete Directory Structure

```
ai-agent-analytics/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Main CI pipeline
│   │   ├── preview.yml               # Preview deployments
│   │   ├── production.yml            # Production deployment
│   │   └── codeql.yml                # Security scanning
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── dependabot.yml
│
├── apps/
│   ├── dashboard/                    # Next.js dashboard
│   │   ├── app/                      # App router pages
│   │   ├── components/               # React components
│   │   ├── lib/                      # Utilities, hooks, stores
│   │   ├── public/                   # Static assets
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   ├── api/                          # Backend API (Lambda)
│   │   ├── src/
│   │   │   ├── handlers/             # Lambda handlers
│   │   │   │   ├── events/
│   │   │   │   ├── metrics/
│   │   │   │   ├── sessions/
│   │   │   │   └── websocket/
│   │   │   ├── services/             # Business logic
│   │   │   ├── repositories/         # Data access
│   │   │   ├── middleware/           # Auth, validation
│   │   │   └── utils/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── esbuild.config.js
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── docs/                         # Documentation site
│       ├── docs/
│       ├── docusaurus.config.js
│       └── package.json
│
├── packages/
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button/
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── button.test.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared/                       # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts            # API types
│   │   │   │   ├── models.ts         # Domain models
│   │   │   │   └── events.ts         # Event schemas
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts
│   │   │   │   └── format.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── sdk/                          # Agent SDK
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── events.ts
│   │   │   ├── sessions.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── package.json
│   │
│   ├── config/                       # Shared configurations
│   │   ├── eslint/
│   │   │   ├── base.js
│   │   │   ├── next.js
│   │   │   ├── node.js
│   │   │   └── package.json
│   │   ├── typescript/
│   │   │   ├── base.json
│   │   │   ├── nextjs.json
│   │   │   ├── node.json
│   │   │   └── package.json
│   │   └── tailwind/
│   │       ├── tailwind.config.ts
│   │       └── package.json
│   │
│   └── database/                     # Database schemas & migrations
│       ├── src/
│       │   ├── schema/               # Drizzle schema
│       │   │   ├── organizations.ts
│       │   │   ├── users.ts
│       │   │   ├── sessions.ts
│       │   │   └── events.ts
│       │   ├── migrations/
│       │   └── seed/
│       ├── drizzle.config.ts
│       └── package.json
│
├── infrastructure/
│   ├── cdk/                          # AWS CDK
│   │   ├── bin/
│   │   │   └── app.ts
│   │   ├── lib/
│   │   │   ├── stacks/
│   │   │   │   ├── vpc-stack.ts
│   │   │   │   ├── database-stack.ts
│   │   │   │   ├── api-stack.ts
│   │   │   │   ├── pipeline-stack.ts
│   │   │   │   └── monitoring-stack.ts
│   │   │   └── constructs/
│   │   │       ├── lambda-api.ts
│   │   │       └── database.ts
│   │   ├── cdk.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── docker/                       # Docker configurations
│       ├── docker-compose.yml        # Local development
│       ├── docker-compose.test.yml   # Testing environment
│       ├── clickhouse/
│       │   ├── config.xml
│       │   └── users.xml
│       ├── postgres/
│       │   └── init.sql
│       └── localstack/
│           └── init-aws.sh
│
├── scripts/                          # Development scripts
│   ├── setup.sh                      # Initial setup
│   ├── dev.sh                        # Start development
│   ├── test.sh                       # Run tests
│   ├── deploy.sh                     # Deploy script
│   ├── db-migrate.ts                 # Database migrations
│   └── seed.ts                       # Seed data
│
├── .env.example                      # Environment template
├── .gitignore
├── .prettierrc
├── .prettierignore
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml               # pnpm workspaces
├── pnpm-lock.yaml
├── package.json                      # Root package.json
├── tsconfig.json                     # Root TypeScript config
├── README.md
└── CONTRIBUTING.md
```

### 14.2 Root Package Configuration

```json
// package.json (root)
{
  "name": "ai-agent-analytics",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\"",
    "prepare": "husky install",
    "db:migrate": "pnpm --filter @repo/database migrate",
    "db:seed": "pnpm --filter @repo/database seed",
    "docker:up": "docker-compose -f infrastructure/docker/docker-compose.yml up -d",
    "docker:down": "docker-compose -f infrastructure/docker/docker-compose.yml down",
    "cdk:deploy": "pnpm --filter @repo/cdk deploy",
    "cdk:diff": "pnpm --filter @repo/cdk diff"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.4.0",
    "@commitlint/config-conventional": "^18.4.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.14.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### 14.3 Package Dependencies

```mermaid
graph TB
    subgraph Apps
        DASHBOARD[dashboard]
        API[api]
        DOCS[docs]
    end
    
    subgraph Packages
        UI[ui]
        SHARED[shared]
        SDK[sdk]
        CONFIG[config]
        DB[database]
    end
    
    DASHBOARD --> UI
    DASHBOARD --> SHARED
    DASHBOARD --> CONFIG
    
    API --> SHARED
    API --> DB
    API --> CONFIG
    
    SDK --> SHARED
    
    UI --> CONFIG
    UI --> SHARED
```

---

## 5. Local Development Environment

### 14.1 Prerequisites

```bash
# Required software
- Node.js 20+ (LTS)
- pnpm 8+
- Docker Desktop 4.25+
- Git 2.40+

# Optional but recommended
- AWS CLI v2 (for production deployment)
- GitHub CLI (for PR workflows)
```

### 14.2 Docker Compose Configuration

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'

services:
  # PostgreSQL (Aurora-compatible)
  postgres:
    image: postgres:15-alpine
    container_name: analytics-postgres
    environment:
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: analytics_dev
      POSTGRES_DB: analytics
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analytics"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ClickHouse (Analytics)
  clickhouse:
    image: clickhouse/clickhouse-server:23.12
    container_name: analytics-clickhouse
    environment:
      CLICKHOUSE_USER: analytics
      CLICKHOUSE_PASSWORD: analytics_dev
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
    ports:
      - "8123:8123"  # HTTP
      - "9000:9000"  # Native
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./clickhouse/config.xml:/etc/clickhouse-server/config.d/config.xml
      - ./clickhouse/users.xml:/etc/clickhouse-server/users.d/users.xml
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8123/ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (Caching)
  redis:
    image: redis:7-alpine
    container_name: analytics-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # LocalStack (AWS Services)
  localstack:
    image: localstack/localstack:3.0
    container_name: analytics-localstack
    environment:
      SERVICES: kinesis,dynamodb,sqs,s3,lambda,apigateway,secretsmanager
      DEBUG: 1
      DATA_DIR: /var/lib/localstack/data
      LAMBDA_EXECUTOR: docker
      DOCKER_HOST: unix:///var/run/docker.sock
    ports:
      - "4566:4566"           # Main endpoint
      - "4510-4559:4510-4559" # External services
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock
      - ./localstack/init-aws.sh:/etc/localstack/init/ready.d/init-aws.sh
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Mailhog (Email testing)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: analytics-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  clickhouse_data:
  redis_data:
  localstack_data:

networks:
  default:
    name: analytics-network
```

### 14.3 LocalStack Initialization

```bash
#!/bin/bash
# infrastructure/docker/localstack/init-aws.sh

echo "Initializing AWS resources..."

# Create Kinesis streams
awslocal kinesis create-stream \
  --stream-name analytics-events \
  --shard-count 4

# Create DynamoDB tables
awslocal dynamodb create-table \
  --table-name websocket-connections \
  --attribute-definitions \
    AttributeName=connectionId,AttributeType=S \
    AttributeName=orgId,AttributeType=S \
  --key-schema \
    AttributeName=connectionId,KeyType=HASH \
  --global-secondary-indexes \
    '[{"IndexName":"org-index","KeySchema":[{"AttributeName":"orgId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

# Create S3 buckets
awslocal s3 mb s3://analytics-events-archive
awslocal s3 mb s3://analytics-exports

# Create SQS queues
awslocal sqs create-queue --queue-name analytics-dlq
awslocal sqs create-queue \
  --queue-name analytics-events \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:analytics-dlq\",\"maxReceiveCount\":3}"
  }'

# Create secrets
awslocal secretsmanager create-secret \
  --name analytics/api-keys \
  --secret-string '{"signing_key":"dev-signing-key-12345"}'

echo "AWS resources initialized!"
```

### 14.4 ClickHouse Schema

```sql
-- infrastructure/docker/clickhouse/init.sql
-- Events table (main analytics data)
CREATE TABLE IF NOT EXISTS events (
    event_id String,
    org_id String,
    event_type LowCardinality(String),
    timestamp DateTime64(3),
    session_id String,
    user_id String,
    agent_id LowCardinality(String),
    environment LowCardinality(String),
    metadata String,  -- JSON
    
    -- Partitioning and ordering
    INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 3,
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 3
)
ENGINE = MergeTree()
PARTITION BY (org_id, toYYYYMM(timestamp))
ORDER BY (org_id, timestamp, event_id)
TTL timestamp + INTERVAL 13 MONTH
SETTINGS index_granularity = 8192;

-- Pre-aggregated metrics (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_hourly
ENGINE = SummingMergeTree()
PARTITION BY (org_id, toYYYYMM(hour))
ORDER BY (org_id, hour, agent_id, environment)
AS SELECT
    org_id,
    toStartOfHour(timestamp) as hour,
    agent_id,
    environment,
    count() as event_count,
    countIf(event_type = 'session_start') as session_count,
    countIf(event_type = 'task_complete') as task_complete_count,
    countIf(event_type = 'task_error') as task_error_count,
    uniqExact(user_id) as unique_users,
    uniqExact(session_id) as unique_sessions
FROM events
GROUP BY org_id, hour, agent_id, environment;
```

### 14.5 Development Scripts

```bash
#!/bin/bash
# scripts/setup.sh - Initial project setup

set -e

echo "🚀 Setting up AI Agent Analytics development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy environment files
echo "📝 Setting up environment files..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local"
fi

if [ ! -f apps/dashboard/.env.local ]; then
    cp apps/dashboard/.env.example apps/dashboard/.env.local
    echo "✅ Created apps/dashboard/.env.local"
fi

if [ ! -f apps/api/.env.local ]; then
    cp apps/api/.env.example apps/api/.env.local
    echo "✅ Created apps/api/.env.local"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
docker-compose -f infrastructure/docker/docker-compose.yml ps

# Run database migrations
echo "🗃️ Running database migrations..."
pnpm db:migrate

# Seed development data
echo "🌱 Seeding development data..."
pnpm db:seed

echo ""
echo "✅ Setup complete! Run 'pnpm dev' to start development."
echo ""
echo "📚 Available services:"
echo "   Dashboard:    http://localhost:3000"
echo "   API:          http://localhost:3001"
echo "   PostgreSQL:   localhost:5432"
echo "   ClickHouse:   localhost:8123"
echo "   Redis:        localhost:6379"
echo "   LocalStack:   localhost:4566"
echo "   MailHog:      http://localhost:8025"
```

```bash
#!/bin/bash
# scripts/dev.sh - Start development environment

set -e

# Ensure Docker services are running
if ! docker-compose -f infrastructure/docker/docker-compose.yml ps | grep -q "Up"; then
    echo "🐳 Starting Docker services..."
    docker-compose -f infrastructure/docker/docker-compose.yml up -d
    sleep 5
fi

# Start development servers
echo "🚀 Starting development servers..."
pnpm dev
```

### 14.6 Environment Variables

```bash
# .env.example (root)

# ===========================================
# Local Development Configuration
# ===========================================

# Node environment
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://analytics:analytics_dev@localhost:5432/analytics

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=analytics
CLICKHOUSE_PASSWORD=analytics_dev
CLICKHOUSE_DATABASE=analytics

# Redis
REDIS_URL=redis://localhost:6379

# AWS (LocalStack)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566

# Kinesis
KINESIS_STREAM_NAME=analytics-events

# Auth (development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production
COGNITO_CLIENT_ID=local-client-id
COGNITO_CLIENT_SECRET=local-client-secret
COGNITO_ISSUER=http://localhost:4566

# API
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Feature flags
ENABLE_DEBUG_LOGGING=true
ENABLE_QUERY_LOGGING=true
```

```bash
# apps/dashboard/.env.example

# Dashboard-specific configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

---

## 6. Code Quality & Standards

### 14.1 ESLint Configuration

```javascript
// packages/config/eslint/base.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    
    // Import
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    'import/no-duplicates': 'error',
    
    // Unicorn
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/no-null': 'off',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
};
```

```javascript
// packages/config/eslint/next.js
module.exports = {
  extends: [
    './base.js',
    'next/core-web-vitals',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks'],
  rules: {
    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-no-target-blank': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Next.js specific
    '@next/next/no-html-link-for-pages': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

### 14.2 Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 14.3 TypeScript Configuration

```json
// packages/config/typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "exclude": ["node_modules", "dist", ".turbo"]
}
```

```json
// packages/config/typescript/nextjs.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### 14.4 Git Hooks (Husky + lint-staged)

```json
// package.json (root)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

```bash
# .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm commitlint --edit $1
```

### 14.5 Commit Message Convention

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semicolons, etc.
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding missing tests
        'chore',    // Maintain
        'ci',       // CI/CD changes
        'revert',   // Revert commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'dashboard',
        'api',
        'sdk',
        'ui',
        'shared',
        'infra',
        'docs',
        'deps',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 100],
  },
};

// Examples:
// feat(dashboard): add real-time metric updates
// fix(api): resolve rate limiting edge case
// docs(sdk): update authentication guide
// chore(deps): upgrade next.js to 14.1
```

---

## 7. Testing Strategy

### 14.1 Testing Pyramid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Testing Strategy                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌─────────────┐                                   │
│                           │     E2E     │  5%                               │
│                           │ (Playwright)│  Critical user flows              │
│                          ┌┴─────────────┴┐                                  │
│                          │  Integration  │  25%                             │
│                          │   (Vitest)    │  API, Component interactions    │
│                         ┌┴───────────────┴┐                                 │
│                         │      Unit       │  70%                            │
│                         │    (Vitest)     │  Utils, hooks, services         │
│                         └─────────────────┘                                 │
│                                                                             │
│  Test Locations:                                                            │
│  ├─ Unit:        packages/**/tests/unit/                                   │
│  ├─ Integration: apps/**/tests/integration/                                │
│  └─ E2E:         apps/dashboard/e2e/                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Vitest Configuration

```typescript
// apps/dashboard/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './coverage/test-results.json',
    },
  },
});
```

```typescript
// apps/dashboard/tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user_123', email: 'test@example.com' },
      accessToken: 'mock-token',
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
```

### 14.3 API Integration Tests

```typescript
// apps/api/tests/integration/events.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, TestContext } from '../helpers/test-client';
import { seedTestData, cleanupTestData } from '../helpers/seed';

describe('Events API', () => {
  let ctx: TestContext;
  
  beforeAll(async () => {
    ctx = await createTestClient();
  });
  
  afterAll(async () => {
    await ctx.cleanup();
  });
  
  beforeEach(async () => {
    await cleanupTestData(ctx.db);
    await seedTestData(ctx.db);
  });
  
  describe('POST /v1/events', () => {
    it('accepts valid event batch', async () => {
      const response = await ctx.client.post('/v1/events', {
        events: [
          {
            event_id: 'evt_test123',
            event_type: 'session_start',
            timestamp: new Date().toISOString(),
            session_id: 'sess_test123',
            user_id: 'user_test',
            agent_id: 'agent_claude_code',
          },
        ],
      });
      
      expect(response.status).toBe(202);
      expect(response.data.accepted).toBe(1);
      expect(response.data.rejected).toBe(0);
    });
    
    it('rejects invalid event schema', async () => {
      const response = await ctx.client.post('/v1/events', {
        events: [
          {
            event_id: 'evt_test123',
            // Missing required fields
          },
        ],
      });
      
      expect(response.status).toBe(422);
      expect(response.data.error.code).toBe('VAL_INVALID_FORMAT');
    });
    
    it('enforces rate limits', async () => {
      // Send requests up to the limit
      for (let i = 0; i < 100; i++) {
        await ctx.client.post('/v1/events', { events: [] });
      }
      
      // Next request should be rate limited
      const response = await ctx.client.post('/v1/events', { events: [] });
      expect(response.status).toBe(429);
    });
    
    it('validates API key authentication', async () => {
      const unauthClient = createTestClient({ noAuth: true });
      const response = await unauthClient.post('/v1/events', { events: [] });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Tenant Isolation', () => {
    it('prevents cross-tenant data access', async () => {
      // Create event for org A
      const orgAClient = await createTestClient({ orgId: 'org_a' });
      await orgAClient.post('/v1/events', {
        events: [{
          event_id: 'evt_org_a',
          event_type: 'session_start',
          timestamp: new Date().toISOString(),
          session_id: 'sess_org_a',
          user_id: 'user_a',
          agent_id: 'agent_1',
        }],
      });
      
      // Try to query from org B
      const orgBClient = await createTestClient({ orgId: 'org_b' });
      const response = await orgBClient.get('/v1/events', {
        params: {
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString(),
        },
      });
      
      // Should not see org A's events
      expect(response.data.data).toHaveLength(0);
    });
  });
});
```

### 14.4 Playwright E2E Tests

```typescript
// apps/dashboard/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

```typescript
// apps/dashboard/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type="submit"]');
  
  // Wait for authentication to complete
  await page.waitForURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
```

```typescript
// apps/dashboard/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('displays overview metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check metric cards are visible
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Total Sessions')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Est. Cost')).toBeVisible();
  });
  
  test('filters by date range', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open date picker
    await page.click('[data-testid="date-range-picker"]');
    
    // Select last 30 days
    await page.click('text=Last 30 days');
    
    // Verify URL updated
    await expect(page).toHaveURL(/period=30d/);
    
    // Verify data refreshed (loading indicator should appear and disappear)
    await expect(page.getByTestId('loading-indicator')).toBeVisible();
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 5000 });
  });
  
  test('navigates to session detail', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    
    // Click first session
    await page.click('[data-testid="session-row"]:first-child');
    
    // Should navigate to session detail
    await expect(page).toHaveURL(/\/sessions\/sess_/);
    await expect(page.getByText('Session Details')).toBeVisible();
  });
  
  test('shows real-time connection status', async ({ page }) => {
    await page.goto('/dashboard');
    
    // WebSocket should connect and show live status
    await expect(page.getByTestId('connection-status')).toContainText('Live', {
      timeout: 10000,
    });
  });
});
```

---

## 8. CI/CD Pipeline

### 14.1 Pipeline Architecture

```mermaid
flowchart LR
    subgraph Trigger["Trigger"]
        PR["Pull Request"]
        PUSH["Push to main"]
        TAG["Release Tag"]
    end
    
    subgraph CI["CI Pipeline"]
        LINT["Lint & Type Check"]
        TEST_UNIT["Unit Tests"]
        TEST_INT["Integration Tests"]
        BUILD["Build"]
        TEST_E2E["E2E Tests"]
    end
    
    subgraph CD["CD Pipeline"]
        PREVIEW["Preview Deploy"]
        STAGING["Staging Deploy"]
        PROD["Production Deploy"]
    end
    
    PR --> LINT
    PUSH --> LINT
    TAG --> LINT
    
    LINT --> TEST_UNIT
    TEST_UNIT --> TEST_INT
    TEST_INT --> BUILD
    BUILD --> TEST_E2E
    
    PR --> |on success| PREVIEW
    PUSH --> |on success| STAGING
    TAG --> |on success| PROD
```

### 14.2 Main CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Lint
        run: pnpm lint
        
      - name: Type check
        run: pnpm type-check
        
      - name: Format check
        run: pnpm format:check

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run unit tests
        run: pnpm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: analytics
          POSTGRES_PASSWORD: analytics_test
          POSTGRES_DB: analytics_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      clickhouse:
        image: clickhouse/clickhouse-server:23.12
        ports:
          - 8123:8123
          - 9000:9000
        options: >-
          --health-cmd "wget --spider -q http://localhost:8123/ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Setup LocalStack
        uses: localstack/setup-localstack@v0.2.0
        with:
          image-tag: 'latest'
          
      - name: Run database migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://analytics:analytics_test@localhost:5432/analytics_test
          
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://analytics:analytics_test@localhost:5432/analytics_test
          CLICKHOUSE_HOST: localhost
          REDIS_URL: redis://localhost:6379
          AWS_ENDPOINT_URL: http://localhost:4566

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            apps/dashboard/.next
            apps/api/dist
          retention-days: 1

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
        
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/dashboard/playwright-report/
          retention-days: 7
```

### 14.3 Preview Deployment Workflow

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      deployments: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest
        
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Preview
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT
          
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🚀 Preview Deployment Ready
              
              | Environment | URL |
              |-------------|-----|
              | Dashboard | [${{ steps.deploy.outputs.preview_url }}](${{ steps.deploy.outputs.preview_url }}) |
              
              Commit: ${{ github.sha }}`
            })
```

### 14.4 Production Deployment Workflow

```yaml
# .github/workflows/production.yml
name: Production Deployment

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'production'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    name: Deploy to ${{ github.event.inputs.environment || 'production' }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'production' }}
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
          
      # Deploy Dashboard to Vercel
      - name: Deploy Dashboard
        run: |
          vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prod --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
          
      # Deploy Backend to AWS
      - name: Deploy Backend (CDK)
        working-directory: infrastructure/cdk
        run: |
          pnpm install
          pnpm cdk deploy --all --require-approval never
        env:
          CDK_DEFAULT_ACCOUNT: ${{ secrets.AWS_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ vars.AWS_REGION }}
          
      - name: Run post-deployment tests
        run: pnpm test:smoke
        env:
          API_URL: ${{ vars.API_URL }}
          
      - name: Create Release Notes
        uses: actions/github-script@v7
        if: startsWith(github.ref, 'refs/tags/')
        with:
          script: |
            const tag = context.ref.replace('refs/tags/', '');
            await github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: tag,
              name: `Release ${tag}`,
              generate_release_notes: true
            });
```

---

## 9. Environment Management

### 14.1 Environment Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Environment Tiers                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Local     │    │  Preview    │    │  Staging    │    │ Production  │ │
│  │   (dev)     │───▶│   (PR)      │───▶│   (main)    │───▶│   (tag)     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
│  Local:      Developer machine, Docker services                            │
│  Preview:    PR deployments, ephemeral, isolated                           │
│  Staging:    Pre-production, full infrastructure, test data               │
│  Production: Live environment, real data, monitored                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Environment Configuration Matrix

| Config | Local | Preview | Staging | Production |
|--------|-------|---------|---------|------------|
| **Database** | Docker Postgres | RDS (shared) | RDS (staging) | RDS (prod) |
| **ClickHouse** | Docker | ClickHouse Cloud (dev) | ClickHouse Cloud (staging) | ClickHouse Cloud (prod) |
| **Redis** | Docker | ElastiCache (shared) | ElastiCache (staging) | ElastiCache (prod) |
| **AWS Services** | LocalStack | AWS (dev account) | AWS (staging) | AWS (prod) |
| **Auth** | Mock/Bypass | Cognito (dev) | Cognito (staging) | Cognito (prod) |
| **Logging** | Console | CloudWatch | CloudWatch | CloudWatch + Datadog |
| **Monitoring** | None | Basic | Full | Full + PagerDuty |

### 14.3 Environment Variable Schema

```typescript
// packages/shared/src/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  
  // ClickHouse
  CLICKHOUSE_HOST: z.string(),
  CLICKHOUSE_PORT: z.coerce.number().default(8123),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string(),
  CLICKHOUSE_DATABASE: z.string().default('analytics'),
  
  // Redis
  REDIS_URL: z.string().url(),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
  
  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_ENDPOINT_URL: z.string().url().optional(), // For LocalStack
  
  // Kinesis
  KINESIS_STREAM_NAME: z.string(),
  KINESIS_SHARD_COUNT: z.coerce.number().default(4),
  
  // Auth
  COGNITO_USER_POOL_ID: z.string(),
  COGNITO_CLIENT_ID: z.string(),
  COGNITO_CLIENT_SECRET: z.string().optional(),
  
  // API
  API_URL: z.string().url(),
  API_TIMEOUT_MS: z.coerce.number().default(30000),
  
  // Feature Flags
  ENABLE_DEBUG_LOGGING: z.coerce.boolean().default(false),
  ENABLE_REAL_TIME: z.coerce.boolean().default(true),
  ENABLE_COST_TRACKING: z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return result.data;
}

// Usage
export const env = validateEnv();
```

---

## 10. Secrets Management

### 14.1 Secrets Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Secrets Management                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Secret Type              Storage Location              Access Method       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  DB Credentials           AWS Secrets Manager           CDK/Lambda          │
│  API Keys                 AWS Secrets Manager           Lambda + SDK        │
│  Auth Secrets             AWS Secrets Manager           Cognito             │
│  Third-party APIs         AWS Secrets Manager           Lambda              │
│  CI/CD Secrets            GitHub Secrets                GitHub Actions      │
│  Vercel Env Vars          Vercel Dashboard              Vercel              │
│                                                                             │
│  Local Development        .env.local (gitignored)       dotenv              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 AWS Secrets Manager Integration

```typescript
// packages/shared/src/secrets.ts
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION,
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
  }),
});

// Cache for secrets
const secretsCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName: string): Promise<string> {
  // Check cache
  const cached = secretsCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  
  // Fetch from Secrets Manager
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  
  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} not found`);
  }
  
  // Cache the value
  secretsCache.set(secretName, {
    value: response.SecretString,
    expiresAt: Date.now() + CACHE_TTL,
  });
  
  return response.SecretString;
}

export async function getDatabaseCredentials(): Promise<{
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}> {
  const secret = await getSecret('analytics/database');
  return JSON.parse(secret);
}

export async function getApiSigningKey(): Promise<string> {
  const secret = await getSecret('analytics/api-keys');
  const parsed = JSON.parse(secret);
  return parsed.signing_key;
}
```

### 14.3 Secrets in CDK

```typescript
// infrastructure/cdk/lib/stacks/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class DatabaseStack extends cdk.Stack {
  public readonly secret: secretsmanager.ISecret;
  public readonly database: rds.DatabaseCluster;
  
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    
    // Create secret for database credentials
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'analytics/database',
      description: 'Analytics database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'analytics_admin',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
    
    // Create Aurora cluster with secret
    this.database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      defaultDatabaseName: 'analytics',
      // ... other config
    });
    
    // Grant Lambda functions access to secret
    this.secret.grantRead(props.lambdaRole);
  }
}
```

### 14.4 GitHub Secrets Structure

```yaml
# Required GitHub Secrets for CI/CD

# AWS
AWS_ROLE_ARN: arn:aws:iam::123456789012:role/github-actions-role
AWS_ACCOUNT_ID: "123456789012"

# Vercel
VERCEL_TOKEN: vercel_xxx
VERCEL_ORG_ID: team_xxx
VERCEL_PROJECT_ID: prj_xxx

# Turborepo
TURBO_TOKEN: xxx

# Testing
TEST_USER_EMAIL: test@example.com
TEST_USER_PASSWORD: xxx

# Codecov
CODECOV_TOKEN: xxx
```

---

## 11. Deployment Strategy

### 14.1 Deployment Architecture

```mermaid
flowchart TB
    subgraph GitHub["GitHub"]
        REPO["Repository"]
        ACTIONS["GitHub Actions"]
    end
    
    subgraph Vercel["Vercel (Frontend)"]
        EDGE["Edge Network"]
        NEXT["Next.js App"]
    end
    
    subgraph AWS["AWS (Backend)"]
        APIGW["API Gateway"]
        LAMBDA["Lambda Functions"]
        subgraph Data["Data Layer"]
            AURORA["Aurora PostgreSQL"]
            CH["ClickHouse Cloud"]
            REDIS["ElastiCache"]
        end
        subgraph Stream["Streaming"]
            KINESIS["Kinesis"]
            FLINK["Managed Flink"]
        end
    end
    
    REPO --> ACTIONS
    ACTIONS --> |"Deploy Frontend"| EDGE
    ACTIONS --> |"CDK Deploy"| APIGW
    
    EDGE --> NEXT
    NEXT --> APIGW
    APIGW --> LAMBDA
    LAMBDA --> Data
    KINESIS --> FLINK
    FLINK --> CH
```

### 14.2 AWS CDK Application

```typescript
// infrastructure/cdk/bin/app.ts
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { StreamingStack } from '../lib/stacks/streaming-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const environment = app.node.tryGetContext('environment') || 'staging';

// VPC Stack
const vpcStack = new VpcStack(app, `Analytics-VPC-${environment}`, {
  env,
  environment,
});

// Database Stack
const databaseStack = new DatabaseStack(app, `Analytics-Database-${environment}`, {
  env,
  environment,
  vpc: vpcStack.vpc,
});

// Streaming Stack (Kinesis + Flink)
const streamingStack = new StreamingStack(app, `Analytics-Streaming-${environment}`, {
  env,
  environment,
  vpc: vpcStack.vpc,
  clickhouseHost: process.env.CLICKHOUSE_HOST!,
});

// API Stack (Lambda + API Gateway)
const apiStack = new ApiStack(app, `Analytics-API-${environment}`, {
  env,
  environment,
  vpc: vpcStack.vpc,
  database: databaseStack.database,
  databaseSecret: databaseStack.secret,
  kinesisStream: streamingStack.stream,
  redis: databaseStack.redis,
});

// Monitoring Stack
new MonitoringStack(app, `Analytics-Monitoring-${environment}`, {
  env,
  environment,
  api: apiStack.api,
  lambdaFunctions: apiStack.functions,
  database: databaseStack.database,
  kinesisStream: streamingStack.stream,
});

app.synth();
```

### 14.3 Lambda API Stack

```typescript
// infrastructure/cdk/lib/stacks/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.HttpApi;
  public readonly functions: lambda.Function[];
  
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    
    // Shared Lambda layer
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../apps/api/dist/layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared dependencies',
    });
    
    // Common Lambda configuration
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      layers: [sharedLayer],
      vpc: props.vpc,
      environment: {
        NODE_ENV: props.environment,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        REDIS_URL: props.redis.attrPrimaryEndPointAddress,
        KINESIS_STREAM_NAME: props.kinesisStream.streamName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk', '@aws-sdk/*'],
      },
    };
    
    // Events handler
    const eventsHandler = new NodejsFunction(this, 'EventsHandler', {
      ...commonProps,
      entry: path.join(__dirname, '../../../../apps/api/src/handlers/events/ingest.ts'),
      handler: 'handler',
      functionName: `analytics-events-${props.environment}`,
    });
    
    // Metrics handler
    const metricsHandler = new NodejsFunction(this, 'MetricsHandler', {
      ...commonProps,
      entry: path.join(__dirname, '../../../../apps/api/src/handlers/metrics/overview.ts'),
      handler: 'handler',
      functionName: `analytics-metrics-${props.environment}`,
    });
    
    // Sessions handler
    const sessionsHandler = new NodejsFunction(this, 'SessionsHandler', {
      ...commonProps,
      entry: path.join(__dirname, '../../../../apps/api/src/handlers/sessions/list.ts'),
      handler: 'handler',
      functionName: `analytics-sessions-${props.environment}`,
    });
    
    // Grant permissions
    props.databaseSecret.grantRead(eventsHandler);
    props.databaseSecret.grantRead(metricsHandler);
    props.databaseSecret.grantRead(sessionsHandler);
    props.kinesisStream.grantWrite(eventsHandler);
    
    // HTTP API
    this.api = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `analytics-api-${props.environment}`,
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type', 'X-API-Key'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: props.environment === 'production'
          ? ['https://dashboard.analytics.example.com']
          : ['*'],
      },
    });
    
    // Add routes
    this.api.addRoutes({
      path: '/v1/events',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'EventsIntegration',
        eventsHandler
      ),
    });
    
    this.api.addRoutes({
      path: '/v1/metrics/{proxy+}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'MetricsIntegration',
        metricsHandler
      ),
    });
    
    this.api.addRoutes({
      path: '/v1/sessions',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'SessionsIntegration',
        sessionsHandler
      ),
    });
    
    this.functions = [eventsHandler, metricsHandler, sessionsHandler];
    
    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url!,
      description: 'API Gateway URL',
    });
  }
}
```

### 14.4 Zero-Downtime Deployment

```typescript
// infrastructure/cdk/lib/constructs/lambda-deployment.ts
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';

export function configureBlueGreenDeployment(
  scope: Construct,
  lambdaFunction: lambda.Function
): codedeploy.LambdaDeploymentGroup {
  // Create alias for the function
  const alias = new lambda.Alias(scope, `${lambdaFunction.node.id}Alias`, {
    aliasName: 'live',
    version: lambdaFunction.currentVersion,
  });
  
  // Create deployment group with traffic shifting
  const deploymentGroup = new codedeploy.LambdaDeploymentGroup(
    scope,
    `${lambdaFunction.node.id}DeploymentGroup`,
    {
      alias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarms: [
        // Add CloudWatch alarms for automatic rollback
      ],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true,
      },
    }
  );
  
  return deploymentGroup;
}
```

---

## 12. Database Management & Migrations

### 14.1 Migration Strategy Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Database Migration Strategy                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Principles:                                                                │
│  1. ALL migrations must be reversible (up + down)                          │
│  2. Migrations run BEFORE code deployment                                   │
│  3. Schema changes must be backward-compatible                              │
│  4. Large data migrations run separately from schema changes                │
│  5. Every migration is tested in staging before production                  │
│                                                                             │
│  Tools:                                                                     │
│  ├─ PostgreSQL: Drizzle ORM + custom migration runner                      │
│  └─ ClickHouse: Custom SQL migrations with version tracking                │
│                                                                             │
│  Migration Flow:                                                            │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │  Write  │──▶│  Test   │──▶│ Review  │──▶│ Staging │──▶│  Prod   │     │
│  │Migration│   │ Locally │   │   PR    │   │ Deploy  │   │ Deploy  │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Drizzle Migration Configuration

```typescript
// packages/database/drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/*',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

```typescript
// packages/database/src/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { logger } from '@repo/shared/logger';

interface MigrationOptions {
  direction: 'up' | 'down';
  steps?: number;  // Number of migrations to run (default: all)
  dryRun?: boolean;
  target?: string; // Specific migration to target
}

export async function runMigrations(options: MigrationOptions = { direction: 'up' }): Promise<MigrationResult> {
  const connectionString = process.env.DATABASE_URL!;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  
  const startTime = Date.now();
  const results: MigrationStepResult[] = [];
  
  try {
    if (options.direction === 'up') {
      logger.info('Running migrations (up)...');
      
      if (options.dryRun) {
        const pending = await getPendingMigrations(db);
        logger.info({ pending }, 'Dry run - pending migrations');
        return { success: true, migrations: pending, dryRun: true };
      }
      
      await migrate(db, { migrationsFolder: './src/migrations' });
      
    } else {
      logger.info({ steps: options.steps || 1 }, 'Running migrations (down)...');
      await rollbackMigrations(db, options.steps || 1, options.target);
    }
    
    const duration = Date.now() - startTime;
    logger.info({ duration }, 'Migrations completed successfully');
    
    return {
      success: true,
      migrations: results,
      duration,
    };
    
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  } finally {
    await sql.end();
  }
}
```

### 14.3 Migration File Structure

```typescript
// packages/database/src/migrations/0001_create_organizations.ts
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const id = '0001_create_organizations';
export const description = 'Create organizations table';

export async function up(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    CREATE TABLE organizations (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(63) NOT NULL UNIQUE,
      plan VARCHAR(50) NOT NULL DEFAULT 'free',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_organizations_slug ON organizations(slug);
    CREATE INDEX idx_organizations_status ON organizations(status);
  `);
}

export async function down(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS organizations CASCADE;
  `);
}

// Validation that migration is reversible
export async function validate(db: PostgresJsDatabase): Promise<boolean> {
  // Run up, verify table exists, run down, verify table gone
  return true;
}
```

```typescript
// packages/database/src/migrations/0005_add_user_teams.ts
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const id = '0005_add_user_teams';
export const description = 'Add teams column to users table';

// This is a BACKWARD-COMPATIBLE change (adding nullable column)
export async function up(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN teams TEXT[] DEFAULT '{}';
    
    CREATE INDEX idx_users_teams ON users USING GIN(teams);
  `);
}

export async function down(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_users_teams;
    ALTER TABLE users DROP COLUMN IF EXISTS teams;
  `);
}
```

### 14.4 Rollback Procedures

#### 11.4.1 Rollback Strategy Matrix

| Scenario | Rollback Method | Time Estimate | Risk Level |
|----------|-----------------|---------------|------------|
| Schema migration failed mid-way | Automatic transaction rollback | Instant | Low |
| Migration succeeded, but app fails | Run migration `down` | 1-5 min | Medium |
| Data migration corrupted data | Restore from backup + replay | 15-60 min | High |
| Multiple migrations to rollback | Sequential `down` migrations | 5-15 min | Medium |
| Production emergency | PITR restore | 15-30 min | High |

#### 11.4.2 Automated Rollback System

```typescript
// packages/database/src/rollback.ts
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { logger } from '@repo/shared/logger';

interface RollbackOptions {
  steps: number;           // Number of migrations to rollback
  target?: string;         // Specific migration ID to rollback to
  dryRun?: boolean;        // Preview without executing
  force?: boolean;         // Skip confirmation prompts
  createBackup?: boolean;  // Create backup before rollback
}

interface MigrationRecord {
  id: string;
  name: string;
  applied_at: Date;
  checksum: string;
}

export async function rollbackMigrations(
  db: PostgresJsDatabase,
  options: RollbackOptions
): Promise<RollbackResult> {
  const startTime = Date.now();
  
  // 1. Get applied migrations in reverse order
  const appliedMigrations = await db.execute<MigrationRecord>(sql`
    SELECT id, name, applied_at, checksum
    FROM drizzle_migrations
    ORDER BY applied_at DESC
  `);
  
  if (appliedMigrations.length === 0) {
    logger.warn('No migrations to rollback');
    return { success: true, migrationsRolledBack: [] };
  }
  
  // 2. Determine which migrations to rollback
  let migrationsToRollback: MigrationRecord[];
  
  if (options.target) {
    // Rollback to specific migration
    const targetIndex = appliedMigrations.findIndex(m => m.id === options.target);
    if (targetIndex === -1) {
      throw new Error(`Target migration ${options.target} not found in applied migrations`);
    }
    migrationsToRollback = appliedMigrations.slice(0, targetIndex);
  } else {
    // Rollback N steps
    migrationsToRollback = appliedMigrations.slice(0, options.steps);
  }
  
  logger.info({
    count: migrationsToRollback.length,
    migrations: migrationsToRollback.map(m => m.id),
  }, 'Migrations to rollback');
  
  // 3. Dry run - just show what would happen
  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      migrationsToRollback: migrationsToRollback.map(m => m.id),
    };
  }
  
  // 4. Create backup if requested
  if (options.createBackup) {
    logger.info('Creating backup before rollback...');
    await createPreRollbackBackup(db);
  }
  
  // 5. Execute rollbacks in transaction
  const rolledBack: string[] = [];
  
  await db.transaction(async (tx) => {
    for (const migration of migrationsToRollback) {
      logger.info({ migrationId: migration.id }, 'Rolling back migration');
      
      try {
        // Load migration file
        const migrationModule = await import(`./migrations/${migration.name}`);
        
        if (!migrationModule.down) {
          throw new Error(`Migration ${migration.id} does not have a down() function`);
        }
        
        // Execute down migration
        await migrationModule.down(tx);
        
        // Remove from migrations table
        await tx.execute(sql`
          DELETE FROM drizzle_migrations WHERE id = ${migration.id}
        `);
        
        rolledBack.push(migration.id);
        logger.info({ migrationId: migration.id }, 'Migration rolled back successfully');
        
      } catch (error) {
        logger.error({ migrationId: migration.id, error }, 'Failed to rollback migration');
        throw error; // Transaction will be rolled back
      }
    }
  });
  
  const duration = Date.now() - startTime;
  
  logger.info({
    duration,
    rolledBack,
  }, 'Rollback completed successfully');
  
  return {
    success: true,
    migrationsRolledBack: rolledBack,
    duration,
  };
}

// Pre-rollback backup
async function createPreRollbackBackup(db: PostgresJsDatabase): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `pre-rollback-${timestamp}`;
  
  // For RDS/Aurora - create snapshot
  if (process.env.DATABASE_CLUSTER_ID) {
    const rds = new RDSClient({ region: process.env.AWS_REGION });
    await rds.send(new CreateDBClusterSnapshotCommand({
      DBClusterIdentifier: process.env.DATABASE_CLUSTER_ID,
      DBClusterSnapshotIdentifier: backupName,
    }));
  }
  
  return backupName;
}
```

#### 11.4.3 CLI Rollback Commands

```typescript
// packages/database/src/cli.ts
import { Command } from 'commander';
import { rollbackMigrations, runMigrations, getMigrationStatus } from './migrate';
import { confirm } from '@inquirer/prompts';

const program = new Command();

program
  .name('db')
  .description('Database migration management');

// Status command
program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const status = await getMigrationStatus();
    console.table(status.applied);
    console.log(`\nPending migrations: ${status.pending.length}`);
    if (status.pending.length > 0) {
      console.table(status.pending);
    }
  });

// Migrate up
program
  .command('migrate')
  .description('Run pending migrations')
  .option('-n, --dry-run', 'Show what would be run without executing')
  .action(async (options) => {
    await runMigrations({ direction: 'up', dryRun: options.dryRun });
  });

// Rollback command
program
  .command('rollback')
  .description('Rollback migrations')
  .option('-s, --steps <number>', 'Number of migrations to rollback', '1')
  .option('-t, --target <id>', 'Rollback to specific migration ID')
  .option('-n, --dry-run', 'Show what would be rolled back without executing')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-b, --backup', 'Create backup before rollback')
  .action(async (options) => {
    const steps = parseInt(options.steps, 10);
    
    // Show what will be rolled back
    const preview = await rollbackMigrations(db, {
      steps,
      target: options.target,
      dryRun: true,
    });
    
    console.log('\nMigrations to rollback:');
    console.table(preview.migrationsToRollback);
    
    if (options.dryRun) {
      console.log('\n(Dry run - no changes made)');
      return;
    }
    
    // Confirm unless --force
    if (!options.force) {
      const confirmed = await confirm({
        message: `Are you sure you want to rollback ${preview.migrationsToRollback.length} migration(s)?`,
        default: false,
      });
      
      if (!confirmed) {
        console.log('Rollback cancelled');
        return;
      }
    }
    
    // Execute rollback
    const result = await rollbackMigrations(db, {
      steps,
      target: options.target,
      createBackup: options.backup,
    });
    
    console.log('\n✅ Rollback completed successfully');
    console.log(`   Migrations rolled back: ${result.migrationsRolledBack.length}`);
    console.log(`   Duration: ${result.duration}ms`);
  });

// Reset (rollback all + migrate)
program
  .command('reset')
  .description('Rollback all migrations and re-run (DANGEROUS)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.force) {
      const confirmed = await confirm({
        message: '⚠️  This will DELETE ALL DATA. Are you absolutely sure?',
        default: false,
      });
      
      if (!confirmed) {
        console.log('Reset cancelled');
        return;
      }
    }
    
    // Rollback all
    await rollbackMigrations(db, { steps: 999, force: true });
    
    // Migrate up
    await runMigrations({ direction: 'up' });
    
    console.log('✅ Database reset completed');
  });

program.parse();
```

#### 11.4.4 Production Rollback Runbook

```markdown
## Production Migration Rollback Runbook

### Pre-Rollback Checklist

- [ ] Identify the problematic migration
- [ ] Verify rollback script exists and is tested
- [ ] Notify team in #incidents Slack channel
- [ ] Check current database connections and load
- [ ] Ensure you have production database access
- [ ] Create manual backup (even if automated exists)

### Step-by-Step Rollback Procedure

#### 1. Create Backup (5 min)

```bash
# Create RDS snapshot before any changes
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier analytics-prod \
  --db-cluster-snapshot-identifier pre-rollback-$(date +%Y%m%d-%H%M%S)

# Wait for snapshot to complete
aws rds wait db-cluster-snapshot-available \
  --db-cluster-snapshot-identifier pre-rollback-$(date +%Y%m%d-%H%M%S)
```

#### 2. Enable Maintenance Mode (Optional)

```bash
# If rollback might cause temporary inconsistency
aws lambda invoke \
  --function-name analytics-maintenance-mode \
  --payload '{"enabled": true, "message": "Database maintenance in progress"}' \
  /dev/null
```

#### 3. Check Current Migration Status

```bash
# Connect to production database
pnpm db:status --env production

# Note the current migration version and what needs to be rolled back
```

#### 4. Execute Rollback

```bash
# Dry run first to verify
pnpm db:rollback --steps 1 --dry-run --env production

# Execute rollback with backup
pnpm db:rollback --steps 1 --backup --env production

# Or rollback to specific migration
pnpm db:rollback --target 0005_add_user_teams --env production
```

#### 5. Verify Rollback

```bash
# Check migration status
pnpm db:status --env production

# Run health checks
curl https://api.analytics.example.com/health

# Check for errors in logs
aws logs tail /aws/lambda/analytics-api --since 5m
```

#### 6. Rollback Application (If Needed)

```bash
# If app code depends on the rolled-back schema
# Revert to previous app version
aws lambda update-function-code \
  --function-name analytics-api \
  --s3-bucket analytics-deployments \
  --s3-key releases/previous-stable.zip
```

#### 7. Disable Maintenance Mode

```bash
aws lambda invoke \
  --function-name analytics-maintenance-mode \
  --payload '{"enabled": false}' \
  /dev/null
```

#### 8. Post-Rollback

- [ ] Verify all services are healthy
- [ ] Check error rates in monitoring
- [ ] Update status page
- [ ] Document incident timeline
- [ ] Schedule post-mortem

### Emergency: Full Database Restore

If migration corrupted data and rollback is insufficient:

```bash
# 1. Stop all write traffic
aws lambda invoke --function-name analytics-maintenance-mode \
  --payload '{"enabled": true}'

# 2. Identify restore point
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier analytics-prod \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime]'

# 3. Restore to new cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier analytics-prod-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql

# 4. Wait for restore
aws rds wait db-cluster-available \
  --db-cluster-identifier analytics-prod-restored

# 5. Update application to use restored cluster
aws ssm put-parameter \
  --name "/analytics/prod/database/endpoint" \
  --value "<new-endpoint>" \
  --overwrite

# 6. Restart application
aws lambda update-function-configuration \
  --function-name analytics-api \
  --environment "Variables={DATABASE_URL=<new-connection-string>}"

# 7. Disable maintenance mode
# 8. Verify and monitor
```
```

#### 11.4.5 ClickHouse Migration Rollback

```typescript
// packages/database/src/clickhouse/migrate.ts
import { ClickHouseClient } from '@clickhouse/client';
import { logger } from '@repo/shared/logger';

interface ClickHouseMigration {
  id: string;
  name: string;
  up: string;    // SQL to apply
  down: string;  // SQL to rollback
}

export async function rollbackClickHouseMigration(
  client: ClickHouseClient,
  migrationId: string
): Promise<void> {
  // 1. Load migration
  const migration = await loadMigration(migrationId);
  
  if (!migration.down) {
    throw new Error(`Migration ${migrationId} does not have rollback SQL`);
  }
  
  logger.info({ migrationId }, 'Rolling back ClickHouse migration');
  
  // 2. ClickHouse doesn't have transactions, so we need to be careful
  // Create backup table first
  const tables = extractTablesFromSQL(migration.down);
  
  for (const table of tables) {
    await client.query({
      query: `CREATE TABLE IF NOT EXISTS ${table}_backup AS SELECT * FROM ${table}`,
    });
  }
  
  try {
    // 3. Execute rollback SQL
    const statements = migration.down.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      await client.query({ query: statement });
    }
    
    // 4. Update migrations table
    await client.query({
      query: `
        ALTER TABLE _migrations 
        DELETE WHERE id = {id:String}
      `,
      query_params: { id: migrationId },
    });
    
    // 5. Cleanup backup tables
    for (const table of tables) {
      await client.query({ query: `DROP TABLE IF EXISTS ${table}_backup` });
    }
    
    logger.info({ migrationId }, 'ClickHouse migration rolled back successfully');
    
  } catch (error) {
    logger.error({ migrationId, error }, 'ClickHouse rollback failed, restoring from backup');
    
    // Restore from backup
    for (const table of tables) {
      await client.query({
        query: `
          INSERT INTO ${table} 
          SELECT * FROM ${table}_backup 
          WHERE 1=1  -- ClickHouse doesn't allow empty WHERE
        `,
      });
    }
    
    throw error;
  }
}

// Example ClickHouse migration with rollback
const exampleMigration: ClickHouseMigration = {
  id: 'ch_0003_add_cost_column',
  name: 'Add estimated_cost column to events',
  up: `
    ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS estimated_cost Float64 DEFAULT 0;
    
    -- Backfill existing data
    ALTER TABLE events 
    UPDATE estimated_cost = (tokens_input * 0.00001 + tokens_output * 0.00003)
    WHERE estimated_cost = 0 AND tokens_input > 0;
  `,
  down: `
    ALTER TABLE events 
    DROP COLUMN IF EXISTS estimated_cost;
  `,
};
```

### 14.5 Safe Migration Patterns

#### Pattern 1: Expand-Contract (for breaking changes)

```typescript
// Phase 1: Expand - Add new column, keep old one
// Migration: 0010_expand_user_email.ts
export async function up(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    -- Add new column (nullable)
    ALTER TABLE users ADD COLUMN email_new VARCHAR(255);
    
    -- Copy data
    UPDATE users SET email_new = email;
    
    -- Add constraint to new column
    ALTER TABLE users ADD CONSTRAINT email_new_check CHECK (email_new ~* '^.+@.+$');
  `);
}

// App code updated to write to BOTH columns
// SELECT reads from email_new with fallback to email

// Phase 2: Contract - Remove old column (after all code uses new column)
// Migration: 0011_contract_user_email.ts
export async function up(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    -- Verify all data migrated
    DO $$ 
    BEGIN
      IF EXISTS (SELECT 1 FROM users WHERE email_new IS NULL) THEN
        RAISE EXCEPTION 'Not all data migrated to email_new';
      END IF;
    END $$;
    
    -- Drop old column
    ALTER TABLE users DROP COLUMN email;
    
    -- Rename new column
    ALTER TABLE users RENAME COLUMN email_new TO email;
    
    -- Add NOT NULL constraint
    ALTER TABLE users ALTER COLUMN email SET NOT NULL;
  `);
}
```

#### Pattern 2: Blue-Green Tables (for large data migrations)

```typescript
// For large data migrations that can't run in a transaction
export async function up(db: PostgresJsDatabase): Promise<void> {
  // 1. Create new table with desired schema
  await db.execute(sql`
    CREATE TABLE events_v2 (
      id UUID PRIMARY KEY,
      -- new schema...
    );
  `);
  
  // 2. Create trigger to dual-write
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION sync_events_to_v2()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO events_v2 (id, ...) 
      VALUES (NEW.id, ...);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER events_sync_trigger
    AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION sync_events_to_v2();
  `);
  
  // 3. Backfill in batches (separate script, can be interrupted)
  // See backfill script below
  
  // 4. After backfill complete, swap tables
  // This is a separate migration
}

export async function down(db: PostgresJsDatabase): Promise<void> {
  await db.execute(sql`
    DROP TRIGGER IF EXISTS events_sync_trigger ON events;
    DROP FUNCTION IF EXISTS sync_events_to_v2;
    DROP TABLE IF EXISTS events_v2;
  `);
}
```

### 14.6 Migration Testing

```typescript
// packages/database/tests/migrations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase } from './helpers';
import { runMigrations, rollbackMigrations } from '../src/migrate';

describe('Database Migrations', () => {
  let testDb: TestDatabase;
  
  beforeEach(async () => {
    testDb = await createTestDatabase();
  });
  
  afterEach(async () => {
    await destroyTestDatabase(testDb);
  });
  
  it('all migrations are reversible', async () => {
    // Run all migrations up
    const upResult = await runMigrations({ direction: 'up' });
    expect(upResult.success).toBe(true);
    
    // Verify tables exist
    const tables = await testDb.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    expect(tables.length).toBeGreaterThan(0);
    
    // Rollback all migrations
    const downResult = await rollbackMigrations(testDb.db, {
      steps: 999,
      force: true,
    });
    expect(downResult.success).toBe(true);
    
    // Verify tables are gone (except migrations table)
    const tablesAfter = await testDb.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != 'drizzle_migrations'
    `);
    expect(tablesAfter.length).toBe(0);
  });
  
  it('migrations can be run multiple times (idempotent)', async () => {
    // Run migrations
    await runMigrations({ direction: 'up' });
    
    // Run again (should be no-op)
    const result = await runMigrations({ direction: 'up' });
    expect(result.success).toBe(true);
  });
  
  it('specific migration can be rolled back', async () => {
    await runMigrations({ direction: 'up' });
    
    // Rollback last migration
    const result = await rollbackMigrations(testDb.db, { steps: 1 });
    expect(result.success).toBe(true);
    expect(result.migrationsRolledBack.length).toBe(1);
    
    // Re-apply
    await runMigrations({ direction: 'up' });
  });
  
  describe('each migration', () => {
    const migrations = getMigrationFiles();
    
    for (const migration of migrations) {
      it(`${migration.id}: up() and down() are consistent`, async () => {
        // Get state before
        const stateBefore = await getSchemaState(testDb);
        
        // Run up
        await migration.up(testDb.db);
        
        // Verify change was made
        const stateAfterUp = await getSchemaState(testDb);
        expect(stateAfterUp).not.toEqual(stateBefore);
        
        // Run down
        await migration.down(testDb.db);
        
        // Verify state is restored
        const stateAfterDown = await getSchemaState(testDb);
        expect(stateAfterDown).toEqual(stateBefore);
      });
    }
  });
});
```

---

## 13. Monitoring & Observability

### 14.1 Observability Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Observability Stack                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Metrics          Logs              Traces            Alerts               │
│  ────────         ─────             ──────            ──────               │
│  CloudWatch       CloudWatch        X-Ray             CloudWatch            │
│  Prometheus       Logs Insights     Datadog APM       PagerDuty            │
│  (optional)                         (optional)        Slack                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Datadog (Unified)                            │   │
│  │  Metrics + Logs + Traces + APM + Synthetics + RUM                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 CloudWatch Dashboard

```typescript
// infrastructure/cdk/lib/stacks/monitoring-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    
    // Create dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `analytics-${props.environment}`,
    });
    
    // API metrics
    dashboard.addWidgets(
      new cloudwatch.Row(
        new cloudwatch.TextWidget({
          markdown: '# API Metrics',
          width: 24,
          height: 1,
        })
      ),
      new cloudwatch.Row(
        new cloudwatch.GraphWidget({
          title: 'API Latency',
          left: [
            props.api.metricLatency({ statistic: 'p50' }),
            props.api.metricLatency({ statistic: 'p95' }),
            props.api.metricLatency({ statistic: 'p99' }),
          ],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: 'API Request Count',
          left: [props.api.metricCount()],
          width: 12,
        })
      ),
      new cloudwatch.Row(
        new cloudwatch.GraphWidget({
          title: 'API Errors',
          left: [
            props.api.metricClientError(),
            props.api.metricServerError(),
          ],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: 'Lambda Invocations',
          left: props.lambdaFunctions.map((fn) => fn.metricInvocations()),
          width: 12,
        })
      )
    );
    
    // Create alarms
    const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
      metric: props.api.metricLatency({ statistic: 'p99' }),
      threshold: 3000, // 3 seconds
      evaluationPeriods: 3,
      alarmDescription: 'API P99 latency exceeds 3 seconds',
    });
    
    const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      metric: new cloudwatch.MathExpression({
        expression: '(errors / requests) * 100',
        usingMetrics: {
          errors: props.api.metricServerError(),
          requests: props.api.metricCount(),
        },
      }),
      threshold: 5, // 5%
      evaluationPeriods: 2,
      alarmDescription: 'API error rate exceeds 5%',
    });
    
    // SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `analytics-alerts-${props.environment}`,
    });
    
    latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
  }
}
```

### 14.3 Application Logging

```typescript
// packages/shared/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

// Request logging middleware
export function requestLogger(handler: Handler): Handler {
  return async (event, context) => {
    const requestId = event.requestContext?.requestId || context.awsRequestId;
    const childLogger = logger.child({ requestId });
    
    childLogger.info({
      type: 'request',
      method: event.httpMethod,
      path: event.path,
      query: event.queryStringParameters,
    });
    
    const startTime = Date.now();
    
    try {
      const result = await handler(event, context);
      
      childLogger.info({
        type: 'response',
        statusCode: result.statusCode,
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      childLogger.error({
        type: 'error',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  };
}
```

---

## 14. Developer Onboarding

### 14.1 Quick Start Guide

```markdown
# Quick Start Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker Desktop
- Git

## Setup (5 minutes)

```bash
# Clone repository
git clone https://github.com/org/ai-agent-analytics.git
cd ai-agent-analytics

# Run setup script
./scripts/setup.sh

# Start development
pnpm dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

## Development URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| ClickHouse UI | http://localhost:8123/play |
| MailHog | http://localhost:8025 |
| LocalStack | http://localhost:4566 |

## Common Tasks

### Create a new component

```bash
cd packages/ui
pnpm generate component MyComponent
```

### Run a specific test

```bash
pnpm test -- --filter=@repo/dashboard -- src/components/MyComponent.test.tsx
```

### Deploy to staging

```bash
git push origin main  # Automatic deployment
```
```

### 14.2 Architecture Decision Records (ADR)

```markdown
# ADR-001: Monorepo with Turborepo

## Status
Accepted

## Context
We need to organize our codebase for multiple applications (dashboard, API, SDK) 
and shared packages. Options considered:
- Multiple repositories
- Monorepo with Nx
- Monorepo with Turborepo
- Monorepo with Lerna

## Decision
Use Turborepo with pnpm workspaces.

## Consequences
**Positive:**
- Fast builds with intelligent caching
- Simple configuration
- Works well with Vercel deployment
- pnpm provides strict dependency resolution

**Negative:**
- Less mature than Nx
- Fewer built-in generators
- Team needs to learn Turborepo concepts

## Related
- ADR-002: Package Manager (pnpm)
- ADR-003: CI/CD Platform (GitHub Actions)
```

### 14.3 Troubleshooting Guide

```markdown
# Troubleshooting Guide

## Common Issues

### Docker services not starting

```bash
# Check Docker is running
docker info

# Reset all containers
docker-compose -f infrastructure/docker/docker-compose.yml down -v
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### pnpm install fails

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
pnpm clean
pnpm install
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker-compose -f infrastructure/docker/docker-compose.yml ps postgres

# Check connection
psql postgresql://analytics:analytics_dev@localhost:5432/analytics
```

### LocalStack AWS errors

```bash
# Check LocalStack health
curl http://localhost:4566/_localstack/health

# Reinitialize AWS resources
docker-compose -f infrastructure/docker/docker-compose.yml restart localstack
```

### TypeScript errors after pulling

```bash
# Rebuild all packages
pnpm build

# Clear TypeScript cache
rm -rf **/tsconfig.tsbuildinfo
```
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Dec 2025 | Tech Team | Initial specification |
| 1.1.0 | Dec 2025 | Tech Team | Added database management & migration rollback procedures |
| 1.2.0 | Dec 2025 | Tech Team | Added MVP infrastructure vs hardening phases, cost estimates |

---

**Next Steps:**
1. Initialize repository with project structure
2. Configure CI/CD pipelines
3. Set up development environments
4. Create initial ADRs for key decisions
