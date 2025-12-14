'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * OAuth callback handler
 * Processes authentication callbacks from providers (e.g., Cognito)
 */
export default function CallbackPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// TODO: Handle OAuth callback with NextAuth
		// Extract tokens/code from URL and complete authentication

		const error = searchParams.get('error');
		if (error) {
			console.error('Auth callback error:', error);
			router.push('/login?error=auth_failed');
			return;
		}

		// On successful callback, redirect to dashboard
		router.push('/');
	}, [router, searchParams]);

	return (
		<div className='flex flex-col items-center justify-center p-8'>
			<div className='h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent' />
			<p className='mt-4 text-sm text-gray-600'>Completing sign in...</p>
		</div>
	);
}
