import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZEOrabbit",
  description: "지오래빗 - 체험단 운영과 리워드 정산 플랫폼"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="zeo-body min-h-screen overflow-x-hidden bg-bg text-text antialiased">
        <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>
      </body>
    </html>
  );
}


