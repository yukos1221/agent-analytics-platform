'use client';

import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SessionRow } from './session-row';
import { SessionFilters } from './session-filters';
import { useSessions } from '@/lib/hooks/useSessions';
import type { Session } from '@/types/api';
import type { PeriodOption } from '@/lib/hooks';

const columnHelper = createColumnHelper<Session>();

const columns: ColumnDef<Session, any>[] = [
	columnHelper.accessor('started_at', {
		header: 'Started',
		cell: (info) => {
			const date = new Date(info.getValue());
			return (
				<div className="text-sm">
					<div className="font-medium text-gray-900">
						{date.toLocaleDateString()}
					</div>
					<div className="text-gray-500">
						{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</div>
				</div>
			);
		},
		sortingFn: 'datetime',
	}),
	columnHelper.accessor('status', {
		header: 'Status',
		cell: (info) => null, // Handled by SessionRow
		enableSorting: false,
	}),
	columnHelper.accessor('duration_seconds', {
		header: 'Duration',
		cell: (info) => null, // Handled by SessionRow
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.duration_seconds ?? 0;
			const b = rowB.original.duration_seconds ?? 0;
			return a - b;
		},
	}),
	columnHelper.accessor('agent_id', {
		header: 'Agent',
		cell: (info) => null, // Handled by SessionRow
		enableSorting: false,
	}),
	columnHelper.accessor((row) => row.user.name, {
		id: 'user',
		header: 'User',
		cell: (info) => null, // Handled by SessionRow
		enableSorting: false,
	}),
	columnHelper.accessor((row) => row.metrics.tasks_completed, {
		id: 'tasks',
		header: 'Tasks',
		cell: (info) => null, // Handled by SessionRow
		enableSorting: false,
	}),
];

interface SessionTableProps {
	className?: string;
}

export function SessionTable({ className }: SessionTableProps) {
	const { sessions, filters, updateFilters } = useSessions();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'started_at', desc: true }, // Default sort by date descending
	]);

	const table = useReactTable({
		data: sessions,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	});

	return (
		<div className={className}>
			{/* Filters */}
			<div className="mb-6">
				<SessionFilters
					period={filters.period}
					onPeriodChange={(period: PeriodOption) => updateFilters({ period })}
					selectedStatuses={filters.statuses}
					onStatusesChange={(statuses) => updateFilters({ statuses })}
					searchQuery={filters.searchQuery}
					onSearchChange={(query) => updateFilters({ searchQuery: query })}
				/>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
									>
										{header.isPlaceholder ? null : (
											<div
												className={`flex items-center gap-1 ${
													header.column.getCanSort()
														? 'cursor-pointer select-none hover:text-gray-700'
														: ''
												}`}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												{header.column.getCanSort() && (
													<div className="flex flex-col">
														<ChevronUp
															className={`h-3 w-3 ${
																header.column.getIsSorted() === 'asc'
																	? 'text-blue-600'
																	: 'text-gray-400'
															}`}
														/>
														<ChevronDown
															className={`h-3 w-3 -mt-1 ${
																header.column.getIsSorted() === 'desc'
																	? 'text-blue-600'
																	: 'text-gray-400'
															}`}
														/>
													</div>
												)}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{table.getRowModel().rows.map((row) => (
							<SessionRow key={row.id} session={row.original} />
						))}
					</tbody>
				</table>

				{/* Empty State */}
				{table.getRowModel().rows.length === 0 && (
					<div className="px-6 py-12 text-center">
						<div className="text-sm text-gray-500">
							No sessions found matching your filters.
						</div>
					</div>
				)}
			</div>

			{/* Pagination Info */}
			<div className="mt-4 text-sm text-gray-500">
				Showing {table.getRowModel().rows.length} sessions
			</div>
		</div>
	);
}
