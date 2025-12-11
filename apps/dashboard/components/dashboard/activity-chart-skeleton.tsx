interface ActivityChartSkeletonProps {
	title: string;
}

export function ActivityChartSkeleton({ title }: ActivityChartSkeletonProps) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-sm font-medium text-gray-900">{title}</h3>

			<div className="mt-4 h-64 flex items-end space-x-2">
				{[...Array(7)].map((_, i) => (
					<div
						key={i}
						className="flex-1 skeleton rounded-t"
						style={{
							height: `${Math.random() * 60 + 20}%`,
						}}
					/>
				))}
			</div>
		</div>
	);
}
