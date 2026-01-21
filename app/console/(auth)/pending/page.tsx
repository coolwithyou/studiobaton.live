import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PendingPage() {
  const session = await getServerSession();

  // 로그인되지 않은 경우 로그인 페이지로
  if (!session?.user) {
    redirect("/console/login");
  }

  // PENDING 상태가 아닌 경우 (ACTIVE면 어드민으로, INACTIVE면 로그인으로)
  const status = session.user.status;
  if (status === "ACTIVE") {
    redirect("/console");
  }
  if (status === "INACTIVE") {
    redirect("/console/login");
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-xl">승인 대기 중</CardTitle>
          <CardDescription>
            회원가입이 완료되었습니다.
            <br />
            관리자의 승인 후 서비스를 이용하실 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">가입 정보</p>
            <p>이메일: {session.user.email}</p>
            {session.user.name && <p>이름: {session.user.name}</p>}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            승인이 완료되면 별도 안내 없이 바로 이용 가능합니다.
            <br />
            문의사항은 관리자에게 연락해주세요.
          </p>

          <div className="flex flex-col gap-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                메인으로 돌아가기
              </Button>
            </Link>
            <form action={logout}>
              <Button variant="ghost" type="submit" className="w-full">
                로그아웃
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
