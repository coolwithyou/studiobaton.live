import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { startOfDayKST, endOfDayKST } from "@/lib/date-utils";
import { getCommitsByAuthor, buildGitHubSearchUrl } from "@/lib/github";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors";

interface EmailMismatch {
  sha: string;
  githubEmail: string;
  memberEmail: string;
  message: string;
  repository: string;
}

/**
 * GET /api/console/commits/diagnose
 * GitHub 커밋과 DB 커밋 비교 진단
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("커밋 진단 기능에 접근할 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const memberId = searchParams.get("memberId");

    if (!dateStr || !memberId) {
      throw new ValidationError("date와 memberId가 필요합니다.");
    }

    const date = new Date(dateStr);

    // 팀원 정보 조회
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        githubName: true,
        email: true,
      },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // GitHub API로 커밋 조회
    const githubCommits = await getCommitsByAuthor(member.githubName, date);

    // DB에서 커밋 조회 (authorEmail 기준)
    const dbCommits = await prisma.commitLog.findMany({
      where: {
        authorEmail: member.email,
        committedAt: {
          gte: startOfDayKST(date),
          lte: endOfDayKST(date),
        },
      },
      select: {
        sha: true,
        message: true,
        authorEmail: true,
        repository: true,
        committedAt: true,
      },
      orderBy: {
        committedAt: "asc",
      },
    });

    // 진단 분석
    const dbShaSet = new Set(dbCommits.map((c) => c.sha));
    const githubShaSet = new Set(githubCommits.map((c) => c.sha));

    // GitHub에는 있지만 DB에 없는 커밋
    const missingInDb = githubCommits
      .filter((c) => !dbShaSet.has(c.sha))
      .map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.message.split("\n")[0],
        repository: c.repository,
        authorEmail: c.authorEmail,
      }));

    // DB에는 있지만 GitHub에 없는 커밋 (이상 케이스)
    const missingInGithub = dbCommits
      .filter((c) => !githubShaSet.has(c.sha))
      .map((c) => c.sha.slice(0, 7));

    // 이메일 불일치 감지
    const emailMismatches: EmailMismatch[] = githubCommits
      .filter((c) => {
        if (!c.authorEmail) return false;
        return c.authorEmail.toLowerCase() !== member.email.toLowerCase();
      })
      .map((c) => ({
        sha: c.sha.slice(0, 7),
        githubEmail: c.authorEmail!,
        memberEmail: member.email,
        message: c.message.split("\n")[0],
        repository: c.repository,
      }));

    // 매칭된 커밋 수
    const matchedCount = githubCommits.filter((c) => dbShaSet.has(c.sha)).length;

    // GitHub 검색 URL 생성
    const githubSearchUrl = buildGitHubSearchUrl(member.githubName, date);

    return NextResponse.json({
      member: {
        id: member.id,
        name: member.name,
        githubName: member.githubName,
        email: member.email,
      },
      date: dateStr,
      githubCommits: githubCommits.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.message.split("\n")[0],
        authorEmail: c.authorEmail,
        authorName: c.authorName,
        repository: c.repository,
        url: c.url,
      })),
      dbCommits: dbCommits.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.message.split("\n")[0],
        authorEmail: c.authorEmail,
        repository: c.repository,
      })),
      diagnosis: {
        missingInDb,
        missingInGithub,
        emailMismatches,
        summary: {
          githubTotal: githubCommits.length,
          dbTotal: dbCommits.length,
          matched: matchedCount,
          missingInDbCount: missingInDb.length,
          emailMismatchCount: emailMismatches.length,
        },
      },
      githubSearchUrl,
    });
  } catch (error) {
    logError("GET /api/console/commits/diagnose", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
