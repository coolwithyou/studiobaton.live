import { getServerSession } from "@/lib/auth-helpers"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  filterNavMainByRole,
  filterNavSecondaryByRole,
} from "./sidebar-config"
import type { UserRole } from "@/app/generated/prisma"

export async function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const session = await getServerSession()

  const user = {
    name: session?.user?.name || null,
    email: session?.user?.email || null,
    image: session?.user?.image || null,
  }

  const userRole = (session?.user?.role as UserRole) || "TEAM_MEMBER"

  const navMainGroups = filterNavMainByRole(userRole)
  const navSecondaryItems = filterNavSecondaryByRole(userRole)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">SB</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">Studio Baton</span>
            <span className="truncate text-xs text-muted-foreground">
              Admin Dashboard
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navMainGroups} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
