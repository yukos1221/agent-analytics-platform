import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className='flex h-screen overflow-hidden'>
			{/* Sidebar navigation per Frontend Spec §5.1 */}
			<Sidebar />

			{/* Main content area - adjust left margin on desktop to account for sidebar */}
			<div className='flex flex-1 flex-col overflow-hidden lg:ml-0'>
				{/* Top header */}
				<Header />

				{/* Page content - adjust padding for mobile */}
				<main className='flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6'>
					{children}
				</main>
			</div>
		</div>
	);
}
