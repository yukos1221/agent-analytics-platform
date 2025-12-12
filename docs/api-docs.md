# API Documentation & SDK Generation

This document explains how to view API documentation and generate the TypeScript SDK from the OpenAPI specification.

**API Spec Reference:** [docs/03-api-specification-v1.2.md](./03-api-specification-v1.2.md) Section 11.3  
**Dev/Deploy Spec Reference:** [docs/05-development-deployment-v1.2.md](./05-development-deployment-v1.2.md)

## Overview

The API documentation and SDK are generated from a **single source of truth**: `specs/openapi.mvp.v1.yaml`

This ensures:

- **Consistency:** API implementation, docs, and SDK types are always in sync
- **Type Safety:** Generated TypeScript types match the API exactly
- **Developer Experience:** Auto-completion and type checking for API calls

## Viewing API Documentation

### Local Development

1. **Start the API server:**

   ```bash
   pnpm --filter @repo/api dev
   ```

2. **Open API docs in browser:**
   - **Redoc UI:** http://localhost:3001/docs
   - **Raw OpenAPI spec:** http://localhost:3001/docs/openapi.yaml

The Redoc UI provides:

- Interactive API documentation
- Request/response examples
- Schema definitions
- Try-it-out functionality (Phase 2)

### Production

API docs are available at:

- `https://api.analytics.example.com/docs` (Redoc UI)
- `https://api.analytics.example.com/docs/openapi.yaml` (Raw spec)

## SDK Generation

### Generating the TypeScript SDK

The SDK package (`packages/sdk`) generates TypeScript types and a typed API client from the OpenAPI spec.

**Generate SDK:**

```bash
# From repo root
pnpm generate:sdk

# Or directly from SDK package
pnpm --filter @repo/sdk generate
```

This will:

1. Generate TypeScript types from OpenAPI spec → `packages/sdk/src/generated/types.ts`
2. Generate typed API client → `packages/sdk/src/generated/client.ts`

### Generated Files

After running `pnpm generate:sdk`, you'll find:

```
packages/sdk/src/generated/
├── types.ts      # TypeScript types for all OpenAPI schemas
└── client.ts     # Typed API client class
```

### Using Generated Types

**Import types:**

```typescript
import type { paths, components } from '@repo/sdk/types';

// Use generated types
type MetricsResponse =
	paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json'];
type Event = components['schemas']['Event'];
```

**Use typed client:**

```typescript
import { APIClient } from '@repo/sdk';

const client = new APIClient({
  baseUrl: 'http://localhost:3001',
  apiKey: 'ak_live_...', // For agent SDK
  // or
  accessToken: 'eyJhbG...', // For dashboard
});

// Typed method calls
const metrics = await client.getMetricsOverview({ period: '7d' });
const result = await client.ingestEvents({ events: [...] });
```

## Integration with Codebase

### Dashboard Usage

The dashboard (`apps/dashboard`) is set up to use generated SDK types:

```typescript
// apps/dashboard/lib/api/metrics.ts
// Once SDK is generated, use:
import type { paths } from '@repo/sdk/types';

// Types are automatically extracted from OpenAPI spec
type MetricsResponse =
	paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json'];
```

**Current Status (Phase 1):**

- Dashboard uses local types (`@/types/api`)
- Ready to migrate to SDK types after generation
- Migration path documented in code comments

### API Implementation

The API (`apps/api`) should match the OpenAPI spec exactly. Contract tests ensure compliance (see `apps/api/tests/contract/`).

## Keeping SDK in Sync

### Pre-Build Hook

The SDK should be regenerated before building applications that depend on it:

```bash
# Before building dashboard
pnpm generate:sdk
pnpm --filter @repo/dashboard build
```

### CI Integration

The CI pipeline should regenerate SDK to catch breaking changes:

```yaml
# .github/workflows/ci.yml
- name: Generate SDK
  run: pnpm generate:sdk

- name: Type check
  run: pnpm type-check # Will fail if types don't match
```

### Manual Regeneration

Regenerate SDK when:

- OpenAPI spec is updated
- New endpoints are added
- Schema changes are made
- Before major releases

## SDK Package Structure

```
packages/sdk/
├── package.json          # SDK package config
├── tsconfig.json         # TypeScript config
├── scripts/
│   └── generate.ts       # Code generation script
└── src/
    ├── index.ts          # Package exports
    └── generated/        # Generated files (gitignored)
        ├── types.ts      # OpenAPI types
        └── client.ts     # Typed API client
```

## Generated Client API

### APIClient Class

```typescript
class APIClient {
	constructor(config: ClientConfig);

	// Typed methods for each endpoint
	async ingestEvents(request: EventBatchRequest): Promise<EventBatchResponse>;
	async getMetricsOverview(params?: {
		period?: string;
		compare?: boolean;
	}): Promise<MetricsOverviewResponse>;

	// Generic method for other endpoints
	async request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}
```

### Configuration

```typescript
interface ClientConfig {
	baseUrl?: string; // API base URL (default: from OpenAPI servers)
	apiKey?: string; // For agent SDK authentication
	accessToken?: string; // For dashboard JWT authentication
	headers?: Record<string, string>; // Additional headers
}
```

## Type Safety Benefits

### Before (Manual Types)

```typescript
// Manual type definition - can drift from API
interface MetricsResponse {
  period: { start: string; end: string };
  metrics: { active_users: number; ... };
}

// No compile-time guarantee this matches API
const response = await api.get<MetricsResponse>('/v1/metrics/overview');
```

### After (Generated Types)

```typescript
// Types generated from OpenAPI spec - always in sync
import type { paths } from '@repo/sdk/types';

type MetricsResponse =
	paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json'];

// TypeScript will error if API changes and types aren't regenerated
const response = await client.getMetricsOverview({ period: '7d' });
```

## Troubleshooting

### Issue: "Cannot find module '@repo/sdk/types'"

**Solution:** Generate the SDK first:

```bash
pnpm generate:sdk
```

### Issue: Types don't match API implementation

**Solution:**

1. Ensure OpenAPI spec is up to date
2. Regenerate SDK: `pnpm generate:sdk`
3. Run contract tests: `pnpm --filter @repo/api test:contract`

### Issue: Generated types are outdated

**Solution:** Regenerate SDK after updating OpenAPI spec:

```bash
# After editing specs/openapi.mvp.v1.yaml
pnpm generate:sdk
```

### Issue: API docs not loading

**Solution:**

1. Check API server is running: `curl http://localhost:3001/health`
2. Verify spec file exists: `ls specs/openapi.mvp.v1.yaml`
3. Check API logs for errors

## Phase 1 vs Phase 2 Differences

| Feature              | Phase 1 (MVP)                | Phase 2+                                    |
| -------------------- | ---------------------------- | ------------------------------------------- |
| **Docs UI**          | Redoc (static)               | Redoc + Swagger UI (interactive)            |
| **SDK Generation**   | Manual (`pnpm generate:sdk`) | Automated in CI/pre-build                   |
| **Client Features**  | Basic typed client           | Full-featured SDK (batching, retries, etc.) |
| **Type Coverage**    | Request/response types       | Full OpenAPI types + helpers                |
| **Language Support** | TypeScript only              | TypeScript + Python + more                  |

## Related Documentation

- [API Specification](./03-api-specification-v1.2.md) - Complete API contract
- [Development & Deployment](./05-development-deployment-v1.2.md) - SDK generation workflow
- [OpenAPI Spec](../specs/openapi.mvp.v1.yaml) - Single source of truth

## Support

For issues or questions:

1. Check that OpenAPI spec is valid: `npx @redocly/cli lint specs/openapi.mvp.v1.yaml`
2. Verify SDK generation: `pnpm generate:sdk`
3. Review contract tests: `pnpm --filter @repo/api test:contract`
