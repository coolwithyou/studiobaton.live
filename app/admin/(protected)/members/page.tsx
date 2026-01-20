"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MemberForm } from "./_components/member-form"
import { MemberList } from "./_components/member-list"
import { Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"

export interface Member {
  id: string
  name: string
  githubName: string
  email: string
  avatarUrl: string | null
  isActive: boolean
  displayOrder: number
  isLinked?: boolean
  linkedAdminEmail?: string | null
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)

  const handleMatch = async () => {
    setMatching(true)
    try {
      const response = await fetch("/api/admin/members/match", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "매칭에 실패했습니다.")
      }

      if (data.matched > 0) {
        toast.success(data.message)
        fetchMembers()
      } else {
        toast.info("매칭할 계정이 없습니다.")
      }
    } catch (error) {
      console.error("Failed to match:", error)
      toast.error("매칭 중 오류가 발생했습니다.")
    } finally {
      setMatching(false)
    }
  }

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/members?includeInactive=true")
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error("Failed to fetch members:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="팀원 관리"
        description="커밋 리뷰에 사용할 팀원 정보를 관리합니다."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleMatch}
          disabled={matching}
        >
          {matching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          사용자 매칭
        </Button>
      </PageHeader>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
      ) : (
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">팀원 목록 ({members.length})</TabsTrigger>
            <TabsTrigger value="add">팀원 추가</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <MemberList members={members} onMemberChange={fetchMembers} />
          </TabsContent>

          <TabsContent value="add">
            <MemberForm onMemberChange={fetchMembers} />
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  )
}
