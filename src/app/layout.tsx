import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalMom",
  description: "Reward-based open market platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="zeo-body min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50 antialiased">
        <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>
      </body>
    </html>
  );
}


