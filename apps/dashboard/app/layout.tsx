import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
	title: {
		default: 'AI Agent Analytics',
		template: '%s | AI Agent Analytics',
	},
	description:
		'Real-time analytics dashboard for AI agent performance monitoring',
	keywords: ['AI', 'analytics', 'dashboard', 'agent', 'monitoring'],
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='en' className={inter.variable}>
			<body className='min-h-screen bg-background font-sans antialiased'>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
