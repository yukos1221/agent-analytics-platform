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
import { useState, useMemo, memo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SessionRow } from './session-row';
import { SessionFilters } from './session-filters';
import { useSessions } from '@/lib/hooks/useSessions';
import type { Session, SessionStatus } from '@/types/api';
import type { PeriodOption } from '@/lib/hooks';

const columnHelper = createColumnHelper<Session>();

// Memoize columns to prevent unnecessary re-renders
const columns: ColumnDef<Session, any>[] = [
    columnHelper.accessor('started_at', {
        header: 'Started',
        cell: (info) => {
            const date = new Date(info.getValue());
            return (
                <div className="text-sm">
                    <div className="font-medium text-gray-900">{date.toLocaleDateString()}</div>
                    <div className="text-gray-500">
                        {date.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
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
    columnHelper.accessor((row) => row.user?.name ?? '', {
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

export const SessionTable = memo(function SessionTable({ className }: SessionTableProps) {
    const [period, setPeriod] = useState<PeriodOption>('7d');
    const [statuses, setStatuses] = useState<SessionStatus[]>([]);

    const { sessions, isLoading, error } = useSessions({
        period,
        statuses,
    });

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

    // Show skeleton only for initial load when no data
    if (isLoading && !sessions.length) {
        return (
            <div className={className}>
                {/* Filters Skeleton */}
                <div className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-gray-200" />
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="h-10 w-[160px] animate-pulse rounded-md bg-gray-200" />
                            <div className="flex gap-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-8 w-16 animate-pulse rounded-md bg-gray-200"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="min-w-full divide-y divide-gray-200">
                        {/* Header */}
                        <div className="bg-gray-50">
                            <div className="flex divide-x divide-gray-200">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex-1 px-6 py-3">
                                        <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Rows */}
                        {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <div key={rowIndex} className="flex divide-x divide-gray-200">
                                {Array.from({ length: 6 }).map((_, colIndex) => (
                                    <div key={colIndex} className="flex-1 px-6 py-4">
                                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={className}>
                {/* Filters */}
                <div className="mb-6">
                    <SessionFilters
                        period={period}
                        onPeriodChange={setPeriod}
                        selectedStatuses={statuses}
                        onStatusesChange={setStatuses}
                        isLoading={false}
                    />
                </div>

                {/* Error State */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                    <div className="text-red-600">
                        <svg
                            className="mx-auto h-12 w-12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-red-800">
                        Error loading sessions
                    </h3>
                    <p className="mt-2 text-sm text-red-700">
                        {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
                    <div className="mt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Filters */}
            <div className="mb-6">
                <SessionFilters
                    period={period}
                    onPeriodChange={setPeriod}
                    selectedStatuses={statuses}
                    onStatusesChange={setStatuses}
                    isLoading={isLoading}
                />
            </div>

            {/* Table */}
            {/* TODO: Phase 2 - Add virtualized scrolling for large datasets */}
            {/* TODO: Phase 2 - Add advanced filtering (date ranges, custom columns) */}
            {/* TODO: Phase 2 - Add export functionality (CSV, JSON) */}
            {/* TODO: Phase 2 - Add bulk actions (delete, tag, export) */}
            <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200" data-testid="sessions-table">
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
                                                                header.column.getIsSorted() ===
                                                                'asc'
                                                                    ? 'text-blue-600'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        />
                                                        <ChevronDown
                                                            className={`h-3 w-3 -mt-1 ${
                                                                header.column.getIsSorted() ===
                                                                'desc'
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

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            <span className="text-sm text-gray-600">Updating...</span>
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
});
