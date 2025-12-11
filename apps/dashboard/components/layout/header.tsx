'use client';

import { Bell, Search, User } from 'lucide-react';

export function Header() {
	return (
		<header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
			{/* Search */}
			<div className="flex flex-1 items-center">
				<div className="relative w-96">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="search"
						placeholder="Search sessions, metrics..."
						className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
					/>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center space-x-4">
				{/* Notifications */}
				<button
					type="button"
					className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
				>
					<span className="sr-only">View notifications</span>
					<Bell className="h-5 w-5" />
					{/* Notification badge */}
					<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error-500" />
				</button>

				{/* User menu */}
				<div className="flex items-center">
					<button
						type="button"
						className="flex items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
					>
						<span className="sr-only">Open user menu</span>
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
							<User className="h-4 w-4 text-primary-600" />
						</div>
					</button>
				</div>
			</div>
		</header>
	);
}
