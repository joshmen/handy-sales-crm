export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-2 border-b border-border-subtle px-8 py-6">
        <div className="h-4 w-48 bg-surface-3 rounded animate-pulse mb-4" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 bg-surface-3 rounded animate-pulse" />
          <div className="flex-1" />
          <div className="h-9 w-40 bg-surface-3 rounded animate-pulse" />
          <div className="h-9 w-24 bg-surface-3 rounded animate-pulse" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-5">
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="h-9 w-72 bg-surface-3 rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-3 rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-3 rounded animate-pulse" />
          <div className="h-9 w-40 bg-surface-3 rounded animate-pulse" />
          <div className="h-9 w-32 bg-surface-3 rounded animate-pulse" />
        </div>

        {/* Table */}
        <div className="bg-surface-2 border border-border-subtle rounded">
          <div className="h-10 bg-surface-1 border-b border-border-subtle" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center px-4 py-3 border-b border-border-subtle">
              <div className="h-4 w-24 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-32 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-5 w-16 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-12 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-16 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-16 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-20 bg-surface-3 rounded animate-pulse mr-4" />
              <div className="h-4 w-24 bg-surface-3 rounded animate-pulse flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
