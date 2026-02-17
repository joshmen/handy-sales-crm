import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function PriceListsLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={6} columns={5} showFilters={true} />
    </div>
  );
}
