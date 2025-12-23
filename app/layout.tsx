import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://studiobaton.live"),
  title: {
    default: "studiobaton - 개발 이야기",
    template: "%s | studiobaton",
  },
  description:
    "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
  keywords: ["studiobaton", "개발", "블로그", "기술", "에이전시", "웹개발", "앱개발"],
  authors: [{ name: "studiobaton" }],
  creator: "studiobaton",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://studiobaton.live",
    siteName: "studiobaton",
    title: "studiobaton - 개발 이야기",
    description:
      "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "studiobaton - 개발 이야기",
    description:
      "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
