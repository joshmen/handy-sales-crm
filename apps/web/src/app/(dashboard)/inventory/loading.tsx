import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function InventoryLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={8} columns={6} showFilters={true} />
    </div>
  );
}
