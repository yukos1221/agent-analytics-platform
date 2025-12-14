import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { SessionStatus } from '@/types/api';

interface SessionStatusBadgeProps {
    status: SessionStatus;
    className?: string;
}

const statusConfig = {
    active: {
        label: 'Active',
        icon: Clock,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        iconClassName: 'text-blue-500',
    },
    completed: {
        label: 'Completed',
        icon: CheckCircle,
        className: 'bg-green-50 text-green-700 border-green-200',
        iconClassName: 'text-green-500',
    },
    error: {
        label: 'Error',
        icon: AlertCircle,
        className: 'bg-red-50 text-red-700 border-red-200',
        iconClassName: 'text-red-500',
    },
} as const;

export function SessionStatusBadge({ status, className }: SessionStatusBadgeProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <span
            data-testid="session-status"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                config.className,
                className
            )}
        >
            <Icon className={cn('h-3 w-3', config.iconClassName)} />
            {config.label}
        </span>
    );
}
