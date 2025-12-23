import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-14 flex items-center">
        <Link href="/" className="font-bold text-xl tracking-tight">
          studiobaton
        </Link>
      </div>
    </header>
  );
}
