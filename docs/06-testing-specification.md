# AI Agent Analytics Platform - Testing Specification

**Version:** 1.1.0  
**Status:** Technical Specification  
**Last Updated:** December 2025  
**Authors:** Technical Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
   - [1.5 MVP Test Suite Summary](#15-mvp-test-suite-summary)
   - [1.6 Accessibility Testing Expectations](#16-accessibility-testing-expectations)
2. [Testing Philosophy & Strategy](#2-testing-philosophy--strategy)
3. [Test Levels & Types](#3-test-levels--types)
4. [Multi-Tenant Isolation Testing](#4-multi-tenant-isolation-testing)
5. [Data Pipeline & Metrics Correctness](#5-data-pipeline--metrics-correctness)
6. [Test Environments](#6-test-environments)
7. [Test Data Strategy](#7-test-data-strategy)
8. [Coverage Strategy](#8-coverage-strategy)
9. [AI-First Testing Workflow](#9-ai-first-testing-workflow)
10. [CI/CD Integration](#10-cicd-integration)
11. [Non-Functional Testing](#11-non-functional-testing)
12. [Test Tooling & Infrastructure](#12-test-tooling--infrastructure)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the testing strategy for the AI Agent Analytics Platform MVP. It establishes a risk-based, spec-driven, AI-first approach to quality assurance that ensures reliability while maintaining development velocity for a small team.

### 1.2 Testing Goals

| Goal | Target | Measure |
|------|--------|---------|
| **Confidence** | High confidence in core paths | Zero P0 bugs in production |
| **Speed** | Fast feedback loops | < 5 min CI for PR checks |
| **Coverage** | Risk-based coverage | 80% unit, 100% critical paths |
| **Automation** | Minimize manual testing | < 30 min manual regression |
| **Maintainability** | Tests as documentation | AI-assisted test generation |

### 1.3 Key Testing Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Testing Principles                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. RISK-BASED         Focus testing effort on highest-risk areas          │
│                        Multi-tenancy, data correctness, auth                │
│                                                                             │
│  2. SPEC-DRIVEN        OpenAPI spec is the source of truth                  │
│                        Contract tests auto-generated from spec              │
│                                                                             │
│  3. AI-FIRST           Use LLMs to generate tests, fixtures, and mocks     │
│                        Humans validate and make high-level decisions        │
│                                                                             │
│  4. SHIFT-LEFT         Catch bugs early with fast local tests              │
│                        Unit tests run in < 30 seconds                       │
│                                                                             │
│  5. REALISTIC          Test with production-like data and scenarios        │
│                        Synthetic multi-tenant datasets                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Testing Scope by Phase

| Test Type | Phase 1 (MVP) | Phase 2 | Phase 3 |
|-----------|:-------------:|:-------:|:-------:|
| Unit Tests | ✅ 80% coverage | ✅ 85% | ✅ 90% |
| Contract Tests (OpenAPI) | ✅ All endpoints | ✅ | ✅ |
| Integration Tests | ✅ Critical paths | ✅ Full | ✅ |
| Data Pipeline Tests | ✅ Core flow | ✅ Edge cases | ✅ |
| E2E Tests | ⚠️ Manual + 3 critical | ✅ Full suite | ✅ |
| Performance Tests | ⚠️ Basic benchmarks | ✅ Load tests | ✅ |
| Security Tests | ⚠️ OWASP basics | ✅ Full scan | ✅ |
| Chaos/Resilience | ❌ | ⚠️ Basic | ✅ |

### 1.5 MVP Test Suite Summary

The following test suite is **guaranteed for the 4-6 week MVP delivery**. This represents the minimum quality bar required for launch:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MVP TEST SUITE (Guaranteed for Launch)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UNIT TESTS                                         TARGET: 80% Coverage    │
│  ───────────────────────────────────────────────────────────────────────    │
│  ✓ All utility functions (formatting, validation, calculations)            │
│  ✓ Authentication middleware                                                │
│  ✓ Metrics calculation logic                                               │
│  ✓ API request/response handling                                           │
│  ✓ React hooks and state management                                        │
│                                                                             │
│  CONTRACT TESTS (OpenAPI)                           TARGET: 100% Endpoints  │
│  ───────────────────────────────────────────────────────────────────────    │
│  ✓ POST /v1/events - schema validation                                     │
│  ✓ GET /v1/metrics/overview - response format                              │
│  ✓ GET /v1/metrics/timeseries - response format                            │
│  ✓ GET /v1/sessions - pagination, filtering                                │
│  ✓ GET /v1/sessions/{id} - response format                                 │
│  ✓ All error responses match documented schemas                            │
│                                                                             │
│  INTEGRATION TESTS                                  TARGET: Critical Paths  │
│  ───────────────────────────────────────────────────────────────────────    │
│  ✓ Event ingestion → ClickHouse storage                                    │
│  ✓ Metrics aggregation correctness                                         │
│  ✓ Multi-tenant data isolation (CRITICAL)                                  │
│  ✓ Authentication flow (JWT + API key)                                     │
│  ✓ Rate limiting enforcement                                               │
│                                                                             │
│  E2E TESTS (Playwright)                             TARGET: 3 Critical Flows│
│  ───────────────────────────────────────────────────────────────────────    │
│  ✓ Login → Dashboard → View metrics                                        │
│  ✓ Dashboard → Sessions list → Session detail                              │
│  ✓ Date range filter updates all data                                      │
│                                                                             │
│  MANUAL TESTING                                     TARGET: Before Launch   │
│  ───────────────────────────────────────────────────────────────────────    │
│  ✓ Cross-browser verification (Chrome, Firefox, Safari)                    │
│  ✓ Mobile responsive spot-check                                            │
│  ✓ Error state verification                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What is NOT included in MVP (deferred to Phase 2+):**
- Full E2E test suite (20+ flows)
- Performance/load testing with k6
- Security penetration testing
- Chaos/resilience testing
- Visual regression testing
- Full accessibility audit

### 1.6 Accessibility Testing Expectations

**MVP (Phase 1):** Basic accessibility is addressed during development, but no formal audit is performed.

| Aspect | MVP Approach |
|--------|--------------|
| Keyboard navigation | Verify all interactive elements are keyboard-accessible |
| Focus indicators | Ensure visible focus states on buttons, links, inputs |
| ARIA labels | Add essential labels for screen readers on key components |
| Color contrast | Use design system colors (assumed compliant) |
| Form labels | All inputs have associated labels |

**Post-MVP (Phase 2+):** Full accessibility audit and remediation.

| Aspect | Phase 2+ Approach |
|--------|-------------------|
| WCAG 2.1 AA audit | Automated (axe-core) + manual testing |
| Lighthouse accessibility | Target score ≥ 90 |
| Screen reader testing | NVDA/VoiceOver verification |
| Reduced motion | Respect `prefers-reduced-motion` |
| Full keyboard flows | Complete keyboard-only navigation testing |

This phased approach ensures MVP ships with functional accessibility while planning for comprehensive compliance in later phases.

---

## 2. Testing Philosophy & Strategy

### 2.1 Risk-Based Testing Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Risk-Based Test Priority                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HIGH RISK (Extensive Testing)           MEDIUM RISK (Standard Testing)    │
│  ══════════════════════════════          ══════════════════════════════    │
│  • Multi-tenant data isolation           • Dashboard rendering              │
│  • Authentication & authorization        • Filtering & pagination          │
│  • Event ingestion correctness           • Date range calculations          │
│  • Metrics aggregation accuracy          • Error handling                   │
│  • Rate limiting enforcement             • Caching behavior                 │
│  • API key validation                    • WebSocket reconnection           │
│                                                                             │
│  LOW RISK (Minimal Testing)              DEFERRED (Post-MVP)               │
│  ══════════════════════════════          ══════════════════════════════    │
│  • Static content rendering              • Chaos engineering               │
│  • UI styling/layout                     • Full accessibility audit         │
│  • Help text and tooltips                • Performance optimization         │
│  • Non-critical notifications            • Mobile-specific flows            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Test Pyramid for Analytics Platform

```
                              ┌───────────────┐
                              │     E2E       │  5% - Critical user journeys
                              │  (Playwright) │  Login → Dashboard → Sessions
                             ┌┴───────────────┴┐
                             │   Integration   │  20% - API + DB + Services
                             │    (Vitest)     │  Multi-tenant, data pipeline
                            ┌┴─────────────────┴┐
                            │    Contract       │  10% - OpenAPI compliance
                            │    (Dredd)        │  Request/response validation
                           ┌┴───────────────────┴┐
                           │       Unit          │  65% - Business logic
                           │     (Vitest)        │  Utils, services, hooks
                           └─────────────────────┘
```

### 2.3 What We Test vs. What We Don't

**We Test Extensively:**
- Multi-tenant data isolation (CRITICAL)
- Event ingestion → aggregation → metrics pipeline
- Authentication and authorization flows
- API contract compliance
- Rate limiting and error handling
- Core dashboard functionality

**We Test Minimally (MVP):**
- UI pixel-perfect rendering
- Edge case error messages
- Non-critical user preferences
- Tooltip and help content

**We Don't Test (Rely on Libraries):**
- React component rendering (Testing Library covers)
- Tailwind CSS compilation
- Next.js routing mechanics
- Third-party library internals

---

## 3. Test Levels & Types

### 3.1 Unit Tests

**Scope:** Individual functions, utilities, hooks, and services in isolation.

**Tools:** Vitest + Testing Library

**Coverage Target:** 80% for MVP, focusing on business logic.

```typescript
// packages/shared/src/utils/__tests__/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, formatPercent, formatDuration } from '../format';

describe('formatNumber', () => {
  it('formats integers with thousand separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats decimals with specified precision', () => {
    expect(formatNumber(1234.567, { decimals: 2 })).toBe('1,234.57');
  });

  it('applies compact notation for large numbers', () => {
    expect(formatNumber(1500000, { compact: true })).toBe('1.5M');
  });
});

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-50.00)).toBe('-$50.00');
  });

  it('rounds to cents', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
  });
});

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.856)).toBe('85.6%');
  });

  it('handles values over 100%', () => {
    expect(formatPercent(1.5)).toBe('150%');
  });

  it('shows positive sign when requested', () => {
    expect(formatPercent(0.15, { showSign: true })).toBe('+15%');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds as human readable', () => {
    expect(formatDuration(65000)).toBe('1m 5s');
  });

  it('handles hours', () => {
    expect(formatDuration(3725000)).toBe('1h 2m 5s');
  });

  it('shows milliseconds for short durations', () => {
    expect(formatDuration(450)).toBe('450ms');
  });
});
```

```typescript
// apps/api/src/services/__tests__/metrics.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsService } from '../metrics.service';
import { createMockClickHouseClient, createMockRedisClient } from '../../test/mocks';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockClickHouse: ReturnType<typeof createMockClickHouseClient>;
  let mockRedis: ReturnType<typeof createMockRedisClient>;

  beforeEach(() => {
    mockClickHouse = createMockClickHouseClient();
    mockRedis = createMockRedisClient();
    service = new MetricsService(mockClickHouse, mockRedis);
  });

  describe('getOverview', () => {
    it('returns cached data if available', async () => {
      const cachedData = { activeUsers: 100, totalSessions: 500 };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getOverview('org_123', '7d');

      expect(result).toEqual(cachedData);
      expect(mockClickHouse.query).not.toHaveBeenCalled();
    });

    it('queries ClickHouse and caches on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockClickHouse.query.mockResolvedValue({
        rows: [{ active_users: 100, total_sessions: 500, success_rate: 0.95 }],
      });

      const result = await service.getOverview('org_123', '7d');

      expect(mockClickHouse.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('metrics:overview:org_123'),
        300,
        expect.any(String)
      );
    });

    it('calculates comparison with previous period', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockClickHouse.query
        .mockResolvedValueOnce({ rows: [{ active_users: 120 }] }) // Current
        .mockResolvedValueOnce({ rows: [{ active_users: 100 }] }); // Previous

      const result = await service.getOverview('org_123', '7d');

      expect(result.activeUsers.change).toBeCloseTo(0.2); // 20% increase
    });
  });

  describe('calculateAggregations', () => {
    it('correctly calculates success rate', () => {
      const events = [
        { event_type: 'task_complete', count: 95 },
        { event_type: 'task_error', count: 5 },
      ];

      const result = service.calculateSuccessRate(events);

      expect(result).toBe(0.95);
    });

    it('handles zero events gracefully', () => {
      const result = service.calculateSuccessRate([]);
      expect(result).toBe(0);
    });
  });
});
```

### 3.2 Contract Tests (OpenAPI-Based)

**Scope:** Verify API implementation matches OpenAPI specification.

**Tools:** Dredd, Prism, or custom Vitest-based contract testing.

**Coverage Target:** 100% of documented endpoints.

```typescript
// apps/api/tests/contract/openapi.contract.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('OpenAPI Contract Tests', () => {
  let server: Server;
  let spec: OpenAPISpec;
  let ajv: Ajv;

  beforeAll(async () => {
    server = await createServer({ port: 0 }); // Random port
    spec = await SwaggerParser.dereference('./api/openapi.yaml');
    ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /v1/events', () => {
    const path = '/v1/events';
    const method = 'post';

    it('accepts valid event batch (202)', async () => {
      const requestBody = {
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
      };

      const response = await fetch(`${server.url}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test_api_key',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(202);

      // Validate response against OpenAPI schema
      const responseSchema = spec.paths[path][method].responses['202'].content['application/json'].schema;
      const validate = ajv.compile(responseSchema);
      const body = await response.json();
      
      expect(validate(body)).toBe(true);
      if (!validate(body)) {
        console.error('Validation errors:', validate.errors);
      }
    });

    it('rejects invalid schema (422)', async () => {
      const invalidBody = {
        events: [{ invalid: 'data' }],
      };

      const response = await fetch(`${server.url}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test_api_key',
        },
        body: JSON.stringify(invalidBody),
      });

      expect(response.status).toBe(422);

      // Validate error response schema
      const errorSchema = spec.paths[path][method].responses['422'].content['application/json'].schema;
      const validate = ajv.compile(errorSchema);
      const body = await response.json();
      
      expect(validate(body)).toBe(true);
    });

    it('requires authentication (401)', async () => {
      const response = await fetch(`${server.url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [] }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/metrics/overview', () => {
    const path = '/v1/metrics/overview';
    const method = 'get';

    it('returns metrics matching schema (200)', async () => {
      const response = await fetch(`${server.url}${path}?period=7d`, {
        headers: { 'Authorization': 'Bearer test_jwt_token' },
      });

      expect(response.status).toBe(200);

      const responseSchema = spec.paths[path][method].responses['200'].content['application/json'].schema;
      const validate = ajv.compile(responseSchema);
      const body = await response.json();
      
      expect(validate(body)).toBe(true);
    });

    it('validates query parameters', async () => {
      const response = await fetch(`${server.url}${path}?period=invalid`, {
        headers: { 'Authorization': 'Bearer test_jwt_token' },
      });

      expect(response.status).toBe(400);
    });
  });

  // Auto-generate tests for all endpoints
  describe.each(Object.entries(spec.paths))('Endpoint %s', (path, pathItem) => {
    describe.each(Object.entries(pathItem).filter(([m]) => ['get', 'post', 'put', 'delete'].includes(m)))(
      'Method %s',
      (method, operation) => {
        it('has documented responses', () => {
          expect(operation.responses).toBeDefined();
          expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
        });

        it('has security defined', () => {
          const hasSecurity = operation.security || spec.security;
          expect(hasSecurity).toBeDefined();
        });
      }
    );
  });
});
```

### 3.3 Integration Tests

**Scope:** Test API endpoints with real database connections (PostgreSQL, ClickHouse, Redis).

**Tools:** Vitest + Testcontainers (or Docker Compose)

**Coverage Target:** All critical paths for MVP.

```typescript
// apps/api/tests/integration/events.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestContext, TestContext } from '../helpers/test-context';
import { seedOrganization, seedApiKey, cleanupTestData } from '../helpers/seed';

describe('Events API Integration', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // Starts PostgreSQL, ClickHouse, Redis via Testcontainers
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await cleanupTestData(ctx);
    await seedOrganization(ctx, { id: 'org_test', name: 'Test Org' });
    await seedApiKey(ctx, { orgId: 'org_test', key: 'ak_test_123' });
  });

  describe('Event Ingestion Flow', () => {
    it('ingests events and makes them queryable', async () => {
      // 1. Ingest events
      const events = [
        createTestEvent({ event_type: 'session_start', session_id: 'sess_1' }),
        createTestEvent({ event_type: 'task_complete', session_id: 'sess_1' }),
        createTestEvent({ event_type: 'session_end', session_id: 'sess_1' }),
      ];

      const ingestResponse = await ctx.api.post('/v1/events', { events });
      expect(ingestResponse.status).toBe(202);
      expect(ingestResponse.data.accepted).toBe(3);

      // 2. Wait for async processing (Kinesis → Flink → ClickHouse)
      await ctx.waitForEventsProcessed(3);

      // 3. Verify events are queryable
      const queryResponse = await ctx.api.get('/v1/events', {
        params: { session_id: 'sess_1' },
      });

      expect(queryResponse.data.data).toHaveLength(3);
      expect(queryResponse.data.data.map(e => e.event_type)).toEqual([
        'session_start',
        'task_complete',
        'session_end',
      ]);
    });

    it('updates metrics after event ingestion', async () => {
      // Get baseline metrics
      const baselineResponse = await ctx.dashboardApi.get('/v1/metrics/overview', {
        params: { period: '1d' },
      });
      const baselineSessions = baselineResponse.data.totalSessions.value;

      // Ingest a complete session
      const events = [
        createTestEvent({ event_type: 'session_start', session_id: 'sess_new' }),
        createTestEvent({ event_type: 'task_complete', session_id: 'sess_new' }),
        createTestEvent({ event_type: 'session_end', session_id: 'sess_new' }),
      ];

      await ctx.api.post('/v1/events', { events });
      await ctx.waitForAggregation();

      // Verify metrics updated
      const updatedResponse = await ctx.dashboardApi.get('/v1/metrics/overview', {
        params: { period: '1d' },
      });

      expect(updatedResponse.data.totalSessions.value).toBe(baselineSessions + 1);
    });

    it('handles duplicate event IDs gracefully', async () => {
      const event = createTestEvent({ event_id: 'evt_duplicate' });

      // First ingestion
      const first = await ctx.api.post('/v1/events', { events: [event] });
      expect(first.data.accepted).toBe(1);

      // Second ingestion with same ID
      const second = await ctx.api.post('/v1/events', { events: [event] });
      expect(second.data.accepted).toBe(0);
      expect(second.data.rejected).toBe(1);
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits per API key', async () => {
      const event = createTestEvent();

      // Send requests up to limit
      const responses: number[] = [];
      for (let i = 0; i < 70; i++) {
        const response = await ctx.api.post('/v1/events', { events: [event] });
        responses.push(response.status);
      }

      // Some should be rate limited (429)
      expect(responses.filter(s => s === 429).length).toBeGreaterThan(0);
    });

    it('returns proper rate limit headers', async () => {
      const response = await ctx.api.post('/v1/events', { events: [] });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});

// Helper function to create test events
function createTestEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    event_id: `evt_${randomId()}`,
    event_type: 'task_complete',
    timestamp: new Date().toISOString(),
    session_id: `sess_${randomId()}`,
    user_id: 'user_test',
    agent_id: 'agent_claude_code',
    environment: 'test',
    metadata: {},
    ...overrides,
  };
}
```

### 3.4 Data Pipeline Tests

**Scope:** Verify correctness of the entire data flow from ingestion to dashboard metrics.

**Tools:** Custom test harness with known inputs and expected outputs.

```typescript
// apps/api/tests/pipeline/metrics-correctness.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPipelineTestContext, PipelineTestContext } from '../helpers/pipeline-context';

describe('Data Pipeline Correctness', () => {
  let ctx: PipelineTestContext;

  beforeAll(async () => {
    ctx = await createPipelineTestContext();
    // Clear all test data
    await ctx.clearAllData();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('Metrics Aggregation Accuracy', () => {
    it('correctly calculates DAU (Daily Active Users)', async () => {
      // Ingest known dataset: 5 unique users, 10 sessions
      const users = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      const today = new Date();
      
      for (const userId of users) {
        await ctx.ingestEvents([
          createSessionStart({ user_id: userId, timestamp: today }),
          createSessionEnd({ user_id: userId, timestamp: today }),
        ]);
        // User 1 has multiple sessions
        if (userId === 'user_1') {
          await ctx.ingestEvents([
            createSessionStart({ user_id: userId, timestamp: today }),
            createSessionEnd({ user_id: userId, timestamp: today }),
          ]);
        }
      }

      await ctx.waitForAggregation();

      const metrics = await ctx.getMetrics({ period: '1d' });
      
      // DAU should be 5 (unique users), not 6 (sessions)
      expect(metrics.activeUsers.value).toBe(5);
    });

    it('correctly calculates success rate', async () => {
      // Ingest: 8 successful tasks, 2 errors = 80% success rate
      const events = [];
      for (let i = 0; i < 8; i++) {
        events.push(createTaskComplete({ session_id: `sess_success_${i}` }));
      }
      for (let i = 0; i < 2; i++) {
        events.push(createTaskError({ session_id: `sess_error_${i}` }));
      }

      await ctx.ingestEvents(events);
      await ctx.waitForAggregation();

      const metrics = await ctx.getMetrics({ period: '1d' });
      
      expect(metrics.successRate.value).toBeCloseTo(0.8, 2);
    });

    it('correctly calculates estimated cost', async () => {
      // Ingest events with known token counts
      // Pricing: input=$0.01/1K tokens, output=$0.03/1K tokens
      const events = [
        createTaskComplete({
          metadata: { tokens_input: 1000, tokens_output: 500 },
        }),
        createTaskComplete({
          metadata: { tokens_input: 2000, tokens_output: 1000 },
        }),
      ];
      // Expected cost: (3000 * 0.01 + 1500 * 0.03) / 1000 = 0.03 + 0.045 = $0.075

      await ctx.ingestEvents(events);
      await ctx.waitForAggregation();

      const metrics = await ctx.getMetrics({ period: '1d' });
      
      expect(metrics.estimatedCost.value).toBeCloseTo(0.075, 3);
    });

    it('correctly aggregates by time period', async () => {
      // Ingest events across multiple days
      const threeDaysAgo = subDays(new Date(), 3);
      const yesterday = subDays(new Date(), 1);
      const today = new Date();

      await ctx.ingestEvents([
        createSessionStart({ timestamp: threeDaysAgo }),
        createSessionStart({ timestamp: yesterday }),
        createSessionStart({ timestamp: yesterday }),
        createSessionStart({ timestamp: today }),
        createSessionStart({ timestamp: today }),
        createSessionStart({ timestamp: today }),
      ]);

      await ctx.waitForAggregation();

      // 1-day period should show 3 sessions
      const metrics1d = await ctx.getMetrics({ period: '1d' });
      expect(metrics1d.totalSessions.value).toBe(3);

      // 7-day period should show 6 sessions
      const metrics7d = await ctx.getMetrics({ period: '7d' });
      expect(metrics7d.totalSessions.value).toBe(6);
    });

    it('correctly calculates period-over-period comparison', async () => {
      // Last period: 100 sessions
      // Current period: 120 sessions
      // Expected change: +20%
      const lastPeriodStart = subDays(new Date(), 14);
      const currentPeriodStart = subDays(new Date(), 7);

      // Seed last period
      for (let i = 0; i < 100; i++) {
        await ctx.ingestEvents([
          createSessionStart({ timestamp: addDays(lastPeriodStart, Math.random() * 7) }),
        ]);
      }

      // Seed current period
      for (let i = 0; i < 120; i++) {
        await ctx.ingestEvents([
          createSessionStart({ timestamp: addDays(currentPeriodStart, Math.random() * 7) }),
        ]);
      }

      await ctx.waitForAggregation();

      const metrics = await ctx.getMetrics({ period: '7d' });
      
      expect(metrics.totalSessions.value).toBe(120);
      expect(metrics.totalSessions.change).toBeCloseTo(0.2, 1); // 20% increase
    });
  });

  describe('Time Series Accuracy', () => {
    it('correctly buckets events by hour', async () => {
      const baseTime = startOfDay(new Date());
      
      // 3 events at hour 0, 5 events at hour 1, 2 events at hour 2
      const events = [
        ...Array(3).fill(null).map(() => createSessionStart({ timestamp: addHours(baseTime, 0) })),
        ...Array(5).fill(null).map(() => createSessionStart({ timestamp: addHours(baseTime, 1) })),
        ...Array(2).fill(null).map(() => createSessionStart({ timestamp: addHours(baseTime, 2) })),
      ];

      await ctx.ingestEvents(events);
      await ctx.waitForAggregation();

      const timeseries = await ctx.getTimeseries({ period: '1d', granularity: 'hour' });
      
      const hour0 = timeseries.find(t => new Date(t.timestamp).getHours() === 0);
      const hour1 = timeseries.find(t => new Date(t.timestamp).getHours() === 1);
      const hour2 = timeseries.find(t => new Date(t.timestamp).getHours() === 2);

      expect(hour0?.sessions).toBe(3);
      expect(hour1?.sessions).toBe(5);
      expect(hour2?.sessions).toBe(2);
    });
  });
});
```

### 3.5 E2E Tests (Playwright)

**Scope:** Critical user journeys through the full application.

**Tools:** Playwright

**Coverage Target:** 3 critical flows for MVP, full suite for Phase 2.

```typescript
// apps/dashboard/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.describe('Authentication', () => {
    test('user can log in and reach dashboard', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      
      // Should show user's organization
      await expect(page.getByTestId('org-name')).toContainText('Test Organization');
    });

    test('invalid credentials show error', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.getByTestId('login-error')).toContainText('Invalid credentials');
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login?redirect=/dashboard');
    });
  });

  test.describe('Dashboard Overview', () => {
    test.beforeEach(async ({ page }) => {
      // Login via API to speed up tests
      await page.goto('/api/test/login?user=test@example.com');
      await page.goto('/dashboard');
    });

    test('displays all metric cards with data', async ({ page }) => {
      // Wait for metrics to load
      await expect(page.getByTestId('metric-card-active-users')).toBeVisible();
      
      // Verify all 4 KPI cards are present
      await expect(page.getByTestId('metric-card-active-users')).toContainText(/\d+/);
      await expect(page.getByTestId('metric-card-total-sessions')).toContainText(/\d+/);
      await expect(page.getByTestId('metric-card-success-rate')).toContainText(/%/);
      await expect(page.getByTestId('metric-card-estimated-cost')).toContainText(/\$/);
    });

    test('date range filter updates metrics', async ({ page }) => {
      // Get initial value
      const initialValue = await page.getByTestId('metric-card-total-sessions').textContent();
      
      // Change date range
      await page.click('[data-testid="date-range-picker"]');
      await page.click('[data-testid="date-preset-30d"]');
      
      // Wait for refresh
      await page.waitForResponse(resp => resp.url().includes('/metrics/overview'));
      
      // URL should update
      await expect(page).toHaveURL(/period=30d/);
    });

    test('charts render with data', async ({ page }) => {
      // Wait for charts to load
      await expect(page.getByTestId('sessions-chart')).toBeVisible();
      
      // Verify chart has data points (SVG paths)
      const chartPaths = page.locator('[data-testid="sessions-chart"] .recharts-line-curve');
      await expect(chartPaths).toHaveCount(1);
    });
  });

  test.describe('Session Explorer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/api/test/login?user=test@example.com');
      await page.goto('/sessions');
    });

    test('lists sessions with pagination', async ({ page }) => {
      // Wait for sessions to load
      await expect(page.getByTestId('sessions-table')).toBeVisible();
      
      // Should show sessions
      const rows = page.locator('[data-testid="session-row"]');
      await expect(rows).toHaveCount.greaterThan(0);
      
      // Should have pagination
      await expect(page.getByTestId('pagination')).toBeVisible();
    });

    test('can navigate to session detail', async ({ page }) => {
      // Click first session
      await page.click('[data-testid="session-row"]:first-child');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/sessions\/sess_/);
      await expect(page.getByRole('heading', { name: 'Session Details' })).toBeVisible();
      
      // Should show session info
      await expect(page.getByTestId('session-status')).toBeVisible();
      await expect(page.getByTestId('session-duration')).toBeVisible();
      await expect(page.getByTestId('events-list')).toBeVisible();
    });

    test('filters update session list', async ({ page }) => {
      // Apply status filter
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-option-active"]');
      
      // Wait for filtered results
      await page.waitForResponse(resp => resp.url().includes('/sessions'));
      
      // All visible sessions should be active
      const statuses = await page.locator('[data-testid="session-status"]').allTextContents();
      expect(statuses.every(s => s === 'Active')).toBe(true);
    });
  });
});
```

---

## 4. Multi-Tenant Isolation Testing

### 4.1 Isolation Test Strategy

Multi-tenant data isolation is **critical** and receives extensive testing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Multi-Tenant Isolation Test Matrix                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer                    Test Focus                     Priority           │
│  ───────────────────────────────────────────────────────────────────────    │
│  API Authentication       API key → org_id mapping       P0                 │
│  JWT Token                org_id claim validation        P0                 │
│  PostgreSQL (RLS)         Row-level security policies    P0                 │
│  ClickHouse               Query-time org_id filtering    P0                 │
│  Redis Cache              Cache key includes org_id      P0                 │
│  WebSocket                Connection org_id binding      P1                 │
│  Exports                  Export scoped to org           P1                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Isolation Test Implementation

```typescript
// apps/api/tests/isolation/tenant-isolation.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createIsolationTestContext, IsolationTestContext } from '../helpers/isolation-context';

describe('Multi-Tenant Isolation', () => {
  let ctx: IsolationTestContext;
  
  // Two test organizations
  const ORG_A = { id: 'org_tenant_a', name: 'Tenant A' };
  const ORG_B = { id: 'org_tenant_b', name: 'Tenant B' };

  beforeAll(async () => {
    ctx = await createIsolationTestContext();
    
    // Create two separate tenants
    await ctx.createOrganization(ORG_A);
    await ctx.createOrganization(ORG_B);
    
    // Create API keys for each
    await ctx.createApiKey({ orgId: ORG_A.id, key: 'ak_tenant_a' });
    await ctx.createApiKey({ orgId: ORG_B.id, key: 'ak_tenant_b' });
    
    // Create dashboard users for each
    await ctx.createUser({ orgId: ORG_A.id, email: 'user@tenant-a.com' });
    await ctx.createUser({ orgId: ORG_B.id, email: 'user@tenant-b.com' });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    // Clear events but keep orgs and users
    await ctx.clearEvents();
  });

  describe('Event Ingestion Isolation', () => {
    it('events ingested by Org A are not visible to Org B', async () => {
      // Org A ingests events
      const orgAClient = ctx.getApiClient(ORG_A.id);
      await orgAClient.post('/v1/events', {
        events: [
          createTestEvent({ event_id: 'evt_org_a_1' }),
          createTestEvent({ event_id: 'evt_org_a_2' }),
        ],
      });

      await ctx.waitForEventsProcessed();

      // Org B should NOT see Org A's events
      const orgBClient = ctx.getApiClient(ORG_B.id);
      const response = await orgBClient.get('/v1/events');

      expect(response.data.data).toHaveLength(0);
      expect(response.data.data.map(e => e.event_id)).not.toContain('evt_org_a_1');
      expect(response.data.data.map(e => e.event_id)).not.toContain('evt_org_a_2');
    });

    it('cannot use Org A API key to query Org B data', async () => {
      // Org B ingests events
      const orgBClient = ctx.getApiClient(ORG_B.id);
      await orgBClient.post('/v1/events', {
        events: [createTestEvent({ event_id: 'evt_org_b_secret' })],
      });

      await ctx.waitForEventsProcessed();

      // Try to query with Org A credentials but requesting Org B data
      const orgAClient = ctx.getApiClient(ORG_A.id);
      
      // Attempting to override org_id should fail or be ignored
      const response = await orgAClient.get('/v1/events', {
        headers: { 'X-Override-Org': ORG_B.id }, // Attempt to bypass
      });

      // Should only return Org A's events (none)
      expect(response.data.data.map(e => e.event_id)).not.toContain('evt_org_b_secret');
    });
  });

  describe('Metrics Isolation', () => {
    it('metrics are calculated separately per tenant', async () => {
      // Org A: 10 sessions, 80% success
      const orgAClient = ctx.getApiClient(ORG_A.id);
      for (let i = 0; i < 8; i++) {
        await orgAClient.post('/v1/events', {
          events: [createTaskComplete({ session_id: `sess_a_${i}` })],
        });
      }
      for (let i = 0; i < 2; i++) {
        await orgAClient.post('/v1/events', {
          events: [createTaskError({ session_id: `sess_a_err_${i}` })],
        });
      }

      // Org B: 5 sessions, 100% success
      const orgBClient = ctx.getApiClient(ORG_B.id);
      for (let i = 0; i < 5; i++) {
        await orgBClient.post('/v1/events', {
          events: [createTaskComplete({ session_id: `sess_b_${i}` })],
        });
      }

      await ctx.waitForAggregation();

      // Verify Org A metrics
      const orgADashboard = ctx.getDashboardClient(ORG_A.id);
      const metricsA = await orgADashboard.get('/v1/metrics/overview');
      expect(metricsA.data.successRate.value).toBeCloseTo(0.8, 1);

      // Verify Org B metrics (should not be affected by Org A's errors)
      const orgBDashboard = ctx.getDashboardClient(ORG_B.id);
      const metricsB = await orgBDashboard.get('/v1/metrics/overview');
      expect(metricsB.data.successRate.value).toBe(1.0);
    });

    it('aggregated totals do not leak between tenants', async () => {
      // Org A has high token usage
      const orgAClient = ctx.getApiClient(ORG_A.id);
      await orgAClient.post('/v1/events', {
        events: [
          createTaskComplete({ metadata: { tokens_input: 100000, tokens_output: 50000 } }),
        ],
      });

      // Org B has low token usage
      const orgBClient = ctx.getApiClient(ORG_B.id);
      await orgBClient.post('/v1/events', {
        events: [
          createTaskComplete({ metadata: { tokens_input: 100, tokens_output: 50 } }),
        ],
      });

      await ctx.waitForAggregation();

      // Org B should see only their cost, not Org A's
      const orgBDashboard = ctx.getDashboardClient(ORG_B.id);
      const metricsB = await orgBDashboard.get('/v1/metrics/overview');
      
      // Cost should be minimal (just Org B's small usage)
      expect(metricsB.data.estimatedCost.value).toBeLessThan(0.01);
    });
  });

  describe('Session Isolation', () => {
    it('session list only shows tenant sessions', async () => {
      // Create sessions for both orgs
      const orgAClient = ctx.getApiClient(ORG_A.id);
      await orgAClient.post('/v1/events', {
        events: [
          createSessionStart({ session_id: 'sess_a_visible' }),
          createSessionEnd({ session_id: 'sess_a_visible' }),
        ],
      });

      const orgBClient = ctx.getApiClient(ORG_B.id);
      await orgBClient.post('/v1/events', {
        events: [
          createSessionStart({ session_id: 'sess_b_hidden' }),
          createSessionEnd({ session_id: 'sess_b_hidden' }),
        ],
      });

      await ctx.waitForEventsProcessed();

      // Org A should only see their session
      const orgADashboard = ctx.getDashboardClient(ORG_A.id);
      const sessionsA = await orgADashboard.get('/v1/sessions');

      expect(sessionsA.data.data.map(s => s.session_id)).toContain('sess_a_visible');
      expect(sessionsA.data.data.map(s => s.session_id)).not.toContain('sess_b_hidden');
    });

    it('cannot access session detail from another tenant', async () => {
      // Create session for Org B
      const orgBClient = ctx.getApiClient(ORG_B.id);
      await orgBClient.post('/v1/events', {
        events: [createSessionStart({ session_id: 'sess_b_private' })],
      });

      await ctx.waitForEventsProcessed();

      // Org A tries to access Org B's session
      const orgADashboard = ctx.getDashboardClient(ORG_A.id);
      const response = await orgADashboard.get('/v1/sessions/sess_b_private');

      expect(response.status).toBe(404); // Not found (not 403, to avoid enumeration)
    });
  });

  describe('PostgreSQL RLS Verification', () => {
    it('RLS policies enforce org_id filtering', async () => {
      // Direct database query should still respect RLS
      const result = await ctx.executeWithRLS(ORG_A.id, `
        SELECT * FROM sessions WHERE org_id != $1
      `, [ORG_A.id]);

      // RLS should prevent returning other orgs' data
      expect(result.rows).toHaveLength(0);
    });

    it('cannot bypass RLS with SQL injection attempts', async () => {
      const orgADashboard = ctx.getDashboardClient(ORG_A.id);
      
      // Attempt SQL injection via filter parameter
      const response = await orgADashboard.get('/v1/sessions', {
        params: {
          status: "active' OR org_id='org_tenant_b",
        },
      });

      // Should either reject the parameter or return only Org A's data
      if (response.status === 200) {
        const sessionOrgIds = response.data.data.map(s => s.org_id);
        expect(sessionOrgIds.every(id => id === ORG_A.id)).toBe(true);
      } else {
        expect(response.status).toBe(400); // Bad request
      }
    });
  });

  describe('Cache Isolation', () => {
    it('cached metrics are tenant-specific', async () => {
      // Warm cache for Org A
      const orgADashboard = ctx.getDashboardClient(ORG_A.id);
      await orgADashboard.get('/v1/metrics/overview');

      // Verify cache key includes org_id
      const cacheKeys = await ctx.redis.keys('metrics:*');
      const orgACacheKeys = cacheKeys.filter(k => k.includes(ORG_A.id));
      const orgBCacheKeys = cacheKeys.filter(k => k.includes(ORG_B.id));

      expect(orgACacheKeys.length).toBeGreaterThan(0);
      expect(orgBCacheKeys.length).toBe(0); // Org B not cached yet
    });
  });
});
```

---

## 5. Data Pipeline & Metrics Correctness

### 5.1 Pipeline Test Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Data Pipeline Test Flow                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Known   │───▶│  Ingest  │───▶│  Process │───▶│  Verify  │             │
│  │  Input   │    │  Events  │    │  (Flink) │    │  Output  │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │                                               │                     │
│       │              Expected Output                  │                     │
│       └───────────────────────────────────────────────┘                     │
│                          COMPARE                                            │
│                                                                             │
│  Test Categories:                                                           │
│  ├─ Aggregation correctness (sum, count, avg, unique)                      │
│  ├─ Time bucketing (hour, day, week)                                       │
│  ├─ Period comparison (previous period calculation)                         │
│  ├─ Edge cases (empty data, timezone boundaries, late events)              │
│  └─ Idempotency (reprocessing produces same results)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Golden Dataset Tests

```typescript
// apps/api/tests/pipeline/golden-dataset.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { loadGoldenDataset, GoldenDataset } from '../fixtures/golden-dataset';
import { createPipelineTestContext } from '../helpers/pipeline-context';

describe('Golden Dataset Verification', () => {
  let ctx: PipelineTestContext;
  let goldenData: GoldenDataset;

  beforeAll(async () => {
    ctx = await createPipelineTestContext();
    goldenData = await loadGoldenDataset('standard-week');
    
    // Load the known input
    await ctx.ingestEvents(goldenData.events);
    await ctx.waitForAggregation();
  });

  it('matches expected DAU values', async () => {
    const metrics = await ctx.getMetrics({ period: '7d' });
    expect(metrics.activeUsers.value).toBe(goldenData.expected.dau);
  });

  it('matches expected session count', async () => {
    const metrics = await ctx.getMetrics({ period: '7d' });
    expect(metrics.totalSessions.value).toBe(goldenData.expected.totalSessions);
  });

  it('matches expected success rate', async () => {
    const metrics = await ctx.getMetrics({ period: '7d' });
    expect(metrics.successRate.value).toBeCloseTo(goldenData.expected.successRate, 3);
  });

  it('matches expected cost calculation', async () => {
    const metrics = await ctx.getMetrics({ period: '7d' });
    expect(metrics.estimatedCost.value).toBeCloseTo(goldenData.expected.estimatedCost, 2);
  });

  it('matches expected time series breakdown', async () => {
    const timeseries = await ctx.getTimeseries({ period: '7d', granularity: 'day' });
    
    for (const expected of goldenData.expected.timeseries) {
      const actual = timeseries.find(t => t.date === expected.date);
      expect(actual).toBeDefined();
      expect(actual.sessions).toBe(expected.sessions);
      expect(actual.users).toBe(expected.users);
    }
  });
});
```

### 5.3 Edge Case Tests

```typescript
// apps/api/tests/pipeline/edge-cases.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('Data Pipeline Edge Cases', () => {
  describe('Empty Data Handling', () => {
    it('returns zeros for metrics with no data', async () => {
      const metrics = await ctx.getMetrics({ period: '7d' });
      
      expect(metrics.activeUsers.value).toBe(0);
      expect(metrics.totalSessions.value).toBe(0);
      expect(metrics.successRate.value).toBe(0);
      expect(metrics.estimatedCost.value).toBe(0);
    });

    it('returns empty array for timeseries with no data', async () => {
      const timeseries = await ctx.getTimeseries({ period: '7d' });
      expect(timeseries).toEqual([]);
    });
  });

  describe('Timezone Handling', () => {
    it('correctly aggregates events across day boundaries (UTC)', async () => {
      // Event at 23:59 UTC and 00:01 UTC should be in different days
      await ctx.ingestEvents([
        createSessionStart({ timestamp: '2025-12-09T23:59:00Z' }),
        createSessionStart({ timestamp: '2025-12-10T00:01:00Z' }),
      ]);

      await ctx.waitForAggregation();

      const timeseries = await ctx.getTimeseries({ period: '7d', granularity: 'day' });
      
      const dec9 = timeseries.find(t => t.date === '2025-12-09');
      const dec10 = timeseries.find(t => t.date === '2025-12-10');
      
      expect(dec9?.sessions).toBe(1);
      expect(dec10?.sessions).toBe(1);
    });
  });

  describe('Late Event Handling', () => {
    it('accepts events with timestamps in the past', async () => {
      const oldTimestamp = subDays(new Date(), 5).toISOString();
      
      const response = await ctx.ingestEvents([
        createSessionStart({ timestamp: oldTimestamp }),
      ]);

      expect(response.accepted).toBe(1);
    });

    it('rejects events older than retention period', async () => {
      const veryOldTimestamp = subMonths(new Date(), 14).toISOString();
      
      const response = await ctx.ingestEvents([
        createSessionStart({ timestamp: veryOldTimestamp }),
      ]);

      expect(response.rejected).toBe(1);
    });
  });

  describe('Idempotency', () => {
    it('reprocessing the same events produces identical metrics', async () => {
      const events = generateTestEvents(100);
      
      // First processing
      await ctx.ingestEvents(events);
      await ctx.waitForAggregation();
      const metrics1 = await ctx.getMetrics({ period: '7d' });

      // Clear and reprocess
      await ctx.clearClickHouse();
      await ctx.reprocessFromKinesis();
      await ctx.waitForAggregation();
      const metrics2 = await ctx.getMetrics({ period: '7d' });

      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('Large Numbers', () => {
    it('handles high token counts without overflow', async () => {
      await ctx.ingestEvents([
        createTaskComplete({
          metadata: { tokens_input: 1000000000, tokens_output: 500000000 },
        }),
      ]);

      await ctx.waitForAggregation();

      const metrics = await ctx.getMetrics({ period: '7d' });
      expect(metrics.estimatedCost.value).toBeGreaterThan(0);
      expect(Number.isFinite(metrics.estimatedCost.value)).toBe(true);
    });
  });
});
```

---

## 6. Test Environments

### 6.1 Environment Matrix

| Environment | Purpose | Data | Services | Who Uses |
|-------------|---------|------|----------|----------|
| **Local** | Development | Synthetic seed | Docker Compose | Developers |
| **CI** | Automated testing | Synthetic/fixtures | GitHub Actions + Containers | CI pipeline |
| **Staging** | Pre-production | Anonymized production subset | Full AWS stack | QA, PM, Demo |
| **Production** | Live | Real | Full AWS stack | Users |

### 6.2 Local Test Environment

```yaml
# infrastructure/docker/docker-compose.test.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: analytics_test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: analytics_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # Use tmpfs for speed
    
  clickhouse-test:
    image: clickhouse/clickhouse-server:23.12
    environment:
      CLICKHOUSE_USER: test
      CLICKHOUSE_PASSWORD: test
    ports:
      - "8124:8123"
    tmpfs:
      - /var/lib/clickhouse

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"

  localstack-test:
    image: localstack/localstack:3.0
    environment:
      SERVICES: kinesis,sqs
      EAGER_SERVICE_LOADING: 1
    ports:
      - "4567:4566"
```

### 6.3 CI Environment Configuration

```typescript
// vitest.config.ci.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    
    // CI-specific settings
    maxConcurrency: 4,
    maxWorkers: 2,
    minWorkers: 1,
    
    // Timeouts for CI
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Coverage thresholds enforced in CI
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    
    // Retry flaky tests
    retry: 2,
    
    // Use container services
    globalSetup: './tests/setup/ci-global-setup.ts',
    globalTeardown: './tests/setup/ci-global-teardown.ts',
  },
});
```

---

## 7. Test Data Strategy

### 7.1 Test Data Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Test Data Strategy                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Category              Source                    Use Case                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Fixtures              Static JSON files         Unit tests, contract tests │
│  Factories             Code-generated            Integration tests          │
│  Golden Datasets       Curated known I/O         Pipeline verification      │
│  Synthetic Multi-tenant Generated at scale      Load/isolation testing     │
│  Anonymized Production Sanitized real data       Staging environment        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Test Data Factories

```typescript
// apps/api/tests/factories/index.ts
import { faker } from '@faker-js/faker';

// Deterministic seed for reproducible tests
faker.seed(12345);

export const factories = {
  organization: (overrides = {}) => ({
    id: `org_${faker.string.alphanumeric(8)}`,
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    plan: faker.helpers.arrayElement(['free', 'starter', 'professional']),
    status: 'active',
    created_at: faker.date.past().toISOString(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: `user_${faker.string.alphanumeric(8)}`,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['admin', 'member', 'viewer']),
    ...overrides,
  }),

  apiKey: (overrides = {}) => ({
    id: `ak_${faker.string.alphanumeric(16)}`,
    name: faker.word.words(2),
    prefix: `ak_${faker.helpers.arrayElement(['live', 'test'])}`,
    created_at: faker.date.past().toISOString(),
    last_used_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  event: (overrides = {}) => ({
    event_id: `evt_${faker.string.alphanumeric(12)}`,
    event_type: faker.helpers.arrayElement([
      'session_start',
      'session_end',
      'task_complete',
      'task_error',
      'tool_call',
    ]),
    timestamp: faker.date.recent().toISOString(),
    session_id: `sess_${faker.string.alphanumeric(8)}`,
    user_id: `user_${faker.string.alphanumeric(8)}`,
    agent_id: faker.helpers.arrayElement([
      'agent_claude_code',
      'agent_claude_chat',
      'agent_custom',
    ]),
    environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
    metadata: {},
    ...overrides,
  }),

  session: (overrides = {}) => {
    const startTime = faker.date.recent();
    const endTime = faker.date.between({ from: startTime, to: new Date() });
    
    return {
      session_id: `sess_${faker.string.alphanumeric(8)}`,
      user_id: `user_${faker.string.alphanumeric(8)}`,
      agent_id: 'agent_claude_code',
      status: faker.helpers.arrayElement(['active', 'completed', 'error']),
      started_at: startTime.toISOString(),
      ended_at: endTime.toISOString(),
      duration_ms: endTime.getTime() - startTime.getTime(),
      task_count: faker.number.int({ min: 1, max: 20 }),
      error_count: faker.number.int({ min: 0, max: 3 }),
      tokens_input: faker.number.int({ min: 100, max: 10000 }),
      tokens_output: faker.number.int({ min: 50, max: 5000 }),
      ...overrides,
    };
  },

  // Generate a complete session with all events
  completeSession: (overrides = {}) => {
    const sessionId = `sess_${faker.string.alphanumeric(8)}`;
    const userId = overrides.user_id || `user_${faker.string.alphanumeric(8)}`;
    const startTime = overrides.timestamp ? new Date(overrides.timestamp) : faker.date.recent();
    
    const events = [
      factories.event({
        event_type: 'session_start',
        session_id: sessionId,
        user_id: userId,
        timestamp: startTime.toISOString(),
      }),
    ];

    // Add some task events
    const taskCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < taskCount; i++) {
      const isError = faker.datatype.boolean({ probability: 0.1 });
      events.push(
        factories.event({
          event_type: isError ? 'task_error' : 'task_complete',
          session_id: sessionId,
          user_id: userId,
          timestamp: addMinutes(startTime, i + 1).toISOString(),
          metadata: {
            tokens_input: faker.number.int({ min: 100, max: 2000 }),
            tokens_output: faker.number.int({ min: 50, max: 1000 }),
          },
        })
      );
    }

    // End session
    events.push(
      factories.event({
        event_type: 'session_end',
        session_id: sessionId,
        user_id: userId,
        timestamp: addMinutes(startTime, taskCount + 2).toISOString(),
      })
    );

    return events;
  },
};

// Generate synthetic multi-tenant dataset
export function generateMultiTenantDataset(config: {
  organizationCount: number;
  usersPerOrg: number;
  sessionsPerUser: number;
  dateRange: { start: Date; end: Date };
}): MultiTenantDataset {
  const dataset: MultiTenantDataset = {
    organizations: [],
    users: [],
    events: [],
  };

  for (let o = 0; o < config.organizationCount; o++) {
    const org = factories.organization({ id: `org_tenant_${o}` });
    dataset.organizations.push(org);

    for (let u = 0; u < config.usersPerOrg; u++) {
      const user = factories.user({
        id: `user_${org.id}_${u}`,
        org_id: org.id,
      });
      dataset.users.push(user);

      for (let s = 0; s < config.sessionsPerUser; s++) {
        const sessionTime = faker.date.between(config.dateRange);
        const events = factories.completeSession({
          user_id: user.id,
          org_id: org.id,
          timestamp: sessionTime,
        });
        dataset.events.push(...events.map(e => ({ ...e, org_id: org.id })));
      }
    }
  }

  return dataset;
}
```

### 7.3 Golden Dataset Definition

```typescript
// apps/api/tests/fixtures/golden-datasets/standard-week.ts
export const standardWeekDataset: GoldenDataset = {
  name: 'standard-week',
  description: 'One week of typical usage across 5 users',
  
  events: [
    // Day 1: 3 users, 5 sessions
    { event_type: 'session_start', user_id: 'user_1', timestamp: '2025-12-02T09:00:00Z' },
    { event_type: 'task_complete', user_id: 'user_1', metadata: { tokens_input: 1000, tokens_output: 500 } },
    { event_type: 'session_end', user_id: 'user_1', timestamp: '2025-12-02T09:30:00Z' },
    // ... more events
  ],

  expected: {
    period: '7d',
    dau: 5,                    // 5 unique users
    totalSessions: 25,          // 25 total sessions
    successRate: 0.92,          // 92% success rate
    estimatedCost: 2.45,        // $2.45 total cost
    avgSessionDuration: 1800000, // 30 minutes average
    
    timeseries: [
      { date: '2025-12-02', sessions: 5, users: 3 },
      { date: '2025-12-03', sessions: 4, users: 4 },
      { date: '2025-12-04', sessions: 3, users: 2 },
      { date: '2025-12-05', sessions: 4, users: 3 },
      { date: '2025-12-06', sessions: 3, users: 2 },
      { date: '2025-12-07', sessions: 3, users: 3 },
      { date: '2025-12-08', sessions: 3, users: 3 },
    ],

    breakdown: {
      byAgent: [
        { agent_id: 'agent_claude_code', sessions: 20 },
        { agent_id: 'agent_claude_chat', sessions: 5 },
      ],
      byEnvironment: [
        { environment: 'production', sessions: 18 },
        { environment: 'staging', sessions: 7 },
      ],
    },
  },
};
```

---

## 8. Coverage Strategy

### 8.1 Coverage Targets by Phase

| Test Type | MVP Target | Phase 2 Target | Phase 3 Target |
|-----------|------------|----------------|----------------|
| **Unit Tests** | 80% lines | 85% lines | 90% lines |
| **Branch Coverage** | 75% | 80% | 85% |
| **Critical Path** | 100% | 100% | 100% |
| **Integration** | Core flows | All flows | All + edge cases |
| **E2E** | 3 critical | 10 flows | 20+ flows |

### 8.2 Critical Path Definition (Must Be 100%)

```typescript
// Critical paths that MUST have test coverage

const criticalPaths = {
  authentication: [
    'API key validation',
    'JWT token validation',
    'Token refresh flow',
    'Unauthorized request rejection',
  ],
  
  multiTenancy: [
    'Org ID extraction from token',
    'RLS policy enforcement',
    'Cross-tenant query blocking',
    'Cache key isolation',
  ],
  
  eventIngestion: [
    'Valid event acceptance',
    'Invalid event rejection',
    'Batch processing',
    'Duplicate detection',
    'Rate limit enforcement',
  ],
  
  metricsAccuracy: [
    'DAU calculation',
    'Session count',
    'Success rate calculation',
    'Cost calculation',
    'Period comparison',
  ],
  
  dataIntegrity: [
    'Event ordering',
    'Timestamp handling',
    'Aggregation correctness',
    'No data loss in pipeline',
  ],
};
```

### 8.3 Coverage Enforcement

```yaml
# .github/workflows/ci.yml (coverage check)
- name: Check coverage thresholds
  run: |
    pnpm test:coverage
    
    # Fail if coverage drops below thresholds
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

---

## 9. AI-First Testing Workflow

### 9.1 AI-Assisted Test Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI-First Testing Workflow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  OpenAPI    │───▶│  AI Agent   │───▶│  Generated  │───▶│  Human      │ │
│  │  Spec       │    │  (Claude)   │    │  Tests      │    │  Review     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│        │                  │                  │                  │         │
│        │                  ▼                  │                  │         │
│        │          ┌─────────────┐            │                  │         │
│        └─────────▶│  PRD/User   │────────────┘                  │         │
│                   │  Stories    │                               │         │
│                   └─────────────┘                               │         │
│                                                                 │         │
│                                                                 ▼         │
│                                                          ┌─────────────┐  │
│                                                          │  Approved   │  │
│                                                          │  Test Suite │  │
│                                                          └─────────────┘  │
│                                                                           │
│  AI Generates:                      Human Validates:                      │
│  • Unit test stubs from types       • Business logic correctness          │
│  • Contract tests from OpenAPI      • Edge case coverage                  │
│  • Test fixtures from schemas       • Test maintainability                │
│  • E2E scenarios from user stories  • Security test completeness          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 AI Test Generation Prompts

```typescript
// scripts/ai-test-gen/generate-contract-tests.ts

const contractTestPrompt = `
You are a senior QA engineer. Given this OpenAPI specification:

${openApiSpec}

Generate comprehensive contract tests using Vitest that:
1. Test every documented endpoint
2. Validate request/response schemas against the spec
3. Test all documented error responses
4. Include authentication scenarios
5. Test edge cases for parameters (empty, null, max length)

Output TypeScript code using this pattern:
- Use vitest describe/it blocks
- Use fetch for HTTP calls
- Use ajv for schema validation
- Include setup/teardown for test isolation

Focus on these endpoints for MVP:
- POST /v1/events
- GET /v1/metrics/overview
- GET /v1/sessions
- GET /v1/sessions/{id}
`;

const unitTestPrompt = `
You are a senior QA engineer. Given this TypeScript function:

${functionCode}

And its types:

${typeDefinitions}

Generate comprehensive unit tests using Vitest that:
1. Test all documented behavior
2. Cover edge cases (null, undefined, empty, boundary values)
3. Test error conditions
4. Use descriptive test names
5. Follow AAA pattern (Arrange, Act, Assert)

Include:
- Happy path tests
- Error path tests
- Boundary condition tests
- Type validation tests (if applicable)
`;
```

### 9.3 AI Test Maintenance Workflow

```typescript
// scripts/ai-test-gen/update-tests.ts

async function updateTestsForCodeChange(
  changedFiles: string[],
  gitDiff: string
): Promise<TestUpdateSuggestion[]> {
  const prompt = `
    You are a QA engineer reviewing a code change. Given:
    
    Changed files: ${changedFiles.join(', ')}
    
    Git diff:
    ${gitDiff}
    
    Existing test files:
    ${existingTests}
    
    Suggest updates needed:
    1. New tests for new functionality
    2. Updated tests for changed behavior
    3. Removed tests for deleted code
    4. Potential regression risks to add tests for
    
    Output as JSON array:
    [
      {
        "action": "add" | "update" | "remove",
        "testFile": "path/to/test.ts",
        "reason": "explanation",
        "suggestedCode": "test code if action is add/update"
      }
    ]
  `;

  const suggestions = await callClaude(prompt);
  return JSON.parse(suggestions);
}

// Run on PR to suggest test updates
async function prTestReview(prNumber: number): Promise<void> {
  const changes = await getGitHubPRChanges(prNumber);
  const suggestions = await updateTestsForCodeChange(
    changes.files,
    changes.diff
  );

  if (suggestions.length > 0) {
    await postPRComment(prNumber, formatSuggestions(suggestions));
  }
}
```

### 9.4 Fixture Generation from Schemas

```typescript
// scripts/ai-test-gen/generate-fixtures.ts

async function generateFixturesFromOpenAPI(): Promise<void> {
  const spec = await loadOpenAPISpec('./api/openapi.yaml');
  
  for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
    const prompt = `
      Given this JSON Schema:
      ${JSON.stringify(schema, null, 2)}
      
      Generate test fixtures:
      1. A valid example that passes validation
      2. An edge case example (minimum values, empty strings, etc.)
      3. An invalid example for each required field (missing, wrong type)
      
      Output as TypeScript:
      export const ${schemaName}Fixtures = {
        valid: { ... },
        edgeCase: { ... },
        invalid: {
          missingField1: { ... },
          wrongTypeField1: { ... },
          // etc
        }
      };
    `;
    
    const fixtures = await callClaude(prompt);
    await writeFile(`tests/fixtures/${schemaName}.fixtures.ts`, fixtures);
  }
}
```

---

## 10. CI/CD Integration

### 10.1 Pipeline Test Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI Pipeline Test Stages                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PR Check (< 5 min)              │  Merge to Main (< 15 min)               │
│  ══════════════════              │  ════════════════════════               │
│  ✓ Lint + Type check             │  ✓ All PR checks                        │
│  ✓ Unit tests                    │  ✓ Integration tests                    │
│  ✓ Contract tests                │  ✓ E2E tests (critical)                 │
│  ✓ Build verification            │  ✓ Coverage report                      │
│                                  │  ✓ Security scan                        │
│  ┌─────────────────────────────┐ │                                         │
│  │ GATES MERGE: All must pass  │ │  ┌─────────────────────────────┐       │
│  └─────────────────────────────┘ │  │ GATES DEPLOY: All must pass │       │
│                                  │  └─────────────────────────────┘       │
│                                                                             │
│  Nightly (Scheduled)             │  Pre-Production                         │
│  ═══════════════════             │  ═══════════════                        │
│  • Full E2E suite                │  • Smoke tests against staging          │
│  • Performance benchmarks        │  • Synthetic monitoring                 │
│  • Security scan (full)          │  • Data integrity checks                │
│  • Dependency audit              │                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: test-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Fast checks (< 2 min) - required for PR merge
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  # Unit tests (< 2 min) - required for PR merge
  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Contract tests (< 2 min) - required for PR merge  
  contract-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:contract

  # Integration tests (< 5 min) - required for merge to main
  integration-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, contract-tests]
    if: github.event_name == 'push' || github.base_ref == 'main'
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
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
      clickhouse:
        image: clickhouse/clickhouse-server:23.12
        ports:
          - 8123:8123
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
          CLICKHOUSE_HOST: localhost

  # E2E tests (< 10 min) - required for merge to main
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium
      - name: Build application
        run: pnpm build
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          CI: true
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/dashboard/playwright-report/

  # Security scan - runs on main only
  security-scan:
    runs-on: ubuntu-latest
    needs: [unit-tests, contract-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript
```

### 10.3 Test Quality Gates

```typescript
// scripts/ci/quality-gates.ts

interface QualityGate {
  name: string;
  check: () => Promise<boolean>;
  required: 'pr' | 'main' | 'release';
  failureMessage: string;
}

const qualityGates: QualityGate[] = [
  {
    name: 'unit-coverage',
    check: async () => {
      const coverage = await getCoverageReport();
      return coverage.lines >= 80 && coverage.branches >= 75;
    },
    required: 'pr',
    failureMessage: 'Unit test coverage below threshold (80% lines, 75% branches)',
  },
  {
    name: 'critical-path-coverage',
    check: async () => {
      const criticalCoverage = await getCriticalPathCoverage();
      return criticalCoverage === 100;
    },
    required: 'pr',
    failureMessage: 'Critical paths must have 100% test coverage',
  },
  {
    name: 'no-skipped-tests',
    check: async () => {
      const results = await getTestResults();
      return results.skipped === 0;
    },
    required: 'main',
    failureMessage: 'No skipped tests allowed on main branch',
  },
  {
    name: 'contract-compliance',
    check: async () => {
      const results = await runContractTests();
      return results.failures === 0;
    },
    required: 'pr',
    failureMessage: 'API does not comply with OpenAPI specification',
  },
  {
    name: 'no-security-vulnerabilities',
    check: async () => {
      const audit = await runSecurityAudit();
      return audit.high === 0 && audit.critical === 0;
    },
    required: 'main',
    failureMessage: 'High/critical security vulnerabilities detected',
  },
];
```

---

## 11. Non-Functional Testing

### 11.1 Performance Testing

```typescript
// apps/api/tests/performance/load.test.ts
import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 50 },   // Steady state
    { duration: '1m', target: 100 },  // Spike
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Event ingestion
  const eventsPayload = JSON.stringify({
    events: [
      {
        event_id: `evt_${Date.now()}_${Math.random()}`,
        event_type: 'task_complete',
        timestamp: new Date().toISOString(),
        session_id: `sess_${Math.random()}`,
        user_id: 'user_load_test',
        agent_id: 'agent_claude_code',
      },
    ],
  });

  const eventsRes = http.post(
    `${__ENV.API_URL}/v1/events`,
    eventsPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': __ENV.API_KEY,
      },
    }
  );

  check(eventsRes, {
    'events: status 202': (r) => r.status === 202,
    'events: latency < 200ms': (r) => r.timings.duration < 200,
  });

  // Metrics overview
  const metricsRes = http.get(
    `${__ENV.API_URL}/v1/metrics/overview?period=7d`,
    {
      headers: {
        'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
      },
    }
  );

  check(metricsRes, {
    'metrics: status 200': (r) => r.status === 200,
    'metrics: latency < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 11.2 Security Testing

```typescript
// apps/api/tests/security/owasp.test.ts
import { describe, it, expect } from 'vitest';

describe('OWASP Security Tests', () => {
  describe('Authentication', () => {
    it('rejects requests without authentication', async () => {
      const response = await fetch(`${API_URL}/v1/metrics/overview`);
      expect(response.status).toBe(401);
    });

    it('rejects expired JWT tokens', async () => {
      const expiredToken = createExpiredJwt();
      const response = await fetch(`${API_URL}/v1/metrics/overview`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status).toBe(401);
    });

    it('rejects malformed JWT tokens', async () => {
      const response = await fetch(`${API_URL}/v1/metrics/overview`, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('rejects SQL injection in query parameters', async () => {
      const response = await authenticatedFetch(
        `/v1/sessions?status=active'; DROP TABLE sessions; --`
      );
      expect(response.status).toBe(400);
    });

    it('rejects XSS in event metadata', async () => {
      const response = await authenticatedFetch('/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          events: [{
            event_id: 'evt_xss',
            event_type: 'task_complete',
            timestamp: new Date().toISOString(),
            session_id: 'sess_test',
            user_id: 'user_test',
            agent_id: 'agent_test',
            metadata: {
              script: '<script>alert("xss")</script>',
            },
          }],
        }),
      });
      
      // Should either reject or sanitize
      if (response.status === 202) {
        const events = await getEvents();
        expect(events[0].metadata.script).not.toContain('<script>');
      }
    });

    it('enforces request size limits', async () => {
      const largePayload = {
        events: Array(10000).fill(null).map(() => createTestEvent()),
      };
      
      const response = await authenticatedFetch('/v1/events', {
        method: 'POST',
        body: JSON.stringify(largePayload),
      });
      
      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits', async () => {
      const requests = Array(100).fill(null).map(() =>
        authenticatedFetch('/v1/metrics/overview')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Headers', () => {
    it('includes security headers', async () => {
      const response = await authenticatedFetch('/v1/metrics/overview');
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
    });

    it('does not leak server information', async () => {
      const response = await authenticatedFetch('/v1/metrics/overview');
      
      expect(response.headers.get('Server')).toBeNull();
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });
  });
});
```

### 11.3 Resilience Testing (Phase 2+)

```typescript
// apps/api/tests/resilience/circuit-breaker.test.ts
import { describe, it, expect } from 'vitest';

describe('Resilience Tests', () => {
  describe('Circuit Breaker', () => {
    it('opens circuit after threshold failures', async () => {
      // Simulate ClickHouse being down
      await ctx.simulateClickHouseFailure();
      
      // Make requests until circuit opens
      for (let i = 0; i < 10; i++) {
        await authenticatedFetch('/v1/metrics/overview');
      }
      
      // Circuit should be open, returning cached/degraded response
      const response = await authenticatedFetch('/v1/metrics/overview');
      expect(response.headers.get('X-Degraded-Mode')).toBe('partial');
    });

    it('recovers when service is restored', async () => {
      await ctx.simulateClickHouseFailure();
      
      // Trip the circuit
      for (let i = 0; i < 10; i++) {
        await authenticatedFetch('/v1/metrics/overview');
      }
      
      // Restore service
      await ctx.restoreClickHouse();
      
      // Wait for circuit half-open check
      await sleep(30000);
      
      // Should recover
      const response = await authenticatedFetch('/v1/metrics/overview');
      expect(response.headers.get('X-Degraded-Mode')).toBe('none');
    });
  });

  describe('Graceful Degradation', () => {
    it('serves stale cache when database is slow', async () => {
      // Prime the cache
      await authenticatedFetch('/v1/metrics/overview');
      
      // Make database slow
      await ctx.simulateSlowClickHouse(5000);
      
      const response = await authenticatedFetch('/v1/metrics/overview');
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache-Status')).toBe('STALE');
    });
  });
});
```

---

## 12. Test Tooling & Infrastructure

### 12.1 Test Tooling Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Unit + Integration tests | 1.2.x |
| **Testing Library** | React component tests | 14.x |
| **Playwright** | E2E tests | 1.40.x |
| **Dredd** | OpenAPI contract tests | 14.x |
| **k6** | Load/performance tests | 0.48.x |
| **Testcontainers** | Container-based integration | 10.x |
| **Faker.js** | Test data generation | 8.x |
| **MSW** | API mocking | 2.x |

### 12.2 Test Helper Utilities

```typescript
// apps/api/tests/helpers/test-context.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export interface TestContext {
  postgres: StartedPostgreSqlContainer;
  clickhouse: StartedTestContainer;
  redis: StartedTestContainer;
  api: AxiosInstance;
  dashboardApi: AxiosInstance;
  cleanup: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  // Start containers in parallel
  const [postgres, clickhouse, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:15')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new GenericContainer('clickhouse/clickhouse-server:23.12')
      .withExposedPorts(8123)
      .start(),
    new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start(),
  ]);

  // Run migrations
  await runMigrations(postgres.getConnectionUri());

  // Create API clients
  const api = axios.create({
    baseURL: `http://localhost:${process.env.API_PORT}`,
    headers: { 'X-API-Key': 'test_api_key' },
  });

  const dashboardApi = axios.create({
    baseURL: `http://localhost:${process.env.API_PORT}`,
    headers: { 'Authorization': `Bearer ${createTestJwt()}` },
  });

  return {
    postgres,
    clickhouse,
    redis,
    api,
    dashboardApi,
    cleanup: async () => {
      await Promise.all([
        postgres.stop(),
        clickhouse.stop(),
        redis.stop(),
      ]);
    },
  };
}
```

---

## 13. Implementation Checklist

### 13.1 MVP Testing Checklist

```markdown
## MVP Testing Checklist

### Setup (Week 1)
- [ ] Configure Vitest for unit tests
- [ ] Configure Playwright for E2E
- [ ] Set up test database containers
- [ ] Create test factories
- [ ] Create CI workflow for tests

### Unit Tests (Weeks 2-4)
- [ ] Format utilities (100%)
- [ ] Validation schemas (100%)
- [ ] Authentication helpers (100%)
- [ ] Metrics calculations (100%)
- [ ] Rate limiting logic (100%)
- [ ] API handlers (80%)

### Contract Tests (Week 3)
- [ ] POST /v1/events (100%)
- [ ] GET /v1/metrics/overview (100%)
- [ ] GET /v1/sessions (100%)
- [ ] GET /v1/sessions/{id} (100%)
- [ ] Error responses (100%)

### Integration Tests (Weeks 3-4)
- [ ] Event ingestion flow
- [ ] Metrics aggregation correctness
- [ ] Multi-tenant isolation
- [ ] Authentication flow
- [ ] Rate limiting enforcement

### E2E Tests (Week 5)
- [ ] Login → Dashboard flow
- [ ] Dashboard metrics display
- [ ] Session list → detail navigation

### Pipeline Verification (Week 5)
- [ ] Golden dataset verification
- [ ] Metrics accuracy tests
- [ ] Tenant isolation tests
```

### 13.2 Phase 2+ Testing Additions

| Addition | Priority | Effort |
|----------|----------|--------|
| Full E2E test suite (20 flows) | P1 | 2 weeks |
| Performance test suite (k6) | P1 | 1 week |
| Security scan integration | P1 | 3 days |
| Visual regression tests | P2 | 1 week |
| Chaos engineering tests | P2 | 1 week |
| Accessibility tests | P2 | 1 week |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Dec 2025 | Tech Team | Initial specification |
| 1.1.0 | Dec 2025 | Tech Team | Added MVP test suite summary, accessibility expectations |

---

**Next Steps:**
1. Set up Vitest configuration
2. Create test factories and helpers
3. Implement critical unit tests
4. Set up CI pipeline with test gates
5. Generate contract tests from OpenAPI spec
