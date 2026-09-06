"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const bookingSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Số điện thoại chưa đúng định dạng Việt Nam."),
  route: z.string().min(1, "Vui lòng chọn tuyến quan tâm."),
  vehicleType: z.string().min(1, "Vui lòng chọn loại xe."),
  departureDate: z.string().optional(),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự.").optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

interface ContactBookingFormProps {
  /**
   * Danh sách tuyến hiển thị trong select "Tuyến quan tâm" — truyền từ fetchRoutes() (Ngày 12)
   * ở trang cha, KHÔNG hardcode ở đây (component dùng chung nhiều trang). Nếu không truyền,
   * dùng tạm 3 tuyến phổ biến nhất làm fallback để component vẫn dùng độc lập được.
   */
  routeOptions?: string[];
  /** Mặc định lấy đúng VEHICLE_TYPE_ORDER (lib/api/routes.ts) — khớp taxonomy vehicle_type thật, không tự đặt tên khác ("Xe 4 chỗ"...). */
  vehicleTypeOptions?: string[];
  defaultRoute?: string;
  onSubmit: (data: BookingFormData) => void | Promise<void>;
}

const FALLBACK_ROUTES = ["TP.HCM – Vũng Tàu", "TP.HCM – Cần Thơ", "TP.HCM – Đà Lạt"];
const FALLBACK_VEHICLE_TYPES = ["4–7 chỗ", "16–29 chỗ", "45 chỗ", "Limousine"];
const OTHER_ROUTE_LABEL = "Tuyến khác";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ContactBookingForm({
  routeOptions = FALLBACK_ROUTES,
  vehicleTypeOptions = FALLBACK_VEHICLE_TYPES,
  defaultRoute = "",
  onSubmit,
}: ContactBookingFormProps) {
  const routes = [...routeOptions, OTHER_ROUTE_LABEL];
  const vehicleTypes = vehicleTypeOptions;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { route: defaultRoute, vehicleType: "", departureDate: "", note: "" },
  });

  const submitForm = async (data: BookingFormData) => {
    try {
      await onSubmit(data);
      toast.success("Đã nhận thông tin đặt xe", {
        description: "Xe Miền Nam sẽ liên hệ với bạn trong thời gian sớm nhất.",
      });
      reset({ ...data, fullName: "", phone: "", note: "" });
    } catch {
      toast.error("Gửi thông tin chưa thành công", {
        description: "Vui lòng thử lại hoặc gọi trực tiếp cho Xe Miền Nam.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Họ tên <span className="text-destructive">*</span>
          <input {...register("fullName")} aria-invalid={!!errors.fullName} placeholder="Nguyễn Văn A" className="form-control" />
          <FieldError message={errors.fullName?.message} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Số điện thoại <span className="text-destructive">*</span>
          <input {...register("phone")} aria-invalid={!!errors.phone} inputMode="tel" placeholder="0898 400 800" className="form-control" />
          <FieldError message={errors.phone?.message} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Tuyến quan tâm <span className="text-destructive">*</span>
          <select {...register("route")} aria-invalid={!!errors.route} className="form-control">
            <option value="">Chọn tuyến xe</option>
            {routes.map((route) => <option key={route} value={route}>{route}</option>)}
          </select>
          <FieldError message={errors.route?.message} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Loại xe <span className="text-destructive">*</span>
          <select {...register("vehicleType")} aria-invalid={!!errors.vehicleType} className="form-control">
            <option value="">Chọn loại xe</option>
            {vehicleTypes.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
          </select>
          <FieldError message={errors.vehicleType?.message} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Ngày đi
          <input {...register("departureDate")} type="date" className="form-control" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground sm:col-span-2">
          Ghi chú <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          <textarea {...register("note")} aria-invalid={!!errors.note} placeholder="Số lượng hành khách, điểm đón hoặc yêu cầu khác..." className="form-control min-h-28 resize-y" />
          <FieldError message={errors.note?.message} />
        </label>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
        {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
        {isSubmitting ? "Đang gửi thông tin..." : "Gửi yêu cầu đặt xe"}
      </Button>
    </form>
  );
}

export { bookingSchema };

export default ContactBookingForm;