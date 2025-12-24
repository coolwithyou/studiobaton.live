"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectMappingForm } from "./_components/project-mapping-form";
import { ProjectMappingList } from "./_components/project-mapping-list";

interface ProjectMapping {
  id: string;
  repositoryName: string;
  displayName: string;
  maskName: string | null;
  description: string | null;
  isActive: boolean;
}

export default function ProjectsPage() {
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMappings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/projects");
      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">프로젝트 설정</h1>
        <p className="text-muted-foreground mt-1">
          리포지토리에 표시 이름을 설정하여 글 생성시 사용합니다.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          로딩 중...
        </div>
      ) : (
        <Tabs defaultValue="registered" className="space-y-6">
          <TabsList>
            <TabsTrigger value="registered">
              등록된 프로젝트 ({mappings.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              새 프로젝트 등록
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registered">
            <ProjectMappingList
              mappings={mappings}
              onMappingChange={fetchMappings}
            />
          </TabsContent>

          <TabsContent value="add">
            <ProjectMappingForm
              mappings={mappings}
              onMappingChange={fetchMappings}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
