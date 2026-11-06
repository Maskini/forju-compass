import {connection} from "next/server";
import type { Metadata } from "next";

import "./globals.css";
import "./feedback.css";


export const metadata: Metadata = {
  title: "ForJu Compass | Wissen. Möglichkeiten. Menschen.",
  description: "ForJu Compass begleitet deine Ideen mit Wissen, Orientierung und Quellen aus der Forschenden Jugend.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection(); // Each HTML response carries a fresh script nonce.
  return (
    <html
      lang="de"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
