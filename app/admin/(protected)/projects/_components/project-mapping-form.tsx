"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Repository {
  name: string;
  description: string;
  isPrivate: boolean;
  url: string;
  updatedAt: string;
}

interface ProjectMapping {
  id: string;
  repositoryName: string;
  displayName: string;
  maskName: string | null;
  description: string | null;
  isActive: boolean;
}

interface ProjectMappingFormProps {
  mappings: ProjectMapping[];
  onMappingChange: () => void;
}

export function ProjectMappingForm({ mappings, onMappingChange }: ProjectMappingFormProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [maskName, setMaskName] = useState("");
  const [description, setDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/admin/repositories");
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
    } finally {
      setLoading(false);
    }
  };

  const mappedRepoNames = new Set(mappings.map((m) => m.repositoryName));

  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch && !mappedRepoNames.has(repo.name);
  });

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setDisplayName(formatDisplayName(repo.name));
    setMaskName("");
    setDescription(repo.description || "");
    setIsDialogOpen(true);
  };

  const formatDisplayName = (repoName: string): string => {
    // "kiaf.web" -> "Kiaf"
    // "magazineb.shop" -> "Magazine B"
    const baseName = repoName.split(".")[0];
    return baseName
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleSubmit = async () => {
    if (!selectedRepo || !displayName.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryName: selectedRepo.name,
          displayName: displayName.trim(),
          maskName: maskName.trim() || null,
          description: description.trim() || null,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "저장에 실패했습니다.");
        return;
      }

      setIsDialogOpen(false);
      setSelectedRepo(null);
      setDisplayName("");
      setMaskName("");
      setDescription("");
      onMappingChange();
    } catch (error) {
      console.error("Failed to save mapping:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        리포지토리 목록을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="리포지토리 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredRepos.length}개의 미등록 리포지토리
        </span>
      </div>

      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {filteredRepos.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? "검색 결과가 없습니다." : "모든 리포지토리가 등록되었습니다."}
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <Dialog key={repo.name} open={isDialogOpen && selectedRepo?.name === repo.name} onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false);
                setSelectedRepo(null);
              }
            }}>
              <DialogTrigger asChild>
                <div
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectRepo(repo)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{repo.name}</div>
                      {repo.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {repo.description}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      등록
                    </Button>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>프로젝트 매핑 등록</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">리포지토리</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {selectedRepo?.name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">표시 이름 *</label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="예: Kiaf SEOUL, Magazine B"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      로그인한 내부 사용자에게 표시됩니다.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">마스킹 이름 (선택)</label>
                    <Input
                      value={maskName}
                      onChange={(e) => setMaskName(e.target.value)}
                      placeholder="예: 고객사 A, 프로젝트 1"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      비로그인 외부 방문자에게 표시됩니다.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">설명 (선택)</label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="프로젝트에 대한 간단한 설명"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={saving || !displayName.trim()}
                    >
                      {saving ? "저장 중..." : "등록"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
    </div>
  );
}
