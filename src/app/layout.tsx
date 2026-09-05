import type { Metadata } from "next";
import { Archivo, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "vietnamese"] });
const vietnam = Be_Vietnam_Pro({ variable: "--font-vietnam", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Xe Miền Nam — Đi đâu cũng có Xe Miền Nam",
  description: "Đặt xe đường dài tử tế từ TP. Hồ Chí Minh đi Vũng Tàu, Cần Thơ, Đà Lạt và nhiều tuyến miền Nam.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${archivo.variable} ${vietnam.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
