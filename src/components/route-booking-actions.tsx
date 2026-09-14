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
import { SITE_HOTLINE_TEL } from "@/lib/site-config";
import type { RoutePricingDirectionKey, RoutePricingMode } from "@/types/route";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const quickBookingSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại chưa đúng định dạng Việt Nam."),
  departureAt: z.string().optional(),
});
type QuickBookingData = z.infer<typeof quickBookingSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function formatDepartureLabel(value: string): string {
  const [datePart, timePart] = value.split("T");
  const d = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dateLabel = `${dd}/${mm}/${d.getFullYear()}`;
  return timePart ? `${dateLabel} ${timePart}` : dateLabel;
}

type BookingPricingContext = {
  routeId?: string;
  displayRoute?: string;
  direction?: RoutePricingDirectionKey;
  packageKey?: string;
  packageLabel?: string;
  pricingMode?: RoutePricingMode;
};

function QuickBookingDialog({
  route,
  routeId,
  displayRoute,
  vehicleType,
  price,
  direction = "outbound",
  packageKey,
  packageLabel,
  pricingMode = "fixed",
  onClose,
}: {
  route: string;
  routeId?: string;
  displayRoute?: string;
  vehicleType: string;
  price?: string;
  direction?: RoutePricingDirectionKey;
  packageKey?: string;
  packageLabel?: string;
  pricingMode?: Exclude<RoutePricingMode, "disabled">;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuickBookingData>({ resolver: zodResolver(quickBookingSchema) });

  const visibleRoute = displayRoute || route;
  const visiblePrice = pricingMode === "contact" ? "Liên hệ để nhận báo giá" : price || "Liên hệ để nhận báo giá";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submitForm(data: QuickBookingData) {
    try {
      const departureDate = data.departureAt ? data.departureAt.split("T")[0] : "";
      const departureLabel = data.departureAt ? formatDepartureLabel(data.departureAt) : "";
      const pricingNote =
        pricingMode === "contact"
          ? "Trạng thái giá: liên hệ báo giá."
          : price
            ? `Giá tham khảo: ${price}.`
            : "Trạng thái giá: liên hệ báo giá.";
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          phone: data.phone,
          route,
          routeId,
          vehicleType,
          departureDate,
          direction,
          packageKey,
          pricingMode,
          note: [
            `Đặt xe online từ trang chi tiết tuyến.`,
            `Chiều: ${visibleRoute} (${direction}).`,
            packageLabel && `Gói: ${packageLabel}${packageKey ? ` (${packageKey})` : ""}.`,
            pricingNote,
            departureLabel && `Ngày giờ đi mong muốn: ${departureLabel}.`,
          ]
            .filter(Boolean)
            .join(" "),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Gửi yêu cầu đặt xe thất bại (HTTP ${res.status}).`);
      }
      trackBookingLead({ route: visibleRoute, vehicleType });
      toast.success("Đã nhận thông tin đặt xe", {
        description: "Đội ngũ sẽ liên hệ với bạn trong thời gian sớm nhất.",
      });
      onClose();
    } catch {
      toast.error("Gửi thông tin chưa thành công", {
        description: "Vui lòng thử lại hoặc gọi trực tiếp cho chúng tôi.",
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
            Tuyến: <strong>{visibleRoute}</strong>
          </div>
          <div>
            Loại xe: <strong>{vehicleType}</strong>
          </div>
          {packageLabel && (
            <div>
              Gói: <strong>{packageLabel}</strong>
            </div>
          )}
          <div>
            Giá: <strong>{visiblePrice}</strong>
          </div>
        </div>
        <form onSubmit={handleSubmit(submitForm)} className="quick-booking-form" noValidate>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            <span>
              Họ tên <span className="text-destructive">*</span>
            </span>
            <input
              {...register("fullName")}
              aria-invalid={!!errors.fullName}
              placeholder="Nguyễn Văn A"
              className="form-control"
              autoFocus
            />
            <FieldError message={errors.fullName?.message} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            <span>
              Số điện thoại <span className="text-destructive">*</span>
            </span>
            <input
              {...register("phone")}
              aria-invalid={!!errors.phone}
              inputMode="tel"
              placeholder="0898 400 800"
              className="form-control"
            />
            <FieldError message={errors.phone?.message} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            <span>
              Ngày giờ đi <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
            </span>
            <input {...register("departureAt")} type="datetime-local" className="form-control" />
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

export function RouteBookingActions({
  route,
  routeId,
  displayRoute,
  vehicleType,
  price,
  direction = "outbound",
  packageKey,
  packageLabel,
  pricingMode = "fixed",
}: {
  route: string;
  vehicleType: string;
  price?: string;
} & BookingPricingContext) {
  const [open, setOpen] = useState(false);
  const zaloLink = getZaloChatLink();

  if (pricingMode === "disabled") return null;

  if (pricingMode === "contact") {
    return (
      <div className="detail-price-actions">
        {zaloLink && (
          <Button size="sm" asChild>
            <a href={zaloLink} target="_blank" rel="noopener noreferrer" aria-label={`Nhắn Zalo nhận báo giá xe ${vehicleType}`}>
              <MessageCircle data-icon="inline-start" size={16} />
              Nhắn Zalo báo giá
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${SITE_HOTLINE_TEL}`} aria-label={`Gọi nhận báo giá xe ${vehicleType}`}>
            <Phone data-icon="inline-start" size={16} />
            Gọi nhận báo giá
          </a>
        </Button>
      </div>
    );
  }

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
        <a
          href={`tel:${SITE_HOTLINE_TEL}`}
          className="detail-price-icon-cta"
          aria-label={`Gọi điện đặt xe ${vehicleType}`}
        >
          <Phone size={16} />
        </a>
      </div>
      {open && (
        <QuickBookingDialog
          route={route}
          routeId={routeId}
          displayRoute={displayRoute}
          vehicleType={vehicleType}
          price={price}
          direction={direction}
          packageKey={packageKey}
          packageLabel={packageLabel}
          pricingMode="fixed"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default RouteBookingActions;
