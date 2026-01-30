"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/ui/image-uploader";

interface EditProfileDialogProps {
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
    bio: string | null;
    title: string | null;
    role: string | null;
  };
  /** Admin 권한 여부 (직함/역할 편집 가능) */
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function EditProfileDialog({
  member,
  isAdmin = false,
  children,
}: EditProfileDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [bio, setBio] = useState(member.bio || "");
  const [title, setTitle] = useState(member.title || "");
  const [role, setRole] = useState(member.role || "");

  // 이미지 URL state (이미지 업로드는 즉시 반영되므로 별도 저장 불필요)
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl);
  const [profileImageUrl, setProfileImageUrl] = useState(member.profileImageUrl);

  const handleSave = async () => {
    startTransition(async () => {
      try {
        // Bio 저장
        const bioRes = await fetch("/api/member/bio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, bio: bio.trim() }),
        });

        if (!bioRes.ok) {
          const data = await bioRes.json();
          throw new Error(data.error || "Bio 저장 실패");
        }

        // 직함/역할 저장 (Admin만)
        if (isAdmin) {
          const titleRoleRes = await fetch("/api/member/title-role", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: member.id,
              title: title.trim() || null,
              role: role.trim() || null,
            }),
          });

          if (!titleRoleRes.ok) {
            const data = await titleRoleRes.json();
            throw new Error(data.error || "직함/역할 저장 실패");
          }
        }

        toast.success("프로필이 업데이트되었습니다.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "저장 실패");
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // 다이얼로그 열 때 현재 값으로 리셋
      setBio(member.bio || "");
      setTitle(member.title || "");
      setRole(member.role || "");
      setAvatarUrl(member.avatarUrl);
      setProfileImageUrl(member.profileImageUrl);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
          <DialogDescription>
            프로필 정보를 수정합니다. 이미지 변경은 즉시 반영됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 이미지 섹션 */}
          <div>
            <h4 className="text-sm font-medium mb-4">프로필 이미지</h4>
            <div className="flex gap-6">
              {/* 0.726:1 프로필 이미지 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  프로필 (0.726:1)
                </Label>
                <div className="w-24">
                  <ImageUploader
                    currentImageUrl={profileImageUrl}
                    uploadEndpoint="/api/upload/profile-image"
                    deleteEndpoint="/api/upload/profile-image"
                    uploadData={{ memberId: member.id, imageType: "profile" }}
                    aspectRatio="0.726:1"
                    cropShape="rect"
                    placeholder={`${member.name} 프로필`}
                    onUploadSuccess={(url) => {
                      setProfileImageUrl(url);
                      toast.success("프로필 이미지가 업로드되었습니다.");
                    }}
                    onDeleteSuccess={() => {
                      setProfileImageUrl(null);
                      toast.success("프로필 이미지가 삭제되었습니다.");
                    }}
                    onError={(message) => toast.error(message)}
                  />
                </div>
              </div>

              {/* 1:1 아바타 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  아바타 (1:1)
                </Label>
                <div className="w-20">
                  <ImageUploader
                    currentImageUrl={avatarUrl}
                    uploadEndpoint="/api/upload/profile-image"
                    deleteEndpoint="/api/upload/profile-image"
                    uploadData={{ memberId: member.id, imageType: "avatar" }}
                    aspectRatio="1:1"
                    cropShape="round"
                    placeholder={`${member.name} 아바타`}
                    onUploadSuccess={(url) => {
                      setAvatarUrl(url);
                      toast.success("아바타가 업로드되었습니다.");
                    }}
                    onDeleteSuccess={() => {
                      setAvatarUrl(null);
                      toast.success("아바타가 삭제되었습니다.");
                    }}
                    onError={(message) => toast.error(message)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 정보 섹션 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">프로필 정보</h4>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">소개</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="자기소개를 입력하세요..."
                rows={4}
                maxLength={5000}
                className="resize-none"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length} / 5,000
              </p>
            </div>

            {/* 직함/역할 (Admin만) */}
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">직함</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 시니어 개발자"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">역할</Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="예: 프론트엔드 리드"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
