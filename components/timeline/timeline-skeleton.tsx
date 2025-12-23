import { Skeleton } from "@/components/ui/skeleton";

export function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative pl-8 pb-8">
          <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-muted bg-background" />
          <div className="ml-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
