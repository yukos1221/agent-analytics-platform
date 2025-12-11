'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		const formData = new FormData(event.currentTarget);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			// TODO: Implement actual authentication with NextAuth
			// For MVP, simulate login
			console.log('Login attempt:', { email });

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Redirect to dashboard on success
			router.push('/dashboard');
		} catch (err) {
			setError('Invalid email or password. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className='rounded-lg bg-white p-8 shadow-lg'>
			{/* Logo and title */}
			<div className='mb-8 text-center'>
				<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100'>
					<svg
						className='h-6 w-6 text-primary-600'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
						/>
					</svg>
				</div>
				<h1 className='text-2xl font-bold text-gray-900'>AI Agent Analytics</h1>
				<p className='mt-2 text-sm text-gray-600'>
					Sign in to your account to continue
				</p>
			</div>

			{/* Error message */}
			{error && (
				<div className='mb-4 rounded-md bg-error-50 p-4'>
					<p className='text-sm text-error-700'>{error}</p>
				</div>
			)}

			{/* Login form */}
			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-gray-700'
					>
						Email address
					</label>
					<input
						id='email'
						name='email'
						type='email'
						autoComplete='email'
						required
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
						placeholder='you@company.com'
					/>
				</div>

				<div>
					<label
						htmlFor='password'
						className='block text-sm font-medium text-gray-700'
					>
						Password
					</label>
					<input
						id='password'
						name='password'
						type='password'
						autoComplete='current-password'
						required
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
						placeholder='••••••••'
					/>
				</div>

				<div className='flex items-center justify-between'>
					<div className='flex items-center'>
						<input
							id='remember-me'
							name='remember-me'
							type='checkbox'
							className='h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500'
						/>
						<label
							htmlFor='remember-me'
							className='ml-2 block text-sm text-gray-700'
						>
							Remember me
						</label>
					</div>

					<Link
						href='/forgot-password'
						className='text-sm font-medium text-primary-600 hover:text-primary-500'
					>
						Forgot password?
					</Link>
				</div>

				<button
					type='submit'
					disabled={isLoading}
					className='flex w-full justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
				>
					{isLoading ? (
						<svg
							className='h-5 w-5 animate-spin text-white'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'
						>
							<circle
								className='opacity-25'
								cx='12'
								cy='12'
								r='10'
								stroke='currentColor'
								strokeWidth='4'
							/>
							<path
								className='opacity-75'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
							/>
						</svg>
					) : (
						'Sign in'
					)}
				</button>
			</form>
		</div>
	);
}
