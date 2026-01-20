import { describe, it, expect } from "vitest";
import {
  createRepositoryIndexMap,
  maskProjectName,
  maskCommitMessage,
  maskCommitUrl,
  maskAuthorName,
  maskContent,
  applyPostMasking,
  ProjectMappingsMap,
} from "../masking";

// 테스트용 프로젝트 매핑
function createTestMappings(): ProjectMappingsMap {
  return new Map([
    ["repo-alpha", { displayName: "Alpha Project", maskName: "프로젝트 A" }],
    ["repo-beta", { displayName: "Beta Project", maskName: null }],
    ["repo-gamma", { displayName: "Gamma Project", maskName: "비밀 프로젝트" }],
  ]);
}

describe("createRepositoryIndexMap", () => {
  it("고유한 리포지토리에 인덱스를 할당한다", () => {
    const repos = ["repo-a", "repo-b", "repo-a", "repo-c"];
    const indexMap = createRepositoryIndexMap(repos);

    expect(indexMap.size).toBe(3);
    expect(indexMap.get("repo-a")).toBe(0);
    expect(indexMap.get("repo-b")).toBe(1);
    expect(indexMap.get("repo-c")).toBe(2);
  });

  it("빈 배열에 대해 빈 맵을 반환한다", () => {
    const indexMap = createRepositoryIndexMap([]);
    expect(indexMap.size).toBe(0);
  });
});

describe("maskProjectName", () => {
  const mappings = createTestMappings();
  const repoIndexMap = new Map([
    ["repo-alpha", 0],
    ["repo-beta", 1],
    ["repo-unknown", 2],
  ]);

  describe("인증된 사용자", () => {
    it("displayName을 반환한다", () => {
      expect(maskProjectName("repo-alpha", mappings, true, repoIndexMap)).toBe(
        "Alpha Project"
      );
    });

    it("매핑이 없으면 원본 이름을 반환한다", () => {
      expect(maskProjectName("repo-unknown", mappings, true, repoIndexMap)).toBe(
        "repo-unknown"
      );
    });
  });

  describe("비인증 사용자", () => {
    it("maskName이 있으면 maskName을 반환한다", () => {
      expect(maskProjectName("repo-alpha", mappings, false, repoIndexMap)).toBe(
        "프로젝트 A"
      );
    });

    it("maskName이 없으면 Repository X 형식을 반환한다", () => {
      expect(maskProjectName("repo-beta", mappings, false, repoIndexMap)).toBe(
        "Repository B"
      );
    });

    it("매핑이 없으면 Repository X 형식을 반환한다", () => {
      expect(maskProjectName("repo-unknown", mappings, false, repoIndexMap)).toBe(
        "Repository C"
      );
    });
  });
});

describe("maskCommitMessage", () => {
  describe("인증된 사용자", () => {
    it("원본 메시지를 반환한다", () => {
      const message = "feat: Add new feature\n\nDetailed description";
      expect(maskCommitMessage(message, true)).toBe(message);
    });
  });

  describe("비인증 사용자", () => {
    it("feat으로 시작하면 '기능 추가'를 반환한다", () => {
      expect(maskCommitMessage("feat: Add login", false)).toBe("기능 추가");
      expect(maskCommitMessage("Feat(auth): Add login", false)).toBe("기능 추가");
    });

    it("fix로 시작하면 '버그 수정'을 반환한다", () => {
      expect(maskCommitMessage("fix: Fix bug", false)).toBe("버그 수정");
    });

    it("refactor로 시작하면 '코드 개선'을 반환한다", () => {
      expect(maskCommitMessage("refactor: Improve code", false)).toBe("코드 개선");
    });

    it("style로 시작하면 '스타일 수정'을 반환한다", () => {
      expect(maskCommitMessage("style: Format code", false)).toBe("스타일 수정");
    });

    it("docs로 시작하면 '문서 업데이트'를 반환한다", () => {
      expect(maskCommitMessage("docs: Update README", false)).toBe("문서 업데이트");
    });

    it("test로 시작하면 '테스트 추가'를 반환한다", () => {
      expect(maskCommitMessage("test: Add unit tests", false)).toBe("테스트 추가");
    });

    it("chore로 시작하면 '설정 변경'을 반환한다", () => {
      expect(maskCommitMessage("chore: Update deps", false)).toBe("설정 변경");
    });

    it("perf로 시작하면 '성능 개선'을 반환한다", () => {
      expect(maskCommitMessage("perf: Optimize query", false)).toBe("성능 개선");
    });

    it("build로 시작하면 '빌드 설정'을 반환한다", () => {
      expect(maskCommitMessage("build: Update webpack", false)).toBe("빌드 설정");
    });

    it("ci로 시작하면 'CI/CD 설정'을 반환한다", () => {
      expect(maskCommitMessage("ci: Update pipeline", false)).toBe("CI/CD 설정");
    });

    it("알 수 없는 형식이면 '코드 업데이트'를 반환한다", () => {
      expect(maskCommitMessage("Update something", false)).toBe("코드 업데이트");
      expect(maskCommitMessage("Random commit message", false)).toBe("코드 업데이트");
    });
  });
});

describe("maskCommitUrl", () => {
  const url = "https://github.com/org/repo/commit/abc123";

  it("인증된 사용자에게는 원본 URL을 반환한다", () => {
    expect(maskCommitUrl(url, true)).toBe(url);
  });

  it("비인증 사용자에게는 null을 반환한다", () => {
    expect(maskCommitUrl(url, false)).toBeNull();
  });
});

describe("maskAuthorName", () => {
  it("인증된 사용자에게는 원본 이름을 반환한다", () => {
    expect(maskAuthorName("John Doe", 0, true)).toBe("John Doe");
  });

  it("비인증 사용자에게도 원본 이름을 반환한다 (마스킹 비활성화)", () => {
    expect(maskAuthorName("John Doe", 0, false)).toBe("John Doe");
    expect(maskAuthorName("Jane Smith", 1, false)).toBe("Jane Smith");
    expect(maskAuthorName("Bob Johnson", 2, false)).toBe("Bob Johnson");
  });
});

describe("maskContent", () => {
  const mappings = createTestMappings();
  const repoIndexMap = new Map([
    ["repo-alpha", 0],
    ["repo-beta", 1],
  ]);

  it("null 콘텐츠는 null을 반환한다", () => {
    expect(maskContent(null, mappings, false, repoIndexMap)).toBeNull();
  });

  it("인증된 사용자에게는 원본 콘텐츠를 반환한다", () => {
    const content = "Alpha Project에서 작업했습니다.";
    expect(maskContent(content, mappings, true, repoIndexMap)).toBe(content);
  });

  it("비인증 사용자에게는 displayName을 maskName으로 치환한다", () => {
    const content = "Alpha Project에서 작업했습니다.";
    expect(maskContent(content, mappings, false, repoIndexMap)).toBe(
      "프로젝트 A에서 작업했습니다."
    );
  });

  it("maskName이 없으면 Repository X 형식으로 치환한다", () => {
    const content = "Beta Project를 개선했습니다.";
    expect(maskContent(content, mappings, false, repoIndexMap)).toBe(
      "Repository B를 개선했습니다."
    );
  });

  it("여러 프로젝트명을 모두 치환한다", () => {
    const content = "Alpha Project와 Beta Project 모두 업데이트했습니다.";
    expect(maskContent(content, mappings, false, repoIndexMap)).toBe(
      "프로젝트 A와 Repository B 모두 업데이트했습니다."
    );
  });

  it("repositoryName도 치환한다", () => {
    const content = "repo-alpha 리포지토리를 업데이트했습니다.";
    expect(maskContent(content, mappings, false, repoIndexMap)).toBe(
      "프로젝트 A 리포지토리를 업데이트했습니다."
    );
  });
});

describe("applyPostMasking", () => {
  const mappings = createTestMappings();

  const mockPost = {
    id: "post-1",
    targetDate: new Date("2024-01-15"),
    title: "오늘의 개발 이야기",
    content: "Alpha Project에서 새 기능을 추가했습니다.",
    summary: "Alpha Project 업데이트",
    slug: "2024-01-15-dev-story",
    publishedAt: new Date("2024-01-15T10:00:00"),
    commits: [
      {
        id: "commit-1",
        repository: "repo-alpha",
        message: "feat: Add new feature",
        author: "John Doe",
        authorAvatar: "https://example.com/avatar.jpg",
        additions: 100,
        deletions: 20,
        url: "https://github.com/org/repo/commit/abc123",
      },
      {
        id: "commit-2",
        repository: "repo-beta",
        message: "fix: Fix bug",
        author: "Jane Smith",
        authorAvatar: "https://example.com/avatar2.jpg",
        additions: 10,
        deletions: 5,
        url: "https://github.com/org/repo/commit/def456",
      },
    ],
  };

  describe("인증된 사용자", () => {
    it("원본 데이터를 유지한다", () => {
      const result = applyPostMasking(mockPost, mappings, true);

      expect(result.content).toBe(mockPost.content);
      expect(result.commits[0].repository).toBe("Alpha Project");
      expect(result.commits[0].message).toBe("feat: Add new feature");
      expect(result.commits[0].author).toBe("John Doe");
      expect(result.commits[0].authorAvatar).toBe("https://example.com/avatar.jpg");
      expect(result.commits[0].url).toBe("https://github.com/org/repo/commit/abc123");
    });
  });

  describe("비인증 사용자", () => {
    it("콘텐츠를 마스킹한다", () => {
      const result = applyPostMasking(mockPost, mappings, false);

      expect(result.content).toBe("프로젝트 A에서 새 기능을 추가했습니다.");
      expect(result.summary).toBe("프로젝트 A 업데이트");
    });

    it("커밋 정보를 마스킹한다 (개발자명/아바타 제외)", () => {
      const result = applyPostMasking(mockPost, mappings, false);

      // 첫 번째 커밋
      expect(result.commits[0].repository).toBe("프로젝트 A");
      expect(result.commits[0].message).toBe("기능 추가");
      expect(result.commits[0].author).toBe("John Doe"); // 개발자명은 마스킹 안함
      expect(result.commits[0].authorAvatar).toBe("https://example.com/avatar.jpg"); // 아바타도 마스킹 안함
      expect(result.commits[0].url).toBeNull();

      // 두 번째 커밋
      expect(result.commits[1].repository).toBe("Repository B");
      expect(result.commits[1].message).toBe("버그 수정");
      expect(result.commits[1].author).toBe("Jane Smith"); // 개발자명은 마스킹 안함
      expect(result.commits[1].authorAvatar).toBe("https://example.com/avatar2.jpg"); // 아바타도 마스킹 안함
      expect(result.commits[1].url).toBeNull();
    });

    it("title은 마스킹하지 않는다", () => {
      const result = applyPostMasking(mockPost, mappings, false);
      expect(result.title).toBe(mockPost.title);
    });

    it("additions, deletions는 유지한다", () => {
      const result = applyPostMasking(mockPost, mappings, false);

      expect(result.commits[0].additions).toBe(100);
      expect(result.commits[0].deletions).toBe(20);
      expect(result.commits[1].additions).toBe(10);
      expect(result.commits[1].deletions).toBe(5);
    });
  });
});
