"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitCard } from "./commit-card";

interface Commit {
  sha: string;
  message: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
}

interface Repository {
  name: string;
  displayName: string | null;
  commits: Commit[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface CommitRepositoryGroupProps {
  repository: Repository;
}

export function CommitRepositoryGroup({ repository }: CommitRepositoryGroupProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {repository.displayName || repository.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {repository.totalCommits} 커밋
            </Badge>
            <Badge variant="outline">
              <span className="text-green-600">
                +{repository.totalAdditions}
              </span>
            </Badge>
            <Badge variant="outline">
              <span className="text-red-600">
                -{repository.totalDeletions}
              </span>
            </Badge>
          </div>
        </div>
        {repository.displayName && (
          <p className="text-sm text-muted-foreground">
            {repository.name}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {repository.commits.map((commit) => (
            <CommitCard key={commit.sha} commit={commit} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
