import { cn, formatNumber } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
    unit?: string;
    icon?: React.ReactNode;
}

export function MetricCard({ title, value, change, trend, unit, icon }: MetricCardProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    const trendColor =
        trend === 'up' ? 'text-success-500' : trend === 'down' ? 'text-error-500' : 'text-gray-400';

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>

            <div className="mt-2 flex items-baseline">
                <p data-testid="metric-value" className="text-3xl font-semibold text-gray-900">
                    {typeof value === 'number' ? formatNumber(value) : value}
                </p>
                {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
            </div>

            {change !== undefined && (
                <div className="mt-2 flex items-center">
                    <TrendIcon className={cn('h-4 w-4', trendColor)} />
                    <span className={cn('ml-1 text-sm font-medium', trendColor)}>
                        {change > 0 ? '+' : ''}
                        {change.toFixed(1)}%
                    </span>
                    <span className="ml-1 text-sm text-gray-500">vs last period</span>
                </div>
            )}
        </div>
    );
}
