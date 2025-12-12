#!/usr/bin/env node
/**
 * CLI for seeding the database
 *
 * Usage:
 *   pnpm db:seed              # Seed database with test data
 */

import { seed } from '../seed.js';

async function main() {
	try {
		await seed();
		process.exit(0);
	} catch (error) {
		const err = error as Error;
		console.error('❌ Seed failed:', err.message);
		process.exit(1);
	}
}

main();
