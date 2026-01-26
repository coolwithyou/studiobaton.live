"use client";

import { useState } from "react";
import { FolderGit2, Plus, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ExternalReposSectionProps {
  githubName: string;
  externalRepos: string[];
  canEdit?: boolean;
}

export function ExternalReposSection({
  githubName,
  externalRepos: initialRepos,
  canEdit = false,
}: ExternalReposSectionProps) {
  const [externalRepos, setExternalRepos] = useState(initialRepos);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingRepo, setDeletingRepo] = useState<string | null>(null);

  const handleAddRepo = async () => {
    const repo = newRepoInput.trim();
    if (!repo) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/member/${githubName}/external-repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setExternalRepos(result.externalRepos);
        setNewRepoInput("");
        setIsAddDialogOpen(false);
        toast.success("외부 레포지토리 추가 완료", {
          description: `${repo}가 추가되었습니다.`,
        });
      } else {
        throw new Error(result.error || "추가 중 오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("추가 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRepo = async (repo: string) => {
    setDeletingRepo(repo);
    try {
      const response = await fetch(`/api/member/${githubName}/external-repos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setExternalRepos(result.externalRepos);
        toast.success("외부 레포지토리 삭제 완료", {
          description: `${repo}가 삭제되었습니다.`,
        });
      } else {
        throw new Error(result.error || "삭제 중 오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("삭제 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setDeletingRepo(null);
    }
  };

  // 레포가 없고 편집 권한도 없으면 아무것도 표시하지 않음
  if (externalRepos.length === 0 && !canEdit) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <FolderGit2 className="w-4 h-4" />
          외부 레포지토리
        </h3>
        {canEdit && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>외부 레포지토리 추가</DialogTitle>
                <DialogDescription>
                  커밋을 수집할 외부 레포지토리를 추가합니다. GitHub 토큰에 접근 권한이 있어야 합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="owner/repo (예: ffgg/personal-project)"
                  value={newRepoInput}
                  onChange={(e) => setNewRepoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAdding) {
                      handleAddRepo();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  GitHub 사용자명 또는 조직명/레포지토리명 형식으로 입력하세요.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isAdding}
                >
                  취소
                </Button>
                <Button onClick={handleAddRepo} disabled={isAdding || !newRepoInput.trim()}>
                  {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {externalRepos.length > 0 ? (
        <ul className="space-y-1">
          {externalRepos.map((repo) => (
            <li
              key={repo}
              className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-md hover:bg-muted/50 group"
            >
              <a
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                <span className="truncate">{repo}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              {canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      disabled={deletingRepo === repo}
                    >
                      {deletingRepo === repo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>레포지토리 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{repo}</strong>를 외부 레포지토리 목록에서 삭제하시겠습니까?
                        <br />
                        이미 수집된 커밋은 삭제되지 않습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteRepo(repo)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          등록된 외부 레포지토리가 없습니다.
        </p>
      )}
    </div>
  );
}
