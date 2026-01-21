"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MemberFormProps {
  onMemberChange: () => void;
}

export function MemberForm({ onMemberChange }: MemberFormProps) {
  const [name, setName] = useState("");
  const [githubName, setGithubName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !githubName.trim() || !email.trim()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/console/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          githubName: githubName.trim(),
          email: email.trim(),
          avatarUrl: avatarUrl.trim(),
          displayOrder,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "저장에 실패했습니다.");
        return;
      }

      // 폼 초기화
      setName("");
      setGithubName("");
      setEmail("");
      setAvatarUrl("");
      setDisplayOrder(0);

      onMemberChange();
      alert("팀원이 추가되었습니다.");
    } catch (error) {
      console.error("Failed to create member:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 팀원 추가</CardTitle>
        <CardDescription>
          커밋 리뷰에 사용할 팀원 정보를 입력하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubName">
              GitHub 사용자명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="githubName"
              value={githubName}
              onChange={(e) => setGithubName(e.target.value)}
              placeholder="gildong-hong"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              GitHub 커밋 이메일 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gildong@example.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              GitHub에서 커밋할 때 사용하는 이메일 주소를 입력하세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">프로필 이미지 URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://avatars.githubusercontent.com/u/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">표시 순서</Label>
            <Input
              id="displayOrder"
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              탭에 표시될 순서를 지정합니다. (숫자가 작을수록 앞에 표시)
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "저장 중..." : "팀원 추가"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
