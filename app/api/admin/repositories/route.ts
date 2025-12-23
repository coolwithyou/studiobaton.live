import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getSessionData } from "@/lib/session";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function GET() {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: "studiobaton",
      type: "all",
      per_page: 100,
    });

    const repoList = repos.map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      isPrivate: repo.private,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }));

    // 최근 업데이트 순으로 정렬
    repoList.sort((a, b) => {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    return NextResponse.json({ repositories: repoList });
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
