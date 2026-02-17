import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function ProductsLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={8} columns={7} showFilters={true} />
    </div>
  );
}
