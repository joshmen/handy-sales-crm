export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1" />
          <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-5">
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="h-9 w-72 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded">
          <div className="h-10 bg-gray-50 border-b border-gray-200" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mr-4" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
