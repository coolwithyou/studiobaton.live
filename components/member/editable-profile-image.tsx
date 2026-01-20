"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUploader, AspectRatio } from "@/components/ui/image-uploader";
import { CropShape } from "@/components/ui/image-cropper";
import { cn } from "@/lib/utils";

export type ImageType = "avatar" | "profile";

interface EditableProfileImageProps {
  memberId: string;
  currentImageUrl: string | null;
  memberName: string;
  /** 이미지 타입: avatar (1:1) | profile (3:4) */
  imageType?: ImageType;
  /** 추가 클래스명 */
  className?: string;
}

const imageTypeConfig: Record<ImageType, {
  aspectRatio: AspectRatio;
  cropShape: CropShape;
  label: string;
}> = {
  avatar: {
    aspectRatio: "1:1",
    cropShape: "round",
    label: "아바타",
  },
  profile: {
    aspectRatio: "3:4",
    cropShape: "rect",
    label: "프로필 이미지",
  },
};

export function EditableProfileImage({
  memberId,
  currentImageUrl,
  memberName,
  imageType = "profile",
  className,
}: EditableProfileImageProps) {
  const router = useRouter();
  const config = imageTypeConfig[imageType];

  return (
    <div className={cn(
      imageType === "avatar" ? "w-20 sm:w-24" : "w-36 sm:w-48",
      className
    )}>
      <ImageUploader
        currentImageUrl={currentImageUrl}
        uploadEndpoint="/api/upload/profile-image"
        deleteEndpoint="/api/upload/profile-image"
        uploadData={{ memberId, imageType }}
        aspectRatio={config.aspectRatio}
        cropShape={config.cropShape}
        placeholder={`${memberName} ${config.label}`}
        onUploadSuccess={() => {
          toast.success(`${config.label}가 업로드되었습니다.`);
          router.refresh();
        }}
        onDeleteSuccess={() => {
          toast.success(`${config.label}가 삭제되었습니다.`);
          router.refresh();
        }}
        onError={(message) => {
          toast.error(message);
        }}
      />
    </div>
  );
}
