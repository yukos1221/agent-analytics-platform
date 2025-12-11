/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,

	// Note: typedRoutes disabled for MVP (routes not fully implemented)
	// TODO: Re-enable in Phase 2 when all routes exist
	experimental: {},

	// Cache headers for static assets
	async headers() {
		return [
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/api/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'private, no-cache, no-store, must-revalidate',
					},
				],
			},
		];
	},

	// Environment variables available to the browser
	env: {
		NEXT_PUBLIC_API_URL:
			process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
	},
};

module.exports = nextConfig;
