"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitPullRequest, ChevronDown, ChevronUp, Plus } from "lucide-react";

interface AssignedIssue {
  number: number;
  title: string;
  repository: string;
  url: string;
  displayId: string;
  createdAt: string;
}

interface AssignedIssuesProps {
  githubName: string;
  onAddIssue: (issue: { displayId: string; title: string }) => void;
}

export function AssignedIssues({ githubName, onAddIssue }: AssignedIssuesProps) {
  const [issues, setIssues] = useState<AssignedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch(
          `/api/console/issues/assigned?githubName=${encodeURIComponent(githubName)}`
        );
        const data = await response.json();

        if (data.issues) {
          setIssues(data.issues);
        }
      } catch (error) {
        console.error("Failed to fetch assigned issues:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [githubName]);

  if (loading) {
    return null; // 로딩 중에는 표시하지 않음
  }

  if (issues.length === 0) {
    return null; // 할당된 이슈가 없으면 표시하지 않음
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitPullRequest className="size-4 text-primary" />
            나에게 할당된 이슈
            <span className="text-muted-foreground font-normal">
              ({issues.length})
            </span>
          </CardTitle>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.displayId}
                className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-muted/50 group"
              >
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0"
                >
                  <div className="text-sm">
                    <span className="text-primary font-medium">
                      {issue.displayId}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {issue.title}
                  </p>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    onAddIssue({ displayId: issue.displayId, title: issue.title });
                  }}
                >
                  <Plus className="size-3 mr-1" />
                  추가
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            클릭하면 GitHub로 이동, &quot;추가&quot; 버튼으로 할 일에 연결
          </p>
        </CardContent>
      )}
    </Card>
  );
}
