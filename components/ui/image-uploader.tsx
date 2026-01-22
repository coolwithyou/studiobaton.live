"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ImageCropper, CropShape } from "@/components/ui/image-cropper";

export type AspectRatio = "1:1" | "3:4" | "4:3" | "16:9";

interface ImageUploaderProps {
  /** 현재 이미지 URL */
  currentImageUrl?: string | null;
  /** 업로드 API 엔드포인트 */
  uploadEndpoint: string;
  /** 삭제 API 엔드포인트 */
  deleteEndpoint?: string;
  /** 업로드 시 전송할 추가 데이터 */
  uploadData?: Record<string, string>;
  /** 이미지 비율 */
  aspectRatio?: AspectRatio;
  /** 업로드 성공 시 콜백 */
  onUploadSuccess?: (url: string) => void;
  /** 삭제 성공 시 콜백 */
  onDeleteSuccess?: () => void;
  /** 에러 발생 시 콜백 */
  onError?: (message: string) => void;
  /** 컴포넌트 클래스명 */
  className?: string;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 크롭 기능 활성화 (기본: true) */
  cropEnabled?: boolean;
  /** 크롭 형태 (기본: "rect") */
  cropShape?: CropShape;
}

const aspectRatioClasses: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-video",
};

const aspectRatioValues: Record<AspectRatio, number> = {
  "1:1": 1,
  "3:4": 3 / 4,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

export function ImageUploader({
  currentImageUrl,
  uploadEndpoint,
  deleteEndpoint,
  uploadData = {},
  aspectRatio = "3:4",
  onUploadSuccess,
  onDeleteSuccess,
  onError,
  className,
  placeholder = "이미지 업로드",
  disabled = false,
  cropEnabled = true,
  cropShape = "rect",
}: ImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 크롭 관련 상태
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleUpload = useCallback(
    async (fileOrBlob: File | Blob, originalFileName?: string) => {
      if (disabled) return;

      setIsUploading(true);

      try {
        const formData = new FormData();

        // Blob인 경우 File로 변환
        if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
          const fileName = originalFileName || `cropped-${Date.now()}.jpg`;
          formData.append("file", fileOrBlob, fileName);
        } else {
          formData.append("file", fileOrBlob);
        }

        // 추가 데이터 첨부
        Object.entries(uploadData).forEach(([key, value]) => {
          formData.append(key, value);
        });

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "업로드 실패");
        }

        setImageUrl(result.url);
        onUploadSuccess?.(result.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "업로드 중 오류 발생";
        onError?.(message);
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, uploadEndpoint, uploadData, onUploadSuccess, onError]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      // 파일 타입 검증
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        onError?.("JPG, PNG, WebP, GIF 형식만 업로드 가능합니다.");
        return;
      }

      // 파일 크기 검증 (GIF는 10MB, 그 외 5MB)
      const maxSize = file.type === "image/gif" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        onError?.(file.type === "image/gif"
          ? "GIF 파일 크기는 10MB 이하여야 합니다."
          : "파일 크기는 5MB 이하여야 합니다."
        );
        return;
      }

      // GIF는 크롭 없이 바로 업로드 (애니메이션 유지)
      if (file.type === "image/gif") {
        handleUpload(file);
        return;
      }

      if (cropEnabled) {
        // 크롭 모드: 이미지를 data URL로 변환하여 크롭 모달 표시
        const reader = new FileReader();
        reader.onload = () => {
          setCropImageSrc(reader.result as string);
          setPendingFile(file);
          setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
      } else {
        // 직접 업로드
        handleUpload(file);
      }
    },
    [cropEnabled, handleUpload, onError]
  );

  const handleCropComplete = useCallback(
    (croppedBlob: Blob) => {
      setIsCropperOpen(false);
      setCropImageSrc(null);

      // 원본 파일명 기반으로 업로드
      const originalName = pendingFile?.name || "image.jpg";
      const ext = originalName.split(".").pop() || "jpg";
      const newFileName = `cropped-${Date.now()}.${ext}`;

      handleUpload(croppedBlob, newFileName);
      setPendingFile(null);
    },
    [handleUpload, pendingFile]
  );

  const handleCropCancel = useCallback(() => {
    setIsCropperOpen(false);
    setCropImageSrc(null);
    setPendingFile(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (disabled || !deleteEndpoint) return;

    setIsUploading(true);

    try {
      const params = new URLSearchParams(uploadData);
      const response = await fetch(`${deleteEndpoint}?${params}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "삭제 실패");
      }

      setImageUrl(null);
      onDeleteSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "삭제 중 오류 발생";
      onError?.(message);
    } finally {
      setIsUploading(false);
    }
  }, [disabled, deleteEndpoint, uploadData, onDeleteSuccess, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // input 초기화 (같은 파일 재선택 가능하게)
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div className={cn("relative", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div
          className={cn(
            "relative overflow-hidden rounded-lg border-2 border-dashed transition-colors",
            aspectRatioClasses[aspectRatio],
            isDragging && "border-primary bg-primary/5",
            !imageUrl && !isDragging && "border-muted-foreground/25",
            imageUrl && "border-transparent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt="Uploaded image"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 300px"
              />
              {/* 오버레이 (호버 시) */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    변경
                  </Button>
                  {deleteEndpoint && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">{placeholder}</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF (최대 10MB)</span>
                </>
              )}
            </button>
          )}

          {/* 업로드 중 오버레이 */}
          {isUploading && imageUrl && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* 크롭 모달 */}
      {cropImageSrc && (
        <ImageCropper
          open={isCropperOpen}
          imageSrc={cropImageSrc}
          aspect={aspectRatioValues[aspectRatio]}
          cropShape={cropShape}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
