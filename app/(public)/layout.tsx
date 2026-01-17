import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 왼쪽 고정 로고 - container 그리드에 맞춤, 모바일에서 숨김 */}
      <div className="fixed top-24 left-0 right-0 z-40 pointer-events-none hidden lg:block">
        <div className="container mx-auto px-4">
          <Link href="/" className="pointer-events-auto inline-block">
            <Image
              src="/header_logo.png"
              alt="studiobaton log"
              width={160}
              height={160}
              className="rounded-xl"
              priority
            />
          </Link>
        </div>
      </div>

      <main>{children}</main>
    </div>
  );
}
