import { CircleHelp } from "lucide-react";

type PriceExplanationProps = {
  compact?: boolean;
};

const PRICE_TERMS = [
  {
    label: "Giá từ",
    description: "Mức cơ bản đã được duyệt cho đúng chiều, loại xe và gói hành trình đang hiển thị.",
  },
  {
    label: "Ước tính chuyến",
    description: "Chỉ xuất hiện khi giá cơ bản và mọi khoản áp dụng cho chuyến đều xác định được.",
  },
  {
    label: "Liên hệ báo giá",
    description: "Dùng khi dữ liệu còn thiếu, cần xác nhận lịch thực tế hoặc có điều kiện chưa được phê duyệt.",
  },
] as const;

export function PriceExplanation({ compact = false }: PriceExplanationProps) {
  return (
    <aside
      className={`rounded-lg border border-border bg-card text-sm text-muted-foreground ${compact ? "p-4" : "p-5"}`}
      aria-labelledby="price-explanation-title"
    >
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <CircleHelp aria-hidden="true" size={18} />
        <h3 className="text-sm font-semibold" id="price-explanation-title">
          Cách đọc thông tin giá
        </h3>
      </div>
      <dl className={`grid gap-3 ${compact ? "sm:grid-cols-3" : "md:grid-cols-3"}`}>
        {PRICE_TERMS.map((item) => (
          <div key={item.label}>
            <dt className="font-semibold text-foreground">{item.label}</dt>
            <dd className="mt-1 leading-6">{item.description}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-border pt-3 text-xs leading-5">
        Giá hiển thị không phải giá đã chốt. Alo Đặt Xe xác nhận lại theo thông tin chuyến trước khi đặt xe.
      </p>
    </aside>
  );
}

