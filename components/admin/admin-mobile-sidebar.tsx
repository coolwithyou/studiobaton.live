import { getServerSession } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { AdminMobileHeader } from "./admin-mobile-header";
import { filterMenuGroupsByRole } from "./admin-sidebar-config";
import type { UserRole } from "@/app/generated/prisma";

export async function AdminMobileSidebar() {
  const session = await getServerSession();
  const userRole = (session?.user?.role as UserRole) || "ORG_MEMBER";

  // 역할별 메뉴 필터링
  const visibleGroups = filterMenuGroupsByRole(userRole);

  const userInfo = {
    email: session?.user?.email || "",
    name: session?.user?.name || null,
    image: session?.user?.image || null,
    role: userRole,
  };

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <AdminMobileHeader
      menuGroups={visibleGroups}
      userInfo={userInfo}
      logoutAction={logout}
    />
  );
}
