# AI Agent Analytics Dashboard — System Architecture

**Version:** 1.0  
**Date:** December 2025  
**Author:** Staff Software Architect  
**Status:** Technical Design Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Pipeline Design](#3-data-pipeline-design)
4. [Multi-Tenancy Implementation](#4-multi-tenancy-implementation)
5. [Scalability Patterns](#5-scalability-patterns)
6. [Security Architecture](#6-security-architecture)
7. [Observability & Monitoring](#7-observability--monitoring)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Cost Estimation](#9-cost-estimation)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Evolutionary Architecture Path](#11-evolutionary-architecture-path)
12. [Simplified 4-Week Architecture](#12-simplified-4-week-architecture)
13. [Real-Time Communication Architecture](#13-real-time-communication-architecture)
14. [Testing Strategy for Data Pipeline](#14-testing-strategy-for-data-pipeline)
15. [Architecture Diagrams](#15-architecture-diagrams)

---

## 1. Executive Summary

### 1.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Operational Simplicity** | Serverless-first, managed services for non-core components |
| **Multi-Region by Default** | Active-active in US/EU with data residency controls |
| **Tenant Isolation** | Row-level security + logical separation at every layer |
| **Cloud-Agnostic Core** | Containerized services with portable data layer |
| **Cost Efficiency** | OpEx model with auto-scaling, pay-per-use |

### 1.2 Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event Streaming | Amazon Kinesis (MSK for cloud-agnostic) | Serverless, auto-scaling, low operational overhead |
| Time-Series Analytics | ClickHouse (primary) | 10-100x faster aggregations than PostgreSQL, excellent compression |
| Batch Processing | Apache Flink on Kinesis Data Analytics | Unified stream/batch, serverless option available |
| API Layer | Node.js on AWS Lambda + API Gateway | Matches team stack, serverless scaling |
| Frontend Hosting | Vercel (Next.js native) or CloudFront + S3 | Edge-optimized, zero-config scaling |
| Cache Layer | Amazon ElastiCache (Redis) | Sub-millisecond latency, pub/sub for real-time |
| Primary Database | Amazon Aurora PostgreSQL | Multi-region, familiar tooling, row-level security |

### 1.3 Requirements Traceability

| Requirement | Solution |
|-------------|----------|
| 10K events/sec per org | Kinesis sharding + ClickHouse columnar ingestion |
| ≤30s real-time latency | Kinesis → Lambda → Redis pub/sub → WebSocket |
| 100 orgs, data isolation | Row-level security + tenant_id partitioning |
| 1,000 concurrent users | CDN caching + read replicas + connection pooling |
| 13mo detailed + 3yr aggregated | ClickHouse TTL policies + S3 archival |
| GDPR / Data residency | Region-pinned data stores + tenant routing |

---

## 2. Architecture Overview

### 2.1 High-Level System Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB["Next.js Dashboard<br/>(Vercel Edge)"]
        SDK["Agent SDK<br/>(Event Emitter)"]
        API_EXT["External APIs<br/>(Git, Slack, PagerDuty)"]
    end

    subgraph Edge["Edge Layer (CloudFront)"]
        CDN["CDN + WAF"]
        EDGE_FN["Edge Functions<br/>(Tenant Routing)"]
    end

    subgraph Ingestion["Ingestion Layer"]
        APIGW["API Gateway<br/>(REST/WebSocket)"]
        KINESIS["Kinesis Data Streams<br/>(Per-Region)"]
        VALIDATOR["Event Validator<br/>(Lambda)"]
    end

    subgraph Processing["Processing Layer"]
        subgraph RealTime["Real-Time Pipeline"]
            FLINK_RT["Flink<br/>(Stream Processing)"]
            LAMBDA_AGG["Aggregator<br/>(Lambda)"]
        end
        subgraph Batch["Batch Pipeline"]
            FLINK_BATCH["Flink<br/>(Batch Jobs)"]
            STEP_FN["Step Functions<br/>(Orchestration)"]
        end
    end

    subgraph Storage["Storage Layer"]
        subgraph HotData["Hot Data (< 24h)"]
            REDIS["ElastiCache Redis<br/>(Real-time Cache)"]
        end
        subgraph WarmData["Warm Data (< 13mo)"]
            CLICKHOUSE["ClickHouse Cluster<br/>(Analytics)"]
            AURORA["Aurora PostgreSQL<br/>(Metadata/Config)"]
        end
        subgraph ColdData["Cold Data (> 13mo)"]
            S3["S3 + Glacier<br/>(Archive)"]
        end
    end

    subgraph Services["Application Services"]
        AUTH["Auth Service<br/>(Cognito + Custom)"]
        QUERY["Query Service<br/>(Node.js Lambda)"]
        ALERT["Alert Service<br/>(EventBridge)"]
        EXPORT["Export Service<br/>(Step Functions)"]
    end

    subgraph Observability["Observability"]
        CW["CloudWatch<br/>(Metrics/Logs)"]
        XRAY["X-Ray<br/>(Tracing)"]
        GRAFANA["Grafana Cloud<br/>(Dashboards)"]
    end

    SDK --> CDN
    WEB --> CDN
    API_EXT --> APIGW
    CDN --> EDGE_FN
    EDGE_FN --> APIGW
    APIGW --> VALIDATOR
    VALIDATOR --> KINESIS
    KINESIS --> FLINK_RT
    KINESIS --> FLINK_BATCH
    FLINK_RT --> REDIS
    FLINK_RT --> CLICKHOUSE
    FLINK_BATCH --> CLICKHOUSE
    FLINK_BATCH --> S3
    LAMBDA_AGG --> REDIS
    STEP_FN --> FLINK_BATCH
    
    QUERY --> REDIS
    QUERY --> CLICKHOUSE
    QUERY --> AURORA
    AUTH --> AURORA
    ALERT --> REDIS
    EXPORT --> S3
    
    Services --> CW
    Processing --> CW
    CW --> GRAFANA
    XRAY --> GRAFANA
```

### 2.2 Component Responsibilities

#### 2.2.1 Client Layer
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Dashboard | Next.js 14 (App Router) | Server-side rendering, real-time updates via WebSocket |
| Agent SDK | TypeScript library | Event collection from AI agent sessions |
| Integrations | Webhooks + OAuth | Git providers, Slack, PagerDuty |

#### 2.2.2 Edge Layer
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| CDN | CloudFront | Static asset caching, DDoS protection |
| WAF | AWS WAF | Rate limiting, SQL injection protection |
| Edge Functions | CloudFront Functions | Tenant routing, geo-based data residency |

#### 2.2.3 Ingestion Layer
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| API Gateway | AWS API Gateway | REST endpoints, WebSocket connections, throttling |
| Event Validator | Lambda (Node.js) | Schema validation, enrichment, tenant tagging |
| Stream Buffer | Kinesis Data Streams | Durable event buffering, replay capability |

#### 2.2.4 Processing Layer
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Real-Time Processor | Managed Flink | Sub-30s aggregations, anomaly detection |
| Batch Processor | Managed Flink | Hourly/daily rollups, cost calculations |
| Orchestrator | Step Functions | Complex workflows, report generation |

#### 2.2.5 Storage Layer
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Real-Time Cache | ElastiCache Redis | Latest metrics, session state, pub/sub |
| Analytics Store | ClickHouse | Time-series queries, aggregations |
| Metadata Store | Aurora PostgreSQL | User/org config, audit logs, relational data |
| Archive | S3 + Glacier | Long-term retention, compliance |

### 2.3 Technology Evaluation: ClickHouse vs TimescaleDB

#### Performance Comparison (10K events/sec workload)

| Criteria | ClickHouse | TimescaleDB | Winner |
|----------|------------|-------------|--------|
| **Write Throughput** | 500K+ rows/sec | 100K rows/sec | ClickHouse |
| **Aggregation Queries** | 10-100x faster | Baseline | ClickHouse |
| **Compression Ratio** | 10-20x | 5-10x | ClickHouse |
| **SQL Compatibility** | 90% (custom dialect) | 100% (PostgreSQL) | TimescaleDB |
| **Operational Complexity** | Medium-High | Low | TimescaleDB |
| **Team Familiarity** | Learning curve | PostgreSQL native | TimescaleDB |
| **Managed Options** | ClickHouse Cloud | Timescale Cloud | Tie |
| **Cost at Scale** | Lower (compression) | Higher | ClickHouse |

#### Recommendation: **ClickHouse** (Primary) with **Aurora PostgreSQL** (Metadata)

**Rationale:**
1. **Query Performance**: Dashboard queries are aggregation-heavy (SUM, AVG, COUNT GROUP BY time). ClickHouse's columnar format is purpose-built for this.
2. **Compression**: At 10K events/sec × 100 orgs × 2KB avg = ~170TB/month raw. ClickHouse's 15x compression → ~11TB stored.
3. **Cost**: Better compression = lower storage costs = significant savings at scale.
4. **Managed Option**: ClickHouse Cloud provides serverless scaling, reducing operational burden.

**Mitigation for ClickHouse complexity:**
- Use ClickHouse Cloud (managed) instead of self-hosted
- Keep relational data (users, orgs, configs) in Aurora PostgreSQL
- Abstract ClickHouse behind a Query Service with standardized interfaces

#### Alternative Path: TimescaleDB
If team strongly prefers PostgreSQL ecosystem:
- Use Timescale Cloud for analytics
- Accept higher storage costs (~2-3x)
- Leverage familiar tooling (pg_dump, standard ORMs)
- Consider for MVP, migrate to ClickHouse if scale demands

---

## 3. Data Pipeline Design

### 3.1 Event Schema

```typescript
// Core Event Schema (standardized)
interface AnalyticsEvent {
  // Identity (required)
  event_id: string;          // UUIDv7 (time-sortable)
  org_id: string;            // Tenant identifier
  user_id: string;           // User within tenant
  session_id: string;        // Agent session identifier
  
  // Classification (required)
  event_type: EventType;     // Enum: session_start, session_end, error, etc.
  event_category: string;    // 'usage' | 'performance' | 'security' | 'cost'
  
  // Temporal (required)
  timestamp: string;         // ISO 8601, source time
  received_at: string;       // ISO 8601, ingestion time
  
  // Context (required)
  region: string;            // 'us-east-1' | 'eu-west-1'
  environment: string;       // 'production' | 'staging'
  
  // Payload (flexible)
  metadata: Record<string, unknown>;  // Extensible JSON blob
  
  // Derived (added by pipeline)
  _partition_key: string;    // org_id + date for sharding
  _processing_time: string;  // Pipeline processing timestamp
}

// Event Types Enum
type EventType = 
  | 'session_start'
  | 'session_end'
  | 'code_generated'
  | 'pr_created'
  | 'error'
  | 'security_alert'
  | 'cost_incurred';
```

### 3.2 Real-Time Pipeline (≤30s Latency)

```mermaid
flowchart LR
    subgraph Ingestion["Ingestion (< 5s)"]
        SDK["Agent SDK"] -->|HTTPS| APIGW["API Gateway"]
        APIGW -->|Validate| LAMBDA_V["Validator Lambda"]
        LAMBDA_V -->|Enrich| KINESIS["Kinesis Stream<br/>(8 shards/region)"]
    end

    subgraph Processing["Processing (< 20s)"]
        KINESIS -->|Consume| FLINK["Managed Flink<br/>(Real-time App)"]
        FLINK -->|"Window: 10s"| AGG["Windowed<br/>Aggregations"]
    end

    subgraph Delivery["Delivery (< 5s)"]
        AGG -->|Upsert| REDIS["Redis<br/>(Sorted Sets)"]
        AGG -->|Insert| CH["ClickHouse<br/>(Buffer Table)"]
        REDIS -->|Pub/Sub| WS["WebSocket<br/>Connections"]
        WS -->|Push| DASH["Dashboard"]
    end

    style Ingestion fill:#e6f3ff
    style Processing fill:#fff3e6
    style Delivery fill:#e6ffe6
```

#### 3.2.1 Kinesis Configuration

```yaml
# Per-region Kinesis stream configuration
kinesis_streams:
  events_realtime:
    shard_count: 8  # 8 shards × 1MB/s = 8MB/s write capacity
    retention_hours: 168  # 7 days for replay
    enhanced_fan_out: true  # Dedicated throughput per consumer
    encryption: aws:kms
    
# Shard calculation:
# - 10K events/sec × 2KB = 20MB/s per org (peak)
# - 100 orgs = 2GB/s theoretical max
# - Realistic: 20% concurrent peak = 400MB/s
# - With batching (10 events/request): 40MB/s
# - Shards needed: 40MB/s ÷ 1MB/s = 40 shards (with headroom: 50)
```

#### 3.2.2 Flink Real-Time Job

```java
// Pseudo-code for Flink streaming job
public class RealTimeAggregator {
    public static void main(String[] args) {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Source: Kinesis with exactly-once semantics
        FlinkKinesisConsumer<Event> source = new FlinkKinesisConsumer<>(
            "events_realtime",
            new EventDeserializer(),
            kinesisConfig()
        );
        
        DataStream<Event> events = env.addSource(source);
        
        // Processing: 10-second tumbling windows
        DataStream<AggregatedMetric> metrics = events
            .keyBy(event -> event.getOrgId() + ":" + event.getEventType())
            .window(TumblingProcessingTimeWindows.of(Time.seconds(10)))
            .aggregate(new MetricAggregator());
        
        // Sink 1: Redis for real-time dashboard
        metrics.addSink(new RedisSink<>(redisConfig()));
        
        // Sink 2: ClickHouse for persistence
        metrics.addSink(new ClickHouseSink<>(clickhouseConfig()));
        
        env.execute("RealTime Aggregator");
    }
}
```

#### 3.2.3 Redis Data Structures

```redis
# Real-time metrics (sorted sets for time-series)
ZADD metrics:{org_id}:sessions:count {timestamp} {value}
ZADD metrics:{org_id}:errors:count {timestamp} {value}

# Current session state (hashes)
HSET session:{session_id} status "running" start_time "2025-12-07T10:00:00Z"

# Pub/Sub for WebSocket updates
PUBLISH org:{org_id}:updates '{"metric":"sessions","value":42}'

# TTL: 24 hours for hot data
EXPIRE metrics:{org_id}:sessions:count 86400
```

### 3.3 Batch Pipeline (5-60 min Latency)

```mermaid
flowchart TB
    subgraph Triggers["Triggers"]
        CRON["EventBridge<br/>Schedule"]
        S3_EVENT["S3 Event<br/>(New Files)"]
    end

    subgraph Orchestration["Orchestration"]
        STEP["Step Functions<br/>Workflow"]
    end

    subgraph Processing["Batch Processing"]
        FLINK_B["Managed Flink<br/>(Batch Mode)"]
        
        subgraph Jobs["Job Types"]
            HOURLY["Hourly Rollups"]
            DAILY["Daily Aggregates"]
            COST["Cost Calculations"]
            COMPLIANCE["Compliance Scores"]
        end
    end

    subgraph Sinks["Output"]
        CH["ClickHouse<br/>(Materialized Views)"]
        S3_OUT["S3<br/>(Parquet Files)"]
        AURORA["Aurora<br/>(Reports Table)"]
    end

    CRON --> STEP
    S3_EVENT --> STEP
    STEP --> FLINK_B
    FLINK_B --> Jobs
    Jobs --> CH
    Jobs --> S3_OUT
    Jobs --> AURORA
```

#### 3.3.1 Batch Job Definitions

```yaml
# Step Functions workflow definition
batch_workflows:
  hourly_rollup:
    schedule: "rate(1 hour)"
    timeout: 15 minutes
    steps:
      - name: extract_raw_events
        source: clickhouse
        query: |
          SELECT 
            org_id,
            toStartOfHour(timestamp) as hour,
            event_type,
            count() as event_count,
            uniqExact(user_id) as unique_users,
            uniqExact(session_id) as unique_sessions
          FROM events
          WHERE timestamp >= now() - INTERVAL 2 HOUR
            AND timestamp < now() - INTERVAL 1 HOUR
          GROUP BY org_id, hour, event_type
      - name: write_aggregates
        sink: clickhouse
        table: hourly_metrics
        
  daily_rollup:
    schedule: "cron(0 2 * * ? *)"  # 2 AM UTC
    timeout: 30 minutes
    steps:
      - name: compute_daily_metrics
        source: clickhouse
        query: |
          SELECT 
            org_id,
            toDate(timestamp) as date,
            sum(cost_tokens) * 0.00001 as total_cost,
            avg(session_duration) as avg_session_duration,
            countIf(event_type = 'error') / count() as error_rate
          FROM events
          WHERE toDate(timestamp) = yesterday()
          GROUP BY org_id, date
      - name: generate_reports
        sink: aurora
        table: daily_reports
      - name: archive_raw
        sink: s3
        format: parquet
        partition: "org_id/year/month/day"
```

### 3.4 Historical Data & Archival

#### 3.4.1 Data Retention Strategy

```mermaid
flowchart LR
    subgraph Hot["Hot Tier<br/>(0-24h)"]
        REDIS["Redis<br/>Real-time Cache"]
    end
    
    subgraph Warm["Warm Tier<br/>(1-13 months)"]
        CH_HOT["ClickHouse<br/>NVMe SSD"]
    end
    
    subgraph Cool["Cool Tier<br/>(13-36 months)"]
        CH_COLD["ClickHouse<br/>HDD + S3"]
    end
    
    subgraph Cold["Cold Tier<br/>(36+ months)"]
        GLACIER["S3 Glacier<br/>Deep Archive"]
    end

    Hot -->|"TTL: 24h"| Warm
    Warm -->|"TTL: 13mo"| Cool
    Cool -->|"TTL: 36mo"| Cold

    style Hot fill:#ff6b6b
    style Warm fill:#ffd93d
    style Cool fill:#6bcb77
    style Cold fill:#4d96ff
```

#### 3.4.2 ClickHouse TTL Configuration

```sql
-- Events table with automatic tiered storage
CREATE TABLE events (
    event_id UUID,
    org_id String,
    user_id String,
    session_id String,
    event_type LowCardinality(String),
    timestamp DateTime64(3),
    metadata String,  -- JSON as string, parsed on read
    
    -- Partitioning
    _partition_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY (org_id, toYYYYMM(_partition_date))
ORDER BY (org_id, event_type, timestamp)
TTL 
    timestamp + INTERVAL 13 MONTH TO VOLUME 'cold',
    timestamp + INTERVAL 36 MONTH DELETE
SETTINGS 
    storage_policy = 'tiered',
    index_granularity = 8192;

-- Storage policy for tiered storage
-- (configured in ClickHouse server config)
<storage_configuration>
    <disks>
        <nvme><path>/data/nvme/</path></nvme>
        <s3>
            <type>s3</type>
            <endpoint>https://s3.amazonaws.com/analytics-cold/</endpoint>
        </s3>
    </disks>
    <policies>
        <tiered>
            <volumes>
                <hot><disk>nvme</disk></hot>
                <cold><disk>s3</disk></cold>
            </volumes>
        </tiered>
    </policies>
</storage_configuration>
```

#### 3.4.3 S3 Lifecycle Rules

```yaml
# S3 lifecycle configuration for archives
lifecycle_rules:
  - id: archive_to_glacier
    prefix: "archives/"
    transitions:
      - days: 90
        storage_class: STANDARD_IA
      - days: 365
        storage_class: GLACIER
      - days: 1095  # 3 years
        storage_class: DEEP_ARCHIVE
    expiration:
      days: 2555  # 7 years (compliance)
    
  - id: delete_temp_files
    prefix: "temp/"
    expiration:
      days: 7
```

---

## 4. Multi-Tenancy Implementation

### 4.1 Tenant Isolation Architecture

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        REQ["API Request<br/>+ JWT Token"]
    end
    
    subgraph Auth["Authentication Layer"]
        JWT["JWT Validation"]
        TENANT["Extract org_id<br/>from Token"]
    end
    
    subgraph Routing["Tenant Routing"]
        ROUTER["Tenant Router"]
        
        subgraph Regions["Region Selection"]
            US["US Region<br/>(us-east-1)"]
            EU["EU Region<br/>(eu-west-1)"]
        end
    end
    
    subgraph Isolation["Data Isolation"]
        subgraph Logical["Logical Isolation"]
            RLS["Row-Level Security<br/>(PostgreSQL)"]
            FILTER["Query Filters<br/>(ClickHouse)"]
        end
        
        subgraph Physical["Physical Isolation"]
            PARTITION["Table Partitions<br/>(per org_id)"]
            BUCKET["S3 Prefixes<br/>(per org_id)"]
        end
    end

    REQ --> JWT
    JWT --> TENANT
    TENANT --> ROUTER
    ROUTER -->|"EU tenant"| EU
    ROUTER -->|"US tenant"| US
    US --> Isolation
    EU --> Isolation
```

### 4.2 Tenant Configuration Model

```typescript
// Tenant (Organization) configuration stored in Aurora
interface TenantConfig {
  org_id: string;
  name: string;
  
  // Data residency
  primary_region: 'us-east-1' | 'eu-west-1';
  data_residency: 'us' | 'eu' | 'global';  // GDPR compliance
  
  // Resource quotas
  quotas: {
    max_events_per_second: number;     // Default: 10,000
    max_seats: number;                  // Licensed seats
    max_storage_gb: number;             // Data retention limit
    max_api_requests_per_minute: number; // Rate limit
  };
  
  // Feature flags
  features: {
    real_time_enabled: boolean;
    export_enabled: boolean;
    sso_enabled: boolean;
    custom_metrics_enabled: boolean;
  };
  
  // Billing
  billing: {
    plan: 'starter' | 'professional' | 'enterprise';
    billing_email: string;
    stripe_customer_id: string;
  };
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}
```

### 4.3 Row-Level Security (Aurora PostgreSQL)

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON users
    USING (org_id = current_setting('app.current_org_id')::text);

CREATE POLICY tenant_isolation ON sessions
    USING (org_id = current_setting('app.current_org_id')::text);

-- Application sets context before queries
-- (Called in middleware after JWT validation)
CREATE OR REPLACE FUNCTION set_tenant_context(p_org_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_org_id', p_org_id, true);
END;
$$ LANGUAGE plpgsql;

-- Usage in application:
-- SELECT set_tenant_context('org_abc123');
-- SELECT * FROM users;  -- Automatically filtered
```

### 4.4 ClickHouse Tenant Isolation

```sql
-- Option 1: Query-time filtering (simpler, recommended for <100 tenants)
-- All queries MUST include org_id filter
SELECT 
    count() as session_count,
    avg(duration) as avg_duration
FROM events
WHERE org_id = {org_id:String}  -- Parameterized, always required
  AND timestamp >= {start:DateTime}
  AND timestamp < {end:DateTime}
GROUP BY toStartOfHour(timestamp);

-- Option 2: Row-level policies (ClickHouse 23.3+)
CREATE ROW POLICY tenant_policy ON events
    USING org_id = currentUser()  -- Requires per-tenant DB users
    TO ALL;

-- Option 3: Materialized views per tenant (for very large tenants)
CREATE MATERIALIZED VIEW events_org_abc123
ENGINE = MergeTree()
ORDER BY (event_type, timestamp)
POPULATE AS
SELECT * FROM events WHERE org_id = 'abc123';
```

### 4.5 Tenant-Aware Routing Middleware

```typescript
// middleware/tenant.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getTenantConfig } from '@/lib/auth';

interface TenantContext {
  orgId: string;
  region: 'us-east-1' | 'eu-west-1';
  quotas: TenantQuotas;
}

export async function tenantMiddleware(req: NextRequest) {
  // 1. Extract and verify JWT
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const payload = await verifyJWT(token);
  const orgId = payload.org_id;
  
  // 2. Load tenant configuration (cached in Redis)
  const tenantConfig = await getTenantConfig(orgId);
  
  // 3. Determine target region based on data residency
  const targetRegion = determineRegion(tenantConfig, req);
  
  // 4. Check quotas
  const quotaOk = await checkQuota(orgId, tenantConfig.quotas);
  if (!quotaOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // 5. Attach tenant context to request
  const response = NextResponse.next();
  response.headers.set('X-Tenant-Id', orgId);
  response.headers.set('X-Target-Region', targetRegion);
  
  return response;
}

function determineRegion(config: TenantConfig, req: NextRequest): string {
  // GDPR: EU tenants must route to EU region
  if (config.data_residency === 'eu') {
    return 'eu-west-1';
  }
  
  // Global tenants: route to nearest region
  if (config.data_residency === 'global') {
    const clientRegion = req.geo?.region;
    return clientRegion?.startsWith('EU') ? 'eu-west-1' : 'us-east-1';
  }
  
  return config.primary_region;
}
```

### 4.6 Multi-Region Data Residency

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS["Route 53<br/>Latency-based Routing"]
        CF["CloudFront<br/>Edge Locations"]
    end
    
    subgraph US["US Region (us-east-1)"]
        US_API["API Gateway"]
        US_KINESIS["Kinesis"]
        US_CH["ClickHouse<br/>(US Data)"]
        US_AURORA["Aurora<br/>Primary"]
    end
    
    subgraph EU["EU Region (eu-west-1)"]
        EU_API["API Gateway"]
        EU_KINESIS["Kinesis"]
        EU_CH["ClickHouse<br/>(EU Data)"]
        EU_AURORA["Aurora<br/>Read Replica"]
    end
    
    subgraph SharedConfig["Shared Config (Global)"]
        AURORA_GLOBAL["Aurora Global DB<br/>(Tenant Config)"]
    end

    DNS --> CF
    CF -->|"US Tenant"| US_API
    CF -->|"EU Tenant"| EU_API
    
    US_API --> US_KINESIS --> US_CH
    EU_API --> EU_KINESIS --> EU_CH
    
    US_AURORA <-->|"Replication"| EU_AURORA
    AURORA_GLOBAL --> US_AURORA
    AURORA_GLOBAL --> EU_AURORA
```

#### Data Residency Rules

| Tenant Type | Event Data | Analytics Data | Config Data |
|-------------|------------|----------------|-------------|
| US-only | US region | US region | Global (replicated) |
| EU-only (GDPR) | EU region only | EU region only | Global (replicated) |
| Global | Write to nearest, read from nearest | Per-region materialized views | Global (replicated) |

---

## 5. Scalability Patterns

### 5.1 Horizontal Scaling Strategy

```mermaid
flowchart TB
    subgraph LoadBalancing["Load Balancing Tier"]
        ALB["Application Load Balancer<br/>(Auto-scaling Target Groups)"]
    end
    
    subgraph Compute["Compute Tier"]
        subgraph Lambda["Serverless (Lambda)"]
            API_FN["API Functions<br/>Concurrency: 1000"]
            PROC_FN["Processing Functions<br/>Concurrency: 5000"]
        end
        
        subgraph ECS["Containers (ECS Fargate)"]
            QUERY_SVC["Query Service<br/>2-20 tasks"]
            EXPORT_SVC["Export Service<br/>1-10 tasks"]
        end
    end
    
    subgraph Data["Data Tier"]
        subgraph Kinesis["Stream Scaling"]
            SHARDS["Kinesis Shards<br/>Auto-scaling: 8-100"]
        end
        
        subgraph ClickHouse["Analytics Scaling"]
            CH_SHARDS["ClickHouse Cluster<br/>3-9 nodes"]
        end
        
        subgraph Cache["Cache Scaling"]
            REDIS_CLUSTER["Redis Cluster<br/>3-15 shards"]
        end
    end

    ALB --> Lambda
    ALB --> ECS
    Lambda --> Data
    ECS --> Data
```

### 5.2 Auto-Scaling Configurations

```yaml
# Lambda concurrency scaling
lambda_scaling:
  api_functions:
    reserved_concurrency: 100
    provisioned_concurrency: 10  # Warm starts for latency
    max_concurrency: 1000
    
  event_processors:
    reserved_concurrency: 500
    provisioned_concurrency: 50
    max_concurrency: 5000

# ECS Fargate auto-scaling
ecs_scaling:
  query_service:
    min_tasks: 2
    max_tasks: 20
    target_cpu_utilization: 70
    scale_in_cooldown: 300
    scale_out_cooldown: 60
    
# Kinesis shard scaling
kinesis_scaling:
  target_utilization: 70
  min_shards: 8
  max_shards: 100
  scale_up_threshold: 80  # % of capacity
  scale_down_threshold: 30

# ClickHouse cluster scaling (manual with automation)
clickhouse_scaling:
  min_nodes: 3
  max_nodes: 9
  replication_factor: 2
  scale_trigger:
    cpu_threshold: 75
    storage_threshold: 80
```

### 5.3 Caching Strategy

```mermaid
flowchart LR
    subgraph Client["Client"]
        BROWSER["Browser<br/>(Local Cache)"]
    end
    
    subgraph Edge["Edge Cache"]
        CF["CloudFront<br/>(Static Assets)"]
    end
    
    subgraph App["Application Cache"]
        REDIS["Redis Cluster"]
        
        subgraph CacheTypes["Cache Types"]
            SESSION["Session Cache<br/>TTL: 1h"]
            TENANT["Tenant Config<br/>TTL: 5m"]
            METRICS["Metric Cache<br/>TTL: 10s"]
            QUERY["Query Results<br/>TTL: 30s"]
        end
    end
    
    subgraph DB["Database"]
        CH["ClickHouse"]
        AURORA["Aurora"]
    end

    BROWSER -->|"Cache-Control"| CF
    CF -->|"Miss"| REDIS
    REDIS -->|"Miss"| DB
    
    style Edge fill:#ffe6cc
    style App fill:#cce6ff
```

#### 5.3.1 Cache Key Strategy

```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis.Cluster(REDIS_CLUSTER_ENDPOINTS);

// Cache key patterns
const CacheKeys = {
  // Tenant configuration (rarely changes)
  tenantConfig: (orgId: string) => `tenant:${orgId}:config`,
  
  // Real-time metrics (frequently updated)
  realtimeMetric: (orgId: string, metric: string, window: string) => 
    `metrics:${orgId}:${metric}:${window}`,
  
  // Query results (short-lived)
  queryResult: (orgId: string, queryHash: string) => 
    `query:${orgId}:${queryHash}`,
  
  // Dashboard data (per-user personalization)
  dashboardData: (orgId: string, userId: string, dashboardId: string) =>
    `dashboard:${orgId}:${userId}:${dashboardId}`,
};

// Cache-aside pattern implementation
async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }
  
  // Fetch from source
  const data = await fetchFn();
  
  // Store in cache (with lock to prevent thundering herd)
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (acquired) {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    await redis.del(lockKey);
  }
  
  return data;
}

// Cache invalidation on write
async function invalidateTenantCache(orgId: string): Promise<void> {
  const pattern = `*:${orgId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

#### 5.3.2 CDN Configuration

```yaml
# CloudFront distribution settings
cloudfront:
  origins:
    - id: next-app
      domain: app.vercel.app
      protocol: https
      
    - id: api
      domain: api.analytics.example.com
      protocol: https
      
  cache_behaviors:
    # Static assets - long cache
    - path_pattern: "/_next/static/*"
      origin: next-app
      ttl: 31536000  # 1 year
      compress: true
      
    # API responses - short cache with stale-while-revalidate
    - path_pattern: "/api/metrics/*"
      origin: api
      ttl: 10
      stale_while_revalidate: 60
      cache_key_includes:
        - Authorization  # Per-user caching
        - X-Org-Id       # Per-tenant caching
        
    # Real-time endpoints - no cache
    - path_pattern: "/api/realtime/*"
      origin: api
      ttl: 0
      forward_all_headers: true
```

### 5.4 Database Scaling

#### 5.4.1 Aurora PostgreSQL Scaling

```yaml
# Aurora cluster configuration
aurora_cluster:
  engine: aurora-postgresql
  engine_version: "15.4"
  
  instances:
    - role: writer
      class: db.r6g.xlarge
      
    - role: reader
      class: db.r6g.large
      count: 2
      auto_scaling:
        min: 2
        max: 5
        target_cpu: 70
        
  global_database:
    enabled: true
    regions:
      - us-east-1  # Primary
      - eu-west-1  # Secondary
    
  connection_pooling:
    engine: pgbouncer  # Via RDS Proxy
    max_connections: 1000
    pool_mode: transaction
```

#### 5.4.2 ClickHouse Cluster Topology

```mermaid
flowchart TB
    subgraph Cluster["ClickHouse Cluster"]
        subgraph Shard1["Shard 1"]
            R1A["Replica 1A<br/>(us-east-1a)"]
            R1B["Replica 1B<br/>(us-east-1b)"]
        end
        
        subgraph Shard2["Shard 2"]
            R2A["Replica 2A<br/>(us-east-1a)"]
            R2B["Replica 2B<br/>(us-east-1b)"]
        end
        
        subgraph Shard3["Shard 3"]
            R3A["Replica 3A<br/>(us-east-1a)"]
            R3B["Replica 3B<br/>(us-east-1b)"]
        end
    end
    
    subgraph Coordination["Coordination"]
        ZK1["ClickHouse Keeper 1"]
        ZK2["ClickHouse Keeper 2"]
        ZK3["ClickHouse Keeper 3"]
    end
    
    R1A <--> R1B
    R2A <--> R2B
    R3A <--> R3B
    
    Cluster --> Coordination
```

```xml
<!-- ClickHouse cluster configuration -->
<clickhouse>
    <remote_servers>
        <analytics_cluster>
            <shard>
                <replica>
                    <host>ch-shard1-replica1.internal</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-shard1-replica2.internal</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <replica>
                    <host>ch-shard2-replica1.internal</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-shard2-replica2.internal</host>
                    <port>9000</port>
                </replica>
            </shard>
            <!-- Additional shards... -->
        </analytics_cluster>
    </remote_servers>
    
    <!-- Distributed table for queries -->
    <macros>
        <cluster>analytics_cluster</cluster>
        <shard>01</shard>
        <replica>replica1</replica>
    </macros>
</clickhouse>
```

---

## 6. Security Architecture

### 6.1 Security Layers Overview

```mermaid
flowchart TB
    subgraph Perimeter["Perimeter Security"]
        WAF["AWS WAF<br/>(OWASP Rules)"]
        SHIELD["AWS Shield<br/>(DDoS)"]
        CF["CloudFront<br/>(TLS 1.3)"]
    end
    
    subgraph Identity["Identity Layer"]
        COGNITO["Cognito<br/>(User Pool)"]
        SSO["SSO Providers<br/>(SAML/OIDC)"]
        MFA["MFA<br/>(TOTP/WebAuthn)"]
    end
    
    subgraph Application["Application Security"]
        JWT["JWT Validation"]
        RBAC["Role-Based Access"]
        RLS["Row-Level Security"]
        AUDIT["Audit Logging"]
    end
    
    subgraph Data["Data Security"]
        TLS["TLS 1.3<br/>(In Transit)"]
        KMS["AWS KMS<br/>(At Rest)"]
        SECRETS["Secrets Manager"]
    end
    
    subgraph Network["Network Security"]
        VPC["VPC"]
        SG["Security Groups"]
        NACL["Network ACLs"]
        PRIVATE["Private Subnets"]
    end

    Perimeter --> Identity --> Application --> Data
    Data --> Network
```

### 6.2 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Next.js App
    participant Cognito
    participant IDP as SAML/OIDC IDP
    participant API as API Gateway
    participant Lambda
    
    User->>App: Access Dashboard
    App->>Cognito: Redirect to Login
    
    alt Enterprise SSO
        Cognito->>IDP: SAML/OIDC Redirect
        IDP->>User: Enterprise Login
        User->>IDP: Credentials + MFA
        IDP->>Cognito: SAML Assertion
    else Cognito Direct
        Cognito->>User: Login Form
        User->>Cognito: Credentials
        Cognito->>User: MFA Challenge
        User->>Cognito: MFA Code
    end
    
    Cognito->>App: Authorization Code
    App->>Cognito: Exchange for Tokens
    Cognito->>App: ID Token + Access Token + Refresh Token
    
    App->>API: API Request + Access Token
    API->>Lambda: Validate JWT
    Lambda->>Lambda: Extract org_id, roles
    Lambda->>Lambda: Apply RLS Context
    Lambda->>API: Response
    API->>App: Data
```

### 6.3 Authorization Model (RBAC)

```typescript
// types/auth.ts
interface Permission {
  resource: ResourceType;
  action: ActionType;
  scope: ScopeType;
}

type ResourceType = 
  | 'dashboard'
  | 'metrics'
  | 'users'
  | 'settings'
  | 'billing'
  | 'audit_logs'
  | 'exports';

type ActionType = 'read' | 'write' | 'delete' | 'admin';
type ScopeType = 'own' | 'team' | 'org';

// Role definitions
const Roles = {
  VIEWER: {
    permissions: [
      { resource: 'dashboard', action: 'read', scope: 'org' },
      { resource: 'metrics', action: 'read', scope: 'own' },
    ]
  },
  
  USER: {
    permissions: [
      { resource: 'dashboard', action: 'read', scope: 'org' },
      { resource: 'metrics', action: 'read', scope: 'team' },
      { resource: 'exports', action: 'write', scope: 'own' },
    ]
  },
  
  MANAGER: {
    permissions: [
      { resource: 'dashboard', action: 'read', scope: 'org' },
      { resource: 'metrics', action: 'read', scope: 'org' },
      { resource: 'users', action: 'read', scope: 'team' },
      { resource: 'exports', action: 'write', scope: 'team' },
    ]
  },
  
  ADMIN: {
    permissions: [
      { resource: '*', action: '*', scope: 'org' },
    ]
  },
};

// Permission check middleware
function checkPermission(
  userRoles: string[],
  resource: ResourceType,
  action: ActionType,
  requestedScope: ScopeType
): boolean {
  for (const roleName of userRoles) {
    const role = Roles[roleName];
    if (!role) continue;
    
    for (const perm of role.permissions) {
      if (
        (perm.resource === '*' || perm.resource === resource) &&
        (perm.action === '*' || perm.action === action) &&
        scopeIncludes(perm.scope, requestedScope)
      ) {
        return true;
      }
    }
  }
  return false;
}
```

### 6.4 API Security

```typescript
// middleware/api-security.ts
import { rateLimit } from '@/lib/rate-limit';
import { validateJWT } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  requireAuth: boolean;
  requiredRoles?: string[];
  auditLevel: 'none' | 'basic' | 'detailed';
}

const defaultConfig: SecurityConfig = {
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  requireAuth: true,
  auditLevel: 'basic',
};

export function secureEndpoint(config: Partial<SecurityConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  
  return async function middleware(req: NextRequest) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Rate limiting (per API key / IP)
      const rateLimitKey = req.headers.get('X-API-Key') || 
                          req.headers.get('X-Forwarded-For') ||
                          'anonymous';
      
      const { success, remaining } = await rateLimit(
        rateLimitKey,
        cfg.rateLimit.windowMs,
        cfg.rateLimit.maxRequests
      );
      
      if (!success) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        });
      }
      
      // 2. Authentication
      if (cfg.requireAuth) {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        const payload = await validateJWT(token);
        if (!payload) {
          return new Response('Invalid token', { status: 401 });
        }
        
        // 3. Authorization
        if (cfg.requiredRoles && cfg.requiredRoles.length > 0) {
          const hasRole = cfg.requiredRoles.some(r => payload.roles.includes(r));
          if (!hasRole) {
            return new Response('Forbidden', { status: 403 });
          }
        }
        
        // Attach user context
        req.headers.set('X-User-Id', payload.sub);
        req.headers.set('X-Org-Id', payload.org_id);
        req.headers.set('X-Roles', payload.roles.join(','));
      }
      
      // 4. Continue to handler
      const response = await NextResponse.next();
      
      // 5. Audit logging
      if (cfg.auditLevel !== 'none') {
        await auditLog({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          org_id: req.headers.get('X-Org-Id'),
          user_id: req.headers.get('X-User-Id'),
          method: req.method,
          path: req.nextUrl.pathname,
          status: response.status,
          duration_ms: Date.now() - startTime,
          ip_address: req.headers.get('X-Forwarded-For'),
          user_agent: req.headers.get('User-Agent'),
          ...(cfg.auditLevel === 'detailed' && {
            request_body: await req.text(),
            response_size: response.headers.get('Content-Length'),
          }),
        });
      }
      
      // Add security headers
      response.headers.set('X-Request-Id', requestId);
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      
      return response;
      
    } catch (error) {
      console.error('Security middleware error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}
```

### 6.5 Audit Logging Schema

```sql
-- Aurora PostgreSQL audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request identification
    request_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Actor
    org_id TEXT NOT NULL,
    user_id TEXT,
    service_account_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Action
    action_type TEXT NOT NULL,  -- 'api_call', 'login', 'export', 'config_change'
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    method TEXT,
    path TEXT,
    
    -- Result
    status_code INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    
    -- Details (JSON for flexibility)
    request_metadata JSONB,
    response_metadata JSONB,
    change_details JSONB,  -- For config changes: {before: {}, after: {}}
    
    -- Indexing
    CONSTRAINT audit_logs_org_id_idx INDEX (org_id, timestamp DESC)
);

-- Partitioning by month for performance
CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Immutable: no updates or deletes allowed
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- Retention policy: 3 years
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Move to S3 via pg_dump or AWS DMS
    -- Delete partitions older than 3 years
    DROP TABLE IF EXISTS audit_logs_2022_12;
END;
$$ LANGUAGE plpgsql;
```

### 6.6 Encryption Architecture

```yaml
# Encryption configuration
encryption:
  in_transit:
    protocol: TLS 1.3
    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
    certificate_management: AWS ACM
    
  at_rest:
    algorithm: AES-256-GCM
    key_management: AWS KMS
    key_rotation: automatic (yearly)
    
    services:
      aurora:
        encrypted: true
        kms_key: alias/analytics-aurora
        
      clickhouse:
        encrypted: true
        kms_key: alias/analytics-clickhouse
        
      s3:
        encrypted: true
        kms_key: alias/analytics-s3
        bucket_policy: deny-unencrypted-uploads
        
      kinesis:
        encrypted: true
        kms_key: alias/analytics-kinesis
        
  secrets:
    manager: AWS Secrets Manager
    rotation: automatic (90 days)
    items:
      - database_credentials
      - api_keys
      - jwt_signing_keys
      - integration_tokens
```

---

## 7. Observability & Monitoring

### 7.1 Observability Stack

```mermaid
flowchart TB
    subgraph Sources["Telemetry Sources"]
        APP["Application<br/>(Structured Logs)"]
        INFRA["Infrastructure<br/>(CloudWatch Agent)"]
        TRACES["Distributed Traces<br/>(X-Ray SDK)"]
        METRICS["Custom Metrics<br/>(StatsD)"]
    end
    
    subgraph Collection["Collection Layer"]
        CW["CloudWatch<br/>Logs & Metrics"]
        XRAY["AWS X-Ray"]
        OTEL["OpenTelemetry<br/>Collector"]
    end
    
    subgraph Storage["Storage Layer"]
        CW_LOGS["CloudWatch<br/>Log Groups"]
        CW_METRICS["CloudWatch<br/>Metrics"]
        TRACES_DB["X-Ray<br/>Traces"]
    end
    
    subgraph Visualization["Visualization"]
        GRAFANA["Grafana Cloud<br/>(Dashboards)"]
        CW_DASH["CloudWatch<br/>Dashboards"]
    end
    
    subgraph Alerting["Alerting"]
        CW_ALARMS["CloudWatch<br/>Alarms"]
        SNS["SNS Topics"]
        PD["PagerDuty"]
        SLACK["Slack"]
    end

    Sources --> Collection
    Collection --> Storage
    Storage --> Visualization
    Storage --> Alerting
    CW_ALARMS --> SNS
    SNS --> PD
    SNS --> SLACK
```

### 7.2 Key Metrics & SLIs

```yaml
# Service Level Indicators (SLIs)
slis:
  availability:
    name: "API Availability"
    description: "Percentage of successful API requests"
    metric: |
      sum(rate(http_requests_total{status!~"5.."}[5m])) /
      sum(rate(http_requests_total[5m])) * 100
    target: 99.9%
    
  latency_p50:
    name: "API Latency (P50)"
    description: "50th percentile response time"
    metric: |
      histogram_quantile(0.50, 
        rate(http_request_duration_seconds_bucket[5m]))
    target: 200ms
    
  latency_p99:
    name: "API Latency (P99)"
    description: "99th percentile response time"
    metric: |
      histogram_quantile(0.99,
        rate(http_request_duration_seconds_bucket[5m]))
    target: 2000ms
    
  data_freshness:
    name: "Real-time Data Freshness"
    description: "Lag between event timestamp and dashboard availability"
    metric: |
      max(event_processing_lag_seconds)
    target: 30s
    
  error_rate:
    name: "Error Rate"
    description: "Percentage of requests resulting in errors"
    metric: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) /
      sum(rate(http_requests_total[5m])) * 100
    target: 0.1%

# Service Level Objectives (SLOs)
slos:
  - name: "Dashboard Availability"
    sli: availability
    target: 99.9%
    window: 30 days
    error_budget: 43.2 minutes
    
  - name: "API Response Time"
    sli: latency_p99
    target: 99%
    window: 30 days
    
  - name: "Data Pipeline Freshness"
    sli: data_freshness
    target: 99.5%
    window: 7 days
```

### 7.3 Dashboard Specifications

```yaml
# Grafana dashboard definitions
dashboards:
  system_overview:
    title: "System Overview"
    refresh: 30s
    panels:
      - title: "Request Rate"
        type: timeseries
        query: sum(rate(http_requests_total[1m])) by (service)
        
      - title: "Error Rate"
        type: gauge
        query: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
        thresholds: [0.1, 1, 5]
        
      - title: "P99 Latency"
        type: timeseries
        query: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
        
      - title: "Active Connections"
        type: stat
        query: sum(websocket_connections_active)
        
  data_pipeline:
    title: "Data Pipeline Health"
    refresh: 10s
    panels:
      - title: "Kinesis Incoming Records"
        query: sum(aws_kinesis_incoming_records_sum)
        
      - title: "Processing Lag"
        query: max(flink_job_latency_seconds)
        
      - title: "ClickHouse Insert Rate"
        query: sum(rate(clickhouse_insert_rows[1m]))
        
      - title: "Redis Memory Usage"
        query: redis_memory_used_bytes / redis_memory_max_bytes * 100
        
  tenant_health:
    title: "Per-Tenant Metrics"
    variables:
      - name: org_id
        type: query
        query: label_values(http_requests_total, org_id)
    panels:
      - title: "Tenant Request Rate"
        query: sum(rate(http_requests_total{org_id="$org_id"}[1m]))
        
      - title: "Tenant Error Rate"
        query: sum(rate(http_requests_total{org_id="$org_id", status=~"5.."}[5m])) / sum(rate(http_requests_total{org_id="$org_id"}[5m])) * 100
```

### 7.4 Alerting Rules

```yaml
# CloudWatch Alarms / Grafana Alert Rules
alerts:
  critical:
    - name: "High Error Rate"
      condition: error_rate > 5%
      duration: 5m
      severity: critical
      notification: pagerduty
      runbook: "https://wiki.internal/runbooks/high-error-rate"
      
    - name: "API Unavailable"
      condition: availability < 99%
      duration: 2m
      severity: critical
      notification: pagerduty
      
    - name: "Data Pipeline Stalled"
      condition: processing_lag > 300s
      duration: 5m
      severity: critical
      notification: pagerduty
      
  warning:
    - name: "Elevated Latency"
      condition: latency_p99 > 1000ms
      duration: 10m
      severity: warning
      notification: slack
      
    - name: "High Memory Usage"
      condition: memory_utilization > 85%
      duration: 15m
      severity: warning
      notification: slack
      
    - name: "Approaching Rate Limit"
      condition: rate_limit_usage > 80%
      duration: 5m
      severity: warning
      notification: slack
      
  info:
    - name: "New Tenant Onboarded"
      condition: new_tenant_created
      severity: info
      notification: slack
      
    - name: "Unusual Traffic Pattern"
      condition: anomaly_score > 0.8
      severity: info
      notification: slack
```

### 7.5 Distributed Tracing

```typescript
// lib/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function initTracing(serviceName: string) {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
    }),
    idGenerator: new AWSXRayIdGenerator(),
  });

  // Register AWS X-Ray propagator for distributed tracing
  provider.register({
    propagator: new AWSXRayPropagator(),
  });

  return provider.getTracer(serviceName);
}

// Usage in API routes
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('query-service');

async function handleMetricsQuery(req: Request) {
  return tracer.startActiveSpan('metrics.query', async (span) => {
    try {
      span.setAttribute('org_id', req.orgId);
      span.setAttribute('query_type', req.queryType);
      
      // Query ClickHouse
      const result = await tracer.startActiveSpan('clickhouse.query', async (dbSpan) => {
        dbSpan.setAttribute('db.system', 'clickhouse');
        dbSpan.setAttribute('db.statement', req.query);
        
        const data = await clickhouse.query(req.query);
        
        dbSpan.setAttribute('db.rows_returned', data.length);
        dbSpan.end();
        return data;
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
      
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 8. Deployment Architecture

### 8.1 Infrastructure as Code Structure

```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   ├── staging/
│   │   └── prod/
│   ├── modules/
│   │   ├── networking/
│   │   │   ├── vpc.tf
│   │   │   ├── subnets.tf
│   │   │   └── security_groups.tf
│   │   ├── compute/
│   │   │   ├── lambda.tf
│   │   │   ├── ecs.tf
│   │   │   └── api_gateway.tf
│   │   ├── data/
│   │   │   ├── aurora.tf
│   │   │   ├── clickhouse.tf
│   │   │   ├── redis.tf
│   │   │   └── kinesis.tf
│   │   ├── security/
│   │   │   ├── cognito.tf
│   │   │   ├── kms.tf
│   │   │   └── waf.tf
│   │   └── observability/
│   │       ├── cloudwatch.tf
│   │       └── xray.tf
│   └── global/
│       ├── route53.tf
│       ├── cloudfront.tf
│       └── s3.tf
├── kubernetes/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── prod/
└── docker/
    ├── query-service/
    │   └── Dockerfile
    ├── export-service/
    │   └── Dockerfile
    └── flink-jobs/
        └── Dockerfile
```

### 8.2 Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Global["Global Resources"]
        R53["Route 53<br/>Global DNS"]
        CF["CloudFront<br/>Global CDN"]
        S3_STATIC["S3<br/>Static Assets"]
    end
    
    subgraph US["US Region (us-east-1) - Primary"]
        subgraph US_Public["Public Subnet"]
            US_ALB["ALB"]
            US_NAT["NAT Gateway"]
        end
        
        subgraph US_Private["Private Subnet"]
            US_LAMBDA["Lambda<br/>Functions"]
            US_ECS["ECS<br/>Services"]
        end
        
        subgraph US_Data["Data Subnet"]
            US_AURORA["Aurora<br/>Primary"]
            US_CH["ClickHouse<br/>Cluster"]
            US_REDIS["Redis<br/>Cluster"]
        end
        
        US_KINESIS["Kinesis<br/>Streams"]
    end
    
    subgraph EU["EU Region (eu-west-1) - Secondary"]
        subgraph EU_Public["Public Subnet"]
            EU_ALB["ALB"]
            EU_NAT["NAT Gateway"]
        end
        
        subgraph EU_Private["Private Subnet"]
            EU_LAMBDA["Lambda<br/>Functions"]
            EU_ECS["ECS<br/>Services"]
        end
        
        subgraph EU_Data["Data Subnet"]
            EU_AURORA["Aurora<br/>Read Replica"]
            EU_CH["ClickHouse<br/>Cluster"]
            EU_REDIS["Redis<br/>Cluster"]
        end
        
        EU_KINESIS["Kinesis<br/>Streams"]
    end

    R53 --> CF
    CF --> US_ALB
    CF --> EU_ALB
    
    US_ALB --> US_LAMBDA
    EU_ALB --> EU_LAMBDA
    
    US_AURORA <-.->|"Global DB<br/>Replication"| EU_AURORA
```

### 8.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Analytics Platform

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run linting
        run: pnpm lint
        
      - name: Run type checking
        run: pnpm type-check
        
      - name: Run unit tests
        run: pnpm test:unit --coverage
        
      - name: Run integration tests
        run: pnpm test:integration
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.build.outputs.image_tag }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
        
      - name: Build and push Docker images
        id: build
        run: |
          IMAGE_TAG="${GITHUB_SHA::8}"
          
          # Build query service
          docker build -t $ECR_REGISTRY/query-service:$IMAGE_TAG \
            -f docker/query-service/Dockerfile .
          docker push $ECR_REGISTRY/query-service:$IMAGE_TAG
          
          # Build export service
          docker build -t $ECR_REGISTRY/export-service:$IMAGE_TAG \
            -f docker/export-service/Dockerfile .
          docker push $ECR_REGISTRY/export-service:$IMAGE_TAG
          
          echo "image_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to staging
        run: |
          # Update Lambda functions
          aws lambda update-function-code \
            --function-name analytics-api-staging \
            --image-uri $ECR_REGISTRY/api-lambda:${{ needs.build.outputs.image_tag }}
            
          # Update ECS services
          aws ecs update-service \
            --cluster analytics-staging \
            --service query-service \
            --force-new-deployment
            
      - name: Run smoke tests
        run: pnpm test:smoke --env=staging

  deploy-production:
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Blue-Green deployment
        run: |
          # Deploy to green environment
          ./scripts/deploy-green.sh ${{ needs.build.outputs.image_tag }}
          
          # Run health checks
          ./scripts/health-check.sh green
          
          # Switch traffic (Route 53 weighted routing)
          ./scripts/switch-traffic.sh green
          
          # Monitor for 10 minutes
          ./scripts/monitor-deployment.sh 600
          
      - name: Rollback on failure
        if: failure()
        run: ./scripts/rollback.sh
```

### 8.4 Environment Configuration

```yaml
# config/environments.yaml
environments:
  development:
    aws_region: us-east-1
    domain: dev.analytics.example.com
    
    scaling:
      lambda_concurrency: 10
      ecs_min_tasks: 1
      kinesis_shards: 2
      clickhouse_nodes: 1
      
    features:
      debug_logging: true
      mock_integrations: true
      seed_data: true
      
  staging:
    aws_region: us-east-1
    domain: staging.analytics.example.com
    
    scaling:
      lambda_concurrency: 50
      ecs_min_tasks: 2
      kinesis_shards: 4
      clickhouse_nodes: 2
      
    features:
      debug_logging: true
      mock_integrations: false
      load_testing: true
      
  production:
    aws_regions:
      - us-east-1  # Primary
      - eu-west-1  # Secondary
    domain: analytics.example.com
    
    scaling:
      lambda_concurrency: 1000
      ecs_min_tasks: 4
      ecs_max_tasks: 20
      kinesis_shards: 50
      clickhouse_nodes: 6
      redis_nodes: 6
      
    features:
      debug_logging: false
      high_availability: true
      multi_region: true
      disaster_recovery: true
```

---

## 9. Cost Estimation

### 9.1 Assumptions

| Parameter | Value |
|-----------|-------|
| Organizations | 100 |
| Events per org per day | 864M (10K/sec peak, avg 50%) |
| Total events per month | ~1.3T |
| Event size (avg) | 2 KB |
| Concurrent dashboard users | 1,000 |
| Data retention (detailed) | 13 months |
| Data retention (aggregated) | 3 years |

### 9.2 Monthly Cost Breakdown (Production)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **Compute** | | |
| Lambda | 50M invocations, 512MB, 200ms avg | $1,500 |
| ECS Fargate | 20 tasks × 2vCPU/4GB | $2,400 |
| | | |
| **Data Streaming** | | |
| Kinesis Data Streams | 50 shards × 2 regions | $3,600 |
| Managed Flink | 8 KPU × 2 regions | $2,300 |
| | | |
| **Databases** | | |
| Aurora PostgreSQL | db.r6g.xlarge + 2 readers, Global | $2,800 |
| ClickHouse Cloud | 3 nodes × 8vCPU/32GB, 10TB storage | $6,500 |
| ElastiCache Redis | cache.r6g.xlarge cluster (6 nodes) | $2,200 |
| | | |
| **Storage** | | |
| S3 (archives) | 50TB + requests | $1,200 |
| | | |
| **Networking** | | |
| CloudFront | 10TB transfer | $850 |
| NAT Gateway | 2 regions | $900 |
| Data transfer | Inter-region + internet | $1,500 |
| | | |
| **Security & Management** | | |
| Cognito | 100K MAU | $500 |
| KMS | Key usage | $100 |
| Secrets Manager | 50 secrets | $40 |
| WAF | 10M requests | $300 |
| | | |
| **Observability** | | |
| CloudWatch | Logs + metrics | $800 |
| X-Ray | Traces | $200 |
| Grafana Cloud | Pro plan | $300 |
| | | |
| **Total** | | **~$28,000/mo** |

### 9.3 Cost Optimization Strategies

| Strategy | Potential Savings | Implementation |
|----------|-------------------|----------------|
| Reserved Capacity | 30-40% on Aurora, Redis | 1-year commitment after stable usage |
| Spot Instances | 60-70% on Flink workers | Use Spot for batch processing |
| S3 Intelligent Tiering | 20-30% on storage | Enable for archives |
| ClickHouse Compression | 10-15x storage reduction | Already included in estimates |
| Lambda ARM64 | 20% cost reduction | Use Graviton2 |
| Right-sizing | 10-20% | Monitor and adjust after 3 months |

### 9.4 Cost per Tenant

At 100 tenants: **~$280/tenant/month** infrastructure cost

Pricing model recommendation:
- **Starter**: $500/mo (up to 1M events/day)
- **Professional**: $2,000/mo (up to 10M events/day)
- **Enterprise**: Custom (unlimited + SLA)

---

## 10. Implementation Roadmap

### 10.1 Phase 1: Foundation (Weeks 1-4)

```mermaid
gantt
    title Phase 1: Foundation
    dateFormat  YYYY-MM-DD
    section Infrastructure
    VPC & Networking           :a1, 2025-01-06, 5d
    Aurora PostgreSQL Setup    :a2, after a1, 3d
    Redis Cluster Setup        :a3, after a1, 3d
    Kinesis Streams            :a4, after a2, 2d
    
    section Core Services
    Auth Service (Cognito)     :b1, 2025-01-06, 7d
    API Gateway Setup          :b2, after b1, 3d
    Event Ingestion Lambda     :b3, after a4, 5d
    
    section CI/CD
    GitHub Actions Pipeline    :c1, 2025-01-06, 3d
    Terraform Modules          :c2, after c1, 5d
    Dev Environment            :c3, after c2, 2d
```

**Deliverables:**
- [ ] Multi-region VPC with private subnets
- [ ] Aurora PostgreSQL with RLS enabled
- [ ] Redis cluster for caching
- [ ] Kinesis streams (single region)
- [ ] Cognito user pool with MFA
- [ ] Basic event ingestion endpoint
- [ ] CI/CD pipeline for dev environment

### 10.2 Phase 2: Data Pipeline (Weeks 5-8)

```mermaid
gantt
    title Phase 2: Data Pipeline
    dateFormat  YYYY-MM-DD
    section Real-Time
    Flink Real-Time Job        :a1, 2025-02-03, 7d
    Redis Pub/Sub Integration  :a2, after a1, 3d
    WebSocket Gateway          :a3, after a2, 5d
    
    section Analytics
    ClickHouse Cluster Setup   :b1, 2025-02-03, 5d
    Schema & Partitioning      :b2, after b1, 3d
    Query Service              :b3, after b2, 5d
    
    section Batch
    Step Functions Workflows   :c1, 2025-02-17, 5d
    Batch Aggregation Jobs     :c2, after c1, 5d
```

**Deliverables:**
- [ ] Real-time pipeline with <30s latency
- [ ] ClickHouse cluster with tenant partitioning
- [ ] Query service with caching
- [ ] Batch aggregation jobs (hourly, daily)
- [ ] WebSocket real-time updates

### 10.3 Phase 3: Dashboard MVP (Weeks 9-12)

```mermaid
gantt
    title Phase 3: Dashboard MVP
    dateFormat  YYYY-MM-DD
    section Frontend
    Next.js App Setup          :a1, 2025-03-03, 3d
    Auth Integration           :a2, after a1, 3d
    Dashboard Components       :a3, after a2, 7d
    Real-Time Widgets          :a4, after a3, 5d
    
    section API
    Metrics API                :b1, 2025-03-03, 5d
    Export API                 :b2, after b1, 3d
    Alerting API               :b3, after b2, 3d
    
    section Integration
    Vercel Deployment          :c1, 2025-03-24, 2d
    CloudFront CDN             :c2, after c1, 2d
```

**Deliverables:**
- [ ] Dashboard with 5 main views
- [ ] Real-time metrics updates
- [ ] Basic filtering (date, team)
- [ ] CSV export functionality
- [ ] Production deployment (US region)

### 10.4 Phase 4: Multi-Region & Scale (Weeks 13-16)

**Deliverables:**
- [ ] EU region deployment
- [ ] Data residency controls
- [ ] Advanced alerting with PagerDuty/Slack
- [ ] SSO integration (SAML/OIDC)
- [ ] Load testing (100 orgs, 10K events/sec)
- [ ] Disaster recovery testing

### 10.5 Success Criteria

| Milestone | Criteria | Target Date |
|-----------|----------|-------------|
| **Alpha** | Single-tenant, US region, basic metrics | Week 8 |
| **Beta** | Multi-tenant, real-time dashboard | Week 12 |
| **GA** | Multi-region, all integrations, SLA | Week 16 |

---

## 11. Evolutionary Architecture Path

This section outlines how to start with a simple, cost-effective architecture and evolve toward the full target state as your user base and requirements grow.

### 11.1 Evolution Overview

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: MVP\n(Weeks 1-6)"]
        P1_SIMPLE["Simple Stack\nTimescaleDB + Lambda"]
    end
    
    subgraph Phase2["Phase 2: Scale\n(Months 2-4)"]
        P2_PERF["Performance Stack\n+ ClickHouse + Kinesis"]
    end
    
    subgraph Phase3["Phase 3: Enterprise\n(Months 5-8)"]
        P3_FULL["Full Stack\n+ Flink + Multi-Region"]
    end
    
    P1_SIMPLE -->|"10+ orgs\n1K events/sec"| P2_PERF
    P2_PERF -->|"50+ orgs\n10K events/sec"| P3_FULL
    
    style Phase1 fill:#e6ffe6
    style Phase2 fill:#fff3e6
    style Phase3 fill:#e6f3ff
```

### 11.2 Phase 1: PostgreSQL/TimescaleDB + Lambda (MVP)

**Target:** Launch in 4-6 weeks, support 1-10 organizations, <1K events/sec

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        DASH["Next.js Dashboard"]
        SDK["Agent SDK"]
    end
    
    subgraph API["API Layer"]
        APIGW["API Gateway"]
        LAMBDA_API["Lambda\n(API Handlers)"]
    end
    
    subgraph Processing["Processing"]
        SQS["SQS Queue\n(Buffer)"]
        LAMBDA_PROC["Lambda\n(Batch Processor)"]
    end
    
    subgraph Storage["Storage"]
        TIMESCALE["TimescaleDB\n(Single Instance)"]
        S3["S3\n(Raw Events)"]
    end
    
    subgraph Cache["Cache"]
        REDIS["ElastiCache Redis\n(Single Node)"]
    end

    SDK --> APIGW
    DASH --> APIGW
    APIGW --> LAMBDA_API
    LAMBDA_API --> SQS
    SQS --> LAMBDA_PROC
    LAMBDA_PROC --> TIMESCALE
    LAMBDA_PROC --> S3
    LAMBDA_API --> REDIS
    LAMBDA_API --> TIMESCALE
```

#### Phase 1 Technology Stack

| Component | Technology | Cost/Month | Rationale |
|-----------|------------|------------|-----------|
| Database | TimescaleDB on RDS | ~$200 | PostgreSQL-native, team familiarity, hypertables for time-series |
| Queue | SQS | ~$10 | Serverless, no ops, built-in retry |
| Processing | Lambda (scheduled) | ~$50 | 5-min batch jobs, simple to implement |
| Cache | ElastiCache Redis (t3.micro) | ~$25 | Session state, simple caching |
| API | API Gateway + Lambda | ~$100 | Serverless, auto-scaling |
| Frontend | Vercel | ~$20 | Zero-config Next.js hosting |
| **Total** | | **~$400/mo** | |

#### Phase 1 Data Flow

```sql
-- TimescaleDB schema (simple, effective)
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable (automatic partitioning by time)
SELECT create_hypertable('events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day');

-- Add compression policy (after 7 days)
ALTER TABLE events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id'
);
SELECT add_compression_policy('events', INTERVAL '7 days');

-- Continuous aggregate for dashboard (materialized, auto-refreshed)
CREATE MATERIALIZED VIEW hourly_metrics
WITH (timescaledb.continuous) AS
SELECT 
    org_id,
    time_bucket('1 hour', timestamp) AS hour,
    event_type,
    count(*) as event_count,
    count(DISTINCT user_id) as unique_users,
    count(DISTINCT session_id) as unique_sessions
FROM events
GROUP BY org_id, hour, event_type
WITH NO DATA;

-- Refresh policy (every 10 minutes)
SELECT add_continuous_aggregate_policy('hourly_metrics',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes');

-- Row-level security (same as full architecture)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON events
    USING (org_id = current_setting('app.current_org_id')::text);
```

#### Phase 1 Lambda Batch Processor

```typescript
// lambdas/batch-processor.ts
import { SQSHandler } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const handler: SQSHandler = async (event) => {
  const events = event.Records.map(record => JSON.parse(record.body));
  
  // Batch insert with deduplication
  const query = `
    INSERT INTO events (org_id, user_id, session_id, event_type, timestamp, metadata)
    SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[], $6::jsonb[])
    ON CONFLICT DO NOTHING
  `;
  
  await pool.query(query, [
    events.map(e => e.org_id),
    events.map(e => e.user_id),
    events.map(e => e.session_id),
    events.map(e => e.event_type),
    events.map(e => e.timestamp),
    events.map(e => JSON.stringify(e.metadata)),
  ]);
  
  // Update Redis cache for real-time dashboard
  await updateDashboardCache(events);
};
```

#### Phase 1 Limitations & Migration Triggers

| Limitation | Trigger to Migrate | Solution in Phase 2 |
|------------|-------------------|---------------------|
| Query latency >2s | Dashboard complaints | Add ClickHouse for analytics |
| Batch delay 5-10min | Real-time requirements | Add Kinesis streaming |
| Single region | EU customer requests | Add Aurora Global |
| 1K events/sec max | Approaching limit | Kinesis sharding |

### 11.3 Phase 2: Add ClickHouse + Kinesis (Scale)

**Target:** Support 10-50 organizations, 1K-10K events/sec, <60s data freshness

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        DASH["Next.js Dashboard"]
        SDK["Agent SDK"]
    end
    
    subgraph Ingestion["Real-Time Ingestion"]
        APIGW["API Gateway"]
        KINESIS["Kinesis Data Streams"]
        LAMBDA_STREAM["Lambda\n(Stream Processor)"]
    end
    
    subgraph Storage["Dual Storage"]
        TIMESCALE["TimescaleDB\n(Metadata + Config)"]
        CLICKHOUSE["ClickHouse Cloud\n(Analytics)"]
    end
    
    subgraph Cache["Cache"]
        REDIS["Redis Cluster"]
    end

    SDK --> APIGW
    DASH --> APIGW
    APIGW --> KINESIS
    KINESIS --> LAMBDA_STREAM
    LAMBDA_STREAM --> CLICKHOUSE
    LAMBDA_STREAM --> REDIS
    APIGW --> TIMESCALE
```

#### Phase 2 Migration Steps

1. **Deploy ClickHouse Cloud** (Day 1-2)
   ```sql
   -- ClickHouse schema (mirrors TimescaleDB)
   CREATE TABLE events (
       event_id UUID,
       org_id String,
       user_id String,
       session_id String,
       event_type LowCardinality(String),
       timestamp DateTime64(3),
       metadata String,
       _partition_date Date DEFAULT toDate(timestamp)
   )
   ENGINE = MergeTree()
   PARTITION BY (org_id, toYYYYMM(_partition_date))
   ORDER BY (org_id, event_type, timestamp);
   ```

2. **Add Kinesis Stream** (Day 3-4)
   ```yaml
   # terraform/kinesis.tf
   resource "aws_kinesis_stream" "events" {
     name             = "analytics-events"
     shard_count      = 4  # Start small, auto-scale later
     retention_period = 24
     encryption_type  = "KMS"
   }
   ```

3. **Dual-Write Period** (Week 1-2)
   - Write to both TimescaleDB and ClickHouse
   - Compare query results
   - Gradually shift dashboard queries to ClickHouse

4. **Cutover** (Week 3)
   - ClickHouse for all analytics queries
   - TimescaleDB for metadata only
   - Archive old TimescaleDB data to S3

#### Phase 2 Cost

| Component | Technology | Cost/Month |
|-----------|------------|------------|
| ClickHouse Cloud | Starter tier | ~$500 |
| Kinesis | 4 shards | ~$120 |
| Lambda (streaming) | Higher volume | ~$200 |
| TimescaleDB (smaller) | Metadata only | ~$100 |
| Redis Cluster | 3 nodes | ~$300 |
| **Total** | | **~$1,500/mo** |

### 11.4 Phase 3: Full Flink + Multi-Region (Enterprise)

**Target:** 50+ organizations, 10K+ events/sec, <30s freshness, GDPR compliance

This is the full architecture described in Sections 2-10. Key additions from Phase 2:

1. **Replace Lambda streaming with Managed Flink**
   - Complex event processing (CEP)
   - Exactly-once semantics
   - Windowed aggregations

2. **Multi-Region Deployment**
   - Aurora Global Database
   - Per-region Kinesis streams
   - ClickHouse cluster per region
   - Geo-routing at CloudFront

3. **Advanced Features**
   - Anomaly detection
   - Predictive alerting
   - Custom metrics engine

### 11.5 Evolution Decision Matrix

| Metric | Phase 1 → 2 Trigger | Phase 2 → 3 Trigger |
|--------|---------------------|---------------------|
| Organizations | >10 active | >50 active |
| Events/sec | >1,000 sustained | >10,000 sustained |
| Query latency | P99 >2s | P99 >500ms |
| Data freshness | Need <5min | Need <30s |
| Revenue | >$10K MRR | >$50K MRR |
| Compliance | — | GDPR/SOC2 required |
| Team size | >3 engineers | >6 engineers |

---

## 12. Simplified 4-Week Architecture

For teams that need to launch immediately, here's the absolute minimum viable architecture.

### 12.1 Architecture Overview

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Vercel)"]
        NEXT["Next.js 14\nApp Router"]
    end
    
    subgraph Backend["Backend (Serverless)"]
        APIGW["API Gateway"]
        LAMBDA["Lambda Functions"]
    end
    
    subgraph Data["Data Layer"]
        SUPABASE["Supabase\n(PostgreSQL + Auth + Realtime)"]
    end

    NEXT <--> APIGW
    APIGW <--> LAMBDA
    LAMBDA <--> SUPABASE
    SUPABASE -.->|"Realtime\nSubscriptions"| NEXT

    style Frontend fill:#e6ffe6
    style Backend fill:#fff3e6
    style Data fill:#e6f3ff
```

### 12.2 Why Supabase for 4-Week MVP?

| Feature | Supabase Provides | Alternative Would Require |
|---------|-------------------|---------------------------|
| PostgreSQL | Managed, auto-backups | RDS setup, maintenance |
| Authentication | Built-in, social providers | Cognito configuration |
| Row-Level Security | Native PostgreSQL RLS | Manual implementation |
| Real-time | WebSocket subscriptions | Custom WebSocket server |
| API | Auto-generated REST/GraphQL | Lambda development |
| Dashboard | Built-in SQL editor | Custom admin panel |

### 12.3 4-Week Sprint Plan

```
Week 1: Foundation
├── Day 1-2: Supabase project setup, schema design
├── Day 3-4: Next.js app with Supabase auth
└── Day 5: Basic event ingestion endpoint

Week 2: Core Features
├── Day 1-2: Dashboard layout, chart components
├── Day 3-4: Real-time subscriptions
└── Day 5: Basic filtering (date range, org)

Week 3: Analytics
├── Day 1-2: Aggregation views (PostgreSQL)
├── Day 3-4: Key metrics (DAU, sessions, errors)
└── Day 5: Export to CSV

Week 4: Polish & Deploy
├── Day 1-2: Multi-tenant isolation testing
├── Day 3: Performance optimization
├── Day 4: Production deployment
└── Day 5: Documentation, handoff
```

### 12.4 Supabase Schema

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with org membership
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES organizations(id),
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (partitioned by month using inheritance)
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Row-level security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their org's events"
    ON events FOR SELECT
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Real-time aggregation view
CREATE OR REPLACE VIEW realtime_metrics AS
SELECT 
    org_id,
    date_trunc('hour', timestamp) as hour,
    count(*) as event_count,
    count(DISTINCT user_id) as unique_users,
    count(DISTINCT session_id) as sessions,
    count(*) FILTER (WHERE event_type = 'error') as error_count
FROM events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY org_id, date_trunc('hour', timestamp);

-- Enable real-time for events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;
```

### 12.5 Next.js Real-time Dashboard Component

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LineChart } from '@/components/charts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const supabase = createClient();
  
  useEffect(() => {
    // Initial fetch
    fetchMetrics();
    
    // Real-time subscription
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          // Update metrics on new event
          updateMetricsFromEvent(payload.new);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  async function fetchMetrics() {
    const { data } = await supabase
      .from('realtime_metrics')
      .select('*')
      .order('hour', { ascending: false })
      .limit(24);
    
    setMetrics(data || []);
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard title="Events (24h)" value={totalEvents} />
        <MetricCard title="Active Users" value={uniqueUsers} />
        <MetricCard title="Error Rate" value={`${errorRate}%`} />
      </div>
      <LineChart data={metrics} />
    </div>
  );
}
```

### 12.6 4-Week Architecture Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single database | <1K events/sec | Batch inserts, connection pooling |
| No dedicated cache | Higher latency | PostgreSQL materialized views |
| Single region | No GDPR compliance | Document as limitation |
| Supabase real-time limits | 100 concurrent connections | Upgrade plan or batch updates |
| No stream processing | 1-5 min data freshness | Acceptable for MVP |

### 12.7 Cost Comparison

| Architecture | Monthly Cost | Time to Launch | Max Scale |
|--------------|--------------|----------------|-----------|
| 4-Week (Supabase) | ~$50-100 | 4 weeks | 10 orgs, 500 events/sec |
| Phase 1 (TimescaleDB) | ~$400 | 6 weeks | 10 orgs, 1K events/sec |
| Phase 2 (ClickHouse) | ~$1,500 | 10 weeks | 50 orgs, 10K events/sec |
| Full Architecture | ~$28,000 | 16 weeks | 100+ orgs, unlimited |

---

## 13. Real-Time Communication Architecture

### 13.1 Technology Options Comparison

| Approach | Latency | Complexity | Cost | Best For |
|----------|---------|------------|------|----------|
| API Gateway WebSocket | <100ms | Medium | Pay-per-message | Bidirectional, auth-integrated |
| SSE (Server-Sent Events) | <100ms | Low | Standard request cost | Unidirectional, simple |
| AppSync Subscriptions | <100ms | Low | Higher per-message | GraphQL APIs |
| Direct WebSocket (EC2/ECS) | <50ms | High | Fixed compute | Maximum control |

**Recommendation:** API Gateway WebSocket for MVP, migrate to dedicated WebSocket service if cost becomes an issue at scale.

### 13.2 API Gateway WebSocket Architecture

```mermaid
flowchart TB
    subgraph Clients["Dashboard Clients"]
        C1["User A\nBrowser"]
        C2["User B\nBrowser"]
        C3["User C\nBrowser"]
    end
    
    subgraph APIGW["API Gateway WebSocket"]
        WS["WebSocket API\n$connect, $disconnect\n$default, sendMetrics"]
    end
    
    subgraph Lambdas["Lambda Functions"]
        CONNECT["onConnect\n(Auth + Store)"]
        DISCONNECT["onDisconnect\n(Cleanup)"]
        BROADCAST["broadcast\n(Fan-out)"]
    end
    
    subgraph Storage["Connection Storage"]
        DYNAMO["DynamoDB\nConnections Table"]
    end
    
    subgraph DataPipeline["Data Pipeline"]
        REDIS["Redis Pub/Sub"]
        PROCESSOR["Event Processor"]
    end

    C1 & C2 & C3 <-->|"WSS"| WS
    WS -->|"$connect"| CONNECT
    WS -->|"$disconnect"| DISCONNECT
    CONNECT & DISCONNECT --> DYNAMO
    
    PROCESSOR --> REDIS
    REDIS -->|"Subscribe"| BROADCAST
    BROADCAST --> DYNAMO
    DYNAMO -->|"Get connections\nby org_id"| BROADCAST
    BROADCAST -->|"@connections API"| WS
```

### 13.3 WebSocket Implementation

#### 13.3.1 Connection Handler

```typescript
// lambdas/websocket/connect.ts
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { verifyJWT } from './auth';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;
  
  try {
    // Verify JWT and extract org_id
    const payload = await verifyJWT(token);
    const { org_id, user_id, roles } = payload;
    
    // Store connection with TTL (24 hours)
    await ddb.send(new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: {
        connectionId,
        org_id,
        user_id,
        roles,
        connectedAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 86400,
      },
    }));
    
    // Add to org-specific index for efficient fan-out
    await ddb.send(new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: {
        pk: `ORG#${org_id}`,
        sk: `CONN#${connectionId}`,
        connectionId,
        ttl: Math.floor(Date.now() / 1000) + 86400,
      },
    }));
    
    return { statusCode: 200, body: 'Connected' };
    
  } catch (error) {
    console.error('Connection failed:', error);
    return { statusCode: 401, body: 'Unauthorized' };
  }
};
```

#### 13.3.2 Broadcast Handler (Fan-out)

```typescript
// lambdas/websocket/broadcast.ts
import { 
  ApiGatewayManagementApiClient, 
  PostToConnectionCommand,
  GoneException 
} from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface MetricUpdate {
  org_id: string;
  metric: string;
  value: number;
  timestamp: string;
}

export async function broadcastToOrg(
  update: MetricUpdate,
  endpoint: string
): Promise<void> {
  const apigw = new ApiGatewayManagementApiClient({ endpoint });
  
  // Get all connections for this org
  const { Items: connections } = await ddb.send(new QueryCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `ORG#${update.org_id}`,
    },
  }));
  
  const message = JSON.stringify({
    type: 'METRIC_UPDATE',
    payload: update,
  });
  
  // Fan-out to all org connections (parallel)
  const sendPromises = (connections || []).map(async (conn) => {
    try {
      await apigw.send(new PostToConnectionCommand({
        ConnectionId: conn.connectionId,
        Data: Buffer.from(message),
      }));
    } catch (error) {
      if (error instanceof GoneException) {
        // Connection is stale, clean up
        await ddb.send(new DeleteCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          Key: { pk: `ORG#${update.org_id}`, sk: `CONN#${conn.connectionId}` },
        }));
      }
    }
  });
  
  await Promise.all(sendPromises);
}
```

#### 13.3.3 Redis Pub/Sub Integration

```typescript
// lambdas/stream-processor/index.ts
import Redis from 'ioredis';
import { broadcastToOrg } from '../websocket/broadcast';

const redis = new Redis(process.env.REDIS_URL);
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT;

// Subscribe to metric updates from Flink/Lambda processors
redis.subscribe('metrics:updates', (err) => {
  if (err) console.error('Redis subscription failed:', err);
});

redis.on('message', async (channel, message) => {
  if (channel === 'metrics:updates') {
    const update = JSON.parse(message);
    
    // Broadcast to all connected clients for this org
    await broadcastToOrg(update, WEBSOCKET_ENDPOINT);
  }
});

// Called by Flink/Lambda after aggregating metrics
export async function publishMetricUpdate(update: MetricUpdate): Promise<void> {
  await redis.publish('metrics:updates', JSON.stringify(update));
  
  // Also store in sorted set for recent history
  await redis.zadd(
    `metrics:${update.org_id}:${update.metric}`,
    Date.now(),
    JSON.stringify(update)
  );
  
  // Trim to last 1000 data points
  await redis.zremrangebyrank(`metrics:${update.org_id}:${update.metric}`, 0, -1001);
}
```

### 13.4 Client-Side WebSocket Integration

```typescript
// lib/websocket.ts
import { useEffect, useRef, useCallback } from 'react';

interface WebSocketOptions {
  url: string;
  token: string;
  onMessage: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket({ url, token, onMessage, onConnect, onDisconnect }: WebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  
  const connect = useCallback(() => {
    // Add token as query param for auth
    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      onConnect?.();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      onDisconnect?.();
      
      // Exponential backoff reconnection
      if (reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  }, [url, token, onMessage, onConnect, onDisconnect]);
  
  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
  
  // Send message to server (if needed)
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);
  
  return { send };
}

// Usage in dashboard component
function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricUpdate[]>([]);
  
  const handleMessage = useCallback((data: any) => {
    if (data.type === 'METRIC_UPDATE') {
      setMetrics(prev => [...prev.slice(-99), data.payload]);
    }
  }, []);
  
  useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL!,
    token: session.accessToken,
    onMessage: handleMessage,
  });
  
  return <MetricsChart data={metrics} />;
}
```

### 13.5 SSE Alternative (Simpler)

If WebSocket complexity is too high for MVP, use Server-Sent Events:

```typescript
// app/api/events/stream/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { org_id } = await verifyJWT(token);
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Redis pub/sub
      const redis = new Redis(process.env.REDIS_URL);
      await redis.subscribe(`metrics:${org_id}`);
      
      redis.on('message', (channel, message) => {
        const data = `data: ${message}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      
      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        redis.quit();
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client-side SSE
function useSSE(url: string, onMessage: (data: any) => void) {
  useEffect(() => {
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };
    
    return () => eventSource.close();
  }, [url, onMessage]);
}
```

### 13.6 WebSocket Cost Estimation

| Metric | Value | Cost |
|--------|-------|------|
| Connections | 1,000 concurrent | $0.25/million connection-minutes |
| Messages | 10M/month | $1.00/million messages |
| Data transfer | 100 GB/month | $0.09/GB |
| **Estimated** | | **~$50-100/month** |

---

## 14. Testing Strategy for Data Pipeline

### 14.1 Testing Pyramid

```mermaid
flowchart TB
    subgraph E2E["End-to-End Tests (5%)"]
        E2E_FRESH["Data Freshness"]
        E2E_FLOW["Full Flow Tests"]
    end
    
    subgraph Integration["Integration Tests (25%)"]
        INT_KINESIS["Kinesis → ClickHouse"]
        INT_TENANT["Multi-Tenant Isolation"]
        INT_CACHE["Cache Consistency"]
    end
    
    subgraph Unit["Unit Tests (70%)"]
        UNIT_TRANSFORM["Transformations"]
        UNIT_DEDUP["Deduplication"]
        UNIT_VALIDATE["Validation"]
    end
    
    E2E --> Integration --> Unit
```

### 14.2 Event Ordering & Deduplication Testing

#### 14.2.1 Unit Tests for Deduplication Logic

```typescript
// tests/unit/deduplication.test.ts
import { deduplicateEvents, EventDeduplicator } from '@/lib/deduplication';

describe('Event Deduplication', () => {
  describe('deduplicateEvents', () => {
    it('should remove exact duplicates by event_id', () => {
      const events = [
        { event_id: 'a', timestamp: '2025-01-01T00:00:00Z', data: 'first' },
        { event_id: 'a', timestamp: '2025-01-01T00:00:00Z', data: 'duplicate' },
        { event_id: 'b', timestamp: '2025-01-01T00:00:01Z', data: 'second' },
      ];
      
      const result = deduplicateEvents(events);
      
      expect(result).toHaveLength(2);
      expect(result.map(e => e.event_id)).toEqual(['a', 'b']);
      expect(result[0].data).toBe('first'); // Keep first occurrence
    });
    
    it('should handle events with same timestamp but different IDs', () => {
      const events = [
        { event_id: 'a', timestamp: '2025-01-01T00:00:00Z' },
        { event_id: 'b', timestamp: '2025-01-01T00:00:00Z' },
      ];
      
      const result = deduplicateEvents(events);
      
      expect(result).toHaveLength(2);
    });
    
    it('should maintain event order after deduplication', () => {
      const events = [
        { event_id: 'c', timestamp: '2025-01-01T00:00:02Z' },
        { event_id: 'a', timestamp: '2025-01-01T00:00:00Z' },
        { event_id: 'b', timestamp: '2025-01-01T00:00:01Z' },
        { event_id: 'a', timestamp: '2025-01-01T00:00:00Z' }, // duplicate
      ];
      
      const result = deduplicateEvents(events, { sortByTimestamp: true });
      
      expect(result.map(e => e.event_id)).toEqual(['a', 'b', 'c']);
    });
  });
  
  describe('EventDeduplicator (Stateful)', () => {
    let deduplicator: EventDeduplicator;
    
    beforeEach(() => {
      deduplicator = new EventDeduplicator({
        windowSize: 10000, // 10 second window
        maxIds: 1000,
      });
    });
    
    it('should deduplicate across multiple batches', () => {
      const batch1 = [{ event_id: 'a' }, { event_id: 'b' }];
      const batch2 = [{ event_id: 'a' }, { event_id: 'c' }]; // 'a' is duplicate
      
      const result1 = deduplicator.process(batch1);
      const result2 = deduplicator.process(batch2);
      
      expect(result1.map(e => e.event_id)).toEqual(['a', 'b']);
      expect(result2.map(e => e.event_id)).toEqual(['c']); // 'a' filtered out
    });
    
    it('should allow same event_id after window expires', async () => {
      const deduplicator = new EventDeduplicator({ windowSize: 100 }); // 100ms window
      
      const result1 = deduplicator.process([{ event_id: 'a' }]);
      expect(result1).toHaveLength(1);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result2 = deduplicator.process([{ event_id: 'a' }]);
      expect(result2).toHaveLength(1); // Allowed after window
    });
  });
});
```

#### 14.2.2 Event Ordering Integration Tests

```typescript
// tests/integration/event-ordering.test.ts
import { KinesisClient, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { ClickHouseClient } from '@clickhouse/client';

describe('Event Ordering (Integration)', () => {
  let kinesis: KinesisClient;
  let clickhouse: ClickHouseClient;
  const testOrgId = `test-org-${Date.now()}`;
  
  beforeAll(async () => {
    kinesis = new KinesisClient({ region: 'us-east-1' });
    clickhouse = createClient({ url: process.env.CLICKHOUSE_URL });
  });
  
  afterAll(async () => {
    // Cleanup test data
    await clickhouse.command({
      query: `ALTER TABLE events DELETE WHERE org_id = '${testOrgId}'`
    });
  });
  
  it('should maintain event order within same partition key', async () => {
    const sessionId = `session-${Date.now()}`;
    const events = Array.from({ length: 100 }, (_, i) => ({
      event_id: `event-${i}`,
      org_id: testOrgId,
      session_id: sessionId,
      timestamp: new Date(Date.now() + i * 100).toISOString(),
      sequence: i,
    }));
    
    // Send to Kinesis with same partition key (session_id)
    await kinesis.send(new PutRecordsCommand({
      StreamName: 'analytics-events-test',
      Records: events.map(e => ({
        Data: Buffer.from(JSON.stringify(e)),
        PartitionKey: sessionId, // Same partition = ordered
      })),
    }));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Query ClickHouse
    const result = await clickhouse.query({
      query: `
        SELECT event_id, sequence
        FROM events
        WHERE org_id = '${testOrgId}' AND session_id = '${sessionId}'
        ORDER BY timestamp
      `,
    });
    
    const rows = await result.json();
    
    // Verify order is maintained
    for (let i = 0; i < rows.data.length - 1; i++) {
      expect(rows.data[i].sequence).toBeLessThan(rows.data[i + 1].sequence);
    }
  });
  
  it('should handle out-of-order events from different partitions', async () => {
    // Events with different session_ids may arrive out of order
    const events = [
      { event_id: 'e1', session_id: 's1', timestamp: '2025-01-01T00:00:00Z' },
      { event_id: 'e3', session_id: 's2', timestamp: '2025-01-01T00:00:02Z' },
      { event_id: 'e2', session_id: 's1', timestamp: '2025-01-01T00:00:01Z' },
    ];
    
    // Each event goes to its session's partition
    await kinesis.send(new PutRecordsCommand({
      StreamName: 'analytics-events-test',
      Records: events.map(e => ({
        Data: Buffer.from(JSON.stringify({ ...e, org_id: testOrgId })),
        PartitionKey: e.session_id,
      })),
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Query should still work with ORDER BY timestamp
    const result = await clickhouse.query({
      query: `
        SELECT event_id FROM events
        WHERE org_id = '${testOrgId}'
        ORDER BY timestamp
      `,
    });
    
    const rows = await result.json();
    expect(rows.data.map(r => r.event_id)).toEqual(['e1', 'e2', 'e3']);
  });
});
```

### 14.3 Multi-Tenant Data Isolation Testing

```typescript
// tests/integration/tenant-isolation.test.ts
describe('Multi-Tenant Isolation', () => {
  const tenants = ['tenant-a', 'tenant-b', 'tenant-c'];
  
  beforeAll(async () => {
    // Insert test data for each tenant
    for (const orgId of tenants) {
      await insertTestEvents(orgId, 100);
    }
  });
  
  describe('ClickHouse Query Isolation', () => {
    it('should only return data for specified org_id', async () => {
      for (const orgId of tenants) {
        const result = await clickhouse.query({
          query: `SELECT DISTINCT org_id FROM events WHERE org_id = {org_id:String}`,
          query_params: { org_id: orgId },
        });
        
        const rows = await result.json();
        expect(rows.data).toHaveLength(1);
        expect(rows.data[0].org_id).toBe(orgId);
      }
    });
    
    it('should not leak data across tenants', async () => {
      const result = await clickhouse.query({
        query: `
          SELECT org_id, count(*) as cnt
          FROM events
          WHERE org_id = {org_id:String}
          GROUP BY org_id
        `,
        query_params: { org_id: 'tenant-a' },
      });
      
      const rows = await result.json();
      expect(rows.data).toHaveLength(1);
      expect(rows.data[0].org_id).toBe('tenant-a');
    });
    
    it('should prevent SQL injection attempts', async () => {
      const maliciousOrgId = "tenant-a' OR '1'='1";
      
      const result = await clickhouse.query({
        query: `SELECT count(*) as cnt FROM events WHERE org_id = {org_id:String}`,
        query_params: { org_id: maliciousOrgId },
      });
      
      const rows = await result.json();
      expect(rows.data[0].cnt).toBe('0'); // No results, injection failed
    });
  });
  
  describe('PostgreSQL Row-Level Security', () => {
    it('should enforce RLS policies', async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      for (const orgId of tenants) {
        // Set tenant context
        await pool.query(`SELECT set_config('app.current_org_id', $1, true)`, [orgId]);
        
        // Query should only return this tenant's data
        const result = await pool.query('SELECT DISTINCT org_id FROM events');
        
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].org_id).toBe(orgId);
      }
    });
    
    it('should block access without tenant context', async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      // Clear tenant context
      await pool.query(`SELECT set_config('app.current_org_id', '', true)`);
      
      const result = await pool.query('SELECT count(*) FROM events');
      expect(result.rows[0].count).toBe('0'); // RLS blocks all rows
    });
  });
  
  describe('API Layer Isolation', () => {
    it('should reject requests with mismatched org_id', async () => {
      const tokenForTenantA = await generateToken({ org_id: 'tenant-a' });
      
      const response = await fetch('/api/metrics?org_id=tenant-b', {
        headers: { Authorization: `Bearer ${tokenForTenantA}` },
      });
      
      expect(response.status).toBe(403);
    });
    
    it('should filter results to authenticated tenant', async () => {
      const tokenForTenantA = await generateToken({ org_id: 'tenant-a' });
      
      const response = await fetch('/api/metrics', {
        headers: { Authorization: `Bearer ${tokenForTenantA}` },
      });
      
      const data = await response.json();
      
      // All returned metrics should be for tenant-a only
      data.metrics.forEach(metric => {
        expect(metric.org_id).toBe('tenant-a');
      });
    });
  });
});
```

### 14.4 End-to-End Data Freshness Testing

```typescript
// tests/e2e/data-freshness.test.ts
import { v4 as uuidv4 } from 'uuid';

describe('End-to-End Data Freshness', () => {
  const FRESHNESS_SLA = 30000; // 30 seconds
  
  it('should deliver events to dashboard within SLA', async () => {
    const testEventId = uuidv4();
    const testOrgId = 'e2e-test-org';
    const sendTime = Date.now();
    
    // 1. Send event through ingestion API
    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        event_id: testEventId,
        org_id: testOrgId,
        event_type: 'e2e_test',
        timestamp: new Date().toISOString(),
        metadata: { test: true },
      }),
    });
    
    expect(response.ok).toBe(true);
    
    // 2. Wait for event to appear in ClickHouse
    let receiveTime: number | null = null;
    const maxWait = FRESHNESS_SLA + 5000; // SLA + buffer
    const checkInterval = 1000;
    
    for (let elapsed = 0; elapsed < maxWait; elapsed += checkInterval) {
      const result = await clickhouse.query({
        query: `SELECT 1 FROM events WHERE event_id = {event_id:String}`,
        query_params: { event_id: testEventId },
      });
      
      const rows = await result.json();
      if (rows.data.length > 0) {
        receiveTime = Date.now();
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // 3. Assert freshness SLA
    expect(receiveTime).not.toBeNull();
    const latency = receiveTime! - sendTime;
    
    console.log(`Data freshness latency: ${latency}ms`);
    expect(latency).toBeLessThan(FRESHNESS_SLA);
  });
  
  it('should update real-time dashboard within SLA', async () => {
    const testEventId = uuidv4();
    const sendTime = Date.now();
    let receiveTime: number | null = null;
    
    // 1. Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}?token=${testToken}`);
    
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = reject;
      setTimeout(() => reject(new Error('WS connection timeout')), 5000);
    });
    
    // 2. Listen for our test event
    const messagePromise = new Promise<void>((resolve) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'METRIC_UPDATE' && 
            data.payload.metadata?.event_id === testEventId) {
          receiveTime = Date.now();
          resolve();
        }
      };
    });
    
    // 3. Send test event
    await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        event_id: testEventId,
        org_id: testOrgId,
        event_type: 'test_metric',
        timestamp: new Date().toISOString(),
        metadata: { event_id: testEventId },
      }),
    });
    
    // 4. Wait for WebSocket update
    await Promise.race([
      messagePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WS message timeout')), FRESHNESS_SLA + 5000)
      ),
    ]);
    
    ws.close();
    
    // 5. Assert
    expect(receiveTime).not.toBeNull();
    const latency = receiveTime! - sendTime;
    
    console.log(`Real-time dashboard latency: ${latency}ms`);
    expect(latency).toBeLessThan(FRESHNESS_SLA);
  });
  
  it('should maintain freshness under load', async () => {
    const NUM_EVENTS = 1000;
    const latencies: number[] = [];
    
    // Send events in parallel
    const sendPromises = Array.from({ length: NUM_EVENTS }, async (_, i) => {
      const eventId = uuidv4();
      const sendTime = Date.now();
      
      await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          org_id: testOrgId,
          event_type: 'load_test',
          timestamp: new Date().toISOString(),
        }),
      });
      
      return { eventId, sendTime };
    });
    
    const sentEvents = await Promise.all(sendPromises);
    
    // Wait for all events to appear
    await new Promise(resolve => setTimeout(resolve, FRESHNESS_SLA));
    
    // Check which events arrived
    for (const { eventId, sendTime } of sentEvents) {
      const result = await clickhouse.query({
        query: `SELECT _processing_time FROM events WHERE event_id = {event_id:String}`,
        query_params: { event_id: eventId },
      });
      
      const rows = await result.json();
      if (rows.data.length > 0) {
        const processingTime = new Date(rows.data[0]._processing_time).getTime();
        latencies.push(processingTime - sendTime);
      }
    }
    
    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    
    console.log(`Load test results (${NUM_EVENTS} events):`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);
    console.log(`  Delivered: ${latencies.length}/${NUM_EVENTS}`);
    
    expect(p95).toBeLessThan(FRESHNESS_SLA);
    expect(latencies.length / NUM_EVENTS).toBeGreaterThan(0.99); // 99% delivery
  });
});
```

### 14.5 Test Infrastructure

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.1
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ./tests/fixtures/clickhouse:/docker-entrypoint-initdb.d
    
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: analytics_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    
  localstack:
    image: localstack/localstack:latest
    environment:
      SERVICES: kinesis,dynamodb,lambda,sqs
      DEBUG: 1
    ports:
      - "4566:4566"

# Run tests
# docker-compose -f docker-compose.test.yml up -d
# npm run test:integration
# docker-compose -f docker-compose.test.yml down
```

### 14.6 Continuous Testing in CI/CD

```yaml
# .github/workflows/test-pipeline.yml
name: Data Pipeline Tests

on:
  push:
    paths:
      - 'lambdas/**'
      - 'flink/**'
      - 'tests/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3
        
  integration-tests:
    runs-on: ubuntu-latest
    services:
      clickhouse:
        image: clickhouse/clickhouse-server:24.1
        ports: ['8123:8123']
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          CLICKHOUSE_URL: http://localhost:8123
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
          
  e2e-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:e2e
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          WS_URL: ${{ secrets.STAGING_WS_URL }}
```

---

## 15. Architecture Diagrams

### 15.1 Simplified High-Level Component Diagram

```mermaid
flowchart TB
    subgraph Users["Users"]
        BROWSER["Web Browser"]
        AGENT["AI Agent"]
    end
    
    subgraph Edge["Edge"]
        CDN["CDN\n(CloudFront)"]
    end
    
    subgraph App["Application"]
        FRONTEND["Dashboard\n(Next.js)"]
        API["API\n(Lambda)"]
        REALTIME["Real-Time\n(WebSocket)"]
    end
    
    subgraph Data["Data Platform"]
        STREAM["Event Stream\n(Kinesis)"]
        PROCESS["Processor\n(Flink/Lambda)"]
        ANALYTICS["Analytics DB\n(ClickHouse)"]
        CACHE["Cache\n(Redis)"]
        METADATA["Metadata\n(PostgreSQL)"]
    end
    
    subgraph Storage["Storage"]
        ARCHIVE["Archive\n(S3)"]
    end

    BROWSER --> CDN --> FRONTEND
    BROWSER <-.->|"WebSocket"| REALTIME
    AGENT --> CDN --> API
    
    FRONTEND --> API
    API --> CACHE
    API --> ANALYTICS
    API --> METADATA
    
    API --> STREAM
    STREAM --> PROCESS
    PROCESS --> ANALYTICS
    PROCESS --> CACHE
    PROCESS --> ARCHIVE
    
    CACHE -.->|"Pub/Sub"| REALTIME

    style Users fill:#f9f9f9
    style Edge fill:#ffe6cc
    style App fill:#cce6ff
    style Data fill:#e6ffe6
    style Storage fill:#f0f0f0
```

### 15.2 End-to-End Data Flow for Single Event

This diagram traces the complete lifecycle of a single analytics event from agent to dashboard.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as AI Agent
    participant GW as API Gateway
    participant Val as Validator Lambda
    participant KS as Kinesis Stream
    participant Flink as Flink Processor
    participant CH as ClickHouse
    participant Redis as Redis Cache
    participant WS as WebSocket Handler
    participant Dash as Dashboard

    Note over Agent,Dash: Event Lifecycle: ~5-30 seconds end-to-end
    
    rect rgb(230, 243, 255)
        Note right of Agent: 1. Ingestion (~500ms)
        Agent->>+GW: POST /events<br/>{event_id, org_id, type, timestamp}
        GW->>+Val: Invoke (async)
        Val->>Val: Validate schema<br/>Enrich metadata<br/>Add received_at
        Val->>-KS: PutRecord<br/>PartitionKey=session_id
        GW-->>-Agent: 202 Accepted
    end
    
    rect rgb(255, 243, 230)
        Note right of KS: 2. Stream Processing (~10-20s)
        KS->>+Flink: Consume (enhanced fan-out)
        Flink->>Flink: 10-second tumbling window<br/>Aggregate by org_id + event_type
        Flink->>CH: Batch INSERT<br/>(every 10s)
        Flink->>-Redis: ZADD metrics:org_id:type<br/>PUBLISH org:org_id:updates
    end
    
    rect rgb(230, 255, 230)
        Note right of Redis: 3. Real-Time Delivery (~100ms)
        Redis->>+WS: Pub/Sub message
        WS->>WS: Query DynamoDB<br/>Get connections for org_id
        WS->>-Dash: Send via @connections API<br/>{type: METRIC_UPDATE, payload}
        Dash->>Dash: Update chart<br/>Re-render component
    end
    
    rect rgb(240, 240, 240)
        Note right of Dash: 4. On-Demand Query (if needed)
        Dash->>GW: GET /api/metrics?range=1h
        GW->>Redis: Check cache
        alt Cache hit
            Redis-->>GW: Return cached data
        else Cache miss
            GW->>CH: SELECT ... FROM events
            CH-->>GW: Query results
            GW->>Redis: SET with TTL
        end
        GW-->>Dash: JSON response
    end
```

### 15.3 Data Flow Timing Breakdown

| Stage | Component | Typical Latency | Max Latency |
|-------|-----------|-----------------|-------------|
| 1a | Agent → API Gateway | 50-100ms | 500ms |
| 1b | API Gateway → Validator Lambda | 100-200ms | 1s |
| 1c | Validator → Kinesis | 50-100ms | 500ms |
| 2a | Kinesis → Flink | 100-500ms | 2s |
| 2b | Flink window | 10,000ms (fixed) | 10,000ms |
| 2c | Flink → ClickHouse | 100-500ms | 2s |
| 2d | Flink → Redis | 10-50ms | 200ms |
| 3a | Redis Pub/Sub | 1-5ms | 50ms |
| 3b | WebSocket broadcast | 50-100ms | 500ms |
| **Total** | End-to-end | **~12-15s** | **~30s** |

### 15.4 Alternative: Low-Latency Path (Sub-5s)

For use cases requiring faster updates (e.g., live session monitoring):

```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant GW as API Gateway
    participant Lambda as Stream Lambda
    participant Redis as Redis
    participant WS as WebSocket
    participant Dash as Dashboard
    
    Note over Agent,Dash: Low-latency path: ~2-5 seconds
    
    Agent->>GW: POST /events (priority: high)
    GW->>Lambda: Invoke (sync)
    Lambda->>Redis: ZADD + PUBLISH<br/>(skip Kinesis/Flink)
    Lambda-->>GW: 200 OK
    Redis->>WS: Pub/Sub
    WS->>Dash: WebSocket push
    
    Note over Lambda,Redis: Also async write to Kinesis<br/>for eventual ClickHouse storage
    Lambda-->>GW: Async: PutRecord to Kinesis
```

**Trade-offs of Low-Latency Path:**
- ✅ 2-5s instead of 15-30s latency
- ❌ No windowed aggregation (less efficient)
- ❌ Redis as source of truth (less durable)
- ❌ Higher Lambda costs (sync invocation)

**Recommendation:** Use low-latency path only for specific high-priority events (errors, security alerts) while routing normal events through the standard Kinesis/Flink path.

---

## Appendix A: Technology Alternatives

| Component | Primary Choice | Alternative | When to Switch |
|-----------|----------------|-------------|----------------|
| Event Streaming | Kinesis | MSK (Kafka) | Need Kafka ecosystem compatibility |
| Time-Series DB | ClickHouse | TimescaleDB | Team prefers PostgreSQL |
| Cache | ElastiCache Redis | DynamoDB DAX | Simpler ops, less real-time |
| Batch Processing | Managed Flink | AWS Glue | Simpler ETL, less streaming |
| Frontend Hosting | Vercel | Amplify | AWS-only requirement |
| Observability | Grafana Cloud | DataDog | Budget allows, want unified APM |

## Appendix B: Security Compliance Checklist

- [ ] SOC 2 Type II controls documented
- [ ] GDPR data processing agreement template
- [ ] Penetration testing scheduled (quarterly)
- [ ] Vulnerability scanning (weekly)
- [ ] Access reviews (monthly)
- [ ] Incident response playbook
- [ ] Data retention policy enforcement
- [ ] Encryption key rotation (annual)

## Appendix C: Disaster Recovery

| Scenario | RTO | RPO | Recovery Procedure |
|----------|-----|-----|-------------------|
| Single AZ failure | 0 (automatic) | 0 | Multi-AZ failover |
| Region failure | 4 hours | 1 hour | Promote EU to primary |
| Data corruption | 4 hours | 1 hour | Point-in-time restore |
| Security breach | 1 hour | N/A | Isolate, rotate credentials |

---

*Document generated: December 2025*
*Next review: March 2026*
