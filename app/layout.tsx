import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./feedback.css";
import FeedbackWidget from "@/app/components/feedback/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForJu Compass | Wissen. Möglichkeiten. Menschen.",
  description: "ForJu Compass begleitet deine Ideen mit Wissen, Orientierung und Quellen aus der Forschenden Jugend.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<FeedbackWidget /></body>
    </html>
  );
}
