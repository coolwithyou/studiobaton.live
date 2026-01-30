import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ContributorWithStats } from "@/lib/author-normalizer";

/** 글 작성자 정보 (Post.publishedBy.linkedMember) */
interface PostAuthor {
  id: string;
  name: string;
  githubName: string;
  avatarUrl: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  title: string | null;
  role: string | null;
}

interface PostAuthorSectionProps {
  /** 글 작성자 (Post.publishedBy → Admin → linkedMember) */
  postAuthor: PostAuthor | null;
  /** 커밋 참여자들 (통계 포함) */
  contributors: ContributorWithStats[];
}

export function PostAuthorSection({
  postAuthor,
  contributors,
}: PostAuthorSectionProps) {
  // 둘 다 없으면 렌더링하지 않음
  if (!postAuthor && contributors.length === 0) return null;

  return (
    <>
      <Separator className="my-8" />

      {/* 글 작성자 섹션 */}
      {postAuthor && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            글 작성자
          </h2>
          <AuthorCard author={postAuthor} />
        </section>
      )}

      {/* 커밋 참여자 섹션 */}
      {contributors.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            커밋 참여자
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contributors.map((contributor) => (
              <ContributorMiniCard
                key={contributor.id}
                contributor={contributor}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** 글 작성자 카드 (0.726:1 이미지 + 상세 정보) */
function AuthorCard({ author }: { author: PostAuthor }) {
  // 이미지 선택: profileImageUrl (0.726:1) 우선, avatarUrl 차순위
  const displayImage = author.profileImageUrl || author.avatarUrl;

  return (
    <div className="rounded-xl border bg-muted/30 p-5">
      {/* 반응형 레이아웃: 모바일 세로, sm 이상 가로 */}
      <div className="flex flex-col sm:flex-row gap-5">
        {/* 0.726:1 이미지 영역 */}
        <Link
          href={`/members/${author.githubName}`}
          className="shrink-0 self-center sm:self-start"
        >
          <div className="relative w-28 sm:w-32 aspect-[0.726] rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={author.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 112px, 128px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-2xl">
                    {author.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </Link>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
          {/* 이름 + GitHub username */}
          <div>
            <h3 className="font-bold text-lg">{author.name}</h3>
            <p className="text-sm text-muted-foreground">@{author.githubName}</p>
          </div>

          {/* 직함 + 역할 */}
          {(author.title || author.role) && (
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
              {author.title && (
                <span className="text-sm text-muted-foreground">
                  {author.title}
                </span>
              )}
              {author.role && (
                <Badge variant="secondary" className="text-xs">
                  {author.role}
                </Badge>
              )}
            </div>
          )}

          {/* Bio */}
          {author.bio && (
            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
              {author.bio}
            </p>
          )}

          {/* 프로필 보기 버튼 */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/members/${author.githubName}`}>
                프로필 보기
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 커밋 참여자 미니카드 (글 작성자 카드의 축소 버전) */
function ContributorMiniCard({
  contributor,
}: {
  contributor: ContributorWithStats;
}) {
  const CardContent = (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* 0.726:1 미니 이미지 */}
      <div className="relative w-14 aspect-[0.726] rounded overflow-hidden bg-muted shrink-0">
        {contributor.avatarUrl ? (
          <Image
            src={contributor.avatarUrl}
            alt={contributor.name}
            fill
            className="object-cover object-top"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground">
              {contributor.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      {/* 정보 영역 */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-medium text-sm truncate">{contributor.name}</p>
        {contributor.role && (
          <p className="text-xs text-muted-foreground truncate">
            {contributor.role}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-600">+{contributor.additions}</span>
          <span className="text-red-600">-{contributor.deletions}</span>
        </div>
      </div>
    </div>
  );

  // Member 매칭된 경우만 링크 활성화
  if (contributor.isMemberMatched) {
    return (
      <Link
        href={`/members/${contributor.githubName}`}
        className="block hover:no-underline"
      >
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
