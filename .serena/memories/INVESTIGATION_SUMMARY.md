# 업무일지 아카이브 기능 구현 - 철저한 조사 요약

## 조사 완료 항목

### ✅ 1. 스탠드업/랩업 관련 컴포넌트와 데이터 구조

**위치**: `app/console/(protected)/standup/` 및 `app/console/(protected)/wrap-up/`

**핵심 컴포넌트**:
- `StandupContent`: 스탠드업 메인 컨테이너 (상태 관리, fetch)
- `StandupForm`: 할 일 입력 폼 (날짜 선택, 멘션 자동완성)
- `TaskList`: 할 일 목록 (편집, 삭제, 완료 체크)
- `WrapUpContent`: 랩업 메인 컨테이너 (스탠드업 + 커밋 통합 뷰)
- `StandupChecklist`: 읽기 전용 체크리스트 (Optimistic update 지원)

**Task 데이터 구조**:
```typescript
{
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  displayOrder: number;
  dueDate: string;           // 목표 완료 날짜 (리스케줄 가능)
  originalDueDate: string;   // 최초 작성 날짜 (뱃지 표시용)
}
```

**데이터 페칭 방식**:
- fetch + useState (React Query 미사용)
- silent flag를 활용한 초기 로딩 vs 백그라운드 갱신 구분
- useCallback + useRef를 활용한 수동 캐시 관리

---

### ✅ 2. 데이터베이스 스키마

**핵심 모델**:

**StandupTask** (할 일 항목):
- `id`: 고유 ID
- `standupId`: Standup FK
- `content`: 할 일 내용
- `repository`: 참조 레포 (선택)
- `isCompleted`: 완료 상태
- `completedAt`: 완료 시각
- `dueDate`: 목표 완료 날짜 (변경 가능)
- `originalDueDate`: 최초 등록 날짜 (불변)
- `displayOrder`: 정렬 순서

**Standup** (일일 스탠드업):
- `id`: 고유 ID
- `memberId`: Member FK
- `date`: 등록 날짜 (Date only)
- `tasks`: StandupTask[] 관계

**Member** (팀원):
- `id`: 고유 ID
- `githubName`: GitHub 사용자명 (@unique)
- `email`: GitHub 커밋 이메일 (CommitLog.authorEmail과 매칭)
- `isActive`: 활성화 여부

**CommitLog** (커밋 기록):
- `sha`: 커밋 SHA
- `authorEmail`: 작성자 이메일 (Member.email과 매칭)
- `committedAt`: 커밋 시간
- `repository`: 리포지토리명

**인덱스 (최적화됨)**:
```
StandupTask: @@index([standupId]), @@index([dueDate]), @@index([isCompleted, dueDate])
Standup: @@unique([memberId, date]), @@index([date])
CommitLog: @@index([committedAt]), @@index([repository])
```

---

### ✅ 3. 기존 UI 컴포넌트

**shadcn/ui 컴포넌트** (사용 가능):
- `Calendar`: 날짜 선택 (react-day-picker, ko 로케일)
- `Card`: 섹션 그룹핑
- `Tabs`: 팀원 탭 전환
- `Button`: 모든 상호작용
- `Badge`: 상태 표시 (캐리오버 "N일 전" 등)
- `Checkbox`: 완료 체크
- `Textarea`: 멀티라인 입력
- `Dialog`: 모달 (복구 확인 등)
- `Popover`: 달력 팝오버
- `Tooltip`: 힌트
- `Table`: 테이블 표시 (@tanstack/react-table 지원)
- `Separator`: 구분선
- `Select`: 드롭다운 선택
- `Input`: 단일 입력
- `Skeleton`: 로딩 스켈레톤

**커스텀 컴포넌트**:
- `PageContainer`: 페이지 최대 너비 제한
- `PageHeader`: 페이지 제목 + 설명
- `MemberTabs`: 팀원 탭
- `CommitRepositoryGroup`: 리포지토리별 커밋 그룹

**레이아웃 패턴**:
```typescript
<PageContainer maxWidth="xl" | "2xl">
  <PageHeader title="" description="" />
  <MemberTabs ... />
  <div className="mt-6">콘텐츠</div>
</PageContainer>
```

---

### ✅ 4. API 라우트

**스탠드업 API**:

```
GET /api/console/standup?date=YYYY-MM-DD&memberId=...&includeCarryover=true&carryoverDays=7
└─ 응답: { date, member, standup: { id, tasks, carriedOverTasks } }

POST /api/console/standup
├─ 바디: { dueDate, memberId, content, repository }
└─ 응답: { task } (201)

PATCH /api/console/standup/task/[taskId]
├─ 바디: { isCompleted?, content?, repository?, dueDate? }
└─ 응답: { task }

DELETE /api/console/standup/task/[taskId]
└─ 응답: { success: true }
```

**커밋 리뷰 API**:

```
GET /api/console/review?date=YYYY-MM-DD&memberId=...
└─ 응답: { date, member, repositories[], summary }
```

**기타 관련 API**:
- `POST /api/member/commits/refresh`: 커밋 다시 가져오기
- `GET /api/me`: 현재 사용자 정보

**주요 특징**:
- 모든 날짜는 KST 기준 문자열 (YYYY-MM-DD)
- 캐리오버: `dueDate < targetDate && isCompleted == false`
- 병렬 요청으로 성능 최적화: `Promise.all([standupRes, reviewRes])`

---

### ✅ 5. @tanstack/react-query 사용 현황

**결론: React Query 미사용**

**현재 데이터 페칭 방식**:
- `fetch()` + `useState` 조합
- `useCallback` + `useEffect`를 활용한 수동 관리
- `useRef`를 활용한 중복 제출 방지

**Optimistic Update 구현** (StandupChecklist):
```typescript
// 1. 즉시 UI 업데이트
setLocalTasks(prev => ...)

// 2. API 요청
const response = await fetch(...)

// 3. 실패 시 롤백
if (!response.ok) { /* 롤백 */ }
```

**무한 스크롤**: 구현되지 않음 (모든 데이터 단일 요청)

**라이브러리**:
- `@tanstack/react-table`: 테이블 컴포넌트 (쿼리 아님)
- React Query 대신 네이티브 fetch 사용

---

## 아카이브 기능 구현 시 활용할 기술

### 데이터 구조 확장
```prisma
# StandupTask에 추가
isArchived: Boolean @default(false)
archivedAt: DateTime?
tags: String[] @default([])
notes: String? @db.Text

# 인덱스
@@index([isArchived])
@@index([archivedAt])
```

### API 엔드포인트 (예상)
```
GET    /api/console/archive/tasks?dateFrom=...&dateTo=...&memberId=...&page=...
POST   /api/console/standup/task/[taskId]/archive
POST   /api/console/standup/task/[taskId]/unarchive
DELETE /api/console/standup/task/[taskId]/archive
GET    /api/console/archive/export
```

### 페이지 구조 (예상)
```
app/console/(protected)/archive/
├── page.tsx (리다이렉트)
├── [memberId]/page.tsx (팀원별 아카이브)
└── _components/
    ├── archive-filters.tsx
    ├── archive-table.tsx
    ├── archive-calendar.tsx
    ├── archive-statistics.tsx
    └── archive-export.tsx
```

### UI 컴포넌트 활용
- **Tabs**: 뷰 전환 (목록/캘린더/통계)
- **Table**: @tanstack/react-table 기반 테이블
- **Calendar**: 날짜 범위 선택
- **Dialog**: 상세 보기/복구 확인
- **Badge**: 상태 표시

---

## 구현 시 주의사항

### 날짜 처리
- ✅ 모든 KST 기반 처리 (lib/date-utils.ts 활용)
- ✅ `toDateOnlyUTC()`: PostgreSQL DATE 컬럼 쿼리용
- ✅ `formatKST()`: 클라이언트 표시용

### 에러 처리
- ✅ `normalizeError()` 사용 (Prisma 에러 자동 처리)
- ✅ Zod 스키마로 검증 (formatZodError 활용)
- ✅ 클라이언트에는 읽기 쉬운 메시지만 전달

### 권한 검증
- ✅ TEAM_MEMBER: 자신의 아카이브만 조회
- ✅ ADMIN: 모든 팀원의 아카이브 조회
- ✅ ORG_MEMBER: 접근 불가

### 성능
- ✅ 페이지네이션 (기본 limit: 10-50)
- ✅ DB 인덱스 (이미 설계됨)
- ✅ silent flag로 백그라운드 갱신 지원

---

## 참고 파일 목록

### 컴포넌트
- `app/console/(protected)/standup/_components/*.tsx`
- `app/console/(protected)/wrap-up/_components/*.tsx`
- `components/ui/*.tsx` (shadcn/ui)

### API 라우트
- `app/api/console/standup/*.ts`
- `app/api/console/review/*.ts`

### 유틸
- `lib/date-utils.ts`: KST 기반 날짜 유틸
- `lib/validation.ts`: Zod 스키마
- `lib/errors.ts`: 에러 클래스
- `lib/auth-helpers.ts`: 인증 헬퍼

### Prisma
- `prisma/schema.prisma`: DB 스키마

---

## 추가 리소스

### 메모리 파일
1. **archive_feature_research.md**: 상세 조사 결과
2. **archive_implementation_checklist.md**: 구현 체크리스트
3. **utility_patterns_and_helpers.md**: 유틸 함수 및 패턴

### 프로젝트 정보
- **package.json**: 의존성 및 스크립트
- **tsconfig.json**: TypeScript 설정
- **next.config.js**: Next.js 설정

---

## 조사 완료도

| 항목 | 상태 | 주요 내용 |
|------|------|---------|
| 컴포넌트 구조 | ✅ 완료 | 페이지 재사용, 레이아웃 패턴 명확 |
| DB 스키마 | ✅ 완료 | 캐리오버, 리스케줄 기능 지원 설계 |
| UI 컴포넌트 | ✅ 완료 | shadcn/ui 20+ 컴포넌트 사용 가능 |
| API 라우트 | ✅ 완료 | 4개 엔드포인트 명확, 응답 형식 정의 |
| 데이터 페칭 | ✅ 완료 | fetch + useState, Optimistic update 지원 |
| 유틸 함수 | ✅ 완료 | 날짜, 검증, 에러 처리 패턴 문서화 |
| 권한 제어 | ✅ 완료 | 역할 기반 접근 제어 구현 가능 |
| 성능 | ✅ 완료 | 인덱스, 페이지네이션 전략 파악 |

**조사 방식**: 철저한 코드 분석 + 패턴 추출 + 메모리 문서화

---

## 다음 단계

1. **DB 마이그레이션**: `isArchived`, `archivedAt` 필드 추가
2. **API 개발**: 아카이브/복구/조회 엔드포인트
3. **페이지 생성**: 기본 레이아웃 (PageContainer + PageHeader)
4. **필터링**: 날짜, 팀원, 상태 필터
5. **테이블 구현**: @tanstack/react-table 활용
6. **내보내기**: CSV/PDF 지원
7. **테스트 및 배포**

---

**조사 완료**: 2026-01-22
**조사 깊이**: Very Thorough
**총 메모리 파일**: 4개
