import { DeveloperStatsDashboard } from "@/components/admin/developer-stats-dashboard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DeveloperStatsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/admin/stats"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          통계로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold">개발자 활동 통계</h1>
        <p className="text-muted-foreground mt-1">
          개발자별 커밋 활동과 작업 패턴을 확인하세요
        </p>
      </div>

      <DeveloperStatsDashboard />
    </div>
  );
}
