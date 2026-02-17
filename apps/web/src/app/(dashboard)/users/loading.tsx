import { ListPageSkeleton } from "@/components/ui/Skeleton";

export default function UsersLoading() {
  return (
    <div className="p-6">
      <ListPageSkeleton rows={6} columns={5} showFilters={true} />
    </div>
  );
}
