import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow access to login page and API routes
	if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
		return NextResponse.next();
	}

	// Check for auth token
	const token = request.cookies.get('auth-token')?.value;

	// If no token and trying to access protected route, redirect to login
	if (!token && pathname.startsWith('/dashboard')) {
		const loginUrl = new URL('/login', request.url);
		// Add return URL so user can be redirected back after login
		loginUrl.searchParams.set('returnUrl', pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Allow access to root page (will redirect to dashboard if logged in)
	if (pathname === '/') {
		if (token) {
			return NextResponse.redirect(new URL('/dashboard', request.url));
		} else {
			return NextResponse.redirect(new URL('/login', request.url));
		}
	}

	// Allow access to other pages if authenticated
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		'/((?!api|_next/static|_next/image|favicon.ico).*)',
	],
};

