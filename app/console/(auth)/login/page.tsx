"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "AccessDenied") {
      setShowErrorModal(true);
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/console/entry",
        redirect: true,
      });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleCloseModal = () => {
    setShowErrorModal(false);
    router.replace("/console/login");
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">studiobaton</CardTitle>
            <p className="text-sm text-muted-foreground">
              @ba-ton.kr 계정으로 로그인
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGoogleLogin}
              className="w-full"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>접근이 제한되었습니다</DialogTitle>
            </div>
            <DialogDescription className="pt-3 text-left">
              현재 바톤(@ba-ton.kr) 조직 멤버만 로그인할 수 있습니다.
              <br />
              <br />
              바톤 멤버라면 <strong>@ba-ton.kr</strong> 이메일 계정으로 다시 시도해 주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleCloseModal} className="w-full sm:w-auto">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">studiobaton</CardTitle>
            <p className="text-sm text-muted-foreground">
              @ba-ton.kr 계정으로 로그인
            </p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled>
              로딩 중...
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
