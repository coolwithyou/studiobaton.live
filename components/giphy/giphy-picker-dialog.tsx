"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GiphyGrid } from "./giphy-grid";
import type { GiphyGif } from "@/types/giphy";
import { SearchIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";

interface GiphyPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (gifUrl: string, altText: string) => void;
}

type Step = "search" | "confirm";

export function GiphyPickerDialog({
  open,
  onOpenChange,
  onInsert,
}: GiphyPickerDialogProps) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<GiphyGif | null>(null);
  const [altText, setAltText] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 초기 trending GIF 로드
  useEffect(() => {
    if (open && gifs.length === 0) {
      fetchGifs("");
    }
  }, [open]);

  // 다이얼로그 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setStep("search");
      setQuery("");
      setGifs([]);
      setSelectedGif(null);
      setAltText("");
      setError(null);
    }
  }, [open]);

  // confirm 단계에서 alt input에 포커스
  useEffect(() => {
    if (step === "confirm" && altInputRef.current) {
      altInputRef.current.focus();
    }
  }, [step]);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "18",
      });

      const response = await fetch(`/api/giphy/search?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "GIF 검색 중 오류가 발생했습니다.");
      }

      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      // 디바운스
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        fetchGifs(value);
      }, 300);
    },
    [fetchGifs]
  );

  const handleSelectGif = useCallback((gif: GiphyGif) => {
    setSelectedGif(gif);
    setAltText(gif.title || "");
    setStep("confirm");
  }, []);

  const handleBack = useCallback(() => {
    setStep("search");
    setSelectedGif(null);
    setAltText("");
  }, []);

  const handleInsert = useCallback(() => {
    if (!selectedGif) return;

    // downsized 또는 original URL 사용
    const gifUrl =
      selectedGif.images.downsized?.url ||
      selectedGif.images.original?.url ||
      selectedGif.images.fixed_height.url;

    onInsert(gifUrl, altText.trim() || "GIF");
    onOpenChange(false);
  }, [selectedGif, altText, onInsert, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && step === "confirm" && selectedGif) {
        e.preventDefault();
        handleInsert();
      }
    },
    [step, selectedGif, handleInsert]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "confirm" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleBack}
                className="mr-1"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
            )}
            {step === "search" ? "GIF 검색" : "GIF 삽입"}
          </DialogTitle>
        </DialogHeader>

        {step === "search" ? (
          <>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="GIF 검색..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] py-2">
              {error ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <p className="text-destructive text-sm">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchGifs(query)}
                  >
                    다시 시도
                  </Button>
                </div>
              ) : (
                <GiphyGrid
                  gifs={gifs}
                  loading={loading}
                  onSelect={handleSelectGif}
                />
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Powered by{" "}
              <a
                href="https://ffgg.im"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                ffgg
              </a>
            </div>
          </>
        ) : (
          <>
            {selectedGif && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedGif.images.fixed_height.url}
                    alt={selectedGif.title || "선택된 GIF"}
                    className="max-h-[200px] rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="alt-text"
                    className="text-sm font-medium leading-none"
                  >
                    이미지 설명 (Alt Text)
                  </label>
                  <Input
                    id="alt-text"
                    ref={altInputRef}
                    placeholder="이미지에 대한 설명을 입력하세요..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    접근성을 위해 이미지 내용을 설명해주세요.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                뒤로
              </Button>
              <Button onClick={handleInsert} disabled={!selectedGif}>
                {loading ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  "삽입"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
