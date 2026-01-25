# AI 커밋 하이라이트 프롬프트 톤 개선

**일시**: 2026-01-25 12:00
**키워드**: AI 프롬프트, 커밋 하이라이트, wrap-up, 톤 변경, Anthropic API

## 요청 사항
wrap-up 페이지의 AI 커밋 하이라이트 분석 프롬프트가 너무 딱딱한 "코드 리뷰" 형태였음. 오늘 한 일을 정리하고 팀원들에게 공유하는 친근한 톤으로 변경 요청.

## 수정 내용
- `lib/ai.ts` - AI 프롬프트 전체 재작성
  - `COMMIT_HIGHLIGHT_PROMPT` 상수 (425-462라인)
  - 출력 형식 지침 (510-535라인)

### 변경 전후 비교
| 항목 | 기존 | 개선 |
|------|------|------|
| 역할 | "Daily Commit Highlight Analyzer" | "오늘 하루 정리 도우미" |
| 톤 | "비즈니스 임팩트", "기술 부채" | "팀 슬랙에 공유하는 느낌" |
| title 가이드 | "20자 이내 핵심 제목" | "구어체로 자연스럽게" |
| description | "기술적 변경사항 1~2문장" | "왜 이걸 했고 ~했어요 체로" |
| impact | "비즈니스/사용자 관점 영향" | "이제 ~할 수 있어요 형태로" |
| techDebtNotes | "기술 부채 목록" | "다음에 ~하면 좋을 것 같아요" |

## 주요 결정
| 결정 | 이유 |
|------|------|
| 스키마 유지 + 프롬프트만 변경 | DB 마이그레이션 없이 즉시 적용 가능, 기존 데이터와 호환 |
| ~해요/~했어요 체 사용 | 팀 내부 공유에 적합한 친근한 톤 |
| 카테고리(feat, fix 등) 유지 | UI에서 뱃지로 표시되므로 분류 기능 유지 필요 |

## 검증 방법
- wrap-up 페이지에서 "재생성" 버튼 클릭
- 새로운 톤으로 분석 결과 생성 확인

## 참고
- 관련 파일: `app/console/(protected)/wrap-up/_components/commit-summary.tsx` (UI)
- 관련 API: `app/api/console/wrap-up/summarize/route.ts`
- Prisma 모델: `CommitSummary`, `CommitHighlight`
