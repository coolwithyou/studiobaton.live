"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

interface Repository {
  name: string;
  fullName: string;
  description: string | null;
}

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onRepositorySelect: (repo: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MentionAutocomplete({
  value,
  onChange,
  onRepositorySelect,
  inputRef,
}: MentionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 레포지토리 검색
  const searchRepositories = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/repositories/search?q=${encodeURIComponent(query)}`
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

  // 디바운스된 검색
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (open && searchQuery !== undefined) {
      debounceRef.current = setTimeout(() => {
        searchRepositories(searchQuery);
      }, 200);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, open, searchRepositories]);

  // @ 입력 감지
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // @ 이후의 텍스트 추출
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // 공백이 없으면 멘션 중
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStart(lastAtIndex);
        setSearchQuery(textAfterAt);
        setOpen(true);
        return;
      }
    }

    setOpen(false);
    setMentionStart(-1);
  };

  // 레포지토리 선택
  const handleSelect = (repo: Repository) => {
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

    setOpen(false);
    setMentionStart(-1);

    // 커서 위치 조정
    setTimeout(() => {
      const newCursorPos = mentionStart + repo.fullName.length + 2; // @ + fullName + space
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      setMentionStart(-1);
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
            placeholder="오늘 할 일을 입력하세요. @를 입력하면 레포지토리를 선택할 수 있습니다."
            className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[300px] p-0"
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
              ) : repositories.length === 0 ? (
                <CommandEmpty>레포지토리를 찾을 수 없습니다.</CommandEmpty>
              ) : (
                <CommandGroup heading="레포지토리">
                  {repositories.map((repo) => (
                    <CommandItem
                      key={repo.fullName}
                      value={repo.fullName}
                      onSelect={() => handleSelect(repo)}
                      className="cursor-pointer"
                    >
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
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
