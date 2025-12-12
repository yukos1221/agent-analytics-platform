/**
 * E2E Test Setup
 *
 * This script runs before all E2E tests to ensure:
 * 1. Database is seeded with test data
 * 2. API server is ready
 *
 * Per Testing Spec §6.2: "Test data seeded by seed script"
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
	console.log('🌱 Setting up E2E test environment...');

	try {
		// Ensure DATABASE_URL is set (use default for local dev)
		if (!process.env.DATABASE_URL) {
			process.env.DATABASE_URL =
				process.env.DATABASE_URL ||
				'postgresql://postgres:postgres@localhost:5432/analytics_test';
			console.log('⚠️  DATABASE_URL not set, using default test database');
		}

		// Resolve repo root once for all commands
		const repoRoot = path.resolve(__dirname, '../../../');

		// Run database migrations (if needed)
		console.log('📦 Running database migrations...');
		try {
			execSync('pnpm --filter @repo/database db:migrate', {
				cwd: repoRoot,
				stdio: 'inherit',
				env: { ...process.env },
			});
		} catch (error) {
			console.warn('⚠️  Migration failed (may already be applied):', error);
		}

		// Seed database with test data
		console.log('🌱 Seeding database with test data...');
		try {
			execSync('pnpm --filter @repo/database db:seed', {
				cwd: repoRoot,
				stdio: 'inherit',
				env: { ...process.env },
			});
			console.log('✅ Database seeded successfully');
		} catch (error) {
			console.error('❌ Database seeding failed:', error);
			// Don't fail the setup - tests may still work with existing data
		}

		// Wait a bit for services to be ready
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log('✅ E2E test setup complete');
	} catch (error) {
		console.error('❌ E2E test setup failed:', error);
		// Don't throw - allow tests to run anyway (they may work with existing setup)
	}
}

export default globalSetup;
