"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ProjectMapping {
  id: string;
  repositoryName: string;
  displayName: string;
  maskName: string | null;
  description: string | null;
  isActive: boolean;
}

interface ProjectMappingListProps {
  mappings: ProjectMapping[];
  onMappingChange: () => void;
}

export function ProjectMappingList({ mappings, onMappingChange }: ProjectMappingListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editMaskName, setEditMaskName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (mapping: ProjectMapping) => {
    setEditingId(mapping.id);
    setEditDisplayName(mapping.displayName);
    setEditMaskName(mapping.maskName || "");
    setEditDescription(mapping.description || "");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditDisplayName("");
    setEditMaskName("");
    setEditDescription("");
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          displayName: editDisplayName.trim(),
          maskName: editMaskName.trim() || null,
          description: editDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        alert("저장에 실패했습니다.");
        return;
      }

      handleCancel();
      onMappingChange();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (mapping: ProjectMapping) => {
    try {
      const response = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mapping.id,
          isActive: !mapping.isActive,
        }),
      });

      if (!response.ok) {
        alert("상태 변경에 실패했습니다.");
        return;
      }

      onMappingChange();
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/projects?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("삭제에 실패했습니다.");
        return;
      }

      onMappingChange();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  if (mappings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        등록된 프로젝트 매핑이 없습니다.
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {mappings.map((mapping) => (
        <div key={mapping.id} className="p-4">
          {editingId === mapping.id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24">
                  리포지토리:
                </span>
                <span className="font-mono text-sm">{mapping.repositoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24">
                  표시 이름:
                </span>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24">
                  마스킹 이름:
                </span>
                <Input
                  value={editMaskName}
                  onChange={(e) => setEditMaskName(e.target.value)}
                  placeholder="예: 고객사 A"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24">
                  설명:
                </span>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="선택사항"
                  className="flex-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(mapping.id)}
                  disabled={saving || !editDisplayName.trim()}
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mapping.displayName}</span>
                  {mapping.maskName && (
                    <span className="text-sm text-muted-foreground">
                      → {mapping.maskName}
                    </span>
                  )}
                  <Badge variant={mapping.isActive ? "default" : "secondary"}>
                    {mapping.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono">{mapping.repositoryName}</span>
                  {mapping.description && (
                    <span className="ml-2">- {mapping.description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(mapping)}
                >
                  {mapping.isActive ? "비활성화" : "활성화"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(mapping)}
                >
                  수정
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(mapping.id)}
                >
                  삭제
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
