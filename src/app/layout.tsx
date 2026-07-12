import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getLocale } from "@/lib/i18n/getLocale";
import "./globals.css";

export const metadata: Metadata = {
  title: "社用車予約",
  description: "社用車の予約管理システム",
  // 社内向けアプリのため検索エンジンにインデックスさせない（ミドルウェアの
  // X-Robots-Tag ヘッダーと合わせた二重の防御）。
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <Header />
          <main className="mx-auto max-w-3xl px-4 py-6 pb-24">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
