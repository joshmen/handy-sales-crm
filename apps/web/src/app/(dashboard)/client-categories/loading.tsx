import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function ClientCategoriesLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={6} columns={4} showFilters={true} />
    </div>
  );
}
