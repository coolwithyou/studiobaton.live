import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingStateProps {
  message?: string
  variant?: "spinner" | "skeleton" | "pulse"
  className?: string
}

export function LoadingState({
  message = "로딩 중...",
  variant = "spinner",
  className,
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid gap-4 @lg/main:grid-cols-2 @xl/main:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "flex min-h-[50vh] items-center justify-center",
          className
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-pulse rounded-full bg-primary/20" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-[50vh] items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
