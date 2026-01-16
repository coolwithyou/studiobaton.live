import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { VersionTone } from "@/app/generated/prisma";
import prisma from "./prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  tone: VersionTone
): Promise<GeneratedPost> {
  const dateStr = format(targetDate, "yyyy년 M월 d일 (EEEE)", { locale: ko });

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
2. 본문은 300-500자 내외, 읽기 편하게
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

## 출력 형식 (정확히 이 형식을 따라주세요):
---TITLE---
[제목]
---CONTENT---
[본문 내용]
---SUMMARY---
[요약 1-2문장]
---END---`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
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
  const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)\s*---CONTENT---/);
  const contentMatch = text.match(/---CONTENT---\s*([\s\S]*?)\s*---SUMMARY---/);
  const summaryMatch = text.match(/---SUMMARY---\s*([\s\S]*?)\s*---END---/);

  return {
    title: titleMatch?.[1]?.trim() || "오늘의 개발 이야기",
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

const COMMIT_HIGHLIGHT_PROMPT = `# Role: Daily Commit Highlight Analyzer

당신은 개발팀의 일일 커밋을 분석하여 팀 랩업 미팅용 하이라이트를 추출하는 전문 분석가입니다.

## 분석 원칙
1. **비즈니스 임팩트 우선**: 코드 변경량보다 기능적 의미를 중시
2. **기술 부채 식별**: 리팩토링, 버그 수정의 중요도 평가
3. **간결성**: 1커밋 = 1~2문장 핵심 요약

## 하이라이트 선정 기준 (우선순위)
1. 새로운 기능 추가 (feat) - 사용자에게 직접 영향을 주는 변경
2. 중요 버그 수정 (fix) - 특히 프로덕션 영향이 있는 수정
3. 성능 개선 (perf) - 측정 가능한 성능 향상
4. 보안 관련 변경 - 취약점 수정, 권한 체계 변경
5. 대규모 리팩토링 (refactor) - 코드 품질 개선

## 제외 기준 (하이라이트에서 제외)
- 단순 typo 수정
- 자동 생성 파일 변경 (lock files, build artifacts)
- 내용 없는 머지 커밋
- 포맷팅만 변경된 커밋
- 주석만 추가/수정한 커밋

## 카테고리 분류 기준
- feat: 새로운 기능 추가, UI 변경, API 추가
- fix: 버그 수정, 오류 해결, 이슈 대응
- perf: 성능 최적화, 쿼리 개선, 캐싱 적용
- refactor: 코드 구조 개선, 중복 제거, 패턴 적용
- test: 테스트 추가/수정
- chore: 빌드 설정, 의존성 업데이트, 기타

## 출력 지침
- title: 20자 이내 핵심 제목 (예: "사용자 인증 개선")
- description: 기술적 변경사항 1~2문장
- impact: 비즈니스/사용자 관점 영향 1문장
- primaryFocus: 오늘 개발의 주요 방향 한 문장
- techDebtNotes: 발견된 기술 부채나 향후 개선 필요사항`;

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
다음 JSON 스키마에 맞게 응답해주세요:

\`\`\`json
{
  "summary": {
    "totalCommits": number,
    "highlightCount": number,
    "primaryFocus": "오늘 개발의 주요 방향 한 문장"
  },
  "highlights": [
    {
      "rank": 1,
      "commitHash": "abc1234",
      "category": "feat" | "fix" | "perf" | "refactor" | "test" | "chore",
      "title": "20자 이내 핵심 제목",
      "description": "기술적 변경사항 1~2문장",
      "impact": "비즈니스/사용자 관점 영향 1문장"
    }
  ],
  "techDebtNotes": ["발견된 기술 부채 목록"]
}
\`\`\`

하이라이트는 최대 5개까지만 선정하고, 중요도 순으로 rank를 부여해주세요.
JSON만 출력하고, 다른 설명은 추가하지 마세요.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
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
