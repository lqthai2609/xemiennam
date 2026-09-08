"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MessageCircle, Phone, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getZaloChatLink } from "@/lib/zalo";
import { trackBookingLead } from "@/lib/analytics";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const quickBookingSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại chưa đúng định dạng Việt Nam."),
});
type QuickBookingData = z.infer<typeof quickBookingSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/**
 * Modal "Đặt xe online" (mở từ mỗi card giá trong route-detail.tsx) — tuyến/loại xe/giá LUÔN
 * cố định theo card đã bấm (không cho sửa), khách chỉ cần điền họ tên + SĐT. Gửi tới cùng
 * /api/booking mà ContactBookingForm (trang /lien-he) đang dùng — ghép route/vehicleType đúng
 * định dạng "from – to" mà resolveRouteId() ở đó kỳ vọng để khớp được ID route thật bên WP.
 */
function QuickBookingDialog({
  route,
  vehicleType,
  price,
  onClose,
}: {
  route: string;
  vehicleType: string;
  price: string;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuickBookingData>({ resolver: zodResolver(quickBookingSchema) });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submitForm(data: QuickBookingData) {
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          phone: data.phone,
          route,
          vehicleType,
          departureDate: "",
          note: `Đặt xe online từ trang chi tiết tuyến — giá tham khảo ${price}.`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Gửi yêu cầu đặt xe thất bại (HTTP ${res.status}).`);
      }
      trackBookingLead({ route, vehicleType });
      toast.success("Đã nhận thông tin đặt xe", {
        description: "Xe Miền Nam sẽ liên hệ với bạn trong thời gian sớm nhất.",
      });
      onClose();
    } catch {
      toast.error("Gửi thông tin chưa thành công", {
        description: "Vui lòng thử lại hoặc gọi trực tiếp cho Xe Miền Nam.",
      });
    }
  }

  return (
    <div className="quick-booking-overlay" role="presentation" onClick={onClose}>
      <div
        className="quick-booking-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Đặt xe ${vehicleType}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="quick-booking-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <p className="section-label">ĐẶT XE ONLINE</p>
        <h3>Xác nhận thông tin.</h3>
        <div className="quick-booking-summary">
          <div>
            Tuyến: <strong>{route}</strong>
          </div>
          <div>
            Loại xe: <strong>{vehicleType}</strong>
          </div>
          <div>
            Giá: <strong>{price}</strong>
          </div>
        </div>
        <form onSubmit={handleSubmit(submitForm)} className="quick-booking-form" noValidate>
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Họ tên <span className="text-destructive">*</span>
            <input
              {...register("fullName")}
              aria-invalid={!!errors.fullName}
              placeholder="Nguyễn Văn A"
              className="form-control"
              autoFocus
            />
            <FieldError message={errors.fullName?.message} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Số điện thoại <span className="text-destructive">*</span>
            <input
              {...register("phone")}
              aria-invalid={!!errors.phone}
              inputMode="tel"
              placeholder="0898 400 800"
              className="form-control"
            />
            <FieldError message={errors.phone?.message} />
          </label>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {isSubmitting ? "Đang gửi..." : "Xác nhận đặt xe"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** 3 CTA của mỗi card giá ở route-detail.tsx: đặt online (modal), Zalo, gọi điện trực tiếp. */
export function RouteBookingActions({
  route,
  vehicleType,
  price,
}: {
  route: string;
  vehicleType: string;
  price: string;
}) {
  const [open, setOpen] = useState(false);
  // null khi chưa cấu hình NEXT_PUBLIC_ZALO_OA_ID (xem lib/zalo.ts) — ẩn hẳn nút Zalo thay vì
  // hiển thị link chết.
  const zaloLink = getZaloChatLink();

  return (
    <>
      <div className="detail-price-actions">
        <Button size="sm" className="detail-price-cta" onClick={() => setOpen(true)}>
          Đặt xe online
        </Button>
        {zaloLink && (
          <a
            href={zaloLink}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-price-icon-cta"
            aria-label={`Đặt xe ${vehicleType} qua Zalo`}
          >
            <MessageCircle size={16} />
          </a>
        )}
        <a href="tel:19006789" className="detail-price-icon-cta" aria-label={`Gọi điện đặt xe ${vehicleType}`}>
          <Phone size={16} />
        </a>
      </div>
      {open && <QuickBookingDialog route={route} vehicleType={vehicleType} price={price} onClose={() => setOpen(false)} />}
    </>
  );
}

export default RouteBookingActions;
