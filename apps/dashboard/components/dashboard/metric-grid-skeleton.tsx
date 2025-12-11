export function MetricGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{[...Array(4)].map((_, i) => (
				<div
					key={i}
					className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
				>
					<div className="flex items-center justify-between">
						<div className="h-4 w-24 skeleton" />
						<div className="h-5 w-5 skeleton rounded" />
					</div>
					<div className="mt-4 h-8 w-32 skeleton" />
					<div className="mt-3 flex items-center space-x-2">
						<div className="h-4 w-4 skeleton rounded" />
						<div className="h-4 w-16 skeleton" />
					</div>
				</div>
			))}
		</div>
	);
}
