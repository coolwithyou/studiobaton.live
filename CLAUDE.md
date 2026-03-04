# studiobaton.live - 프로젝트 컨텍스트

> Prep 봇의 행동 규칙은 studiobaton.prep의 issue-analyzer.yml에서 중앙 관리됩니다.
> 이 파일은 봇이 코드베이스를 이해하는 데 필요한 프로젝트 컨텍스트를 제공합니다.

## 기술 스택

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **Test**: Vitest
- **Auth**: auth.ts (자체 구현)

## 프로젝트 구조

```
app/              # Next.js App Router 페이지 및 API 라우트
components/       # 공통 UI 컴포넌트
lib/              # 유틸리티, 헬퍼 함수
hooks/            # React 커스텀 훅
types/            # 전역 타입 정의
prisma/           # DB 스키마 및 마이그레이션
scripts/          # 빌드/유틸리티 스크립트
public/           # 정적 파일
assets/           # 이미지 등 에셋
```

## 중요 파일

- `auth.ts` - 인증 설정
- `proxy.ts` - 프록시 설정
- `prisma/` - DB 스키마 및 마이그레이션
- `next.config.ts` - Next.js 설정
- `vercel.json` - 배포 설정

## 코딩 컨벤션

- 서버 컴포넌트 기본, 클라이언트는 `"use client"` 명시 시만
- API 라우트는 `app/api/` 하위에 위치
- DB 접근은 Prisma Client를 통해서만
- 타입은 `types/` 또는 컴포넌트 파일 내 로컬 정의

## 주의 사항

- Prisma 스키마 변경 시 마이그레이션 필요 (`prisma migrate dev`)
- `prisma/` 하위 변경은 MEDIUM 이하 confidence로 판단
- 인증(`auth.ts`) 관련 변경은 신중하게 처리
