'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { SessionStatusBadge } from './session-status-badge';
import { SessionDuration } from './session-duration';
import type { Session } from '@/types/api';

interface SessionRowProps {
	session: Session;
	className?: string;
}

export function SessionRow({ session, className }: SessionRowProps) {
	const router = useRouter();

	const handleClick = () => {
		router.push(`/dashboard/sessions/${session.session_id}`);
	};

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return {
			date: date.toLocaleDateString(),
			time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			relative: formatDistanceToNow(date, { addSuffix: true }),
		};
	};

	const dateTime = formatDateTime(session.started_at);

	return (
		<tr
			onClick={handleClick}
			className='cursor-pointer border-b border-gray-200 hover:bg-gray-50'
			data-testid={`session-row-${session.session_id}`}
		>
			{/* Date/Time */}
			<td className='px-6 py-4'>
				<div className='text-sm'>
					<div className='font-medium text-gray-900'>{dateTime.date}</div>
					<div className='text-gray-500'>{dateTime.time}</div>
				</div>
			</td>

			{/* Status */}
			<td className='px-6 py-4'>
				<SessionStatusBadge status={session.status} />
			</td>

			{/* Duration */}
			<td className='px-6 py-4'>
				<SessionDuration
					durationSeconds={session.duration_seconds}
					className='text-sm text-gray-900'
				/>
			</td>

			{/* Agent */}
			<td className='px-6 py-4'>
				<div className='text-sm'>
					<div className='font-medium text-gray-900'>{session.agent_id}</div>
					<div className='text-gray-500 capitalize'>{session.environment}</div>
				</div>
			</td>

			{/* User */}
			<td className='px-6 py-4'>
				<div className='text-sm'>
					<div className='font-medium text-gray-900'>
						{session.user?.name || `User ${session.user_id.slice(-4)}`}
					</div>
					<div className='text-gray-500'>
						{session.user?.email || session.user_id}
					</div>
				</div>
			</td>

			{/* Metrics */}
			<td className='px-6 py-4'>
				<div className='text-sm'>
					<div className='font-medium text-gray-900'>
						{session.metrics.tasks_completed} tasks
					</div>
					<div className='text-gray-500'>
						{session.metrics.tokens_used.toLocaleString()} tokens
					</div>
				</div>
			</td>
		</tr>
	);
}
