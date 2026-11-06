import type { Metadata } from "next";

import "./globals.css";
import "./feedback.css";


export const metadata: Metadata = {
  title: "ForJu Compass | Wissen. Möglichkeiten. Menschen.",
  description: "ForJu Compass begleitet deine Ideen mit Wissen, Orientierung und Quellen aus der Forschenden Jugend.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
