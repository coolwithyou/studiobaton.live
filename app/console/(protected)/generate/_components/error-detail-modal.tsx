"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export interface ErrorDetails {
  code: string;
  message: string;
  status?: number;
  type?: string;
  suggestion?: string;
  requestId?: string;
}

interface ErrorDetailModalProps {
  open: boolean;
  onClose: () => void;
  error?: string;
  errorDetails?: ErrorDetails;
}

const errorCodeLabels: Record<string, string> = {
  INSUFFICIENT_CREDITS: "크레딧 부족",
  INVALID_REQUEST: "잘못된 요청",
  AUTH_ERROR: "인증 오류",
  PERMISSION_ERROR: "권한 오류",
  RATE_LIMIT: "요청 제한 초과",
  OVERLOADED: "서버 과부하",
  API_ERROR: "API 오류",
  UNKNOWN_ERROR: "알 수 없는 오류",
};

const errorCodeColors: Record<string, string> = {
  INSUFFICIENT_CREDITS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  RATE_LIMIT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  OVERLOADED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  AUTH_ERROR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PERMISSION_ERROR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  INVALID_REQUEST: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  API_ERROR: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UNKNOWN_ERROR: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function ErrorDetailModal({
  open,
  onClose,
  error,
  errorDetails,
}: ErrorDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyError = async () => {
    const errorText = [
      `Error Code: ${errorDetails?.code || "UNKNOWN"}`,
      `Message: ${error || errorDetails?.message || "알 수 없는 오류"}`,
      errorDetails?.status ? `Status: ${errorDetails.status}` : null,
      errorDetails?.type ? `Type: ${errorDetails.type}` : null,
      errorDetails?.requestId ? `Request ID: ${errorDetails.requestId}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy error details");
    }
  };

  const code = errorDetails?.code || "UNKNOWN_ERROR";
  const codeLabel = errorCodeLabels[code] || code;
  const codeColor = errorCodeColors[code] || errorCodeColors.UNKNOWN_ERROR;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            AI 작업 중 오류 발생
          </DialogTitle>
          <DialogDescription>
            AI 글 생성 과정에서 오류가 발생했습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 에러 코드 배지 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              오류 유형:
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${codeColor}`}
            >
              {codeLabel}
            </span>
          </div>

          {/* 에러 메시지 */}
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {error || errorDetails?.message || "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>

          {/* 해결 방법 제안 */}
          {errorDetails?.suggestion && (
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-1 text-sm font-medium">해결 방법</h4>
              <p className="text-sm text-muted-foreground">
                {errorDetails.suggestion}
              </p>
            </div>
          )}

          {/* 상세 정보 (개발자용) */}
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium hover:bg-muted/50">
              기술적 상세 정보
            </summary>
            <div className="border-t px-4 py-3 text-xs font-mono space-y-1 text-muted-foreground">
              <p>
                <span className="text-foreground">Code:</span> {errorDetails?.code || "UNKNOWN"}
              </p>
              {errorDetails?.status && (
                <p>
                  <span className="text-foreground">HTTP Status:</span>{" "}
                  {errorDetails.status}
                </p>
              )}
              {errorDetails?.type && (
                <p>
                  <span className="text-foreground">Type:</span>{" "}
                  {errorDetails.type}
                </p>
              )}
              {errorDetails?.requestId && (
                <p>
                  <span className="text-foreground">Request ID:</span>{" "}
                  {errorDetails.requestId}
                </p>
              )}
            </div>
          </details>

          {/* 크레딧 부족 시 특별 안내 */}
          {errorDetails?.code === "INSUFFICIENT_CREDITS" && (
            <a
              href="https://console.anthropic.com/settings/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Anthropic 대시보드에서 크레딧 충전하기
            </a>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyError}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? "복사됨!" : "오류 정보 복사"}
          </Button>
          <Button onClick={onClose}>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
