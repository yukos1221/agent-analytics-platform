import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['**/*.test.{ts,tsx}'],
		exclude: ['node_modules', '.next'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['components/**/*.tsx', 'lib/**/*.ts'],
			exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
			'@/components': path.resolve(__dirname, './components'),
			'@/lib': path.resolve(__dirname, './lib'),
			'@/hooks': path.resolve(__dirname, './lib/hooks'),
			'@/stores': path.resolve(__dirname, './lib/stores'),
			'@/types': path.resolve(__dirname, './types'),
		},
	},
});
