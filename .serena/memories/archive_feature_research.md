# 업무일지 아카이브 기능 구현 - 조사 보고서

## 1. 스탠드업/랩업 관련 컴포넌트와 데이터 구조

### 컴포넌트 구조
```
app/console/(protected)/
├── standup/
│   ├── page.tsx (리다이렉트)
│   ├── [githubName]/page.tsx (실제 페이지)
│   └── _components/
│       ├── standup-content.tsx (메인 컨테이너, 상태 관리)
│       ├── standup-form.tsx (할 일 입력 폼)
│       ├── task-list.tsx (할 일 목록)
│       ├── member-tabs.tsx (팀원 탭)
│       ├── mention-autocomplete.tsx (멘션 자동완성)
│       └── standup-checklist.tsx (체크리스트, read-only)
└── wrap-up/
    ├── page.tsx (리다이렉트)
    ├── [githubName]/page.tsx (실제 페이지)
    └── _components/
        ├── wrap-up-content.tsx (메인 컨테이너, 상태 관리)
        ├── standup-checklist.tsx (스탠드업 할 일 표시)
        ├── commit-summary.tsx (AI 커밋 요약)
        └── commit-diagnose-dialog.tsx (커밋 진단)
```

### Task 데이터 타입
```typescript
interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  displayOrder: number;
  dueDate: string;              // 목표 완료 날짜 (리스케줄 가능)
  originalDueDate: string;      // 최초 작성 날짜 (불변, 뱃지 표시용)
}
```

### 데이터 페칭 패턴
- **방식**: fetch + useState (React Query 미사용)
- **캐시 전략**: useCallback + useRef를 활용한 수동 관리
- **새로고침**: silent flag를 사용하여 초기 로딩 vs 백그라운드 갱신 구분
- **예시** (StandupContent):
  ```typescript
  const fetchStandup = useCallback(async (silent = false) => {
    // silent=true: 로더 표시 안 함 (백그라운드 갱신)
    // silent=false: 초기 로딩 시 로더 표시
  }, [selectedDate, memberId])
  ```

---

## 2. 데이터베이스 스키마

### 핵심 모델

#### StandupTask
```prisma
model StandupTask {
  id           String    @id @default(cuid())
  standupId    String
  standup      Standup   @relation(fields: [standupId], references: [id], onDelete: Cascade)
  content      String
  repository   String?
  isCompleted  Boolean   @default(false)
  completedAt  DateTime?
  displayOrder Int       @default(0)
  
  # 날짜 관리 (캐리오버 & 미래 예약)
  dueDate         DateTime @db.Date      # 목표 완료 날짜 (리스케줄 가능)
  originalDueDate DateTime @db.Date      # 최초 작성 날짜 (불변)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([standupId])
  @@index([dueDate])
  @@index([isCompleted, dueDate])
}
```

#### Standup
```prisma
model Standup {
  id        String   @id @default(cuid())
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  date      DateTime @db.Date
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tasks StandupTask[]
  
  @@unique([memberId, date])
  @@index([date])
  @@index([memberId])
}
```

#### Member
```prisma
model Member {
  id              String  @id @default(cuid())
  name            String
  githubName      String  @unique
  email           String  @unique  # GitHub 커밋 이메일 (CommitLog.authorEmail과 매칭)
  avatarUrl       String?
  isActive        Boolean @default(true)
  displayOrder    Int     @default(0)
  
  standups        Standup[]
  # ...
  @@index([isActive])
}
```

#### CommitLog
```prisma
model CommitLog {
  id           String   @id @default(cuid())
  sha          String   @unique
  repository   String
  message      String
  author       String
  authorEmail  String?  # Member.email과 매칭
  committedAt  DateTime
  additions    Int      @default(0)
  deletions    Int      @default(0)
  filesChanged Int      @default(0)
  url          String
  
  createdAt DateTime @default(now())
  
  files CommitFile[]
  
  @@index([committedAt])
  @@index([repository])
}
```

### 날짜별 조회에 필요한 필드
- **StandupTask.dueDate**: 오늘의 할 일 조회
- **StandupTask.isCompleted**: 미완료 할 일 필터링
- **StandupTask.originalDueDate**: 캐리오버 표시용 (뱃지)
- **CommitLog.committedAt**: 날짜별 커밋 조회
- **CommitLog.authorEmail**: Member와의 매칭

---

## 3. 기존 UI 컴포넌트

### shadcn/ui 사용 컴포넌트
```
Calendar         - 날짜 선택 (react-day-picker 기반, ko 로케일)
Card             - 섹션 그룹핑
Tabs             - 팀원 탭 (MemberTabs)
Button           - 모든 상호작용
Badge            - 뱃지 표시 (캐리오버 날짜 표시 등)
Checkbox         - 완료 체크
Textarea         - 멀티라인 입력
Dialog           - 모달
Popover          - 달력 팝오버
Tooltip          - 힌트 표시
```

### 커스텀 컴포넌트
```
PageContainer      - 최대 너비 제한 (maxWidth prop)
PageHeader        - 페이지 제목 + 설명
MemberTabs        - 팀원 탭 (선택 가능)
CommitRepositoryGroup - 리포지토리별 커밋 그룹
```

### 레이아웃 패턴
```typescript
// 기본 페이지 구조
<PageContainer maxWidth="xl" | "2xl">
  <PageHeader title="" description="" />
  <MemberTabs members={members} basePath="/console/..." />
  <div className="mt-6">
    {/* 실제 콘텐츠 */}
  </div>
</PageContainer>
```

### 상태 표시 패턴
```typescript
// 로더
<Loader2 className="size-8 animate-spin text-muted-foreground" />

// 빈 상태
<div className="text-center py-8 text-muted-foreground">메시지</div>

// 통계 (muted 배경)
<div className="p-3 bg-muted rounded-lg text-sm">통계 정보</div>
```

---

## 4. API 라우트

### 스탠드업 API

#### GET /api/console/standup
- **파라미터**:
  - `date` (required): YYYY-MM-DD 형식
  - `memberId` (required): 팀원 ID
  - `includeCarryover` (optional): 캐리오버 포함 여부 (default: true)
  - `carryoverDays` (optional): 캐리오버 조회 범위 (default: 7)

- **응답**:
```typescript
{
  date: string;           // ISO 문자열
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  standup: {
    id: string | null;    // 해당 날짜 Standup ID
    tasks: Task[];        // 오늘(dueDate = date)의 할 일
    carriedOverTasks: Task[];  // 미완료 + dueDate < date
  };
}
```

#### POST /api/console/standup
- **바디**:
```json
{
  "dueDate": "2024-01-22T00:00:00Z",
  "memberId": "...",
  "content": "할 일 내용",
  "repository": "studiobaton/project-name" (optional)
}
```

- **응답**: `{ task: Task }` (201)

#### PATCH /api/console/standup/task/[taskId]
- **바디** (모든 필드 optional):
```json
{
  "content": "수정된 내용",
  "repository": "org/repo",
  "isCompleted": true,
  "dueDate": "2024-01-22T00:00:00Z"
}
```

- **응답**: `{ task: Task }`

#### DELETE /api/console/standup/task/[taskId]
- **응답**: `{ success: true }`

### 커밋 리뷰 API

#### GET /api/console/review
- **파라미터**:
  - `date` (required): YYYY-MM-DD
  - `memberId` (required): 팀원 ID

- **응답**:
```typescript
{
  date: string;
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  repositories: Array<{
    name: string;
    displayName: string | null;
    commits: Array<{
      sha: string;
      message: string;
      committedAt: string;
      additions: number;
      deletions: number;
      filesChanged: number;
      url: string;
      files: CommitFile[];
    }>;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  }>;
  summary: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}
```

### 기타 관련 API

#### POST /api/member/commits/refresh
- **설명**: 특정 날짜의 커밋 다시 가져오기
- **바디**: `{ memberId: string; date: string; }`

#### GET /api/me
- **응답**: 현재 사용자 정보

---

## 5. @tanstack/react-query 사용 현황

### **결론: React Query 미사용**

프로젝트에서 **@tanstack/react-query를 사용하지 않음**.

### 현재 데이터 페칭 패턴
```typescript
// 기본 패턴: fetch + useState + useCallback + useEffect
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

const fetchData = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);
  try {
    const response = await fetch('/api/...');
    const result = await response.json();
    setData(result);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}, [dependencies]);

useEffect(() => {
  fetchData();
}, [dependencies, fetchData]);
```

### Optimistic Updates (StandupChecklist)
```typescript
// UI를 먼저 업데이트한 후 API 요청
const handleToggleComplete = async (task: Task) => {
  // 1. Optimistic update: 즉시 UI 변경
  setLocalTasks(prev => 
    prev.map(t => t.id === task.id ? {...t, isCompleted: !t.isCompleted} : t)
  );

  try {
    // 2. API 요청
    const response = await fetch('/api/console/standup/task/{id}', {...});
    
    if (!response.ok) {
      // 3. 실패 시 롤백
      throw new Error();
    }
  } catch (error) {
    // 롤백 처리
  }
};
```

### 무한 스크롤 미구현
- 현재 페이지네이션이나 무한 스크롤이 없음
- 모든 데이터가 단일 요청으로 로드됨

---

## 아카이브 기능 구현에 필요한 추가 고려사항

### 날짜 범위 조회
```typescript
// API 확장 필요
GET /api/console/standup?date=start-end&memberId=...
```

### 아카이브 상태 관리
```prisma
// StandupTask에 추가 가능
model StandupTask {
  archivedAt   DateTime?  // 아카이브 날짜
  isArchived   Boolean    @default(false)  // 아카이브 상태
}
```

### 필터링 및 검색
- 날짜 범위
- 카테고리/저장소별
- 완료/미완료 상태
- 검색어

### 내보내기 기능
- PDF, CSV, JSON 형식
- 날짜 범위별 번들링

---

## 참고 유틸함수

### 날짜 유틸 (lib/date-utils.ts)
- `formatKST()`: KST 기준 포맷팅
- `startOfDayKST()`: 당일 시작 (KST)
- `endOfDayKST()`: 당일 종료 (KST)
- `toDateOnlyUTC()`: Date → UTC Date Only
- `subDaysKST()`: 며칠 전

### 검증 유틸 (lib/validation.ts)
- `standupQuerySchema`: GET 파라미터 검증
- `standupTaskSchema`: POST 바디 검증
- `standupTaskUpdateSchema`: PATCH 바디 검증
