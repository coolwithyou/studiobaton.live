# Studio Baton Live

에이전시 개발 블로그 - 개발 활동을 자동으로 수집하여 블로그 형태로 공유합니다.

## 주요 기능

### 자동화
- **GitHub 커밋 수집**: Cron 기반 자동 커밋 수집
- **AI 개발일지 생성**: Claude API를 활용한 자동 글 생성
- **AI 커밋 요약**: 팀원별 일일 커밋 하이라이트 분석

### 팀 협업
- **스탠드업**: 일일 할 일 관리 (레포지토리 @멘션 지원)
- **커밋 리뷰**: 팀원별/날짜별 커밋 검토
- **Wrap-up**: AI 기반 일일 작업 요약 및 기술 부채 분석

### 보안
- **런타임 마스킹 시스템**: 내부/외부 사용자 구분
- **역할 기반 접근 제어**: ADMIN, TEAM_MEMBER, ORG_MEMBER
- **사용자 승인 시스템**: 가입 후 관리자 승인 필요

## 마스킹 시스템

외부 방문자에게는 고객 기밀을 보호하면서 개발 활동을 공개합니다.

| 항목                 | 내부 사용자             | 외부 방문자                        |
| -------------------- | ----------------------- | ---------------------------------- |
| 프로젝트명           | 실제 이름 (displayName) | 마스킹 이름 (maskName)             |
| 커밋 메시지          | 전체 표시               | 카테고리 (기능 추가, 버그 수정 등) |
| 커밋 URL             | 링크 활성               | 링크 제거                          |
| 개발자명             | 실명                    | "개발자 A, B, C"                   |
| 커밋 수/라인 수/날짜 | 표시                    | 표시                               |

## 역할 기반 접근 제어

| 역할        | 설명                | 접근 권한                     |
| ----------- | ------------------- | ----------------------------- |
| ADMIN       | 최고 관리자         | 모든 페이지 접근              |
| TEAM_MEMBER | 개발팀원            | 커밋 리뷰, 스탠드업 등        |
| ORG_MEMBER  | 바토너 (조직 구성원) | 마스킹 해제만 (어드민 접근 불가) |

## 시작하기

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# 데이터베이스 (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Auth.js Configuration
AUTH_SECRET="your-secret-key"  # openssl rand -base64 32
AUTH_URL="http://localhost:3090"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub API 토큰
GITHUB_TOKEN="ghp_..."
GITHUB_ORG="studiobaton"

# Claude API (글 생성용)
ANTHROPIC_API_KEY="sk-ant-..."

# GIPHY API (GIF 검색용, 선택)
GIPHY_API_KEY="your-giphy-api-key"
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma db push

# 관리자 계정 생성
npx prisma db seed

# 개발 서버 실행 (포트 3090)
npm run dev
```

### Google OAuth 설정

#### 1. Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 상단의 프로젝트 선택 드롭다운 클릭 → "새 프로젝트" 선택
3. 프로젝트 이름 입력 (예: `studiobaton-live`) → "만들기" 클릭

#### 2. OAuth 동의 화면 설정

1. 좌측 메뉴에서 "APIs & Services" > "OAuth consent screen" 클릭
2. User Type: "External" 선택 → "만들기"
3. 필수 정보 입력:
   - 앱 이름: `Studio Baton Live`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 이메일: 본인 이메일
4. "저장 후 계속" 클릭 (Scopes, Test users는 기본값으로 진행)

#### 3. OAuth 클라이언트 ID 생성

1. "APIs & Services" > "Credentials" 클릭
2. 상단 "+ CREATE CREDENTIALS" → "OAuth client ID" 선택
3. 애플리케이션 유형: "Web application" 선택
4. 이름 입력 (예: `Studio Baton Live Web`)
5. **승인된 JavaScript 원본** 추가:
   - `http://localhost:3090` (개발용)
   - `https://log.ba-ton.kr` (프로덕션)
6. **승인된 리디렉션 URI** 추가:
   - `http://localhost:3090/api/auth/callback/google` (개발용)
   - `https://log.ba-ton.kr/api/auth/callback/google` (프로덕션)
7. "만들기" 클릭

#### 4. 환경 변수 설정

생성 완료 후 표시되는 클라이언트 ID와 클라이언트 보안 비밀번호를 `.env.local`에 추가:

```bash
GOOGLE_CLIENT_ID="123456789-xxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
```

> **참고**: 클라이언트 보안 비밀번호는 생성 시에만 표시됩니다. 분실 시 새로 생성해야 합니다.

### 로그인 방법

Google OAuth를 사용하며, **@ba-ton.kr 도메인 계정만** 로그인할 수 있습니다.

1. http://localhost:3090/admin 접속
2. "Google로 로그인" 버튼 클릭
3. @ba-ton.kr 계정으로 로그인
4. 최초 로그인 시 승인 대기 상태 (ADMIN이 승인 필요)

## 프로젝트 구조

```
├── app/
│   ├── (public)/              # 공개 페이지 (홈, 포스트)
│   ├── admin/
│   │   ├── (auth)/            # 인증 페이지 (로그인, 승인 대기)
│   │   └── (protected)/       # 보호된 관리자 페이지
│   │       ├── standup/       # 스탠드업 (할 일 관리)
│   │       ├── review/        # 커밋 리뷰
│   │       ├── wrap-up/       # 일일 Wrap-up
│   │       ├── generate/      # 글 생성
│   │       ├── projects/      # 프로젝트 매핑
│   │       ├── members/       # 팀원 관리
│   │       ├── users/         # 사용자 관리
│   │       └── stats/         # 통계
│   ├── api/
│   │   ├── admin/             # 관리자 API
│   │   ├── auth/              # 인증 API
│   │   ├── cron/              # Cron 작업
│   │   ├── giphy/             # GIPHY API
│   │   └── posts/             # 공개 포스트 API
│   └── generated/             # Prisma 생성 파일
├── components/
│   ├── admin/                 # 관리자 컴포넌트
│   ├── giphy/                 # GIF 선택기
│   ├── markdown/              # 마크다운 렌더러
│   ├── search/                # 검색 컴포넌트
│   ├── timeline/              # 타임라인 컴포넌트
│   └── ui/                    # shadcn/ui 컴포넌트
├── lib/
│   ├── ai.ts                  # Claude API 유틸
│   ├── auth-adapter.ts        # Auth.js 어댑터
│   ├── auth-helpers.ts        # 인증 헬퍼
│   ├── config.ts              # 사이트 설정
│   ├── generate.ts            # 글 생성 로직
│   ├── github.ts              # GitHub API
│   ├── masking.ts             # 마스킹 로직
│   ├── prisma.ts              # DB 클라이언트
│   └── validation.ts          # 입력 검증
└── prisma/
    ├── schema.prisma          # 데이터베이스 스키마
    └── seed.ts                # 초기 데이터 시드
```

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: Auth.js (NextAuth v5) + Google OAuth
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **AI**: Claude API (Anthropic)
- **Testing**: Vitest + Testing Library
- **Editor**: Monaco Editor (마크다운 편집)
- **Charts**: Recharts (통계 시각화)

## 관리자 페이지

| 경로             | 설명                           | 권한 |
| ---------------- | ------------------------------ | ---- |
| `/admin`         | 대시보드                       | ALL  |
| `/admin/standup` | 스탠드업 (일일 할 일 관리)     | TEAM_MEMBER+ |
| `/admin/review`  | 커밋 리뷰 (팀원별 커밋 검토)   | TEAM_MEMBER+ |
| `/admin/wrap-up` | 일일 Wrap-up (AI 커밋 요약)    | TEAM_MEMBER+ |
| `/admin/generate`| 글 생성                        | ADMIN |
| `/admin/post/[id]`| 글 편집                       | ADMIN |
| `/admin/projects`| 프로젝트 매핑 관리             | ADMIN |
| `/admin/members` | 팀원 관리                      | ADMIN |
| `/admin/users`   | 사용자 관리 (승인/거부)        | ADMIN |
| `/admin/stats`   | 통계                           | ADMIN |

## 개발/테스트 API (AI 에이전트용)

### Bearer 토큰 기반 인증 API

AI 에이전트, E2E 테스트, 자동화 스크립트에서 사용할 수 있는 개발 전용 인증 API입니다.

**⚠️ 보안**: `NODE_ENV=production`에서는 자동으로 비활성화됩니다.

#### 1. 토큰 발급

```bash
POST /api/auth/dev-login
Content-Type: application/json

{
  "email": "admin@ba-ton.kr"
}
```

응답:
```json
{
  "success": true,
  "token": "dev_YWRtaW5AYmEtdG9uLmty",
  "user": {
    "id": "cm...",
    "email": "admin@ba-ton.kr",
    "name": "admin"
  },
  "usage": "Authorization: Bearer dev_YWRtaW5AYmEtdG9uLmty"
}
```

#### 2. API 요청 시 사용

발급받은 토큰을 Authorization 헤더에 포함:

```bash
# 관리자 API 호출 예시
curl -H "Authorization: Bearer dev_YWRtaW5AYmEtdG9uLmty" \
  http://localhost:3090/api/admin/posts
```

TypeScript/JavaScript:
```typescript
const token = "dev_YWRtaW5AYmEtdG9uLmty" // 발급받은 토큰

// API 요청
const response = await fetch('http://localhost:3090/api/admin/posts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log(data)
```

#### 3. 토큰 검증

```bash
GET /api/auth/dev-login
Authorization: Bearer dev_YWRtaW5AYmEtdG9uLmty
```

#### 4. 로그아웃

토큰은 stateless이므로 클라이언트에서 삭제하면 됩니다:

```bash
DELETE /api/auth/dev-login
```

#### 특징

- 이메일 기반 간단한 토큰 생성
- Bearer 토큰 방식으로 어디서나 사용 가능
- 개발 환경에서만 작동 (프로덕션 자동 비활성화)
- @ba-ton.kr 도메인만 허용
- Google OAuth 로그인과 동일한 권한

## 스크립트

```bash
npm run dev          # 개발 서버 (포트 3090)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # ESLint 검사
npm run test         # Vitest 실행 (watch)
npm run test:run     # Vitest 단일 실행
npm run test:coverage # 커버리지 리포트
npm run db:push      # Prisma 스키마 푸시
npm run db:migrate   # Prisma 마이그레이션
npm run db:seed      # 초기 데이터 시드
```

## 라이선스

Private - Studio Baton
