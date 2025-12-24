# Studio Baton Live

에이전시 포트폴리오 사이트 - 개발 활동을 자동으로 수집하여 블로그 형태로 공유합니다.

## 주요 기능

- GitHub 커밋 자동 수집 (Cron 기반)
- AI 기반 개발일지 자동 생성 (Claude API)
- 런타임 마스킹 시스템 (내부/외부 사용자 구분)
- 프로젝트별 표시명 관리ㄱ

## 마스킹 시스템

외부 방문자에게는 고객 기밀을 보호하면서 개발 활동을 공개합니다.

| 항목                 | 내부 사용자             | 외부 방문자                        |
| -------------------- | ----------------------- | ---------------------------------- |
| 프로젝트명           | 실제 이름 (displayName) | 마스킹 이름 (maskName)             |
| 커밋 메시지          | 전체 표시               | 카테고리 (기능 추가, 버그 수정 등) |
| 커밋 URL             | 링크 활성               | 링크 제거                          |
| 개발자명             | 실명                    | "개발자 A, B, C"                   |
| 커밋 수/라인 수/날짜 | 표시                    | 표시                               |

## 시작하기

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# 데이터베이스 (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# 세션 암호화 키 (32자 이상)
SESSION_SECRET="your-secret-key-at-least-32-characters"

# GitHub API 토큰
GITHUB_TOKEN="ghp_..."
GITHUB_ORG="studiobaton"

# Claude API (글 생성용)
ANTHROPIC_API_KEY="sk-ant-..."

# 관리자 계정 (선택, seed 시 사용)
ADMIN_EMAIL="admin@ba-ton.kr"
ADMIN_PASSWORD="your-secure-password"
ADMIN_NAME="관리자"
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma db push

# 관리자 계정 생성
npx prisma db seed

# 개발 서버 실행
npm run dev
```

### 관리자 계정 생성

`npx prisma db seed` 명령으로 관리자 계정을 생성합니다.

**중요**: `@ba-ton.kr` 이메일만 로그인할 수 있습니다.

```bash
# 환경 변수로 설정
ADMIN_EMAIL="yourname@ba-ton.kr"
ADMIN_PASSWORD="secure-password"
ADMIN_NAME="홍길동"

# seed 실행
npx prisma db seed
```

기본값:
- 이메일: `admin@ba-ton.kr`
- 비밀번호: `changeme123`

## 프로젝트 구조

```
├── app/
│   ├── (public)/          # 공개 페이지 (홈, 포스트)
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API 라우트
│   └── generated/         # Prisma 생성 파일
├── components/            # UI 컴포넌트
├── lib/                   # 유틸리티
│   ├── masking.ts         # 마스킹 로직
│   ├── session.ts         # 세션 관리
│   └── prisma.ts          # DB 클라이언트
└── prisma/
    ├── schema.prisma      # 데이터베이스 스키마
    └── seed.ts            # 초기 데이터 시드
```

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: Iron Session
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Claude API (Anthropic)

## 관리자 페이지

- `/admin` - 대시보드
- `/admin/projects` - 프로젝트 매핑 관리
- `/admin/generate` - 글 생성

## 라이선스

Private - Studio Baton
