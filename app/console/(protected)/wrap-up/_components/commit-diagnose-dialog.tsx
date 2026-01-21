"use client";

import { useState } from "react";
import { formatKST } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Mail,
  GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnoseData {
  member: {
    id: string;
    name: string;
    githubName: string;
    email: string;
  };
  date: string;
  githubCommits: {
    sha: string;
    message: string;
    authorEmail: string | null;
    authorName: string | null;
    repository: string;
    url: string;
  }[];
  dbCommits: {
    sha: string;
    message: string;
    authorEmail: string | null;
    repository: string;
  }[];
  diagnosis: {
    missingInDb: {
      sha: string;
      message: string;
      repository: string;
      authorEmail: string | null;
    }[];
    missingInGithub: string[];
    emailMismatches: {
      sha: string;
      githubEmail: string;
      memberEmail: string;
      message: string;
      repository: string;
    }[];
    summary: {
      githubTotal: number;
      dbTotal: number;
      matched: number;
      missingInDbCount: number;
      emailMismatchCount: number;
    };
  };
  githubSearchUrl: string;
}

interface CommitDiagnoseDialogProps {
  memberId: string;
  memberName: string;
  date: Date;
}

export function CommitDiagnoseDialog({
  memberId,
  memberName,
  date,
}: CommitDiagnoseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnoseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = formatKST(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/console/commits/diagnose?date=${dateStr}&memberId=${memberId}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "진단에 실패했습니다.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "진단에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !data && !loading) {
      handleDiagnose();
    }
  };

  const summary = data?.diagnosis.summary;
  const hasIssues =
    summary && (summary.missingInDbCount > 0 || summary.emailMismatchCount > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Stethoscope className="size-4" />
          커밋 진단
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-5" />
            커밋 진단 - {memberName}
            <span className="text-muted-foreground font-normal text-sm">
              ({formatKST(date, "PPP")})
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              GitHub에서 커밋을 조회하고 있습니다...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* 요약 */}
            <div
              className={cn(
                "p-4 rounded-lg border",
                hasIssues
                  ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20"
                  : "bg-green-50 border-green-200 dark:bg-green-950/20"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                {hasIssues ? (
                  <AlertTriangle className="size-5 text-orange-500" />
                ) : (
                  <CheckCircle2 className="size-5 text-green-500" />
                )}
                <span className="font-medium">
                  {hasIssues ? "문제가 발견되었습니다" : "정상입니다"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">GitHub 커밋:</span>
                  <span className="font-medium">{summary?.githubTotal}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">DB 커밋:</span>
                  <span className="font-medium">{summary?.dbTotal}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-muted-foreground">매칭됨:</span>
                  <span className="font-medium text-green-600">
                    {summary?.matched}개
                  </span>
                </div>
                {summary && summary.missingInDbCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="size-4 text-red-500" />
                    <span className="text-muted-foreground">DB 누락:</span>
                    <span className="font-medium text-red-600">
                      {summary.missingInDbCount}개
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 이메일 불일치 */}
            {data.diagnosis.emailMismatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-orange-500" />
                  <h3 className="font-medium">이메일 불일치 감지</h3>
                  <Badge variant="outline" className="text-orange-600">
                    {data.diagnosis.emailMismatches.length}건
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  다음 커밋들은 팀원 이메일({data.member.email})과 다른 이메일로
                  커밋되어 DB에 매칭되지 않았습니다.
                </p>
                <div className="space-y-2">
                  {data.diagnosis.emailMismatches.map((mismatch) => (
                    <div
                      key={mismatch.sha}
                      className="p-3 border rounded-lg bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {mismatch.sha}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {mismatch.repository}
                        </span>
                      </div>
                      <p className="text-sm truncate">{mismatch.message}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-600">
                          GitHub: {mismatch.githubEmail}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-600">
                          등록됨: {mismatch.memberEmail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DB 누락 커밋 */}
            {data.diagnosis.missingInDb.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-red-500" />
                  <h3 className="font-medium">DB에 누락된 커밋</h3>
                  <Badge variant="outline" className="text-red-600">
                    {data.diagnosis.missingInDb.length}건
                  </Badge>
                </div>
                <div className="space-y-2">
                  {data.diagnosis.missingInDb.map((commit) => (
                    <div
                      key={commit.sha}
                      className="p-3 border rounded-lg bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {commit.sha}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {commit.repository}
                        </span>
                      </div>
                      <p className="text-sm truncate">{commit.message}</p>
                      {commit.authorEmail && (
                        <p className="text-xs text-muted-foreground">
                          커밋 이메일: {commit.authorEmail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub에서 확인 */}
            <div className="pt-2 border-t">
              <a
                href={data.githubSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-4" />
                GitHub에서 직접 확인하기
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
