import Anthropic from "@anthropic-ai/sdk";
import { formatKST } from "@/lib/date-utils";
import { VersionTone } from "@/app/generated/prisma";
import prisma from "./prisma";

// 클라이언트/서버 공통 모델 설정 re-export
export { AVAILABLE_MODELS, DEFAULT_MODEL } from "./ai-models";
export type { AIModel } from "./ai-models";

import { DEFAULT_MODEL } from "./ai-models";
import type { AIModel } from "./ai-models";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 커밋 수에 따른 동적 글 길이 계산
 * 커밋이 많을수록 더 상세한 글 생성
 */
function calculateContentLength(commitCount: number): {
  minLength: number;
  maxLength: number;
  maxTokens: number;
} {
  if (commitCount <= 5) {
    // 1-5개 커밋: 간결한 요약
    return { minLength: 150, maxLength: 300, maxTokens: 512 };
  } else if (commitCount <= 15) {
    // 6-15개 커밋: 표준 길이
    return { minLength: 300, maxLength: 500, maxTokens: 1024 };
  } else if (commitCount <= 30) {
    // 16-30개 커밋: 상세 설명
    return { minLength: 500, maxLength: 800, maxTokens: 1536 };
  } else {
    // 31개+ 커밋: 풍부한 내용
    return { minLength: 800, maxLength: 1200, maxTokens: 2048 };
  }
}

/**
 * AI API 에러 상세 정보
 */
export interface AIErrorDetails {
  code: string;
  message: string;
  status?: number;
  type?: string;
  suggestion?: string;
  requestId?: string;
}

/**
 * AI API 커스텀 에러 클래스
 */
export class AIError extends Error {
  public readonly details: AIErrorDetails;

  constructor(details: AIErrorDetails) {
    super(details.message);
    this.name = "AIError";
    this.details = details;
  }
}

/**
 * Anthropic API 에러를 AIError로 변환
 */
function parseAnthropicError(error: unknown): AIError {
  // Anthropic SDK 에러인 경우
  if (error && typeof error === "object" && "status" in error) {
    const apiError = error as {
      status?: number;
      error?: { type?: string; message?: string };
      requestID?: string;
      message?: string;
    };

    const status = apiError.status;
    const errorType = apiError.error?.type || "unknown_error";
    const errorMessage = apiError.error?.message || apiError.message || "알 수 없는 오류";
    const requestId = apiError.requestID;

    // 에러 유형별 코드와 제안 매핑
    const errorMapping: Record<string, { code: string; suggestion: string }> = {
      invalid_request_error: {
        code: "INVALID_REQUEST",
        suggestion: "요청 형식을 확인해주세요. API 키 또는 크레딧 문제일 수 있습니다.",
      },
      authentication_error: {
        code: "AUTH_ERROR",
        suggestion: "API 키가 올바른지 확인해주세요.",
      },
      permission_error: {
        code: "PERMISSION_ERROR",
        suggestion: "API 키의 권한을 확인해주세요.",
      },
      rate_limit_error: {
        code: "RATE_LIMIT",
        suggestion: "잠시 후 다시 시도해주세요. API 호출 제한에 도달했습니다.",
      },
      overloaded_error: {
        code: "OVERLOADED",
        suggestion: "AI 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.",
      },
      api_error: {
        code: "API_ERROR",
        suggestion: "AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
    };

    const mapping = errorMapping[errorType] || {
      code: "UNKNOWN_ERROR",
      suggestion: "관리자에게 문의해주세요.",
    };

    // 크레딧 부족 특별 처리
    if (errorMessage.includes("credit balance is too low")) {
      return new AIError({
        code: "INSUFFICIENT_CREDITS",
        message: "Anthropic API 크레딧이 부족합니다.",
        status,
        type: errorType,
        suggestion: "Anthropic 대시보드에서 크레딧을 충전하거나 플랜을 업그레이드해주세요.",
        requestId,
      });
    }

    return new AIError({
      code: mapping.code,
      message: errorMessage,
      status,
      type: errorType,
      suggestion: mapping.suggestion,
      requestId,
    });
  }

  // 일반 Error인 경우
  if (error instanceof Error) {
    return new AIError({
      code: "UNKNOWN_ERROR",
      message: error.message,
      suggestion: "관리자에게 문의해주세요.",
    });
  }

  // 알 수 없는 에러
  return new AIError({
    code: "UNKNOWN_ERROR",
    message: String(error),
    suggestion: "관리자에게 문의해주세요.",
  });
}

// 프로젝트 매핑 캐시 (서버 인스턴스 내에서 유지)
let projectMappingCache: Map<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

async function getProjectMappings(): Promise<Map<string, string>> {
  const now = Date.now();

  if (projectMappingCache && now - cacheTimestamp < CACHE_TTL) {
    return projectMappingCache;
  }

  const mappings = await prisma.projectMapping.findMany({
    where: { isActive: true },
  });

  projectMappingCache = new Map(
    mappings.map((m) => [m.repositoryName, m.displayName])
  );
  cacheTimestamp = now;

  return projectMappingCache;
}

function getDisplayName(repoName: string, mappings: Map<string, string>): string {
  return mappings.get(repoName) || repoName;
}

interface CommitSummary {
  repository: string;
  message: string;
  author: string;
  additions: number;
  deletions: number;
}

interface GeneratedPost {
  title: string;
  slug: string;
  content: string;
  summary: string;
}

// BATON DEV 글 스타일 가이드
// - 친근하면서도 전문적, 솔직하고 약간의 자조적 유머
// - 괄호 안의 부연 설명 활용 (예: "마치 냉면집의 녹두전처럼")
// - 이모지 없이 유머 표현
// - 개발자다운 솔직함과 겸손함
// - 실용주의적 관점

const STYLE_GUIDE = `
당신은 studiobaton 개발팀의 기술 블로그 작성자입니다.

## 문체 특징 (반드시 준수):
1. 친근하면서도 전문적인 톤 - 기업 블로그지만 딱딱하지 않게
2. 솔직하고 겸손한 표현 - "저희도 매일 배우고 있습니다" 같은 자세
3. 괄호를 활용한 재치있는 부연설명 - "(마치 마검사 같달까요)", "(뷰럽)"
4. 이모지 대신 텍스트로 유머 표현 - 쿨하니까, 이길 수 있다면
5. 개발자 커뮤니티 감성의 자연스러운 표현
6. 구체적인 사례와 비유로 이해하기 쉽게
7. 실용주의적 관점 - "왜 이렇게 했는지" 명확히

## 피해야 할 것:
- 과도한 이모지 사용
- 뻔한 기업 블로그 문체 ("열심히 노력하겠습니다")
- 지나친 자화자찬
- 추상적이고 모호한 표현
`;

const TONE_PROMPTS: Record<VersionTone, string> = {
  PROFESSIONAL: `전문적이면서도 친근한 톤으로 작성해주세요.
- 기술적 성과를 객관적으로 설명하되 딱딱하지 않게
- "저희 팀에서는" 같은 자연스러운 표현 사용
- 비즈니스 가치보다는 실제 개발 과정의 인사이트 공유`,

  CASUAL: `친근하고 솔직한 개발자 톤으로 작성해주세요.
- 개발하면서 겪은 시행착오나 깨달음을 담백하게
- 괄호를 활용한 재치있는 부연설명 활용
- "사실 이게 쉽지 않았는데요" 같은 솔직한 표현
- 독자가 같은 개발자라고 생각하고 이야기하듯이`,

  TECHNICAL: `기술 중심의 상세한 톤으로 작성하되 읽기 쉽게 해주세요.
- 구체적인 기술 스택과 변경사항 설명
- 왜 이런 선택을 했는지 배경 설명
- 실용주의적 관점에서 트레이드오프 언급
- 너무 교과서적이지 않게, 실무 경험이 묻어나게`,
};

export async function generatePostVersion(
  commits: CommitSummary[],
  targetDate: Date,
  tone: VersionTone,
  model: AIModel = DEFAULT_MODEL
): Promise<GeneratedPost> {
  const dateStr = formatKST(targetDate, "yyyy년 M월 d일 (EEEE)");

  // 프로젝트 매핑 가져오기
  const projectMappings = await getProjectMappings();

  const commitSummary = commits
    .map(
      (c) =>
        `- [${getDisplayName(c.repository, projectMappings)}] ${c.message} (by ${c.author}, +${c.additions}/-${c.deletions})`
    )
    .join("\n");

  const repoStats = commits.reduce((acc, c) => {
    const displayName = getDisplayName(c.repository, projectMappings);
    if (!acc[displayName]) {
      acc[displayName] = { commits: 0, additions: 0, deletions: 0 };
    }
    acc[displayName].commits++;
    acc[displayName].additions += c.additions;
    acc[displayName].deletions += c.deletions;
    return acc;
  }, {} as Record<string, { commits: number; additions: number; deletions: number }>);

  const repoSummary = Object.entries(repoStats)
    .map(
      ([repo, stats]) =>
        `- ${repo}: ${stats.commits}개 커밋, +${stats.additions}/-${stats.deletions}`
    )
    .join("\n");

  // 커밋 수에 따른 동적 글 길이 계산
  const { minLength, maxLength, maxTokens } = calculateContentLength(commits.length);

  const prompt = `${STYLE_GUIDE}

${dateStr}의 개발 활동을 블로그 글로 작성해주세요.

## 레포지토리별 요약:
${repoSummary}

## 상세 커밋 내역:
${commitSummary}

## 이번 글의 톤:
${TONE_PROMPTS[tone]}

## 작성 가이드:
1. 제목은 개발자가 클릭하고 싶어지는 흥미로운 제목으로 (뻔한 "오늘의 개발" 같은 건 피하기)
2. 본문은 ${minLength}-${maxLength}자 내외, 읽기 편하게
3. Markdown 형식 사용:
   - 내용이 길거나 섹션 구분이 필요하면 ## 헤딩 사용 가능
   - 핵심 내용은 **굵게** 강조, 기술 용어는 \`인라인 코드\`로 표시
   - 인상적인 인용이나 깨달음은 > 인용문으로 표시 (선택적)
4. 커밋 내용을 나열하지 말고, 하루의 개발 흐름을 자연스럽게 풀어서
5. 이모지는 사용하지 않기 (텍스트로 감정 표현)
6. 품질 높은 코드나 공유할만한 코드가 있다면 간단한 코드 블록으로 포함 (선택적):
   - 핵심 로직이나 인상적인 해결책만 짧게 발췌
   - 언어 명시 필수 (예: \`\`\`typescript)
   - 코드 블록은 10줄 이내로 간결하게
7. **중요: 프로젝트명은 제공된 이름을 정확히 그대로 사용**:
   - "매거진비"를 "매거진비 프로젝트"로 확장하지 말 것
   - "하이츠"를 "하이츠 백오피스"로 변형하지 말 것
   - 레포지토리별 요약에 나온 프로젝트명을 그대로 사용할 것

## 출력 형식 (정확히 이 형식을 따라주세요):
---TITLE---
[제목]
---SLUG---
[SEO 친화적 영문 URL slug - 3~5개 단어, 소문자, 하이픈 구분, 핵심 키워드만]
---CONTENT---
[본문 내용]
---SUMMARY---
[요약 1-2문장]
---END---

## SLUG 작성 가이드:
- 한글 제목의 핵심 키워드를 영문으로 번역
- 예: "React 캐싱 전략 개선" → react-caching-strategy
- 예: "사용자 인증 버그 수정" → user-auth-bug-fix
- 예: "성능 최적화 작업" → performance-optimization
- 영문 소문자, 숫자, 하이픈만 사용
- 최대 5단어, 60자 이내`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return parseGeneratedContent(responseText);
  } catch (error) {
    throw parseAnthropicError(error);
  }
}

function parseGeneratedContent(text: string): GeneratedPost {
  const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)\s*---SLUG---/);
  const slugMatch = text.match(/---SLUG---\s*([\s\S]*?)\s*---CONTENT---/);
  const contentMatch = text.match(/---CONTENT---\s*([\s\S]*?)\s*---SUMMARY---/);
  const summaryMatch = text.match(/---SUMMARY---\s*([\s\S]*?)\s*---END---/);

  // slug 정제: 소문자, 하이픈, 영문숫자만 허용
  const rawSlug = slugMatch?.[1]?.trim() || "";
  const cleanSlug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    title: titleMatch?.[1]?.trim() || "오늘의 개발 이야기",
    slug: cleanSlug || "daily-dev-story",
    content: contentMatch?.[1]?.trim() || text,
    summary: summaryMatch?.[1]?.trim() || "",
  };
}

export async function generateAllVersions(
  commits: CommitSummary[],
  targetDate: Date
): Promise<{ tone: VersionTone; post: GeneratedPost }[]> {
  const tones: VersionTone[] = ["PROFESSIONAL", "CASUAL", "TECHNICAL"];

  const results = await Promise.all(
    tones.map(async (tone) => {
      const post = await generatePostVersion(commits, targetDate, tone);
      return { tone, post };
    })
  );

  return results;
}

/**
 * 커밋 하이라이트 분석용 타입
 */
interface CommitForHighlight {
  sha: string;
  repository: string;
  message: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  files?: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string | null;
  }[];
}

interface CommitHighlight {
  rank: number;
  commitHash: string;
  category: "feat" | "fix" | "perf" | "refactor" | "test" | "chore";
  title: string;
  description: string;
  impact: string;
}

interface CommitHighlightResponse {
  summary: {
    totalCommits: number;
    highlightCount: number;
    primaryFocus: string;
  };
  highlights: CommitHighlight[];
  techDebtNotes: string[];
}

const COMMIT_HIGHLIGHT_PROMPT = `# Role: 오늘 하루 정리 도우미

당신은 개발자가 오늘 한 일을 팀원들에게 공유하기 좋게 정리해주는 도우미입니다.
딱딱한 코드 리뷰가 아닌, "오늘 뭐 했어요?"라고 물었을 때 답하는 느낌으로 작성해주세요.

## 핵심 원칙
1. **친근한 톤**: 팀 슬랙에 공유하는 느낌으로
2. **맥락 설명**: 왜 이걸 했는지, 어떤 문제가 있었는지
3. **결과 중심**: 뭐가 달라졌는지 쉽게 설명
4. **~해요/~했어요** 체로 자연스럽게 작성

## 하이라이트 선정 기준
팀원들이 "오 그거 좋네!"라고 할 만한 것들 위주로:
1. 새로운 기능이나 화면 (feat)
2. 골치 아프던 버그 해결 (fix)
3. 눈에 띄게 빨라진 것들 (perf)
4. 코드 정리해서 깔끔해진 것 (refactor)
5. 테스트 추가 (test)

## 하이라이트에서 제외
- 오타 수정, 포맷팅만 바꾼 것
- lock 파일이나 빌드 산출물
- 내용 없는 머지 커밋

## 카테고리
- feat: 새 기능, UI 변경, API 추가
- fix: 버그 수정, 오류 해결
- perf: 성능 개선, 속도 향상
- refactor: 코드 정리, 구조 개선
- test: 테스트 추가/수정
- chore: 설정 변경, 의존성 업데이트

## 작성 가이드 (중요!)
- **title**: 구어체로 자연스럽게 (예: "회원가입 오류 잡음", "검색이 느려서 캐싱 적용")
- **description**: 왜 이걸 했고, 어떻게 접근했는지 맥락 포함. "~했어요", "~거든요" 체로
- **impact**: 사용자나 팀 입장에서 뭐가 좋아졌는지. "이제 ~할 수 있어요" 형태로
- **primaryFocus**: "오늘은 주로 ~한 작업을 했어요" 형태로 하루 요약
- **techDebtNotes**: "다음에 ~하면 좋을 것 같아요", "~는 나중에 더 다듬어야 할 것 같아요" 형태로`;

/**
 * 커밋 하이라이트 분석
 * 랩업 미팅을 위한 오늘의 주요 커밋 분석
 */
export async function analyzeCommitHighlights(
  commits: CommitForHighlight[]
): Promise<CommitHighlightResponse> {
  if (commits.length === 0) {
    return {
      summary: {
        totalCommits: 0,
        highlightCount: 0,
        primaryFocus: "오늘 커밋 내역이 없습니다.",
      },
      highlights: [],
      techDebtNotes: [],
    };
  }

  // 프로젝트 매핑 가져오기
  const projectMappings = await getProjectMappings();

  // 커밋 정보 정리 (diff는 50라인으로 truncate)
  const commitData = commits.map((c) => ({
    sha: c.sha.substring(0, 7),
    repository: getDisplayName(c.repository, projectMappings),
    message: c.message,
    stats: `+${c.additions}/-${c.deletions}, ${c.filesChanged} files`,
    files: c.files?.slice(0, 5).map((f) => ({
      name: f.filename,
      status: f.status,
      changes: `+${f.additions}/-${f.deletions}`,
      // 패치는 50라인으로 제한
      patch: f.patch
        ? f.patch.split("\n").slice(0, 50).join("\n") +
          (f.patch.split("\n").length > 50 ? "\n... (truncated)" : "")
        : null,
    })),
  }));

  const prompt = `${COMMIT_HIGHLIGHT_PROMPT}

## 오늘의 커밋 내역 (${commits.length}개)

${JSON.stringify(commitData, null, 2)}

## 응답 형식 (JSON)
다음 JSON 스키마에 맞게 응답해주세요. **톤은 반드시 친근하게!**

\`\`\`json
{
  "summary": {
    "totalCommits": number,
    "highlightCount": number,
    "primaryFocus": "오늘은 주로 ~한 작업을 했어요 (자연스러운 한 문장)"
  },
  "highlights": [
    {
      "rank": 1,
      "commitHash": "abc1234",
      "category": "feat" | "fix" | "perf" | "refactor" | "test" | "chore",
      "title": "구어체로 자연스럽게 (예: 로그인 버그 잡음)",
      "description": "왜 이걸 했고 어떻게 해결했는지 ~했어요/~거든요 체로",
      "impact": "이제 ~할 수 있어요 / ~가 좋아졌어요 형태로"
    }
  ],
  "techDebtNotes": ["다음에 ~하면 좋을 것 같아요 형태로"]
}
\`\`\`

하이라이트는 최대 5개까지, 팀원들이 관심 가질 만한 순서로 rank를 부여해주세요.
JSON만 출력하고, 다른 설명은 추가하지 마세요.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 파싱
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as CommitHighlightResponse;

    return {
      summary: {
        totalCommits: commits.length,
        highlightCount: parsed.highlights?.length || 0,
        primaryFocus: parsed.summary?.primaryFocus || "분석 결과 없음",
      },
      highlights: parsed.highlights || [],
      techDebtNotes: parsed.techDebtNotes || [],
    };
  } catch (error) {
    console.error("Failed to analyze commit highlights:", error);
    return {
      summary: {
        totalCommits: commits.length,
        highlightCount: 0,
        primaryFocus: "AI 분석 중 오류가 발생했습니다.",
      },
      highlights: [],
      techDebtNotes: [],
    };
  }
}
