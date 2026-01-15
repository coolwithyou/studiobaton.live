import { BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface VerifiedBadgeProps {
  memberName?: string
  className?: string
  size?: "sm" | "md"
}

export function VerifiedBadge({
  memberName,
  className,
  size = "sm",
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
  }

  return (
    <span
      title={memberName ? `${memberName}님의 인증된 계정` : "인증된 팀원"}
      className={cn("inline-flex items-center", className)}
    >
      <BadgeCheck className={cn(sizeClasses[size], "text-blue-500")} />
    </span>
  )
}
