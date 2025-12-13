import {
	CheckCircle,
	XCircle,
	Clock,
	Cpu,
	DollarSign,
	Zap,
	TrendingUp,
	TrendingDown
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils/format';
import type { SessionDetailResponse } from '@/types/api';

interface SessionMetricsProps {
	session: SessionDetailResponse;
}

export function SessionMetrics({ session }: SessionMetricsProps) {
	const metrics = session.metrics;

	// Calculate success rate
	const totalTasks = metrics.tasks_completed + metrics.tasks_failed + metrics.tasks_cancelled;
	const successRate = totalTasks > 0 ? (metrics.tasks_completed / totalTasks) * 100 : 0;

	// Calculate total tokens
	const totalTokens = metrics.tokens_input + metrics.tokens_output;

	// Calculate efficiency metrics
	const tokensPerTask = totalTasks > 0 ? totalTokens / totalTasks : 0;
	const costPerTask = totalTasks > 0 ? metrics.estimated_cost / totalTasks : 0;

	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{/* Task Metrics */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div className="text-sm font-medium">Tasks</div>
					<CheckCircle className="h-4 w-4 text-gray-400" />
				</div>
				<div className="space-y-3">
					<div className="text-2xl font-bold">{formatNumber(totalTasks)}</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500 flex items-center gap-1">
								<CheckCircle className="h-3 w-3 text-green-500" />
								Completed
							</span>
							<span className="font-medium">{formatNumber(metrics.tasks_completed)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500 flex items-center gap-1">
								<XCircle className="h-3 w-3 text-red-500" />
								Failed
							</span>
							<span className="font-medium">{formatNumber(metrics.tasks_failed)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500 flex items-center gap-1">
								<Clock className="h-3 w-3 text-yellow-500" />
								Cancelled
							</span>
							<span className="font-medium">{formatNumber(metrics.tasks_cancelled)}</span>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Success Rate</span>
							<span className="font-medium">{successRate.toFixed(1)}%</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-green-500 h-2 rounded-full transition-all duration-300"
								style={{ width: `${successRate}%` }}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Token Usage */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div className="text-sm font-medium">Token Usage</div>
					<Zap className="h-4 w-4 text-gray-400" />
				</div>
				<div className="space-y-3">
					<div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Input</span>
							<span className="font-medium">{formatNumber(metrics.tokens_input)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Output</span>
							<span className="font-medium">{formatNumber(metrics.tokens_output)}</span>
						</div>
					</div>
					<div className="pt-2 border-t border-gray-200">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Per Task</span>
							<span className="font-medium">{formatNumber(Math.round(tokensPerTask))}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Cost & Performance */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div className="text-sm font-medium">Cost & Performance</div>
					<DollarSign className="h-4 w-4 text-gray-400" />
				</div>
				<div className="space-y-3">
					<div className="text-2xl font-bold">{formatCurrency(metrics.estimated_cost)}</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Per Task</span>
							<span className="font-medium">{formatCurrency(costPerTask)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Avg Task Duration</span>
							<span className="font-medium">
								{metrics.avg_task_duration_ms}ms
							</span>
						</div>
					</div>
					<div className="pt-2 border-t border-gray-200">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Cost Efficiency</span>
							<div className="flex items-center gap-1">
								{metrics.estimated_cost > 0 && totalTokens > 0 ? (
									<>
										<span className="font-medium">
											{(metrics.estimated_cost / (totalTokens / 1000)).toFixed(4)}
										</span>
										<span className="text-xs text-gray-500">/1K tokens</span>
									</>
								) : (
									<span className="font-medium">-</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Efficiency Metrics */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-2 lg:col-span-3">
				<div className="mb-4">
					<div className="text-sm font-medium">Efficiency Overview</div>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-green-500" />
							<span className="text-sm font-medium">Task Success Rate</span>
						</div>
						<div className="text-lg font-bold">{successRate.toFixed(1)}%</div>
						<p className="text-xs text-gray-500">
							{metrics.tasks_completed} of {totalTasks} tasks completed successfully
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Cpu className="h-4 w-4 text-blue-500" />
							<span className="text-sm font-medium">Token Efficiency</span>
						</div>
						<div className="text-lg font-bold">
							{formatNumber(Math.round(tokensPerTask))}
						</div>
						<p className="text-xs text-gray-500">
							Average tokens used per task
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<TrendingDown className="h-4 w-4 text-purple-500" />
							<span className="text-sm font-medium">Cost Efficiency</span>
						</div>
						<div className="text-lg font-bold">{formatCurrency(costPerTask)}</div>
						<p className="text-xs text-gray-500">
							Average cost per task completed
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
