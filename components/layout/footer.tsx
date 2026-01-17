import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>&copy; {currentYear} All rights reserved.</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>
            Powered by{" "}
            <Link
              href="https://ba-ton.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              studiobaton
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
