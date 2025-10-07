import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { BackgroundWave } from "@/components/background-wave";
import Link from "next/link";
import { ElevenLabsLogo, GithubLogo } from "@/components/logos";

export const metadata: Metadata = {
  title: "Eleven Shopping - The Future of Commerce is Conversational",
  description:
    "Experience the future of e-commerce with AI-powered conversational shopping. Discover products through natural conversation.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/Avatar.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Eleven Shopping - The Future of Commerce is Conversational",
    description:
      "Experience the future of e-commerce with AI-powered conversational shopping. Discover products through natural conversation.",
    images: [
      {
        url: "/eleven_shopping_og.png",
        width: 1200,
        height: 630,
        alt: "Eleven Shopping - Conversational Commerce Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eleven Shopping - The Future of Commerce is Conversational",
    description:
      "Experience the future of e-commerce with AI-powered conversational shopping. Discover products through natural conversation.",
    images: ["/eleven_shopping_og.png"],
  },
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
