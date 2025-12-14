'use client';

import { Bell, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header() {
	const router = useRouter();

	const handleLogout = () => {
		// Clear auth token
		document.cookie =
			'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		// Redirect to login
		router.push('/login');
	};

	return (
		<header className='flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6'>
			{/* Left side - empty for now */}
			<div className='flex-1'></div>

			{/* Actions */}
			<div className='flex items-center space-x-4'>
				{/* Notifications - Disabled */}
				<div className='relative rounded-full p-2 text-gray-300 cursor-not-allowed opacity-50'>
					<span className='sr-only'>Notifications disabled</span>
					<Bell className='h-5 w-5' />
					{/* Notification badge - hidden when disabled */}
				</div>

				{/* User menu */}
				<div className='flex items-center space-x-2 cursor-not-allowed opacity-20'>
					<div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary-100'>
						<User className='h-4 w-4 text-primary-600' />
					</div>
				</div>

				{/* Logout button */}
				<button
					onClick={handleLogout}
					className='flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900'
				>
					<LogOut className='mr-2 h-4 w-4' />
					Logout
				</button>
			</div>
		</header>
	);
}
