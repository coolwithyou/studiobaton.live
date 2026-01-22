# 유틸 함수 및 코드 패턴

## 1. 날짜 유틸 (lib/date-utils.ts)

### KST 기반 함수들
```typescript
// KST 기준 현재 시간
nowKST(): TZDate

// 날짜를 KST로 변환
toKST(date: Date | string): TZDate

// KST 기준 하루의 시작/끝
startOfDayKST(date?: Date | string): Date
endOfDayKST(date?: Date | string): Date

// KST 기준 오늘 확인
isTodayKST(date: Date): boolean

// KST 기반 포맷팅
formatKST(date: Date | string, formatStr: string): string

// KST 기준 N일 전
subDaysKST(date: Date | string, amount: number): Date

// PostgreSQL DATE 컬럼 쿼리용 UTC Date 변환
// KST의 날짜 부분을 그대로 유지하면서 UTC 자정으로 변환
toDateOnlyUTC(date: Date | string): Date

// KST 기준 날짜 범위 반환 (DB 쿼리용)
getKSTDayRange(date: Date | string): { start: Date; end: Date }

// 상대 시간 표시 (예: "3일 전")
formatDistanceToNowKST(date: Date | string, options?: { addSuffix?: boolean }): string
```

### 사용 예시
```typescript
// API에서 날짜 조회
const dateStr = formatKST(selectedDate, "yyyy-MM-dd"); // "2024-01-22"

// DB 쿼리
const range = getKSTDayRange(selectedDate);
const commits = await prisma.commitLog.findMany({
  where: {
    committedAt: { gte: range.start, lte: range.end }
  }
});

// 캐리오버 날짜 계산
const carryoverStartDate = toDateOnlyUTC(subDaysKST(targetDate, 7));
```

---

## 2. 검증 유틸 (lib/validation.ts)

### 스탠드업 관련 스키마
```typescript
// GET 파라미터 검증
export const standupQuerySchema = z.object({
  date: z.coerce.date(),
  memberId: z.string().cuid(),
  includeCarryover: z.preprocess(..., z.boolean()).optional(),
  carryoverDays: z.preprocess(..., z.number().int().min(1).max(30)).optional(),
});

// POST 바디 검증
export const standupTaskSchema = z.object({
  dueDate: z.coerce.date().optional(),
  memberId: z.string().cuid(),
  content: z.string().min(1).max(500),
  repository: z.string().max(200).nullable().optional(),
});

// PATCH 바디 검증
export const standupTaskUpdateSchema = z.object({
  isCompleted: z.boolean().optional(),
  content: z.string().min(1).max(500).optional(),
  repository: z.string().max(200).nullable().optional(),
  dueDate: z.coerce.date().optional(),
});
```

### API에서 사용 패턴
```typescript
import { standupQuerySchema, formatZodError } from '@/lib/validation';

try {
  const params = standupQuerySchema.parse({
    date: searchParams.get("date"),
    memberId: searchParams.get("memberId"),
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new ValidationError(
      "파라미터가 올바르지 않습니다.",
      formatZodError(error)
    );
  }
}
```

---

## 3. 에러 처리 (lib/errors.ts)

### 에러 클래스 계층
```
ApiError (기본)
├── AuthError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ValidationError (400)
├── ConflictError (409)
├── ExternalServiceError (502)
├── DatabaseError (500)
└── RateLimitError (429)
```

### API 라우트 에러 처리 패턴
```typescript
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '@/lib/errors';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    // 권한 확인
    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("스탠드업 기능에 접근할 권한이 없습니다.");
    }

    // 데이터 조회
    const member = await prisma.member.findUnique({...});
    if (!member) {
      throw new NotFoundError("팀원");
    }

    return NextResponse.json({ /* 데이터 */ });
  } catch (error) {
    logError("GET /api/console/standup", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
```

---

## 4. 인증 헬퍼 (lib/auth-helpers.ts)

```typescript
// 세션 조회
const session = await getServerSession();

// 팀 접근 권한 확인
const hasAccess = await hasTeamAccess();

// 권한별 접근 제어
// ADMIN: 모든 페이지
// TEAM_MEMBER: 본인 스탠드업/랩업 + 커밋 리뷰
// ORG_MEMBER: 마스킹 해제만
```

---

## 5. Prisma 클라이언트 (lib/prisma.ts)

```typescript
import prisma from "@/lib/prisma";

// 타입 안전한 쿼리
const standup = await prisma.standup.findUnique({
  where: { memberId_date: { memberId, date } },
});

// 병렬 조회 (Promise.all 활용)
const [standup, review] = await Promise.all([
  fetch(standupUrl),
  fetch(reviewUrl),
]);
```

---

## 6. 데이터 페칭 패턴 (fetch + useState)

### 기본 패턴 (백그라운드 갱신 지원)
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

const fetchData = useCallback(
  async (silent = false) => {
    // silent: true면 로더 표시 안 함 (백그라운드 갱신)
    if (!silent) setLoading(true);
    
    try {
      const response = await fetch(`/api/console/standup?date=${dateStr}&memberId=${memberId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error);
      }
      
      setData(result);
    } catch (error) {
      console.error(error);
      if (!silent) setData(null);
    } finally {
      setLoading(false);
    }
  },
  [dateStr, memberId]
);

useEffect(() => {
  fetchData();
}, [dateStr, memberId, fetchData]);
```

### Optimistic Update 패턴
```typescript
const handleToggleComplete = async (task: Task) => {
  // 1. 즉시 UI 업데이트
  setTasks(prev =>
    prev.map(t => 
      t.id === task.id ? {...t, isCompleted: !t.isCompleted} : t
    )
  );

  try {
    // 2. API 요청
    const response = await fetch(`/api/console/standup/task/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });

    if (!response.ok) {
      throw new Error("Failed");
    }
  } catch (error) {
    // 3. 실패 시 롤백
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id ? {...t, isCompleted: task.isCompleted} : t
      )
    );
    console.error(error);
  }
};
```

---

## 7. 레이아웃 패턴

### 페이지 기본 구조
```typescript
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <PageContainer maxWidth="xl" | "2xl">
      <PageHeader
        title="페이지 제목"
        description="페이지 설명"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : (
        // 콘텐츠
      )}
    </PageContainer>
  );
}
```

### 섹션 그룹화
```typescript
<div className="space-y-6">
  {/* 필터 */}
  <div className="flex items-center gap-4">
    <span className="text-sm font-medium">라벨:</span>
    {/* 필터 컴포넌트 */}
  </div>

  {/* 통계 */}
  <div className="p-3 bg-muted rounded-lg text-sm">
    <span>총 <strong>{count}</strong>개</span>
    <span className="text-muted-foreground">|</span>
    <span className="text-green-600">완료 <strong>{completed}</strong>개</span>
  </div>

  {/* 목록 */}
  <div>
    <h3 className="text-sm font-medium mb-3">제목</h3>
    {/* 목록 컴포넌트 */}
  </div>
</div>
```

---

## 8. shadcn/ui 사용 패턴

### 날짜 선택 (Calendar + Popover)
```typescript
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { ko } from "date-fns/locale";

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2 size-4" />
      {formatKST(selectedDate, "PPP")}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && setSelectedDate(date)}
      disabled={(date) => date > new Date()}
      locale={ko}
      initialFocus
    />
  </PopoverContent>
</Popover>
```

### 상태 배지
```typescript
<Badge variant="outline" className="text-orange-600 border-orange-300">
  <Clock className="size-3 mr-1" />
  {daysAgo}일 전
</Badge>
```

### 버튼 상태
```typescript
<Button
  onClick={handleSubmit}
  disabled={!content.trim() || submitting}
>
  {submitting ? (
    <Loader2 className="size-4 animate-spin mr-2" />
  ) : (
    <Plus className="size-4 mr-2" />
  )}
  할 일 추가
</Button>
```

---

## 9. 네비게이션 패턴

### 페이지 리다이렉트 (서버 컴포넌트)
```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export default async function Page() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/console/login");
  }

  // 팀원별 페이지로 리다이렉트
  const member = await prisma.member.findFirst({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  if (member) {
    redirect(`/console/page/${member.githubName}`);
  }

  // 폴백
  redirect("/console/members");
}
```

---

## 10. 타입 정의 패턴

### 컴포넌트 Props 타입
```typescript
interface StandupContentProps {
  memberId: string;
}

interface TaskListProps {
  tasks: Task[];
  onTaskUpdated: () => void;
  readOnly?: boolean;
  showDueDateBadge?: boolean;
}

export function TaskList({
  tasks,
  onTaskUpdated,
  readOnly = false,
  showDueDateBadge = false,
}: TaskListProps) {
  // ...
}
```

### API 응답 타입
```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}

// 또는
type StandupApiResponse = {
  date: string;
  member: Member;
  standup: {
    id: string | null;
    tasks: Task[];
    carriedOverTasks: Task[];
  };
};
```

---

## 11. 상수 및 설정

### 타임존
```typescript
const KST_TIMEZONE = "Asia/Seoul";
```

### 로케일
```typescript
import { ko } from "date-fns/locale";
```

### API 엔드포인트
```
GET    /api/console/standup?date=&memberId=&includeCarryover=&carryoverDays=
POST   /api/console/standup
PATCH  /api/console/standup/task/[taskId]
DELETE /api/console/standup/task/[taskId]
GET    /api/console/review?date=&memberId=
```

---

## 주의사항

### React Query 미사용
- 프로젝트에서는 fetch + useState를 직접 사용
- `useQuery`, `useMutation` 등 불필요

### 날짜 처리
- 항상 KST 기준으로 처리
- PostgreSQL DATE 컬럼은 `toDateOnlyUTC()` 사용
- 시간 정보가 필요한 경우 타임스탬프 사용

### 에러 처리
- 항상 `normalizeError()` 사용
- Prisma 에러도 자동으로 처리됨
- 클라이언트에는 읽기 쉬운 메시지만 전달
