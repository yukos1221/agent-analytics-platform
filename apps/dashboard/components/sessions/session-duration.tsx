import { formatDuration } from '@/lib/utils';

interface SessionDurationProps {
	durationSeconds: number | null;
	className?: string;
}

export function SessionDuration({ durationSeconds, className }: SessionDurationProps) {
	if (durationSeconds === null || durationSeconds === undefined) {
		return (
			<span className={className}>
				—
			</span>
		);
	}

	return (
		<span className={className}>
			{formatDuration(durationSeconds * 1000)} {/* formatDuration expects milliseconds */}
		</span>
	);
}
