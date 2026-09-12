import type { Metadata } from "next";
import { Archivo, Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "sonner";
import { FloatingContactActions } from "@/components/floating-contact-actions";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { AnalyticsPageview } from "@/components/analytics-pageview";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "vietnamese"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // Archivo renders the LCP heading and remains preloaded. Let body copy load Be Vietnam
  // Pro from the generated CSS instead of forcing every weight into the critical head.
  preload: false,
});

export const metadata: Metadata = {
  title: "Xe Miền Nam",
  description: "Dịch vụ cho thuê xe các tuyến miền Nam — TP.HCM, Vũng Tàu, Cần Thơ, Đà Lạt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${archivo.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsScripts />
        <AnalyticsPageview />
        {children}
        <FloatingContactActions />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
