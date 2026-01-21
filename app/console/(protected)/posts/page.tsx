"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, RefreshCw, Eye, Pencil, GitCommit } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"

interface PostVersion {
  id: string
  version: number
  title: string
  tone: string
  isSelected: boolean
}

interface Author {
  id: string
  name: string | null
  email: string
  image: string | null
  linkedMember?: {
    avatarUrl: string | null
  } | null
}

interface Post {
  id: string
  slug: string
  category: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  targetDate: string
  createdAt: string
  updatedAt: string
  author: Author | null
  versions: PostVersion[]
  _count: {
    commits: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "임시저장", variant: "secondary" },
  PUBLISHED: { label: "발행됨", variant: "default" },
  ARCHIVED: { label: "보관됨", variant: "outline" },
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", "20")
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }

      const response = await fetch(`/api/console/posts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
        setPagination(data.pagination || null)
      }
    } catch (error) {
      console.error("Fetch posts error:", error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const getSelectedVersion = (versions: PostVersion[]) => {
    return versions.find((v) => v.isSelected) || versions[0]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="포스트 목록"
        description="생성된 포스트를 관리합니다."
      >
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="DRAFT">임시저장</SelectItem>
              <SelectItem value="PUBLISHED">발행됨</SelectItem>
              <SelectItem value="ARCHIVED">보관됨</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchPosts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button asChild>
            <Link href="/console/posts/new">
              <Plus className="h-4 w-4 mr-2" />
              새 포스트
            </Link>
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          포스트가 없습니다.
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>커밋</TableHead>
                  <TableHead>대상일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const selectedVersion = getSelectedVersion(post.versions)
                  const statusInfo = STATUS_LABELS[post.status]

                  return (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">
                        <div className="truncate max-w-[260px]" title={selectedVersion?.title || post.slug}>
                          {selectedVersion?.title || post.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.author ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={post.author.linkedMember?.avatarUrl || post.author.image || undefined}
                                alt={post.author.name || ""}
                              />
                              <AvatarFallback className="text-xs">
                                {(post.author.name || post.author.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm" title={post.author.email}>
                              {post.author.name || post.author.email.split("@")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {post.category ? (
                          <Badge variant="outline">{post.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GitCommit className="h-4 w-4" />
                          <span>{post._count.commits}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(post.targetDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {post.status === "PUBLISHED" && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/posts/${post.slug}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/console/post/${post.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}개
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  이전
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
