"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { GiphyGif } from "@/types/giphy";

interface GiphyGridProps {
  gifs: GiphyGif[];
  loading?: boolean;
  onSelect: (gif: GiphyGif) => void;
  selectedId?: string;
}

export function GiphyGrid({
  gifs,
  loading = false,
  onSelect,
  selectedId,
}: GiphyGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (gifs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        검색 결과가 없습니다
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {gifs.map((gif) => (
        <button
          key={gif.id}
          type="button"
          onClick={() => onSelect(gif)}
          className={cn(
            "relative aspect-square rounded-lg overflow-hidden",
            "transition-all hover:ring-2 hover:ring-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            selectedId === gif.id && "ring-2 ring-primary"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gif.images.fixed_height.url}
            alt={gif.title || "GIF"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {selectedId === gif.id && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
