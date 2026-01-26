"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";

interface RepositoryMapping {
  id: string;
  displayName: string;
  maskName: string | null;
  description: string | null;
  isActive: boolean;
}

interface Repository {
  name: string;
  description: string;
  isPrivate: boolean;
  url: string | null;
  syncedAt: string;
  lastCommitAt: string | null;
  isExternal: boolean;
  mapping: RepositoryMapping | null;
}

interface RepositorySpreadsheetProps {
  onDataChange?: () => void;
}

export function RepositorySpreadsheet({ onDataChange }: RepositorySpreadsheetProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ repoName: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchRepositories = useCallback(async () => {
    try {
      const response = await fetch("/api/console/repositories");
      const data = await response.json();
      setRepositories(data.repositories || []);
      setLastSyncedAt(data.lastSyncedAt);
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/console/repositories/sync", {
        method: "POST",
      });
      if (response.ok) {
        await fetchRepositories();
        onDataChange?.();
      } else {
        alert("동기화에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to sync:", error);
      alert("동기화에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCellClick = (repoName: string, field: string, currentValue: string) => {
    setEditingCell({ repoName, field });
    setEditValue(currentValue);
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    const repo = repositories.find((r) => r.name === editingCell.repoName);
    if (!repo) {
      setEditingCell(null);
      return;
    }

    const trimmedValue = editValue.trim();

    // displayName이 비어있으면 저장하지 않음
    if (editingCell.field === "displayName" && !trimmedValue) {
      setEditingCell(null);
      return;
    }

    // 변경 없으면 저장하지 않음
    const currentValue =
      editingCell.field === "displayName"
        ? repo.mapping?.displayName || ""
        : editingCell.field === "maskName"
        ? repo.mapping?.maskName || ""
        : repo.mapping?.description || "";

    if (trimmedValue === currentValue) {
      setEditingCell(null);
      return;
    }

    setSaving(editingCell.repoName);

    try {
      if (repo.mapping) {
        // 기존 매핑 업데이트
        await fetch("/api/console/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: repo.mapping.id,
            [editingCell.field]: trimmedValue || null,
          }),
        });
      } else if (editingCell.field === "displayName" && trimmedValue) {
        // 새 매핑 생성 (displayName 입력 시)
        await fetch("/api/console/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repositoryName: editingCell.repoName,
            displayName: trimmedValue,
          }),
        });
      }

      await fetchRepositories();
      onDataChange?.();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(null);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleToggleActive = async (repo: Repository) => {
    if (!repo.mapping) return;

    try {
      await fetch("/api/console/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: repo.mapping.id,
          isActive: !repo.mapping.isActive,
        }),
      });
      await fetchRepositories();
      onDataChange?.();
    } catch (error) {
      console.error("Failed to toggle active:", error);
    }
  };

  const handleDelete = async (repo: Repository) => {
    if (!repo.mapping) return;
    if (!confirm(`"${repo.mapping.displayName}" 매핑을 삭제하시겠습니까?`)) return;

    try {
      await fetch(`/api/console/projects?id=${repo.mapping.id}`, {
        method: "DELETE",
      });
      await fetchRepositories();
      onDataChange?.();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // 서버에서 최신 커밋 순으로 정렬된 상태 유지
  const sortedRepositories = repositories;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              동기화 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              GitHub 동기화
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          마지막 동기화: {formatDate(lastSyncedAt)}
        </span>
      </div>

      {repositories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          리포지토리가 없습니다. GitHub 동기화 버튼을 클릭하여 리포지토리를 가져오세요.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">리포지토리</th>
                <th className="text-left p-3 font-medium">표시 이름</th>
                <th className="text-left p-3 font-medium">마스킹명</th>
                <th className="text-center p-3 font-medium w-20">활성</th>
                <th className="text-center p-3 font-medium w-24">상태</th>
                <th className="text-center p-3 font-medium w-20">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRepositories.map((repo) => (
                <tr
                  key={repo.name}
                  className={`hover:bg-muted/30 ${saving === repo.name ? "opacity-50" : ""}`}
                >
                  {/* 리포지토리명 */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{repo.name}</span>
                      {repo.isExternal && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          외부
                        </Badge>
                      )}
                      {repo.url && (
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {repo.lastCommitAt && (
                      <div className="text-xs text-muted-foreground">
                        최신 커밋: {formatDate(repo.lastCommitAt)}
                      </div>
                    )}
                  </td>

                  {/* 표시 이름 */}
                  <td className="p-3">
                    {editingCell?.repoName === repo.name && editingCell.field === "displayName" ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        className="h-8"
                        placeholder="표시 이름 입력..."
                      />
                    ) : (
                      <div
                        onClick={() =>
                          handleCellClick(repo.name, "displayName", repo.mapping?.displayName || "")
                        }
                        className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[32px] flex items-center"
                      >
                        {repo.mapping?.displayName || (
                          <span className="text-muted-foreground">클릭하여 입력...</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 마스킹명 */}
                  <td className="p-3">
                    {editingCell?.repoName === repo.name && editingCell.field === "maskName" ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        className="h-8"
                        placeholder="마스킹명 입력..."
                      />
                    ) : (
                      <div
                        onClick={() =>
                          repo.mapping &&
                          handleCellClick(repo.name, "maskName", repo.mapping?.maskName || "")
                        }
                        className={`rounded px-2 py-1 min-h-[32px] flex items-center ${
                          repo.mapping
                            ? "cursor-pointer hover:bg-muted/50"
                            : "cursor-not-allowed opacity-50"
                        }`}
                      >
                        {repo.mapping?.maskName || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 활성 체크박스 */}
                  <td className="p-3 text-center">
                    <Checkbox
                      checked={repo.mapping?.isActive ?? false}
                      onCheckedChange={() => handleToggleActive(repo)}
                      disabled={!repo.mapping}
                    />
                  </td>

                  {/* 상태 배지 */}
                  <td className="p-3 text-center">
                    <Badge variant={repo.mapping ? "default" : "secondary"}>
                      {repo.mapping ? "등록됨" : "미등록"}
                    </Badge>
                  </td>

                  {/* 삭제 버튼 */}
                  <td className="p-3 text-center">
                    {repo.mapping && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(repo)}
                      >
                        삭제
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 문구 */}
      <div className="text-sm text-muted-foreground">
        <p>* 표시 이름을 입력하면 자동으로 프로젝트가 등록됩니다.</p>
        <p>* 마스킹명은 비로그인 사용자에게 표시됩니다. 비워두면 &quot;Repository A&quot; 형태로 표시됩니다.</p>
        <p>* <Badge variant="outline" className="text-xs px-1.5 py-0 mx-0.5">외부</Badge> 표시는 팀원이 등록한 외부 레포지토리입니다.</p>
      </div>
    </div>
  );
}
