import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'esm',
	outdir: 'dist',
	sourcemap: true,
	minify: process.env.NODE_ENV === 'production',
	external: [
		// Add external dependencies that shouldn't be bundled
	],
	banner: {
		// Required for ESM compatibility with __dirname in Node
		js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
		`.trim(),
	},
};

async function build() {
	if (isWatch) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		console.log('👀 Watching for changes...');
	} else {
		await esbuild.build(buildOptions);
		console.log('✅ Build complete');
	}
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
