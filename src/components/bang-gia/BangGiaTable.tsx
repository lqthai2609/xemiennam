"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PricingTableData } from "@/lib/pricing";

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function BangGiaTable({ data }: { data: PricingTableData }) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) => row.title.toLowerCase().includes(q));
  }, [data.rows, query]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên tuyến, ví dụ: Vũng Tàu"
          aria-label="Tìm tuyến"
          className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--slate)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] sm:max-w-[320px]"
        />
        <p className="text-[13px] text-[var(--slate)]">
          Cập nhật lần cuối: {data.lastUpdated}
        </p>
      </div>

      {/* Bảng ngang — desktop/tablet */}
      <div className="hidden overflow-x-auto rounded-[14px] border border-[var(--line)] bg-white md:block">
        <table className="w-full border-collapse text-[14.5px]">
          <thead>
            <tr className="bg-[var(--navy-900)] text-white">
              <th scope="col" className="px-5 py-4 text-left font-semibold">
                Tuyến
              </th>
              {data.columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className="whitespace-nowrap px-5 py-4 text-left font-semibold"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.slug} className="border-t border-[var(--line)]">
                <td className="px-5 py-4">
                  <Link
                    href={`/tuyen-duong/${row.slug}`}
                    className="font-semibold text-[var(--navy-900)] hover:text-[var(--orange)]"
                  >
                    {row.title}
                  </Link>
                </td>
                {data.columns.map((col) => (
                  <td key={col.id} className="px-5 py-4 text-[var(--ink)]">
                    {formatPrice(row.prices[col.id] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={data.columns.length + 1}
                  className="px-5 py-8 text-center text-[var(--slate)]"
                >
                  Không tìm thấy tuyến phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Danh sách thẻ — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredRows.map((row) => (
          <div
            key={row.slug}
            className="rounded-[14px] border border-[var(--line)] bg-white p-5"
          >
            <Link
              href={`/tuyen-duong/${row.slug}`}
              className="font-[Archivo] text-[17px] font-extrabold text-[var(--navy-900)]"
            >
              {row.title}
            </Link>
            <div className="mt-3 flex flex-col gap-2">
              {data.columns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between text-[14px]"
                >
                  <span className="text-[var(--slate)]">{col.name}</span>
                  <span className="font-semibold text-[var(--navy-900)]">
                    {formatPrice(row.prices[col.id] ?? null)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredRows.length === 0 && (
          <p className="py-8 text-center text-[var(--slate)]">
            Không tìm thấy tuyến phù hợp.
          </p>
        )}
      </div>

      <p className="mt-6 text-[13px] text-[var(--slate)]">
        Giá tham khảo, có thể thay đổi theo mùa hoặc dịp lễ. Liên hệ hotline
        hoặc Zalo để được báo giá chính xác cho chuyến đi của bạn.
      </p>
    </div>
  );
}
