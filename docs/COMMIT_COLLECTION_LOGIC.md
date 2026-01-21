# 커밋 수집 및 글 생성 로직

이 문서는 Studio Baton Live의 커밋 수집 및 AI 글 생성 시스템의 내부 로직을 설명합니다.

## 목차

- [데이터 모델](#데이터-모델)
- [커밋 수집 흐름](#커밋-수집-흐름)
- [글 생성 흐름](#글-생성-흐름)
- [효율성 메커니즘](#효율성-메커니즘)

---

## 데이터 모델

### CommitLog 테이블

모든 커밋은 단일 `CommitLog` 테이블에 저장됩니다. 수집 경로(Generate, Wrap-up, Standup)와 관계없이 동일한 테이블을 사용합니다.

```
CommitLog
├── sha (PK)           # 커밋 고유 식별자
├── postId (FK, nullable)  # 연결된 Post (없으면 orphan)
├── repository
├── message
├── author
├── committedAt
└── ...
```

**설계 이유**:
- SHA 기반 자연스러운 중복 방지
- 유연한 커밋-포스트 연결 (다대일)
- 단순한 데이터 구조로 유지보수 용이

### Post 타입 분리

```typescript
enum PostType {
  COMMIT_BASED  // 커밋 기반 자동 생성 포스트
  MANUAL        // 수동 작성 포스트
}
```

| 타입 | 설명 | 생성 방식 |
|------|------|-----------|
| `COMMIT_BASED` | 커밋 데이터 기반 AI 생성 | `/console/generate` 페이지 |
| `MANUAL` | 사용자가 직접 작성 | 수동 생성 (향후) |

---

## 커밋 수집 흐름

### collectCommitsForDate 함수

**파일**: `lib/generate.ts`

```
┌─────────────────────────────────────────────────────────────┐
│                    커밋 수집 프로세스                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   1. GitHub에서 커밋 수집      │
              │   collectDailyCommits(date)   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  2. 새 Post 생성               │
              │  type: "COMMIT_BASED"          │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  3. DB에서 기존 커밋 SHA 확인  │
              │  findMany({ sha: { in: [...] }})│
              └───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐   ┌─────────────────┐
          │  기존 커밋       │   │   새 커밋        │
          │  (DB에 존재)     │   │   (DB에 없음)    │
          └─────────────────┘   └─────────────────┘
                    │                   │
                    ▼                   ▼
          ┌─────────────────┐   ┌─────────────────┐
          │  postId UPDATE  │   │  INSERT         │
          │  (새 Post로 이동)│   │  (새로 저장)     │
          └─────────────────┘   └─────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
              ┌───────────────────────────────┐
              │  4. 결과 반환                  │
              │  { postId, newCommitsCount,   │
              │    existingCommitsCount, ... } │
              └───────────────────────────────┘
```

### 핵심 로직

```typescript
// 1. 항상 새 Post 생성 (COMMIT_BASED 타입)
const newPost = await prisma.post.create({
  data: {
    targetDate: startOfDay,
    status: "DRAFT",
    type: "COMMIT_BASED",
  },
});

// 2. 기존 커밋 SHA 확인
const existingCommitsInDb = await prisma.commitLog.findMany({
  where: { sha: { in: commitShas } },
  select: { sha: true },
});

// 3. 기존 커밋 → 새 Post로 이동 (UPDATE만 수행)
const existingShas = commits
  .filter((c) => existingShasInDb.has(c.sha))
  .map((c) => c.sha);

if (existingShas.length > 0) {
  await prisma.commitLog.updateMany({
    where: { sha: { in: existingShas } },
    data: { postId },
  });
}

// 4. 새 커밋만 INSERT
for (const commit of newCommits) {
  await prisma.commitLog.create({ data: { ...commit, postId } });
}
```

### Orphan 커밋 처리

**Orphan 커밋**: `postId: null`인 커밋 (Wrap-up/Standup에서 수집된 커밋)

- Wrap-up/Standup에서 수집 시: Post 없이 커밋만 저장 (`postId: null`)
- Generate에서 수집 시: 기존 orphan 커밋을 새 Post에 연결

```typescript
// 기존 커밋(orphan 포함)을 새 Post로 이동
await prisma.commitLog.updateMany({
  where: { sha: { in: existingShas } },  // postId 조건 없음 → 모든 기존 커밋 대상
  data: { postId },
});
```

---

## 글 생성 흐름

### handleGeneratePost 함수

**파일**: `app/console/(protected)/generate/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                    글 생성 프로세스                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  postId 확인                   │
              │  collectResult?.postId OR     │
              │  existingCommitStat?.postId   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  needsCollect 조건 확인        │
              │  (!collectResult?.success &&  │
              │   existingCommitStat?.        │
              │   commitCount > 0)            │
              └───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  needsCollect   │             │  !needsCollect  │
    │  = true         │             │  (Post 있음)     │
    └─────────────────┘             └─────────────────┘
              │                               │
              ▼                               │
    ┌─────────────────┐                       │
    │  커밋 수집 API   │                       │
    │  호출 (POST     │                       │
    │  /api/.../      │                       │
    │  collect)       │                       │
    │                 │                       │
    │  "수집 중..."   │                       │
    │  버튼 표시      │                       │
    └─────────────────┘                       │
              │                               │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │  버전 생성 API 호출            │
              │  POST /api/.../versions       │
              │                               │
              │  "생성 중..." 버튼 표시        │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  결과 반환                     │
              └───────────────────────────────┘
```

### needsCollect 조건

```typescript
const needsCollect = !collectResult?.success &&
  existingCommitStat?.commitCount != null &&
  existingCommitStat.commitCount > 0;
```

| 조건 | 의미 |
|------|------|
| `!collectResult?.success` | 아직 "커밋 수집하기" 버튼을 누르지 않음 |
| `existingCommitStat?.commitCount > 0` | 캘린더에 이미 커밋이 표시됨 (Wrap-up 등에서 수집) |

**결과**: 글 생성 버튼 클릭 시 자동으로 커밋 수집 후 버전 생성

### canGeneratePost 조건

```typescript
const canGeneratePost =
  (collectResult?.success === true && (collectResult.totalCommitsCount ?? 0) > 0) ||
  (existingCommitStat?.commitCount != null && existingCommitStat.commitCount > 0);
```

| 조건 | 의미 |
|------|------|
| `collectResult?.success && totalCommitsCount > 0` | 커밋 수집 완료 & 커밋 있음 |
| `existingCommitStat?.commitCount > 0` | 이미 수집된 커밋 있음 (Post 유무 무관) |

---

## 효율성 메커니즘

### 1. SHA 기반 중복 방지

커밋의 SHA는 전역적으로 고유하므로 중복 저장이 불가능합니다.

```typescript
// DB에서 기존 SHA 확인
const existingShasInDb = new Set(existingCommitsInDb.map((c) => c.sha));

// 새 커밋만 필터링
const newCommits = commits.filter((c) => !existingShasInDb.has(c.sha));
```

### 2. 기존 커밋은 UPDATE만

이미 DB에 있는 커밋은 데이터를 덮어쓰지 않고 `postId`만 업데이트합니다.

```typescript
// ❌ 전체 데이터 덮어쓰기 (비효율)
await prisma.commitLog.upsert({
  where: { sha },
  update: { ...allData, postId },  // 불필요한 데이터 업데이트
  create: { ...allData, postId },
});

// ✅ postId만 업데이트 (효율적)
await prisma.commitLog.updateMany({
  where: { sha: { in: existingShas } },
  data: { postId },  // postId만 변경
});
```

### 3. 배치 처리

여러 커밋을 개별 쿼리가 아닌 배치로 처리합니다.

```typescript
// 기존 커밋 일괄 업데이트
await prisma.commitLog.updateMany({
  where: { sha: { in: existingShas } },  // 배치
  data: { postId },
});

// 새 커밋 파일은 createMany로 일괄 생성
await tx.commitFile.createMany({
  data: commit.files.map((file) => ({ ...file, commitSha: commit.sha })),
});
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `lib/generate.ts` | 커밋 수집 및 버전 생성 핵심 로직 |
| `app/console/(protected)/generate/page.tsx` | Generate 페이지 UI 및 핸들러 |
| `app/console/(protected)/generate/_components/generation-options.tsx` | 생성 옵션 컴포넌트 |
| `app/console/(protected)/generate/_components/generate-calendar.tsx` | 캘린더 컴포넌트 |
| `app/api/console/commits/collect/route.ts` | 커밋 수집 API |
| `app/api/console/posts/[id]/versions/route.ts` | 버전 생성 API |
| `app/api/console/commits/stats/route.ts` | 커밋 통계 API (캘린더 데이터) |

---

## 요약

1. **단일 CommitLog 테이블**: 모든 수집 경로의 커밋을 통합 관리
2. **PostType 분리**: `COMMIT_BASED` vs `MANUAL`로 포스트 유형 구분
3. **SHA 기반 중복 방지**: 같은 커밋은 절대 중복 저장되지 않음
4. **효율적인 업데이트**: 기존 커밋은 `postId`만 변경 (데이터 덮어쓰기 없음)
5. **자동 Post 생성**: 커밋만 있어도 글 생성 시 Post 자동 생성
