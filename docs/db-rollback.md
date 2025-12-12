# Database Migration Rollback Guide

This document explains how to roll back database migrations in Phase 1 (MVP). For Phase 2+ procedures, see [docs/05-development-deployment-v1.2.md](./05-development-deployment-v1.2.md) Section 12.4.

## Overview

**Phase 1 (Current):** Manual rollback procedures  
**Phase 2:** Automated rollback in CI/CD  
**Phase 3:** Blue-green deployments with automated rollback

All migrations are designed to be reversible. Each migration file in `packages/database/src/migrations/` includes:

- `up()` function: Applies the migration
- `down()` function: Reverses the migration

## Quick Reference

### Local Development

```bash
# Check migration status
pnpm --filter @repo/database db:migrate:status

# Rollback last migration
pnpm --filter @repo/database db:rollback

# Rollback last N migrations
pnpm --filter @repo/database db:rollback --steps 2

# Rollback to specific migration
pnpm --filter @repo/database db:rollback --target 0001_init_schema

# Preview rollback (dry run)
pnpm --filter @repo/database db:rollback --dry-run

# Reset database (rollback all + re-run migrations)
# ⚠️ DANGEROUS - Only use in local development
pnpm --filter @repo/database db:rollback --steps 999 --force
pnpm --filter @repo/database db:migrate
```

### Staging/Production (Phase 1)

```bash
# 1. Create backup first (manual in Phase 1)
# For RDS: Create snapshot via AWS Console or CLI

# 2. Check current status
DATABASE_URL="<staging_db_url>" pnpm --filter @repo/database db:migrate:status

# 3. Preview rollback
DATABASE_URL="<staging_db_url>" pnpm --filter @repo/database db:rollback --dry-run --steps 1

# 4. Execute rollback
DATABASE_URL="<staging_db_url>" pnpm --filter @repo/database db:rollback --steps 1

# 5. Verify
DATABASE_URL="<staging_db_url>" pnpm --filter @repo/database db:migrate:status
```

## Rollback Scenarios

### Scenario 1: Migration Failed Mid-Way

**Symptom:** Migration error during execution, database in inconsistent state.

**Solution:** Drizzle runs migrations in transactions. If a migration fails, it automatically rolls back. No manual action needed.

```bash
# Check status - migration should not be recorded
pnpm --filter @repo/database db:migrate:status

# Fix the migration file, then retry
pnpm --filter @repo/database db:migrate
```

### Scenario 2: Migration Succeeded, But Application Fails

**Symptom:** Migration completed successfully, but application code fails with schema errors.

**Solution:** Rollback the migration, then fix the code.

```bash
# 1. Rollback the problematic migration
pnpm --filter @repo/database db:rollback --steps 1

# 2. Fix application code

# 3. Re-apply migration after code fix
pnpm --filter @repo/database db:migrate
```

### Scenario 3: Bad Migration in Production

**Symptom:** Migration deployed to production causes issues.

**Phase 1 Procedure:**

1. **Create Backup** (Manual)

   ```bash
   # For RDS PostgreSQL
   aws rds create-db-snapshot \
     --db-instance-identifier analytics-prod \
     --db-snapshot-identifier pre-rollback-$(date +%Y%m%d-%H%M%S)
   ```

2. **Check Migration Status**

   ```bash
   DATABASE_URL="<prod_db_url>" pnpm --filter @repo/database db:migrate:status
   ```

3. **Preview Rollback**

   ```bash
   DATABASE_URL="<prod_db_url>" pnpm --filter @repo/database db:rollback --dry-run --steps 1
   ```

4. **Execute Rollback**

   ```bash
   DATABASE_URL="<prod_db_url>" pnpm --filter @repo/database db:rollback --steps 1
   ```

5. **Verify Application Health**

   ```bash
   # Check API health endpoint
   curl https://api.example.com/health

   # Check logs for errors
   # (Use your logging system)
   ```

6. **Revert Application Code** (if needed)
   - If application code depends on the rolled-back schema, revert to previous version
   - Deploy previous application version

### Scenario 4: Multiple Migrations to Rollback

**Solution:** Rollback sequentially or to a specific target.

```bash
# Rollback last 3 migrations
pnpm --filter @repo/database db:rollback --steps 3

# Or rollback to specific migration (rolls back everything after it)
pnpm --filter @repo/database db:rollback --target 0001_init_schema
```

## Migration File Structure

Each migration file follows this structure:

```typescript
// packages/database/src/migrations/0001_init_schema.ts
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const id = '0001_init_schema';
export const description = 'Create initial Phase 1 schema';

export async function up(db: PostgresJsDatabase): Promise<void> {
	// Migration logic here
	await db.execute(sql`CREATE TABLE ...`);
}

export async function down(db: PostgresJsDatabase): Promise<void> {
	// Rollback logic here
	await db.execute(sql`DROP TABLE ...`);
}
```

## Phase 1 vs Phase 2 Differences

| Feature                 | Phase 1 (MVP)               | Phase 2 (Hardening)             |
| ----------------------- | --------------------------- | ------------------------------- |
| **Migration Execution** | Manual (`pnpm db:migrate`)  | Automated in CI/CD              |
| **Rollback**            | Manual (`pnpm db:rollback`) | Automated with monitoring       |
| **Backups**             | Manual (RDS snapshots)      | Automated pre-migration backups |
| **Blue-Green Deploy**   | ❌ Not available            | ✅ Available                    |
| **Rollback Automation** | ❌ Manual                   | ✅ Automated on error           |
| **Migration Testing**   | Manual testing              | Automated in CI                 |

## Troubleshooting

### Error: "Migration file not found"

**Cause:** Migration file doesn't exist or hash mismatch.

**Solution:**

```bash
# Check available migrations
ls packages/database/src/migrations/

# If migration was manually removed, use --force flag
pnpm --filter @repo/database db:rollback --steps 1 --force
```

### Error: "Migration does not have a down() function"

**Cause:** Migration file missing `down()` function.

**Solution:** Add `down()` function to the migration file, then retry rollback.

### Error: "Cannot rollback - foreign key constraints"

**Cause:** Tables have foreign key dependencies.

**Solution:** The rollback script uses `CASCADE` to handle dependencies. If issues persist:

1. Manually drop foreign keys first
2. Then run rollback

### Database Connection Issues

**Symptom:** `DATABASE_URL` not set or incorrect.

**Solution:**

```bash
# Check environment variable
echo $DATABASE_URL

# Set for current session
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Or use inline
DATABASE_URL="postgresql://..." pnpm --filter @repo/database db:migrate:status
```

## Best Practices

1. **Always test rollback locally** before rolling back in staging/production
2. **Create backups** before any production rollback (manual in Phase 1)
3. **Use dry-run** to preview rollback before executing
4. **Document rollback reason** in your incident log
5. **Verify application health** after rollback
6. **Keep migrations small** - easier to rollback individual changes
7. **Test migrations in staging** before production deployment

## Related Documentation

- [Database Management & Migrations](./05-development-deployment-v1.2.md#12-database-management--migrations)
- [Migration Strategy Overview](./05-development-deployment-v1.2.md#141-migration-strategy-overview)
- [Production Rollback Runbook](./05-development-deployment-v1.2.md#1144-production-rollback-runbook)

## Support

For issues or questions:

1. Check migration status: `pnpm --filter @repo/database db:migrate:status`
2. Review migration files in `packages/database/src/migrations/`
3. Consult [docs/05-development-deployment-v1.2.md](./05-development-deployment-v1.2.md) for detailed procedures
