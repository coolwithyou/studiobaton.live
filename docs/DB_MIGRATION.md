# PostgreSQL 데이터베이스 마이그레이션 가이드

PostgreSQL 데이터베이스를 다른 서버로 안전하게 마이그레이션하는 방법을 설명합니다.

## 사전 준비

### PostgreSQL 클라이언트 도구 설치 (macOS)

```bash
brew install libpq
brew link --force libpq
```

설치 후 경로: `/opt/homebrew/opt/libpq/bin/`

## 마이그레이션 절차

### 1. 원본 DB 백업

```bash
pg_dump "원본_DATABASE_URL" \
  --no-owner \
  --no-acl \
  -Fc \
  -f backup.dump
```

**옵션 설명:**
- `--no-owner`: 소유자 정보 제외 (다른 서버에서 권한 문제 방지)
- `--no-acl`: 접근 권한 정보 제외
- `-Fc`: custom 포맷 (압축 + pg_restore 호환)
- `-f`: 출력 파일 경로

### 2. 대상 DB로 복원

```bash
pg_restore \
  -d "대상_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  backup.dump
```

**옵션 설명:**
- `-d`: 대상 데이터베이스 연결 URL
- `--clean`: 기존 객체 삭제 후 복원
- `--if-exists`: 삭제 시 존재하지 않아도 에러 무시

### 3. 데이터 검증

```bash
psql "대상_DATABASE_URL" -c "\dt public.*"
```

## 실제 마이그레이션 예시

### Neon → Supabase 마이그레이션

```bash
# 1. Neon에서 백업
/opt/homebrew/opt/libpq/bin/pg_dump \
  "postgresql://user:password@host/neondb?sslmode=require" \
  --no-owner --no-acl -Fc -f /tmp/neon_backup.dump

# 2. Supabase로 복원
/opt/homebrew/opt/libpq/bin/pg_restore \
  -d "postgres://user:password@host:6543/postgres?sslmode=require" \
  --no-owner --no-acl --clean --if-exists \
  /tmp/neon_backup.dump

# 3. 테이블 목록 확인
/opt/homebrew/opt/libpq/bin/psql \
  "postgres://user:password@host:6543/postgres?sslmode=require" \
  -c "\dt public.*"

# 4. 데이터 수 검증
/opt/homebrew/opt/libpq/bin/psql "대상_DATABASE_URL" -c "
SELECT 'Admin' as tbl, COUNT(*) FROM public.\"Admin\"
UNION ALL SELECT 'CommitLog', COUNT(*) FROM public.\"CommitLog\"
UNION ALL SELECT 'CommitFile', COUNT(*) FROM public.\"CommitFile\"
UNION ALL SELECT 'Post', COUNT(*) FROM public.\"Post\"
ORDER BY tbl;
"
```

## 트러블슈팅

### 외래 키 제약 조건 오류

TablePlus 등 GUI 도구로 export/import 시 발생할 수 있음:

```
ERROR: there is no unique constraint matching given keys for referenced table
```

**해결 방법 1: pg_dump 사용 (권장)**

위의 pg_dump/pg_restore 방식을 사용하면 자동으로 올바른 순서로 처리됨.

**해결 방법 2: 제약 조건 임시 비활성화**

```sql
-- import 전
SET session_replication_role = 'replica';

-- SQL import 실행
\i backup.sql

-- import 후
SET session_replication_role = 'DEFAULT';
```

### Pooler 연결 문제

Supabase, Neon 등의 connection pooler 사용 시:
- pg_dump/pg_restore는 대부분 pooler URL로도 동작
- 문제 발생 시 direct connection URL 사용 권장

### Prisma 스키마만 먼저 생성

데이터 없이 스키마만 먼저 생성하려면:

```bash
DATABASE_URL="새서버URL" npx prisma db push
```

### TLS 인증서 오류 (Prisma 7 + Supabase)

Prisma 7과 Supabase pooler 조합에서 발생할 수 있는 TLS 오류:

```
Error: self-signed certificate in certificate chain
```

**원인:**
- Prisma 7의 새로운 TLS 처리 방식과 Supabase pooler의 인증서 체인 간 호환성 문제
- Supabase pooler는 자체 서명된 인증서를 사용

**해결 방법 1: NODE_TLS_REJECT_UNAUTHORIZED 설정 (개발 환경)**

`.env.local` 파일에 추가:
```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

또는 서버 실행 시:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

**해결 방법 2: Session Pooler 사용 (포트 5432)**

Transaction Pooler(6543) 대신 Session Pooler(5432) 사용:
```
DATABASE_URL=postgres://user:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

**Prisma 7 설정 (prisma.config.ts)**

Prisma 7에서는 `schema.prisma`가 아닌 `prisma.config.ts`에서 연결 URL 설정:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    directUrl: process.env["DIRECT_URL"],
  },
});
```

**주의:** `.env.local`이 `.env`보다 우선순위가 높으므로, 개발 환경에서는 `.env.local`에 DATABASE_URL 설정 필요.

## 마이그레이션 후 체크리스트

- [ ] 모든 테이블 존재 확인 (`\dt public.*`)
- [ ] 각 테이블 데이터 수 원본과 비교
- [ ] `.env` 및 `.env.local` 파일의 `DATABASE_URL` 업데이트
- [ ] TLS 오류 발생 시 `NODE_TLS_REJECT_UNAUTHORIZED=0` 추가
- [ ] 애플리케이션 연결 테스트
- [ ] Prisma 클라이언트 재생성 (`npx prisma generate`)
- [ ] `.next` 캐시 삭제 후 서버 재시작 (`rm -rf .next && npm run dev`)
