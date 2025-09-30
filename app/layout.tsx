import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { BackgroundWave } from "@/components/background-wave";
import Link from "next/link";
import { ElevenLabsLogo, GithubLogo } from "@/components/logos";

export const metadata: Metadata = {
  title: "Conversational Commerce Demo",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={"h-full w-full"}>
      <body className={`antialiased w-full h-full lex flex-col`}>
        <div className="flex flex-col flex-grow w-full">
          {children}
          <BackgroundWave />
        </div>
      </body>
    </html>
  );
}
