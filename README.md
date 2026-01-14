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

`.env.local` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# 데이터베이스 (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Auth.js Configuration
AUTH_SECRET="your-secret-key"  # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub API 토큰
GITHUB_TOKEN="ghp_..."
GITHUB_ORG="studiobaton"

# Claude API (글 생성용)
ANTHROPIC_API_KEY="sk-ant-..."
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

### Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. "APIs & Services" > "Credentials" 에서 OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI 추가:
   - 개발: `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `https://studiobaton.live/api/auth/callback/google`
4. 발급된 Client ID와 Client Secret을 `.env.local`에 추가

### 로그인 방법

Google OAuth를 사용하며, **@ba-ton.kr 도메인 계정만** 로그인할 수 있습니다.

1. http://localhost:3000/admin 접속
2. "Google로 로그인" 버튼 클릭
3. @ba-ton.kr 계정으로 로그인
4. 최초 로그인 시 자동으로 Admin 계정 생성

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
- **Auth**: Auth.js (NextAuth v5) + Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Claude API (Anthropic)

## 관리자 페이지

- `/admin` - 대시보드
- `/admin/projects` - 프로젝트 매핑 관리
- `/admin/generate` - 글 생성

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
  http://localhost:3000/api/admin/posts
```

TypeScript/JavaScript:
```typescript
const token = "dev_YWRtaW5AYmEtdG9uLmty" // 발급받은 토큰

// API 요청
const response = await fetch('http://localhost:3000/api/admin/posts', {
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

- ✅ 이메일 기반 간단한 토큰 생성
- ✅ Bearer 토큰 방식으로 어디서나 사용 가능
- ✅ 개발 환경에서만 작동 (프로덕션 자동 비활성화)
- ✅ @ba-ton.kr 도메인만 허용
- ✅ Google OAuth 로그인과 동일한 권한

## 라이선스

Private - Studio Baton
