import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const id = '0002_add_api_keys_fields';
export const description =
	'Add name, scopes, environment, expires_at, last_used_at, created_by fields to api_keys table';

/**
 * Migration UP: Add additional fields to api_keys table
 *
 * Adds:
 * - name: Human-readable key name
 * - scopes: JSON array of authorized scopes
 * - environment: Target environment (production, staging, development)
 * - expires_at: Optional expiration timestamp
 * - last_used_at: Last usage timestamp
 * - created_by: JSON object with user info who created the key
 */
export async function up(db: PostgresJsDatabase): Promise<void> {
	// Add new columns (all nullable for backward compatibility)
	await db.execute(sql`
		ALTER TABLE api_keys
		ADD COLUMN IF NOT EXISTS name varchar(100),
		ADD COLUMN IF NOT EXISTS scopes jsonb,
		ADD COLUMN IF NOT EXISTS environment varchar(32) DEFAULT 'production',
		ADD COLUMN IF NOT EXISTS expires_at timestamptz,
		ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
		ADD COLUMN IF NOT EXISTS created_by jsonb
	`);

	// Update existing rows to have default values
	await db.execute(sql`
		UPDATE api_keys
		SET 
			scopes = '["events:write"]'::jsonb,
			environment = 'production'
		WHERE scopes IS NULL OR environment IS NULL
	`);
}

/**
 * Migration DOWN: Remove added fields
 */
export async function down(db: PostgresJsDatabase): Promise<void> {
	await db.execute(sql`
		ALTER TABLE api_keys
		DROP COLUMN IF EXISTS name,
		DROP COLUMN IF EXISTS scopes,
		DROP COLUMN IF EXISTS environment,
		DROP COLUMN IF EXISTS expires_at,
		DROP COLUMN IF EXISTS last_used_at,
		DROP COLUMN IF EXISTS created_by
	`);
}


