import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function PromotionsLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={6} columns={6} showFilters={true} />
    </div>
  );
}
