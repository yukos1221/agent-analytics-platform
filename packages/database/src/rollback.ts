/**
 * Rollback Script for Drizzle Migrations
 *
 * Implements rollback procedures as per docs/05-development-deployment-v1.2.md Section 12.4.
 *
 * Phase 1: Manual rollback (this script)
 * Phase 2: Automated rollback in CI/CD
 *
 * Usage:
 *   - Rollback last migration: pnpm db:rollback --steps 1
 *   - Rollback to specific migration: pnpm db:rollback --target 0001_init_schema
 *   - Dry run: pnpm db:rollback --steps 1 --dry-run
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RollbackOptions {
	steps?: number;
	target?: string;
	dryRun?: boolean;
	force?: boolean;
	createBackup?: boolean;
}

interface RollbackResult {
	success: boolean;
	migrationsRolledBack: string[];
	error?: string;
}

interface MigrationRecord {
	id: string;
	hash: string;
	created_at: Date;
}

/**
 * Get database connection
 */
function getDb() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL environment variable is required');
	}
	const sql = postgres(connectionString, { max: 1 });
	return { db: drizzle(sql), sql };
}

/**
 * Get applied migrations in reverse chronological order
 *
 * Drizzle stores migrations with:
 * - id: sequential number
 * - hash: migration file hash
 * - created_at: timestamp
 */
async function getAppliedMigrations(
	db: ReturnType<typeof drizzle>
): Promise<MigrationRecord[]> {
	try {
		const result = await db.execute<{
			id: number;
			hash: string;
			created_at: Date;
		}>(sql`
			SELECT id, hash, created_at 
			FROM drizzle_migrations 
			ORDER BY created_at DESC
		`);
		return result.map((r) => ({
			id: r.hash, // Use hash as identifier
			hash: r.hash,
			created_at: r.created_at,
		}));
	} catch (error) {
		// Table doesn't exist yet - no migrations applied
		if ((error as { code?: string }).code === '42P01') {
			return [];
		}
		throw error;
	}
}

/**
 * Load migration module by ID
 */
async function loadMigrationModule(migrationId: string): Promise<{
	up?: (db: PostgresJsDatabase) => Promise<void>;
	down?: (db: PostgresJsDatabase) => Promise<void>;
}> {
	const migrationsDir = path.join(__dirname, 'migrations');
	const filePath = path.join(migrationsDir, `${migrationId}.ts`);

	if (!fs.existsSync(filePath)) {
		throw new Error(`Migration file not found: ${filePath}`);
	}

	// Dynamic import of the migration module
	const module = await import(`./migrations/${migrationId}.ts`);
	return module;
}

/**
 * Rollback migrations
 *
 * Phase 1: Manual rollback using TypeScript migration files with down() functions
 * Phase 2: Will use Drizzle's built-in rollback if available
 */
export async function rollbackMigrations(
	options: RollbackOptions = {}
): Promise<RollbackResult> {
	const { db, sql: sqlClient } = getDb();

	try {
		// 1. Get applied migrations
		const appliedMigrations = await getAppliedMigrations(db);

		if (appliedMigrations.length === 0) {
			return {
				success: true,
				migrationsRolledBack: [],
			};
		}

		// 2. Determine which migrations to rollback
		let migrationsToRollback: MigrationRecord[];

		if (options.target) {
			// Rollback to specific migration (rollback everything after target)
			const targetIndex = appliedMigrations.findIndex(
				(m) => m.hash === options.target || m.id === options.target
			);
			if (targetIndex === -1) {
				throw new Error(
					`Target migration ${options.target} not found in applied migrations`
				);
			}
			// Rollback everything before (newer than) the target
			migrationsToRollback = appliedMigrations.slice(0, targetIndex);
		} else {
			// Rollback N steps (default: 1)
			const steps = options.steps || 1;
			migrationsToRollback = appliedMigrations.slice(0, steps);
		}

		if (migrationsToRollback.length === 0) {
			return {
				success: true,
				migrationsRolledBack: [],
			};
		}

		// 3. Dry run - just return what would be rolled back
		if (options.dryRun) {
			return {
				success: true,
				migrationsRolledBack: migrationsToRollback.map((m) => m.id),
			};
		}

		// 4. Create backup if requested (Phase 1: manual, Phase 2: automated)
		if (options.createBackup) {
			console.warn(
				'⚠️  Backup creation not implemented in Phase 1. ' +
					'Please create a manual backup before rollback in production.'
			);
		}

		// 5. Execute rollbacks in reverse order (newest first)
		const rolledBack: string[] = [];

		// Note: Drizzle doesn't have built-in rollback for TypeScript migrations
		// We need to manually call down() functions from migration files
		// For Phase 1, we'll use a simpler approach: drop and recreate tables
		// In Phase 2, we'll implement proper migration tracking

		console.log(`Rolling back ${migrationsToRollback.length} migration(s)...`);

		// Execute rollbacks by calling down() functions from TypeScript migration files
		// Note: Drizzle tracks migrations by hash, but we maintain TypeScript files with up/down
		// For Phase 1, we map Drizzle hashes to our TypeScript migration files
		// In Phase 2, we'll improve this with a migration registry

		// Get list of available TypeScript migration files
		const migrationsDir = path.join(__dirname, 'migrations');
		const availableMigrations = fs.existsSync(migrationsDir)
			? fs
					.readdirSync(migrationsDir)
					.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
					.map((f) => f.replace('.ts', ''))
					.sort()
					.reverse() // Newest first for rollback
			: [];

		for (let i = 0; i < migrationsToRollback.length; i++) {
			const migration = migrationsToRollback[i];

			// Map Drizzle migration index to TypeScript migration file
			// Since we rollback newest first, use the index to find the corresponding TS file
			const migrationId = availableMigrations[i];

			if (!migrationId) {
				console.warn(
					`⚠️  No TypeScript migration file found for ${migration.hash}. ` +
						`Skipping rollback execution, but will remove from migrations table.`
				);
				// Still remove from migrations table if forced
				if (options.force) {
					await db.execute(
						sql`DELETE FROM drizzle_migrations WHERE hash = ${migration.hash}`
					);
					rolledBack.push(migration.hash);
				} else {
					throw new Error(
						`Cannot rollback ${migration.hash}: No TypeScript migration file found. ` +
							`Use --force to remove from migrations table without executing down().`
					);
				}
				continue;
			}

			try {
				const module = await loadMigrationModule(migrationId);
				if (module.down) {
					await module.down(db);
					// Remove from migrations table
					await db.execute(
						sql`DELETE FROM drizzle_migrations WHERE hash = ${migration.hash}`
					);
					rolledBack.push(migration.hash);
					console.log(`✅ Rolled back: ${migrationId} (${migration.hash})`);
				} else {
					throw new Error(
						`Migration ${migrationId} does not have a down() function`
					);
				}
			} catch (error) {
				const err = error as Error;
				console.error(`❌ Failed to rollback ${migrationId}: ${err.message}`);
				throw error;
			}
		}

		return {
			success: true,
			migrationsRolledBack: rolledBack,
		};
	} catch (error) {
		const err = error as Error;
		return {
			success: false,
			migrationsRolledBack: [],
			error: err.message,
		};
	} finally {
		await sqlClient.end();
	}
}
