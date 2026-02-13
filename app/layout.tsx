import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "English 1500 Memorizer",
  description: "영단어 암기/퀴즈 앱"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-5xl p-6">
          <AppNav />
          {children}
        </main>
      </body>
    </html>
  );
}
