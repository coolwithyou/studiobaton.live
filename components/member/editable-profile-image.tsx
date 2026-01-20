"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ui/image-uploader";

interface EditableProfileImageProps {
  memberId: string;
  currentImageUrl: string | null;
  memberName: string;
}

export function EditableProfileImage({
  memberId,
  currentImageUrl,
  memberName,
}: EditableProfileImageProps) {
  const router = useRouter();

  return (
    <div className="w-36 sm:w-48">
      <ImageUploader
        currentImageUrl={currentImageUrl}
        uploadEndpoint="/api/upload/profile-image"
        deleteEndpoint="/api/upload/profile-image"
        uploadData={{ memberId }}
        aspectRatio="3:4"
        placeholder={`${memberName} 프로필 이미지`}
        onUploadSuccess={() => {
          toast.success("프로필 이미지가 업로드되었습니다.");
          router.refresh();
        }}
        onDeleteSuccess={() => {
          toast.success("프로필 이미지가 삭제되었습니다.");
          router.refresh();
        }}
        onError={(message) => {
          toast.error(message);
        }}
      />
    </div>
  );
}
