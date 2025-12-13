import { SessionStatusBadge } from './session-status-badge';
import { SessionDuration } from './session-duration';
import { formatDateTime } from '@/lib/utils/format';
import type { SessionDetailResponse } from '@/types/api';

interface SessionDetailHeaderProps {
	session: SessionDetailResponse;
}

export function SessionDetailHeader({ session }: SessionDetailHeaderProps) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div className="flex items-start justify-between mb-6">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold">Session Details</h2>
					<p className="text-sm text-gray-500">
						{session.session_id}
					</p>
				</div>
				<SessionStatusBadge status={session.status} />
			</div>
				<div className="grid gap-6 md:grid-cols-2">
					<div className="space-y-4">
						<div>
							<h3 className="text-sm font-medium text-gray-500 mb-2">
								Session Info
							</h3>
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm text-gray-500">Agent:</span>
									<span className="text-sm font-medium">
										{session.agent?.name || session.agent_id}
									</span>
								</div>
								{session.agent?.version && (
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Version:</span>
										<span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium">
											{session.agent.version}
										</span>
									</div>
								)}
								<div className="flex justify-between">
									<span className="text-sm text-gray-500">Environment:</span>
									<span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium capitalize">
										{session.environment}
									</span>
								</div>
								{session.user?.name && (
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">User:</span>
										<span className="text-sm font-medium">
											{session.user.name}
										</span>
									</div>
								)}
							</div>
						</div>

						{session.client_info && (
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-2">
									Client Info
								</h3>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">IDE:</span>
										<span className="text-sm font-medium">
											{session.client_info.ide} {session.client_info.ide_version}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">OS:</span>
										<span className="text-sm font-medium">
											{session.client_info.os} {session.client_info.os_version}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-4">
						<div>
							<h3 className="text-sm font-medium text-gray-500 mb-2">
								Timing
							</h3>
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm text-gray-500">Started:</span>
									<span className="text-sm font-medium">
										{formatDateTime(session.started_at)}
									</span>
								</div>
								{session.ended_at && (
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Ended:</span>
										<span className="text-sm font-medium">
											{formatDateTime(session.ended_at)}
										</span>
									</div>
								)}
								<div className="flex justify-between">
									<span className="text-sm text-gray-500">Duration:</span>
									<SessionDuration
										durationSeconds={session.duration_seconds}
										className="text-sm font-medium"
									/>
								</div>
							</div>
						</div>

						{session.timeline && (
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-2">
									Timeline
								</h3>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Events:</span>
										<span className="text-sm font-medium">
											{session.timeline.event_count}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">First Event:</span>
										<span className="text-sm font-medium">
											{formatDateTime(session.timeline.first_event)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Last Event:</span>
										<span className="text-sm font-medium">
											{formatDateTime(session.timeline.last_event)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
		</div>
	);
}
