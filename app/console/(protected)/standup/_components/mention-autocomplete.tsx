"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { GitPullRequest, FolderGit2 } from "lucide-react";

interface Repository {
  name: string;
  fullName: string;
  description: string | null;
}

interface Issue {
  number: number;
  title: string;
  repository: string;
  state: string;
  url: string;
  displayId: string;
}

type MentionType = "repository" | "issue" | null;

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onRepositorySelect: (repo: string) => void;
  onIssueSelect?: (issue: { displayId: string; url: string }) => void;
  onOpenChange?: (open: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MentionAutocomplete({
  value,
  onChange,
  onRepositorySelect,
  onIssueSelect,
  onOpenChange,
  inputRef,
}: MentionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionType, setMentionType] = useState<MentionType>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 현재 타입에 맞는 결과 목록
  const currentResults = mentionType === "repository" ? repositories : issues;
  const resultCount = currentResults.length;

  // 레포지토리 검색
  const searchRepositories = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/console/repositories/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error("Failed to search repositories:", error);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 이슈 검색
  const searchIssues = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/console/issues/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error("Failed to search issues:", error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 디바운스된 검색
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (open && searchQuery !== undefined && mentionType) {
      debounceRef.current = setTimeout(() => {
        if (mentionType === "repository") {
          searchRepositories(searchQuery);
        } else if (mentionType === "issue") {
          searchIssues(searchQuery);
        }
      }, 200);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, open, mentionType, searchRepositories, searchIssues]);

  // 검색 결과 변경 시 선택 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(0);
  }, [repositories, issues]);

  // 팝업 상태 변경 시 부모에게 알림
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // @ 또는 # 입력 감지
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    const textBeforeCursor = newValue.substring(0, cursorPos);

    // @ 감지 (레포지토리)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    // # 감지 (이슈)
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");

    // 더 나중에 입력된 트리거 사용
    if (lastAtIndex > lastHashIndex) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStart(lastAtIndex);
        setSearchQuery(textAfterAt);
        setMentionType("repository");
        setOpen(true);
        return;
      }
    } else if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
      if (!textAfterHash.includes(" ") && !textAfterHash.includes("\n")) {
        setMentionStart(lastHashIndex);
        setSearchQuery(textAfterHash);
        setMentionType("issue");
        setOpen(true);
        return;
      }
    }

    setOpen(false);
    setMentionStart(-1);
    setMentionType(null);
  };

  // 레포지토리 선택
  const handleSelectRepo = (repo: Repository) => {
    if (mentionStart === -1) return;

    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart || 0;
    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(cursorPos);

    // @repo 형식으로 삽입
    const newValue = `${beforeMention}@${repo.fullName} ${afterCursor}`;
    onChange(newValue);
    onRepositorySelect(repo.fullName);

    closeMention();

    // 커서 위치 조정
    setTimeout(() => {
      const newCursorPos = mentionStart + repo.fullName.length + 2; // @ + fullName + space
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 이슈 선택
  const handleSelectIssue = (issue: Issue) => {
    if (mentionStart === -1) return;

    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart || 0;
    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(cursorPos);

    // #repo#123 형식으로 삽입
    const newValue = `${beforeMention}${issue.displayId} ${afterCursor}`;
    onChange(newValue);
    onIssueSelect?.({ displayId: issue.displayId, url: issue.url });

    closeMention();

    // 커서 위치 조정
    setTimeout(() => {
      const newCursorPos = mentionStart + issue.displayId.length + 1; // displayId + space
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const closeMention = () => {
    setOpen(false);
    setMentionStart(-1);
    setMentionType(null);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || resultCount === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < resultCount - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : resultCount - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (mentionType === "repository" && repositories[selectedIndex]) {
          handleSelectRepo(repositories[selectedIndex]);
        } else if (mentionType === "issue" && issues[selectedIndex]) {
          handleSelectIssue(issues[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeMention();
        break;
    }
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="할 일을 입력하세요. @로 레포지토리, #으로 이슈를 연결할 수 있습니다."
            className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[350px] p-0"
          align="start"
          side="bottom"
          sideOffset={5}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  검색 중...
                </div>
              ) : mentionType === "repository" ? (
                repositories.length === 0 ? (
                  <CommandEmpty>레포지토리를 찾을 수 없습니다.</CommandEmpty>
                ) : (
                  <CommandGroup heading="레포지토리">
                    {repositories.map((repo, index) => (
                      <CommandItem
                        key={repo.fullName}
                        value={repo.fullName}
                        onSelect={() => handleSelectRepo(repo)}
                        className={`cursor-pointer ${
                          index === selectedIndex ? "bg-accent" : ""
                        }`}
                      >
                        <FolderGit2 className="mr-2 size-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">@{repo.fullName}</span>
                          {repo.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {repo.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              ) : mentionType === "issue" ? (
                issues.length === 0 ? (
                  <CommandEmpty>이슈를 찾을 수 없습니다.</CommandEmpty>
                ) : (
                  <CommandGroup heading="이슈">
                    {issues.map((issue, index) => (
                      <CommandItem
                        key={`${issue.repository}-${issue.number}`}
                        value={issue.displayId}
                        onSelect={() => handleSelectIssue(issue)}
                        className={`cursor-pointer ${
                          index === selectedIndex ? "bg-accent" : ""
                        }`}
                      >
                        <GitPullRequest className="mr-2 size-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">
                              {issue.displayId}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {issue.title}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
