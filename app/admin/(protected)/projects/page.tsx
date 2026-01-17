"use client";

import { RepositorySpreadsheet } from "./_components/repository-spreadsheet";

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">프로젝트 설정</h1>
        <p className="text-muted-foreground mt-1">
          리포지토리에 표시 이름을 설정하여 글 생성시 사용합니다.
        </p>
      </div>

      <RepositorySpreadsheet />
    </div>
  );
}
