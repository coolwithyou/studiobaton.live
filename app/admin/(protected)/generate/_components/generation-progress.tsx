"use client";

import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SkippedDay {
  date: string;
  reason: "holiday" | "low_commits" | "already_exists" | "error";
}

interface ProcessedDay {
  date: string;
  postId: string;
  commitsCollected: number;
}

interface GenerationResult {
  success: boolean;
  totalDays?: number;
  processedDays?: number;
  skippedDays?: SkippedDay[];
  results?: ProcessedDay[];
  postId?: string;
  commitsCollected?: number;
  versionsGenerated?: number;
  error?: string;
}

interface GenerationProgressProps {
  isGenerating: boolean;
  progress: {
    current: number;
    total: number;
    currentDate?: string;
  } | null;
  result: GenerationResult | null;
  onReset: () => void;
}

const reasonLabels: Record<string, string> = {
  holiday: "공휴일",
  low_commits: "커밋 부족",
  already_exists: "이미 존재",
  error: "오류 발생",
};

export function GenerationProgress({
  isGenerating,
  progress,
  result,
  onReset,
}: GenerationProgressProps) {
  if (!isGenerating && !result) {
    return null;
  }

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-semibold">생성 결과</h3>

      {/* 진행 상황 */}
      {isGenerating && progress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {progress.currentDate
                ? `${progress.currentDate} 처리 중...`
                : "진행 중..."}
            </span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={progressPercent} />
          <p className="text-xs text-muted-foreground text-center">
            {progressPercent}% 완료
          </p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && !isGenerating && (
        <>
          {/* 단일 생성 결과 */}
          {result.postId && !result.results && (
            <Alert
              variant={result.success ? "default" : "destructive"}
              className={result.success ? "border-green-500" : ""}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? "생성 완료" : "생성 실패"}
              </AlertTitle>
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2">
                    <p>
                      {result.commitsCollected}개 커밋, {result.versionsGenerated}
                      개 버전 생성됨
                    </p>
                    <Link
                      href={`/admin/post/${result.postId}`}
                      className="inline-flex items-center text-primary hover:underline"
                    >
                      포스트 보기
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <p>{result.error || "알 수 없는 오류가 발생했습니다."}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 배치 생성 결과 */}
          {result.results !== undefined && (
            <div className="space-y-4">
              {/* 성공 요약 */}
              <Alert
                variant={result.processedDays! > 0 ? "default" : "destructive"}
                className={result.processedDays! > 0 ? "border-green-500" : ""}
              >
                {result.processedDays! > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>배치 생성 완료</AlertTitle>
                <AlertDescription>
                  총 {result.totalDays}일 중 {result.processedDays}일 처리됨
                </AlertDescription>
              </Alert>

              {/* 생성된 포스트 목록 */}
              {result.results && result.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">생성된 포스트</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.results.map((item) => (
                      <Link
                        key={item.postId}
                        href={`/admin/post/${item.postId}`}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm"
                      >
                        <span>{item.date}</span>
                        <span className="text-muted-foreground">
                          {item.commitsCollected}개 커밋
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 건너뛴 날짜 */}
              {result.skippedDays && result.skippedDays.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    건너뛴 날짜 ({result.skippedDays.length}일)
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {result.skippedDays.map((item) => (
                        <div
                          key={item.date}
                          className="flex items-center justify-between p-1.5 rounded bg-muted/30"
                        >
                          <span>{item.date}</span>
                          <span className="text-muted-foreground">
                            {reasonLabels[item.reason] || item.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 초기화 버튼 */}
          <Button variant="outline" onClick={onReset} className="w-full">
            새로 선택하기
          </Button>
        </>
      )}
    </div>
  );
}
