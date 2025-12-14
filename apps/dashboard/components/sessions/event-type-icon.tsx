import {
    Play,
    Square,
    Pause,
    RotateCcw,
    PlayCircle,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Wrench,
    ArrowLeftRight,
    AlertCircle,
    ThumbsUp,
    ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EventType =
    | 'session_start'
    | 'session_end'
    | 'session_pause'
    | 'session_resume'
    | 'task_start'
    | 'task_complete'
    | 'task_error'
    | 'task_cancel'
    | 'tool_call'
    | 'tool_response'
    | 'error'
    | 'warning'
    | 'feedback_positive'
    | 'feedback_negative';

interface EventTypeIconProps {
    eventType: EventType;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const eventTypeConfig = {
    session_start: {
        icon: Play,
        className: 'text-green-600',
        title: 'Session Started',
    },
    session_end: {
        icon: Square,
        className: 'text-blue-600',
        title: 'Session Ended',
    },
    session_pause: {
        icon: Pause,
        className: 'text-yellow-600',
        title: 'Session Paused',
    },
    session_resume: {
        icon: RotateCcw,
        className: 'text-green-600',
        title: 'Session Resumed',
    },
    task_start: {
        icon: PlayCircle,
        className: 'text-blue-600',
        title: 'Task Started',
    },
    task_complete: {
        icon: CheckCircle,
        className: 'text-green-600',
        title: 'Task Completed',
    },
    task_error: {
        icon: AlertTriangle,
        className: 'text-red-600',
        title: 'Task Error',
    },
    task_cancel: {
        icon: XCircle,
        className: 'text-gray-600',
        title: 'Task Cancelled',
    },
    tool_call: {
        icon: Wrench,
        className: 'text-purple-600',
        title: 'Tool Call',
    },
    tool_response: {
        icon: ArrowLeftRight,
        className: 'text-purple-600',
        title: 'Tool Response',
    },
    error: {
        icon: AlertCircle,
        className: 'text-red-600',
        title: 'Error',
    },
    warning: {
        icon: AlertTriangle,
        className: 'text-yellow-600',
        title: 'Warning',
    },
    feedback_positive: {
        icon: ThumbsUp,
        className: 'text-green-600',
        title: 'Positive Feedback',
    },
    feedback_negative: {
        icon: ThumbsDown,
        className: 'text-red-600',
        title: 'Negative Feedback',
    },
} as const;

const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
};

export function EventTypeIcon({ eventType, className, size = 'md' }: EventTypeIconProps) {
    const config = eventTypeConfig[eventType];
    const Icon = config.icon;

    return (
        <div title={config.title} data-testid={`event-icon-${eventType}`}>
            <Icon className={cn(sizeClasses[size], config.className, className)} />
        </div>
    );
}
