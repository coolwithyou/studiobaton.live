"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { Member } from "../page";

interface MemberListProps {
  members: Member[];
  onMemberChange: () => void;
}

export function MemberList({ members, onMemberChange }: MemberListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGithubName, setEditGithubName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditGithubName(member.githubName);
    setEditEmail(member.email);
    setEditAvatarUrl(member.avatarUrl || "");
    setEditDisplayOrder(member.displayOrder);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditGithubName("");
    setEditEmail("");
    setEditAvatarUrl("");
    setEditDisplayOrder(0);
  };

  const handleSave = async (id: string) => {
    if (!editName.trim() || !editGithubName.trim() || !editEmail.trim()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          githubName: editGithubName.trim(),
          email: editEmail.trim(),
          avatarUrl: editAvatarUrl.trim() || null,
          displayOrder: editDisplayOrder,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "저장에 실패했습니다.");
        return;
      }

      handleCancel();
      onMemberChange();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: Member) => {
    try {
      const response = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          isActive: !member.isActive,
        }),
      });

      if (!response.ok) {
        alert("상태 변경에 실패했습니다.");
        return;
      }

      onMemberChange();
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/members?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("삭제에 실패했습니다.");
        return;
      }

      onMemberChange();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  if (members.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>등록된 팀원이 없습니다.</p>
        <p className="text-sm mt-1">&quot;팀원 추가&quot; 탭에서 새 팀원을 등록하세요.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <Card key={member.id} className="p-4">
          {editingId === member.id ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">이름</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="이름"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">GitHub 사용자명</label>
                  <Input
                    value={editGithubName}
                    onChange={(e) => setEditGithubName(e.target.value)}
                    placeholder="GitHub 사용자명"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">GitHub 커밋 이메일</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="이메일"
                />
              </div>

              <div>
                <label className="text-sm font-medium">프로필 이미지 URL</label>
                <Input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">표시 순서</label>
                <Input
                  type="number"
                  min="0"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(member.id)}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      순서: {member.displayOrder}
                    </Badge>
                    {!member.isActive && (
                      <Badge variant="outline">비활성</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{member.githubName} • {member.email}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleToggleActive(member)}
                  variant="outline"
                  size="sm"
                >
                  {member.isActive ? "비활성화" : "활성화"}
                </Button>
                <Button
                  onClick={() => handleEdit(member)}
                  variant="outline"
                  size="sm"
                >
                  수정
                </Button>
                <Button
                  onClick={() => handleDelete(member.id)}
                  variant="destructive"
                  size="sm"
                >
                  삭제
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
