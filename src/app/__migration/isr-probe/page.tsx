import type { Metadata } from "next";

// Preview-only diagnostic: the timestamp should change after ISR regenerates.
// This route is intentionally absent from navigation and sitemap.
export const dynamic = "force-static";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kiểm tra bộ nhớ đệm bản thử",
  robots: { index: false, follow: false },
};

export default function IsrProbe() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Kiểm tra làm mới bản thử</h1>
      <p>Thời điểm tạo trang: <time>{new Date().toISOString()}</time></p>
      <p>Trang này chỉ dùng để kiểm tra bộ nhớ đệm trên Worker thử.</p>
    </main>
  );
}
