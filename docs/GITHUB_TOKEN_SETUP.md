# GitHub Token 설정 가이드

이 문서는 studiobaton.live 프로젝트에서 GitHub 커밋을 수집하기 위해 필요한 GitHub Personal Access Token 설정 방법을 설명합니다.

## 필요한 권한 (Scopes)

### Fine-grained Personal Access Token (권장)

GitHub에서 새로운 Fine-grained token 방식을 권장합니다.

#### 필수 권한

| 권한 | 설명 | 용도 |
|------|------|------|
| **Repository access** | `studiobaton` 조직의 모든 저장소 | 커밋 수집 대상 |
| **Contents** | `Read-only` | 커밋 상세 정보 조회 |
| **Metadata** | `Read-only` | 저장소 목록 조회 |

#### 설정 방법

1. [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta) 이동

2. **Generate new token** 클릭

3. 토큰 설정:
   - **Token name**: `studiobaton-live-commits`
   - **Expiration**: 원하는 만료 기간 (최대 1년)
   - **Resource owner**: `studiobaton` (조직 선택)
   - **Repository access**: `All repositories` 또는 특정 저장소 선택

4. **Permissions** 설정:
   ```
   Repository permissions:
   ├── Contents: Read-only
   └── Metadata: Read-only
   ```

5. **Generate token** 클릭 후 토큰 복사

---

### Classic Personal Access Token (레거시)

Fine-grained token이 조직에서 허용되지 않는 경우 Classic token을 사용합니다.

#### 필수 스코프

| 스코프 | 설명 |
|--------|------|
| `repo` | Private 저장소 접근 (public만 있으면 `public_repo`) |
| `read:org` | 조직 저장소 목록 조회 |

#### 설정 방법

1. [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens) 이동

2. **Generate new token (classic)** 클릭

3. 토큰 설정:
   - **Note**: `studiobaton-live-commits`
   - **Expiration**: 원하는 만료 기간

4. **스코프 선택**:
   ```
   ☑ repo (Full control of private repositories)
     ☑ repo:status
     ☑ repo_deployment
     ☑ public_repo
     ☑ repo:invite
     ☑ security_events
   ☑ read:org (Read org and team membership)
   ```

   > **참고**: Public 저장소만 수집하는 경우 `public_repo`와 `read:org`만 선택해도 됩니다.

5. **Generate token** 클릭 후 토큰 복사

---

## 환경변수 설정

생성된 토큰을 `.env` 파일에 추가합니다:

```env
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 사용되는 GitHub API

이 프로젝트에서 호출하는 GitHub API 엔드포인트:

| API | 메서드 | 용도 |
|-----|--------|------|
| `/orgs/{org}/repos` | `GET` | 조직의 저장소 목록 조회 |
| `/repos/{owner}/{repo}/commits` | `GET` | 저장소의 커밋 목록 조회 |
| `/repos/{owner}/{repo}/commits/{ref}` | `GET` | 개별 커밋 상세 정보 조회 |

---

## Rate Limit

GitHub API는 시간당 요청 수 제한이 있습니다:

| 인증 방식 | 시간당 요청 수 |
|-----------|----------------|
| 인증 없음 | 60 requests/hour |
| Personal Access Token | 5,000 requests/hour |

> 토큰을 사용하면 시간당 5,000회 요청이 가능합니다. 일반적인 사용에는 충분합니다.

---

## 토큰 갱신

토큰 만료 전에 새 토큰을 생성하고 환경변수를 업데이트해야 합니다.

### Vercel에서 환경변수 업데이트

1. [Vercel Dashboard](https://vercel.com) 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. `GITHUB_TOKEN` 값 업데이트
4. Redeploy 실행

---

## 문제 해결

### 403 Forbidden 오류

```
Error: Resource not accessible by integration
```

**해결 방법**:
- 토큰에 `repo` 또는 `read:org` 권한이 있는지 확인
- Fine-grained token의 경우 조직에서 허용되었는지 확인

### 404 Not Found 오류

```
Error: Not Found
```

**해결 방법**:
- 조직 이름이 정확한지 확인 (`studiobaton`)
- 토큰이 해당 조직의 저장소에 접근 가능한지 확인

### Rate Limit 초과

```
Error: API rate limit exceeded
```

**해결 방법**:
- 잠시 후 재시도 (1시간 후 초기화)
- 요청 빈도 줄이기
