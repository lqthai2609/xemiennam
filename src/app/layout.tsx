import type { Metadata } from "next";
import { Archivo, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

import { FloatingContactActions } from "@/components/floating-contact-actions";

// Font cho tiêu đề & số liệu — đúng design system (mục 8, xemiennam-kien-truc-ky-thuat.md)
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "vietnamese"],
  weight: ["700", "800", "900"],
});

// Font cho phần chữ còn lại
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
        {children}
        <FloatingContactActions />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
