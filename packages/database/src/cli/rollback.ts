#!/usr/bin/env node
/**
 * CLI for rolling back migrations
 *
 * Usage:
 *   pnpm db:rollback                    # Rollback last migration
 *   pnpm db:rollback --steps 2         # Rollback last 2 migrations
 *   pnpm db:rollback --target 0001     # Rollback to specific migration
 *   pnpm db:rollback --dry-run         # Preview rollback
 */

import { rollbackMigrations } from '../rollback.js';

function parseArgs(): {
	steps?: number;
	target?: string;
	dryRun?: boolean;
	force?: boolean;
	backup?: boolean;
} {
	const args = process.argv.slice(2);
	const options: {
		steps?: number;
		target?: string;
		dryRun?: boolean;
		force?: boolean;
		backup?: boolean;
	} = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--steps' || arg === '-s') {
			options.steps = parseInt(args[++i], 10);
		} else if (arg === '--target' || arg === '-t') {
			options.target = args[++i];
		} else if (arg === '--dry-run' || arg === '-d') {
			options.dryRun = true;
		} else if (arg === '--force' || arg === '-f') {
			options.force = true;
		} else if (arg === '--backup' || arg === '-b') {
			options.backup = true;
		}
	}

	return options;
}

async function main() {
	const options = parseArgs();

	try {
		if (options.dryRun) {
			console.log('🔍 Dry Run - Preview Rollback:');
			const result = await rollbackMigrations({ ...options, dryRun: true });
			if (result.success && result.migrationsRolledBack.length > 0) {
				console.log(
					`\n   Would rollback ${result.migrationsRolledBack.length} migration(s):`
				);
				result.migrationsRolledBack.forEach((id) =>
					console.log(`     - ${id}`)
				);
			} else {
				console.log('   No migrations to rollback');
			}
			process.exit(0);
		}

		console.log('⏪ Rolling back migrations...');
		const result = await rollbackMigrations(options);

		if (result.success) {
			if (result.migrationsRolledBack.length > 0) {
				console.log(
					`✅ Successfully rolled back ${result.migrationsRolledBack.length} migration(s)`
				);
				result.migrationsRolledBack.forEach((id) => console.log(`   - ${id}`));
			} else {
				console.log('✅ No migrations to rollback');
			}
			process.exit(0);
		} else {
			console.error('❌ Rollback failed:', result.error);
			process.exit(1);
		}
	} catch (error) {
		const err = error as Error;
		console.error('❌ Error:', err.message);
		process.exit(1);
	}
}

main();
