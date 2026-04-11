import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function GlobalSettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <PageHeaderSkeleton />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-6 dark:border-border-strong dark:bg-foreground">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-surface-3" />
          <FormSkeleton fields={4} />
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-2 p-6 dark:border-border-strong dark:bg-foreground">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-surface-3" />
          <FormSkeleton fields={3} />
        </div>
      </div>
    </div>
  );
}
