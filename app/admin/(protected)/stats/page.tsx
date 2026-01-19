import { StatsDashboard } from "@/components/admin/stats-dashboard";
import Link from "next/link";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">활동 통계</h1>
          <p className="text-muted-foreground mt-1">
            커밋 활동과 글 발행 현황을 확인하세요
          </p>
        </div>
        <Link
          href="/admin/stats/developers"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
        >
          <Users className="w-4 h-4" />
          개발자별 통계
        </Link>
      </div>

      <StatsDashboard />
    </div>
  );
}
