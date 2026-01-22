"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatKST, nowKST, subDaysKST } from "@/lib/date-utils";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamCommitsAreaChart } from "./team-commits-area-chart";

interface StatsData {
  summary: {
    totalCommits: number;
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    uniqueAuthors: number;
    totalAdditions: number;
    totalDeletions: number;
  };
  trend: Array<{
    date: string;
    label: string;
    commits: number;
  }>;
  repositories: Array<{
    name: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
    groupBy: string;
  };
}

interface DeveloperDailyActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface DeveloperStats {
  author: string;
  avatar: string | null;
  dailyActivity: DeveloperDailyActivity[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  className?: string;
}

function StatCard({ label, value, subValue, className }: StatCardProps) {
  return (
    <div className={cn("p-4 border rounded-md", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-medium mt-1">{value.toLocaleString()}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      )}
    </div>
  );
}

export function StatsDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [developers, setDevelopers] = useState<DeveloperStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: formatKST(subDaysKST(nowKST(), 30), "yyyy-MM-dd"),
    endDate: formatKST(nowKST(), "yyyy-MM-dd"),
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // 병렬 API 호출
      const [statsRes, devRes] = await Promise.all([
        fetch(`/api/console/stats?${params}`),
        fetch(`/api/console/stats/developers?days=7`),
      ]);

      if (!statsRes.ok) {
        throw new Error("통계 데이터를 불러오는데 실패했습니다.");
      }

      const result = await statsRes.json();
      setData(result);

      if (devRes.ok) {
        const devResult = await devRes.json();
        setDevelopers(devResult.developers || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, trend, repositories } = data;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4 text-sm">
        <label className="text-muted-foreground">기간</label>
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) =>
            setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
          }
          className="px-2 py-1 border rounded-md bg-background"
        />
        <span className="text-muted-foreground">~</span>
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) =>
            setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
          }
          className="px-2 py-1 border rounded-md bg-background"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="총 커밋" value={summary.totalCommits} />
        <StatCard
          label="발행 글"
          value={summary.publishedPosts}
          subValue={`전체 ${summary.totalPosts}개 중`}
        />
        <StatCard label="기여자" value={summary.uniqueAuthors} />
        <StatCard
          label="코드 변경"
          value={`+${summary.totalAdditions.toLocaleString()}`}
          subValue={`-${summary.totalDeletions.toLocaleString()}`}
        />
      </div>

      {/* Trend Chart */}
      <div className="border rounded-md p-4">
        <h3 className="text-sm font-medium mb-4">최근 7일 커밋 활동</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => `${label}요일`}
                formatter={(value) => [`${value} 커밋`, ""]}
              />
              <Line
                type="monotone"
                dataKey="commits"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--foreground))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Commits Area Chart */}
      <TeamCommitsAreaChart developers={developers} />

      {/* Repository Stats */}
      <div className="border rounded-md p-4">
        <h3 className="text-sm font-medium mb-4">프로젝트별 활동</h3>
        {repositories.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repositories} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      commits: "커밋",
                      additions: "추가",
                      deletions: "삭제",
                    };
                    return [
                      typeof value === "number" ? value.toLocaleString() : value,
                      labels[String(name)] || String(name),
                    ];
                  }}
                />
                <Bar
                  dataKey="commits"
                  fill="hsl(var(--foreground))"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            데이터가 없습니다.
          </p>
        )}
      </div>

      {/* Detailed Repository Table */}
      {repositories.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">프로젝트</th>
                <th className="text-right px-4 py-2 font-medium">커밋</th>
                <th className="text-right px-4 py-2 font-medium">추가</th>
                <th className="text-right px-4 py-2 font-medium">삭제</th>
              </tr>
            </thead>
            <tbody>
              {repositories.map((repo) => (
                <tr key={repo.name} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{repo.name}</td>
                  <td className="px-4 py-2 text-right">{repo.commits}</td>
                  <td className="px-4 py-2 text-right text-green-600">
                    +{repo.additions.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    -{repo.deletions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
