import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Hub | Gocar VN",
  description: "Quản trị nội dung Gocar VN",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
