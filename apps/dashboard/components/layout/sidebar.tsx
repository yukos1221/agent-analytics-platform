'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	BarChart3,
	Activity,
	Settings,
	Users,
	AlertCircle,
	LayoutDashboard,
	Menu,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
	{ name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
	{ name: 'Sessions', href: '/dashboard/sessions', icon: Activity },
	{
		name: 'Metrics',
		href: '/dashboard/metrics',
		icon: BarChart3,
		disabled: true,
	},
	{
		name: 'Alerts',
		href: '/dashboard/alerts',
		icon: AlertCircle,
		disabled: true,
	},
	{
		name: 'Team',
		href: '/dashboard/settings/team',
		icon: Users,
		disabled: true,
	},
	{
		name: 'Settings',
		href: '/dashboard/settings',
		icon: Settings,
		disabled: true,
	},
];

export function Sidebar() {
	const pathname = usePathname();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<>
			{/* Mobile menu button - only visible on small screens */}
			<div className='lg:hidden fixed top-4 left-4 z-50'>
				<button
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className='p-2 rounded-md bg-white shadow-lg border border-gray-200 hover:bg-gray-50'
				>
					{isMobileMenuOpen ? (
						<X className='h-5 w-5 text-gray-700' />
					) : (
						<Menu className='h-5 w-5 text-gray-700' />
					)}
				</button>
			</div>

			{/* Mobile overlay */}
			{isMobileMenuOpen && (
				<div
					className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40'
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* TODO: Phase 2 - Add keyboard navigation support for mobile menu */}
			{/* TODO: Phase 2 - Add swipe gestures for mobile menu */}

			{/* Sidebar */}
			<aside
				className={cn(
					// Base styles
					'flex flex-col border-r border-gray-200 bg-white',
					// Positioning: always fixed overlay on mobile, relative on desktop
					'fixed inset-y-0 left-0 w-64 z-50 lg:relative lg:translate-x-0',
					// Transform: hidden on mobile by default, show when menu open
					'transform -translate-x-full transition-transform duration-200 ease-in-out',
					isMobileMenuOpen && 'translate-x-0'
				)}
			>
				{/* Logo */}
				<div className='flex h-16 items-center border-b border-gray-200 px-6'>
					<Link
						href='/dashboard'
						className='flex items-center space-x-2'
						onClick={() => setIsMobileMenuOpen(false)}
					>
						<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600'>
							<BarChart3 className='h-5 w-5 text-white' />
						</div>
						<span className='text-lg font-semibold text-gray-900'>
							Analytics
						</span>
					</Link>
				</div>

				{/* Navigation */}
				<nav className='flex-1 space-y-1 px-3 py-4'>
					{navigation.map((item) => {
						const isActive =
							pathname === item.href ||
							(item.href !== '/' &&
								item.href !== '/dashboard' &&
								pathname.startsWith(item.href));

						if (item.disabled) {
							return (
								<div
									key={item.name}
									className='group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed opacity-50'
								>
									<item.icon className='mr-3 h-5 w-5 flex-shrink-0 text-gray-300' />
									{item.name}
								</div>
							);
						}

						return (
							<Link
								key={item.name}
								href={item.href}
								onClick={() => setIsMobileMenuOpen(false)}
								className={cn(
									'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
									isActive
										? 'bg-primary-50 text-primary-700'
										: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
								)}
							>
								<item.icon
									className={cn(
										'mr-3 h-5 w-5 flex-shrink-0',
										isActive
											? 'text-primary-600'
											: 'text-gray-400 group-hover:text-gray-500'
									)}
								/>
								{item.name}
							</Link>
						);
					})}
				</nav>

				{/* Footer */}
				<div className='border-t border-gray-200 p-4'>
					<div className='rounded-md bg-gray-50 p-3'>
						<p className='text-xs font-medium text-gray-500'>Current Plan</p>
						<p className='text-sm font-semibold text-gray-900'>Pro Team</p>
						<p className='mt-1 text-xs text-gray-500'>
							1,247 / 10,000 sessions
						</p>
					</div>
				</div>
			</aside>
		</>
	);
}
