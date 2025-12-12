#!/usr/bin/env node
/**
 * CLI for running migrations
 *
 * Usage:
 *   pnpm db:migrate              # Run all pending migrations
 *   pnpm db:migrate:status        # Show migration status
 *   pnpm db:migrate:dry-run       # Preview pending migrations
 */

import { runMigrations, getMigrationStatus } from '../migrate.js';

const command = process.argv[2] || 'up';

async function main() {
	try {
		if (command === 'status') {
			const status = await getMigrationStatus();
			console.log('\n📊 Migration Status:');
			console.log(`   Total migrations: ${status.total}`);
			console.log(`   Applied: ${status.applied.length}`);
			console.log(`   Pending: ${status.pending.length}`);
			if (status.pending.length > 0) {
				console.log(`\n   Pending migrations:`);
				status.pending.forEach((id) => console.log(`     - ${id}`));
			}
			process.exit(0);
		}

		if (command === 'dry-run') {
			const result = await runMigrations({ direction: 'up', dryRun: true });
			console.log('\n🔍 Dry Run - Pending Migrations:');
			if (result.migrations && result.migrations.length > 0) {
				result.migrations.forEach((id) => console.log(`   - ${id}`));
			} else {
				console.log('   No pending migrations');
			}
			process.exit(0);
		}

		if (command === 'up' || !command) {
			console.log('🚀 Running migrations...');
			const result = await runMigrations({ direction: 'up' });
			if (result.success) {
				console.log('✅ Migrations completed successfully');
				if (result.duration) {
					console.log(`   Duration: ${result.duration}ms`);
				}
				process.exit(0);
			} else {
				console.error('❌ Migration failed:', result.error);
				process.exit(1);
			}
		}

		console.error(`Unknown command: ${command}`);
		console.error('Usage: migrate [status|dry-run|up]');
		process.exit(1);
	} catch (error) {
		const err = error as Error;
		console.error('❌ Error:', err.message);
		process.exit(1);
	}
}

main();
