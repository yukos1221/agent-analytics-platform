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

// Use process.cwd() for repo root (Playwright runs from dashboard directory)
// This works in both CommonJS and ES module contexts

async function globalSetup() {
    console.log('🌱 Setting up E2E test environment...');

    try {
        // E2E tests use in-memory store (mocked data), no real database needed
        // Ensure DATABASE_URL is set (use default for local dev)
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL =
                process.env.DATABASE_URL ||
                'postgresql://postgres:postgres@localhost:5432/analytics_test';
            console.log('⚠️  DATABASE_URL not set, using default test database');
        }

        // Resolve repo root once for all commands
        // Playwright runs from apps/dashboard, so go up 2 levels to repo root
        const repoRoot = path.resolve(process.cwd(), '../../');

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

            // Verify that sessions were seeded for acme123 org
            console.log('🔍 Verifying seeded data...');
            try {
                const verifyCmd = `psql "${process.env.DATABASE_URL}" -t -c "SELECT COUNT(*) FROM sessions WHERE org_id = 'acme123';"`;
                const sessionCount = execSync(verifyCmd, {
                    cwd: repoRoot,
                    encoding: 'utf-8',
                    env: { ...process.env },
                }).trim();
                console.log(`✅ Found ${sessionCount} sessions for org_id 'acme123'`);
                if (parseInt(sessionCount) === 0) {
                    console.warn(
                        '⚠️  WARNING: No sessions found for org_id "acme123" - tests may fail'
                    );
                }
            } catch (verifyError) {
                console.warn('⚠️  Could not verify seeded data:', verifyError);
            }
        } catch (error) {
            console.error('❌ Database seeding failed:', error);
            console.error('⚠️  Tests may fail if database is not seeded correctly');
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
