'use client';

import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

interface ActivityChartProps {
	title: string;
	type: 'sessions' | 'errors';
}

// Mock data - will be replaced with actual API data
const sessionsData = [
	{ date: 'Mon', value: 1200 },
	{ date: 'Tue', value: 1350 },
	{ date: 'Wed', value: 1100 },
	{ date: 'Thu', value: 1450 },
	{ date: 'Fri', value: 1320 },
	{ date: 'Sat', value: 890 },
	{ date: 'Sun', value: 950 },
];

const errorsData = [
	{ type: 'Timeout', count: 45 },
	{ type: 'API Error', count: 32 },
	{ type: 'Rate Limit', count: 28 },
	{ type: 'Auth Failed', count: 15 },
	{ type: 'Other', count: 12 },
];

export function ActivityChart({ title, type }: ActivityChartProps) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-sm font-medium text-gray-900">{title}</h3>

			<div className="mt-4 h-64">
				<ResponsiveContainer width="100%" height="100%">
					{type === 'sessions' ? (
						<LineChart data={sessionsData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis
								dataKey="date"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: '#6b7280' }}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: '#6b7280' }}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: 'white',
									border: '1px solid #e5e7eb',
									borderRadius: '0.375rem',
									fontSize: '12px',
								}}
							/>
							<Line
								type="monotone"
								dataKey="value"
								stroke="#3b82f6"
								strokeWidth={2}
								dot={{ fill: '#3b82f6', strokeWidth: 2 }}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					) : (
						<BarChart data={errorsData} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis
								type="number"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: '#6b7280' }}
							/>
							<YAxis
								type="category"
								dataKey="type"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: '#6b7280' }}
								width={80}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: 'white',
									border: '1px solid #e5e7eb',
									borderRadius: '0.375rem',
									fontSize: '12px',
								}}
							/>
							<Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
						</BarChart>
					)}
				</ResponsiveContainer>
			</div>
		</div>
	);
}
