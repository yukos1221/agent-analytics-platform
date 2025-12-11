/**
 * Root ESLint Configuration
 *
 * This config is inherited by all packages in the monorepo.
 * Per Dev/Deploy Spec §6: Code Quality & Standards
 */
module.exports = {
	root: true,
	env: {
		node: true,
		es2022: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	rules: {
		// TypeScript handles these
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
		],

		// Allow explicit any for MVP (tighten in Phase 2)
		'@typescript-eslint/no-explicit-any': 'warn',

		// Consistent code style
		'no-console': ['warn', { allow: ['warn', 'error'] }],
	},
	ignorePatterns: [
		'node_modules/',
		'dist/',
		'.next/',
		'coverage/',
		'*.config.js',
		'*.config.ts',
	],
};
