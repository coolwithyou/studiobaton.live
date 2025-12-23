import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* 로고 및 설명 */}
          <div className="text-center md:text-left">
            <Link
              href="/"
              className="font-bold text-sm hover:text-tint transition-colors"
            >
              studiobaton
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              디자인과 개발의 균형을 추구합니다.
            </p>
          </div>

          {/* 링크 */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-muted-foreground hover:text-tint transition-colors"
            >
              About
            </Link>
            <a
              href="https://ba-ton.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-tint transition-colors"
            >
              ba-ton.kr
            </a>
            <a
              href="https://github.com/studiobaton"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-tint transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* 저작권 */}
        <div className="mt-4 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>&copy; {currentYear} studiobaton. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
