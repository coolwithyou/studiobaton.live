"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  name: string;
  githubName: string;
}

export default function WorkLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/me");
        if (!response.ok) {
          router.push("/console/login");
          return;
        }

        const user = await response.json();

        // linkedMember가 있으면 해당 멤버의 work-log로 이동
        if (user.linkedMember?.githubName) {
          router.replace(`/console/work-log/${user.linkedMember.githubName}`);
          return;
        }

        // 없으면 첫 번째 멤버의 work-log로 이동
        const membersResponse = await fetch("/api/console/members");
        if (membersResponse.ok) {
          const members: Member[] = await membersResponse.json();
          if (members.length > 0) {
            router.replace(`/console/work-log/${members[0].githubName}`);
            return;
          }
        }

        // 멤버가 없는 경우
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/console/login");
      }
    };

    fetchCurrentUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <p className="text-muted-foreground">등록된 멤버가 없습니다.</p>
    </div>
  );
}
