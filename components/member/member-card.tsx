import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MemberCardProps {
  member: {
    name: string;
    githubName: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
    title: string | null;
    role: string | null;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  // 이미지 선택: profileImageUrl 우선, avatarUrl 차순위
  const displayImage = member.profileImageUrl || member.avatarUrl;

  return (
    <Link href={`/member/${member.githubName}`}>
      <Card className="group relative aspect-[2/3] overflow-hidden p-0 border hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
        {/* 배경 이미지 또는 폴백 */}
        {displayImage ? (
          <Image
            src={displayImage}
            alt={member.name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-7xl font-bold text-muted-foreground">
              {member.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        {/* 하단 그라데이션 오버레이 (카드 하단 40%만 차지) */}
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-background via-background/60 via-50% to-transparent" />

        {/* 텍스트 컨텐츠 (하단 고정) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {member.name}
          </h3>

          {/* 직함과 역할 */}
          {(member.title || member.role) && (
            <div className="text-sm text-muted-foreground space-y-0.5">
              {member.title && <p>{member.title}</p>}
              {member.role && <p>{member.role}</p>}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Github className="w-4 h-4" />
            <span>@{member.githubName}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
