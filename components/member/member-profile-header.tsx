import Image from "next/image";
import { Github, GitCommit, FolderGit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EditableProfileImage } from "./editable-profile-image";

interface MemberProfileHeaderProps {
  member: {
    id: string;
    name: string;
    githubName: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
  };
  stats: {
    totalCommits: number;
    repoCount: number;
  };
  /** 프로필 이미지 편집 가능 여부 */
  canEdit?: boolean;
}

export function MemberProfileHeader({ member, stats, canEdit = false }: MemberProfileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      {/* 3:4 프로필 이미지 */}
      {canEdit ? (
        <EditableProfileImage
          memberId={member.id}
          currentImageUrl={member.profileImageUrl}
          memberName={member.name}
          imageType="profile"
        />
      ) : (
        <div className="relative w-36 sm:w-48 aspect-[3/4] rounded-lg overflow-hidden bg-muted">
          {member.profileImageUrl ? (
            <Image
              src={member.profileImageUrl}
              alt={member.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 144px, 192px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-3xl">
                  {member.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 text-center sm:text-left">
        {/* 멤버 정보 + 아바타 섹션 */}
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          {/* 1:1 아바타 */}
          {canEdit ? (
            <EditableProfileImage
              memberId={member.id}
              currentImageUrl={member.avatarUrl}
              memberName={member.name}
              imageType="avatar"
            />
          ) : (
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
              <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
              <AvatarFallback className="text-xl">
                {member.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-muted-foreground">@{member.githubName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <GitCommit className="w-4 h-4" />
            <span>{stats.totalCommits.toLocaleString()} 커밋</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FolderGit2 className="w-4 h-4" />
            <span>{stats.repoCount} 레포지토리</span>
          </div>
        </div>

        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://github.com/${member.githubName}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub 프로필
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
