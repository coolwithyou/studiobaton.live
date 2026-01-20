import { Github, GitCommit, FolderGit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface MemberProfileHeaderProps {
  member: {
    name: string;
    githubName: string;
    avatarUrl: string | null;
  };
  stats: {
    totalCommits: number;
    repoCount: number;
  };
}

export function MemberProfileHeader({ member, stats }: MemberProfileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <Avatar className="w-24 h-24">
        <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
        <AvatarFallback className="text-3xl">
          {member.name.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold">{member.name}</h1>
        <p className="text-muted-foreground mt-1">@{member.githubName}</p>

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
