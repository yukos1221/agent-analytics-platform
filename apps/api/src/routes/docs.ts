/**
 * API Documentation Routes
 *
 * Serves OpenAPI documentation using Redoc.
 * Per API Spec §11.3: "OpenAPI 3.0 Specification (Single Source of Truth)"
 *
 * Routes:
 * - GET /docs - Redoc UI for API documentation
 * - GET /docs/openapi.yaml - Raw OpenAPI spec (for codegen, etc.)
 */

import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docs = new Hono();

// Path to OpenAPI spec (relative to repo root)
// This file is at: apps/api/src/routes/docs.ts
// Spec is at: specs/openapi.mvp.v1.yaml (repo root)
const repoRoot = resolve(__dirname, '../../../../');
const specPath = join(repoRoot, 'specs/openapi.mvp.v1.yaml');

/**
 * GET /docs/openapi.yaml
 * Serve raw OpenAPI specification
 */
docs.get('/openapi.yaml', (c) => {
	try {
		const spec = readFileSync(specPath, 'utf-8');
		return c.text(spec, 200, {
			'Content-Type': 'application/x-yaml',
		});
	} catch (error) {
		return c.json(
			{
				error: {
					code: 'DOCS_NOT_FOUND',
					message: 'OpenAPI specification not found',
				},
			},
			500
		);
	}
});

/**
 * GET /docs
 * Serve Redoc UI with OpenAPI spec
 */
docs.get('/', (c) => {
	const html = `<!DOCTYPE html>
<html>
  <head>
    <title>AI Agent Analytics Platform - API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url='/docs/openapi.yaml'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

	return c.html(html, 200);
});

export default docs;
