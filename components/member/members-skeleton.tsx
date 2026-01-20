import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MembersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="relative aspect-[2/3] p-0 overflow-hidden">
          {/* 전체 배경 스켈레톤 */}
          <Skeleton className="w-full h-full" />

          {/* 하단 텍스트 영역 스켈레톤 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}
