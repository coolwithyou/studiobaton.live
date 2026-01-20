import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
}

export function PageContainer({
  children,
  className,
  maxWidth = "full",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  )
}
