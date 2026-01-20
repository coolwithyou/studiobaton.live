import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-helpers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/sidebar"
import { SiteHeader } from "@/components/admin/site-header"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/admin/login")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
