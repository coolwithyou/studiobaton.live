import { cn } from "@/lib/utils"
import { InboxIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className
      )}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        {icon || <InboxIcon className="size-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
