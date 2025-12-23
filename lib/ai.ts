import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { VersionTone } from "@/app/generated/prisma";
import prisma from "./prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
3. Markdown 형식 사용, 헤딩은 사용하지 않기
4. 커밋 내용을 나열하지 말고, 하루의 개발 흐름을 자연스럽게 풀어서
5. 이모지는 사용하지 않기 (텍스트로 감정 표현)

## 출력 형식 (정확히 이 형식을 따라주세요):
---TITLE---
[제목]
---CONTENT---
[본문 내용]
---SUMMARY---
[요약 1-2문장]
---END---`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  return parseGeneratedContent(responseText);
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
