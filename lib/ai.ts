import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { VersionTone } from "@/app/generated/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

const TONE_PROMPTS: Record<VersionTone, string> = {
  PROFESSIONAL:
    "전문적이고 공식적인 톤으로 작성해주세요. 기술적 성과를 객관적으로 강조하고, 비즈니스 가치를 명확히 전달해주세요.",
  CASUAL:
    "친근하고 캐주얼한 톤으로 작성해주세요. 개발자들의 노력을 재미있고 친근하게 표현하고, 독자가 공감할 수 있는 스토리로 풀어주세요.",
  TECHNICAL:
    "기술 중심의 상세한 톤으로 작성해주세요. 구체적인 기술 스택, 변경사항, 아키텍처 개선 등을 상세히 설명해주세요.",
};

export async function generatePostVersion(
  commits: CommitSummary[],
  targetDate: Date,
  tone: VersionTone
): Promise<GeneratedPost> {
  const dateStr = format(targetDate, "yyyy년 M월 d일 (EEEE)", { locale: ko });

  const commitSummary = commits
    .map(
      (c) =>
        `- [${c.repository}] ${c.message} (by ${c.author}, +${c.additions}/-${c.deletions})`
    )
    .join("\n");

  const repoStats = commits.reduce((acc, c) => {
    if (!acc[c.repository]) {
      acc[c.repository] = { commits: 0, additions: 0, deletions: 0 };
    }
    acc[c.repository].commits++;
    acc[c.repository].additions += c.additions;
    acc[c.repository].deletions += c.deletions;
    return acc;
  }, {} as Record<string, { commits: number; additions: number; deletions: number }>);

  const repoSummary = Object.entries(repoStats)
    .map(
      ([repo, stats]) =>
        `- ${repo}: ${stats.commits}개 커밋, +${stats.additions}/-${stats.deletions}`
    )
    .join("\n");

  const prompt = `당신은 studiobaton 개발팀의 기술 블로그 작성자입니다.
${dateStr}의 개발 활동을 블로그 글로 작성해주세요.

## 레포지토리별 요약:
${repoSummary}

## 상세 커밋 내역:
${commitSummary}

## 작성 가이드:
1. ${TONE_PROMPTS[tone]}
2. 제목은 흥미롭고 클릭하고 싶게 작성해주세요.
3. 본문은 300-500자 내외로 작성해주세요.
4. Markdown 형식을 사용하되, 헤딩은 사용하지 마세요.
5. 글 마지막에 1-2문장 요약을 포함해주세요.
6. 이모지는 적절히 사용해도 좋습니다.

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
