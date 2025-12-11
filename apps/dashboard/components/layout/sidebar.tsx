'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	BarChart3,
	Activity,
	Settings,
	Users,
	AlertCircle,
	LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
	{ name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
	{ name: 'Sessions', href: '/dashboard/sessions', icon: Activity },
	{ name: 'Metrics', href: '/dashboard/metrics', icon: BarChart3 },
	{ name: 'Alerts', href: '/dashboard/alerts', icon: AlertCircle },
	{ name: 'Team', href: '/dashboard/settings/team', icon: Users },
	{ name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className='flex w-64 flex-col border-r border-gray-200 bg-white'>
			{/* Logo */}
			<div className='flex h-16 items-center border-b border-gray-200 px-6'>
				<Link href='/dashboard' className='flex items-center space-x-2'>
					<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600'>
						<BarChart3 className='h-5 w-5 text-white' />
					</div>
					<span className='text-lg font-semibold text-gray-900'>Analytics</span>
				</Link>
			</div>

			{/* Navigation */}
			<nav className='flex-1 space-y-1 px-3 py-4'>
				{navigation.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== '/dashboard' && pathname.startsWith(item.href));

					return (
						<Link
							key={item.name}
							href={item.href}
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
					<p className='mt-1 text-xs text-gray-500'>1,247 / 10,000 sessions</p>
				</div>
			</div>
		</aside>
	);
}
