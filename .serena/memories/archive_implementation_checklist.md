# 아카이브 기능 구현 체크리스트

## 1단계: 데이터베이스 스키마 확장

### Prisma Migration 필요사항
```prisma
# StandupTask 모델에 추가
- isArchived: Boolean @default(false)  // 아카이브 상태
- archivedAt: DateTime?                // 아카이브 시점
- tags: String[] @default([])          // 태그 (카테고리)
- notes: String? @db.Text              // 메모

# 인덱스 추가
@@index([isArchived])
@@index([archivedAt])
```

### CommitLog 모델에 추가
```prisma
- isArchived: Boolean @default(false)
- archivedAt: DateTime?
```

---

## 2단계: 백엔드 API 개발

### 아카이브 관련 API 엔드포인트
```
POST   /api/console/standup/task/[taskId]/archive       # 아카이브 처리
POST   /api/console/standup/task/[taskId]/unarchive     # 아카이브 해제
DELETE /api/console/standup/task/[taskId]/archive       # 영구 삭제

GET    /api/console/archive/tasks                       # 아카이브된 할 일 목록
GET    /api/console/archive/tasks/search                # 아카이브 검색
GET    /api/console/archive/export                      # 내보내기 (PDF/CSV)
```

### 쿼리 파라미터
```
GET /api/console/archive/tasks?
  &dateFrom=2024-01-01
  &dateTo=2024-12-31
  &memberId=...
  &repository=...
  &status=completed|pending|all
  &page=1
  &pageSize=20
```

---

## 3단계: 프론트엔드 컴포넌트

### 새 페이지 및 컴포넌트
```
app/console/(protected)/archive/
├── page.tsx                    # 아카이브 메인 페이지
├── [memberId]/page.tsx        # 팀원별 아카이브
└── _components/
    ├── archive-filters.tsx     # 필터 (날짜, 저장소, 상태)
    ├── archive-table.tsx       # 아카이브 테이블
    ├── archive-calendar.tsx    # 캘린더 뷰
    ├── archive-statistics.tsx  # 통계 (완료율, 기간 등)
    ├── archive-export.tsx      # 내보내기 옵션
    └── archive-restore-dialog.tsx # 복구 다이얼로그
```

---

## 4단계: UI/UX 디자인 고려사항

### 레이아웃 패턴
```typescript
// 페이지 구조
<PageContainer maxWidth="2xl">
  <PageHeader title="아카이브" description="과거 업무 기록 조회" />
  
  {/* 필터 섹션 */}
  <ArchiveFilters
    onFilter={(filters) => refetch(filters)}
  />
  
  {/* 뷰 토글 (테이블/캘린더) */}
  <Tabs defaultValue="table">
    <TabsList>
      <TabsTrigger value="table">목록</TabsTrigger>
      <TabsTrigger value="calendar">캘린더</TabsTrigger>
      <TabsTrigger value="stats">통계</TabsTrigger>
    </TabsList>
    
    <TabsContent value="table">
      <ArchiveTable data={data} />
    </TabsContent>
  </Tabs>
  
  {/* 액션 버튼 */}
  <Button onClick={() => exportData()}>내보내기</Button>
</PageContainer>
```

### 사용 가능한 shadcn/ui 컴포넌트
- **Tabs**: 뷰 전환 (목록/캘린더/통계)
- **Calendar**: 날짜 범위 선택
- **Table** (@tanstack/react-table 사용)
- **Dialog**: 상세 보기/복구 확인
- **Badge**: 상태 표시 (완료, 미완료, 아카이브됨)
- **Button**: 다양한 액션
- **Select**: 정렬 및 필터링
- **DatePicker**: 날짜 범위 선택 (있으면)

---

## 5단계: 검색 및 필터링

### 필터 조합
- **날짜 범위**: startDate ~ endDate (또는 프리셋: 이번달, 지난달, 지난 분기)
- **팀원**: 단일 선택 또는 다중 선택
- **저장소**: 다중 선택
- **완료 상태**: 전체/완료/미완료
- **태그**: 다중 선택 (future feature)

### 정렬 옵션
- 최신순 (dueDate DESC)
- 완료 날짜순 (completedAt DESC)
- 원래 등록 날짜순 (originalDueDate ASC)

---

## 6단계: 내보내기 기능

### 지원 형식
- **CSV**: 스프레드시트 호환
  - 열: 날짜, 팀원, 내용, 저장소, 완료상태, 완료날짜
- **PDF**: 보고서 형식
  - 페이지 헤더: 기간, 팀원명
  - 요약: 통계 (총 할 일, 완료율)
  - 내용: 날짜별 할 일 목록

### 라이브러리
- **CSV**: papaparse 또는 수동 생성
- **PDF**: pdfkit 또는 puppeteer (복잡한 경우)

---

## 7단계: 권한 검증

### 접근 제어
```typescript
// TEAM_MEMBER: 자신의 아카이브만 조회 가능
// ADMIN: 모든 팀원의 아카이브 조회 가능
// ORG_MEMBER: 접근 불가
```

### 에러 처리
```typescript
// 미인증 사용자 → 401
// 권한 없음 → 403
// 파라미터 오류 → 400
// 데이터 없음 → 404
```

---

## 8단계: 성능 최적화

### 페이지네이션
```typescript
// 대량 데이터 조회 시 필수
GET /api/console/archive/tasks?page=1&pageSize=50
```

### 인덱싱 (이미 설정됨)
```prisma
@@index([isArchived])
@@index([archivedAt])
@@index([dueDate])
@@index([isCompleted, dueDate])
```

---

## 9단계: 테스트

### E2E 테스트 케이스
1. 아카이브 하기/해제하기
2. 날짜 범위로 필터링
3. 팀원별 조회
4. 저장소별 필터링
5. 내보내기 (CSV/PDF)
6. 권한 검증

### 단위 테스트
- API 응답 형식
- 필터링 로직
- 내보내기 포맷팅

---

## 10단계: 배포 및 마이그레이션

### Prisma 마이그레이션
```bash
npx prisma migrate dev --name add_archive_fields
npx prisma db push
```

### 백필 데이터 (기존 데이터)
```typescript
// 기존 완료된 할 일을 아카이브 처리 (선택사항)
// 또는 isArchived=false 기본값으로 유지
```

---

## 추가 고려사항

### 소프트 삭제 vs 하드 삭제
- **현재 제안**: 소프트 삭제 (isArchived flag)
- **장점**: 복구 가능, 통계 유지
- **단점**: 데이터 크기 증가

### 자동 아카이빙
```typescript
// 30일 이상 완료된 할 일 자동 아카이브 (선택 기능)
// Cron 작업으로 구현 가능
```

### 알림/배포 보고서
```typescript
// 주간 아카이브 요약 이메일
// 월간 성과 리포트
```

---

## 구현 순서 (권장)

1. **DB 마이그레이션** (스키마 확장)
2. **API 개발** (아카이브/복구/조회)
3. **페이지 생성** (기본 구조)
4. **필터링** (날짜, 팀원, 상태)
5. **테이블/캘린더 뷰**
6. **통계 생성**
7. **내보내기** (CSV → PDF)
8. **테스트 및 최적화**
9. **배포**

---

## 참고 코드 패턴

### 기존 API 검증 패턴
```typescript
// lib/validation.ts에서 zod 스키마 정의
export const archiveQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  memberId: z.string().cuid(),
  repository: z.string().optional(),
  status: z.enum(['all', 'completed', 'pending']).default('all'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(50),
});
```

### 기존 에러 처리 패턴
```typescript
import { AuthError, ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors';

// API 라우트에서 사용
try {
  // 로직
} catch (error) {
  const normalizedError = normalizeError(error);
  return NextResponse.json(
    { error: normalizedError.message },
    { status: normalizedError.status }
  );
}
```
