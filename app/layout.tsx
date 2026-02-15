import type { Metadata } from "next";

import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { KeyboardPageNavigator } from "@/components/KeyboardPageNavigator";

export const metadata: Metadata = {
  title: "English 1500 Memorizer",
  description: "Weekly memorize cards + quizzes with spaced repetition."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <KeyboardPageNavigator />
        <main className="mx-auto min-h-screen w-full max-w-5xl p-6">
          <AppNav />
          {children}
        </main>
      </body>
    </html>
  );
}

