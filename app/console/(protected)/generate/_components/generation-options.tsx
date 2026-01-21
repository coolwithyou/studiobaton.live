"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKST } from "@/lib/date-utils";
import { Calendar, CalendarRange, Loader2, Download, FileText } from "lucide-react";
import { AVAILABLE_MODELS, AIModel, estimateCost, formatCost } from "@/lib/ai-models";

interface GenerationOptionsProps {
  selectionMode: "single" | "range";
  onSelectionModeChange: (mode: "single" | "range") => void;
  selectedDates: Date[];
  rangeStart: Date | null;
  rangeEnd: Date | null;
  excludeHolidays: boolean;
  onExcludeHolidaysChange: (value: boolean) => void;
  minCommitCount: number;
  onMinCommitCountChange: (value: number) => void;
  forceRegenerate: boolean;
  onForceRegenerateChange: (value: boolean) => void;
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  onCollectCommits: () => void;
  onGeneratePost: () => void;
  isCollecting: boolean;
  isGenerating: boolean;
  canGeneratePost: boolean;
  commitCount?: number; // 수집된 커밋 수 (예상 요금 계산용)
  hasExistingPost?: boolean; // 선택된 날짜에 이미 Post가 있는지 여부
}

export function GenerationOptions({
  selectionMode,
  onSelectionModeChange,
  selectedDates,
  rangeStart,
  rangeEnd,
  excludeHolidays,
  onExcludeHolidaysChange,
  minCommitCount,
  onMinCommitCountChange,
  forceRegenerate,
  onForceRegenerateChange,
  selectedModel,
  onModelChange,
  onCollectCommits,
  onGeneratePost,
  isCollecting,
  isGenerating,
  canGeneratePost,
  commitCount = 0,
  hasExistingPost = false,
}: GenerationOptionsProps) {
  const hasSelection =
    selectedDates.length > 0 || (rangeStart !== null && rangeEnd !== null);

  const getSelectionText = () => {
    if (rangeStart && rangeEnd) {
      return `${formatKST(rangeStart, "M월 d일")} ~ ${formatKST(rangeEnd, "M월 d일")}`;
    }
    if (selectedDates.length === 1) {
      return formatKST(selectedDates[0], "yyyy년 M월 d일");
    }
    if (selectedDates.length > 1) {
      return `${selectedDates.length}개 날짜 선택됨`;
    }
    return "날짜를 선택하세요";
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-semibold">생성 옵션</h3>

      {/* 선택 모드 */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">선택 모드</Label>
        <div className="flex gap-2">
          <Button
            variant={selectionMode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectionModeChange("single")}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-1" />
            단일
          </Button>
          <Button
            variant={selectionMode === "range" ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectionModeChange("range")}
            className="flex-1"
          >
            <CalendarRange className="h-4 w-4 mr-1" />
            구간
          </Button>
        </div>
      </div>

      {/* 선택된 날짜 표시 */}
      <div className="p-3 bg-muted/50 rounded-md">
        <p className="text-sm font-medium">{getSelectionText()}</p>
      </div>

      {/* 구간 선택 옵션 */}
      {selectionMode === "range" && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="excludeHolidays"
              checked={excludeHolidays}
              onCheckedChange={(checked) =>
                onExcludeHolidaysChange(checked as boolean)
              }
            />
            <Label htmlFor="excludeHolidays" className="text-sm cursor-pointer">
              공휴일 제외
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minCommitCount" className="text-sm">
              최소 커밋 수
            </Label>
            <Input
              id="minCommitCount"
              type="number"
              min={0}
              max={100}
              value={minCommitCount}
              onChange={(e) =>
                onMinCommitCountChange(parseInt(e.target.value) || 0)
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              커밋 수가 이 값 미만인 날은 건너뜁니다.
            </p>
          </div>
        </>
      )}

      {/* 덮어쓰기 옵션 */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="forceRegenerate"
          checked={forceRegenerate}
          onCheckedChange={(checked) =>
            onForceRegenerateChange(checked as boolean)
          }
        />
        <Label htmlFor="forceRegenerate" className="text-sm cursor-pointer">
          기존 Post 덮어쓰기
        </Label>
      </div>

      {/* AI 모델 선택 */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">AI 모델</Label>
        <Select value={selectedModel} onValueChange={(value) => onModelChange(value as AIModel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AVAILABLE_MODELS).map(([key, label]) => {
              const cost = commitCount > 0 ? estimateCost(commitCount, key as AIModel) : null;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span>{label}</span>
                    {cost && (
                      <span className="text-xs text-muted-foreground">
                        {formatCost(cost)}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Opus는 더 높은 품질, Sonnet은 빠른 속도와 가성비
        </p>
      </div>

      {/* 버튼들 */}
      <div className="space-y-2">
        <Button
          onClick={onCollectCommits}
          disabled={!hasSelection || isCollecting || isGenerating}
          className="w-full"
        >
          {isCollecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              수집 중...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              커밋 수집하기
            </>
          )}
        </Button>
        <Button
          onClick={onGeneratePost}
          disabled={!canGeneratePost || isCollecting || isGenerating}
          variant="secondary"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              글 생성하기
            </>
          )}
        </Button>
        {!canGeneratePost && hasSelection && (
          <p className="text-xs text-muted-foreground text-center">
            커밋을 먼저 수집해야 글을 생성할 수 있습니다.
          </p>
        )}
        {canGeneratePost && hasExistingPost && commitCount > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            이미 수집된 커밋이 있습니다. 바로 글을 생성할 수 있습니다.
          </p>
        )}
        {canGeneratePost && !hasExistingPost && commitCount > 0 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
            커밋이 수집되어 있습니다. 글 생성 시 Post가 자동 생성됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
