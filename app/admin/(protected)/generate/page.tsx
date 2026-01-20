"use client";

import { useState, useCallback } from "react";
import { eachDayOfInterval } from "date-fns";
import { formatKST } from "@/lib/date-utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateCalendar } from "./_components/generate-calendar";
import { GenerationOptions } from "./_components/generation-options";
import { GenerationProgress } from "./_components/generation-progress";
import { ErrorDetailModal, ErrorDetails } from "./_components/error-detail-modal";
import { DEFAULT_MODEL, AIModel } from "@/lib/ai-models";

interface CollectResult {
  success: boolean;
  postId?: string;
  newCommitsCount?: number;
  existingCommitsCount?: number;
  totalCommitsCount?: number;
  totalDays?: number;
  processedDays?: number;
  skippedDays?: Array<{
    date: string;
    reason: "holiday" | "low_commits" | "already_exists" | "error" | "no_commits";
  }>;
  results?: Array<{
    date: string;
    postId: string;
    newCommitsCount: number;
    totalCommitsCount: number;
  }>;
  error?: string;
}

interface GenerationResult {
  success: boolean;
  postId?: string;
  versionId?: string;
  tone?: string;
  totalDays?: number;
  processedDays?: number;
  skippedDays?: Array<{
    date: string;
    reason: "holiday" | "low_commits" | "already_exists" | "no_commits" | "error";
  }>;
  results?: Array<{
    date: string;
    postId: string;
    versionId?: string;
  }>;
  error?: string;
  errorDetails?: ErrorDetails;
}

export default function GeneratePage() {
  // 선택 상태
  const [selectionMode, setSelectionMode] = useState<"single" | "range">(
    "single"
  );
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  // 옵션 상태
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [minCommitCount, setMinCommitCount] = useState(5);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);

  // 수집/생성 상태
  const [isCollecting, setIsCollecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResult | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentDate?: string;
  } | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // 선택된 날짜에 대해 커밋이 수집되었는지 확인
  const canGeneratePost =
    collectResult?.success === true &&
    (collectResult.totalCommitsCount ?? 0) > 0;

  // 에러 모달 상태
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    error?: string;
    errorDetails?: ErrorDetails;
  } | null>(null);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (selectionMode === "single") {
        setSelectedDates([date]);
        setRangeStart(null);
        setRangeEnd(null);
      } else {
        // range 모드에서 첫 번째 클릭은 시작점
        setRangeStart(date);
        setRangeEnd(null);
        setSelectedDates([]);
      }
      setResult(null);
    },
    [selectionMode]
  );

  const handleRangeSelect = useCallback((start: Date, end: Date) => {
    setRangeStart(start);
    setRangeEnd(end);
    // 범위 내 모든 날짜를 선택으로 표시
    const dates = eachDayOfInterval({ start, end });
    setSelectedDates(dates);
    setResult(null);
  }, []);

  const handleSelectionModeChange = useCallback((mode: "single" | "range") => {
    setSelectionMode(mode);
    setSelectedDates([]);
    setRangeStart(null);
    setRangeEnd(null);
    setResult(null);
  }, []);

  // 커밋 수집 핸들러
  const handleCollectCommits = async () => {
    setIsCollecting(true);
    setCollectResult(null);
    setResult(null);

    try {
      if (selectionMode === "single" && selectedDates.length === 1) {
        // 단일 날짜 커밋 수집
        const response = await fetch("/api/admin/commits/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formatKST(selectedDates[0], "yyyy-MM-dd"),
          }),
        });

        const data = await response.json();
        setCollectResult(data);
      } else if (rangeStart && rangeEnd) {
        // 구간 커밋 수집 - SSE 스트림 사용
        const response = await fetch("/api/admin/commits/collect/batch/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: formatKST(rangeStart, "yyyy-MM-dd"),
            endDate: formatKST(rangeEnd, "yyyy-MM-dd"),
            excludeHolidays,
            minCommitCount,
          }),
        });

        if (!response.body) {
          throw new Error("스트림을 읽을 수 없습니다.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "progress") {
                  setProgress({
                    current: event.data.current,
                    total: event.data.total,
                    currentDate: event.data.currentDate,
                  });
                } else if (event.type === "complete") {
                  setCollectResult({
                    success: true,
                    totalDays: event.data.total,
                    processedDays: event.data.processedDays,
                    results: event.data.results,
                    skippedDays: event.data.skippedDays,
                    totalCommitsCount: event.data.totalCommitsCount,
                  });
                  setProgress(null);
                } else if (event.type === "error") {
                  setCollectResult({
                    success: false,
                    error: event.data.error,
                  });
                  setProgress(null);
                }
              } catch {
                // JSON 파싱 실패는 무시 (불완전한 청크)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Collect error:", error);
      setCollectResult({
        success: false,
        error: "커밋 수집 중 오류가 발생했습니다.",
      });
    } finally {
      setIsCollecting(false);
    }
  };

  // 글 생성 핸들러
  const handleGeneratePost = async () => {
    if (!collectResult?.postId && !collectResult?.results?.length) {
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      if (selectionMode === "single" && collectResult?.postId) {
        // 단일 포스트 버전 생성 (PROFESSIONAL만)
        const response = await fetch(
          `/api/admin/posts/${collectResult.postId}/versions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone: "PROFESSIONAL", model: selectedModel }),
          }
        );

        const data = await response.json();
        setResult(data);

        // 에러 발생 시 에러 모달 표시
        if (!data.success && data.errorDetails) {
          setErrorModalData({
            error: data.error,
            errorDetails: data.errorDetails,
          });
          setErrorModalOpen(true);
        }
      } else if (rangeStart && rangeEnd && collectResult?.results) {
        // 구간 글 생성 - SSE 스트림 사용
        const postIds = collectResult.results.map((r) => r.postId);
        const response = await fetch("/api/admin/generate/versions/batch/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postIds,
            tone: "PROFESSIONAL",
            model: selectedModel,
          }),
        });

        if (!response.body) {
          throw new Error("스트림을 읽을 수 없습니다.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "progress") {
                  setProgress({
                    current: event.data.current,
                    total: event.data.total,
                    currentDate: event.data.currentDate,
                  });
                } else if (event.type === "complete") {
                  setResult({
                    success: true,
                    totalDays: event.data.total,
                    processedDays: event.data.processedDays,
                    results: event.data.results,
                    skippedDays: event.data.skippedDays,
                  });
                  setProgress(null);
                } else if (event.type === "error") {
                  setResult({
                    success: false,
                    error: event.data.error,
                    errorDetails: event.data.errorDetails,
                  });
                  setProgress(null);

                  // 에러 상세 정보가 있으면 모달 표시
                  if (event.data.errorDetails) {
                    setErrorModalData({
                      error: event.data.error,
                      errorDetails: event.data.errorDetails,
                    });
                    setErrorModalOpen(true);
                  }
                }
              } catch {
                // JSON 파싱 실패는 무시 (불완전한 청크)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      setResult({
        success: false,
        error: "글 생성 중 오류가 발생했습니다.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedDates([]);
    setRangeStart(null);
    setRangeEnd(null);
    setCollectResult(null);
    setResult(null);
    setProgress(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">커밋 수집</h1>
        <p className="text-muted-foreground mt-1">
          날짜를 선택하여 커밋을 수집하고 글을 생성합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 캘린더 (2/3 너비) */}
        <div className="lg:col-span-2">
          <GenerateCalendar
            selectedDates={selectedDates}
            onDateSelect={handleDateSelect}
            onRangeSelect={handleRangeSelect}
            selectionMode={selectionMode}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>

        {/* 오른쪽: 옵션 및 결과 패널 (1/3 너비) */}
        <div className="space-y-4">
          <GenerationOptions
            selectionMode={selectionMode}
            onSelectionModeChange={handleSelectionModeChange}
            selectedDates={selectedDates}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            excludeHolidays={excludeHolidays}
            onExcludeHolidaysChange={setExcludeHolidays}
            minCommitCount={minCommitCount}
            onMinCommitCountChange={setMinCommitCount}
            forceRegenerate={forceRegenerate}
            onForceRegenerateChange={setForceRegenerate}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onCollectCommits={handleCollectCommits}
            onGeneratePost={handleGeneratePost}
            isCollecting={isCollecting}
            isGenerating={isGenerating}
            canGeneratePost={canGeneratePost}
          />

          <GenerationProgress
            isGenerating={isGenerating}
            progress={progress}
            result={result}
            onReset={handleReset}
            onShowErrorDetails={
              result?.errorDetails
                ? () => {
                    setErrorModalData({
                      error: result.error,
                      errorDetails: result.errorDetails,
                    });
                    setErrorModalOpen(true);
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* 에러 상세 모달 */}
      <ErrorDetailModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        error={errorModalData?.error}
        errorDetails={errorModalData?.errorDetails}
      />
    </div>
  );
}
