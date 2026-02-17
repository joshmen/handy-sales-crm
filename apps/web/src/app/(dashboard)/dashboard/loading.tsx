import { StatCardSkeleton, TableSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <PageHeaderSkeleton />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts/Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
          <TableSkeleton rows={5} columns={3} />
        </div>
      </div>
    </div>
  );
}
