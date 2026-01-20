import Link from "next/link";
import { Github } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberCardProps {
  member: {
    name: string;
    githubName: string;
    avatarUrl: string | null;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link href={`/member/${member.githubName}`}>
      <Card className="group hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer">
        <CardContent className="flex flex-col items-center text-center pt-6">
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
            <AvatarFallback className="text-2xl">
              {member.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {member.name}
          </h3>

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
            <Github className="w-4 h-4" />
            <span>@{member.githubName}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
