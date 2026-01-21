import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>&copy; {currentYear} studiobaton</span>
          <span>&middot;</span>
          <span>
            Built by{" "}
            <Link
              href="https://github.com/coolwithyou"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              @coolwithyou ↗
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
