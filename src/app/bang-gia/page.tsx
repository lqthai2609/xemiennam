import type { Metadata } from "next";
import { getPricingTable } from "@/lib/pricing";
import { BangGiaTable } from "@/components/bang-gia/BangGiaTable";

// Khớp nhịp làm mới với các trang khác đọc cùng nguồn pricing_by_vehicle
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bảng giá thuê xe các tuyến miền Nam | Xe Miền Nam",
  description:
    "Bảng giá thuê xe nguyên chiếc 4–45 chỗ và limousine theo từng tuyến miền Nam. Xem giá theo loại xe, cập nhật theo dữ liệu thật.",
};

export default async function BangGiaPage() {
  const pricingTable = await getPricingTable();

  return (
    <main className="min-h-screen bg-[var(--sand)]">
      <section className="bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-800)] pb-16 pt-24">
        <div className="mx-auto max-w-[1120px] px-7">
          <span className="mb-2.5 block text-[13px] font-semibold text-[var(--orange)]">
            Bảng giá
          </span>
          <h1 className="max-w-[18ch] font-[Archivo] text-[34px] font-extrabold text-white md:text-[40px]">
            Giá thuê xe nguyên chiếc theo từng tuyến
          </h1>
          <p className="mt-4 max-w-[52ch] text-[16px] text-white/70">
            Xem trước mức giá cho từng tuyến và từng loại xe. Khách thuê
            nguyên chiếc, chủ động giờ giấc — giá dưới đây là giá tham khảo,
            liên hệ để được báo giá chính xác theo hành trình của bạn.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-[1120px] px-7">
          <BangGiaTable data={pricingTable} />
        </div>
      </section>
    </main>
  );
}
