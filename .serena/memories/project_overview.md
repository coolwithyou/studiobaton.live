# Studio Baton Live - Project Overview

## Project Purpose
에이전시 개발 블로그 - GitHub 커밋 수집 및 AI 기반 자동 글 생성, 팀 협업 기능 제공

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma ORM v7.2.0
- **Authentication**: Auth.js (NextAuth v5) + Google OAuth (@ba-ton.kr 도메인 전용)
- **UI Library**: shadcn/ui + Radix UI + Tailwind CSS v4
- **AI**: Claude API (Anthropic SDK)
- **API Client**: Octokit (GitHub API), @tanstack/react-table
- **Testing**: Vitest 4.0.16 + @testing-library/react
- **Code Editor**: Monaco Editor (마크다운 편집)
- **Charts**: Recharts 2.15.4

## Key Features
1. **자동화**: GitHub 커밋 수집, AI 개발일지 생성, AI 커밋 요약
2. **팀 협업**: 스탠드업, 커밋 리뷰, Wrap-up
3. **보안**: 마스킹 시스템, 역할 기반 접근 제어(ADMIN, TEAM_MEMBER, ORG_MEMBER)

## Development Port
- Port 3090

## Recent Features
- 카테고리별 커스텀 URL 슬러그 기능
- URL을 memberId에서 githubName으로 변경
- standup/wrap-up URL 기반 라우팅 마이그레이션
