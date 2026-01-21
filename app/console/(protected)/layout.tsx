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
    redirect("/console/login")
  }

  return (
    <SidebarProvider defaultOpen={true} open={true} className="console-layout">
      <AppSidebar />
      <SidebarInset className="console-content">
        <main className="flex flex-1 flex-col p-4">
          <div className="@container/main flex flex-1 flex-col rounded-xl border bg-card console-main-card shadow-sm">
            <SiteHeader />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
