"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { CalendarDays, CarFront, Info, LoaderCircle, MapPin, Phone, Send, UserRound } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocationField } from "@/components/location-field";
import { Button } from "@/components/ui/button";
import { MultiStopFields } from "@/components/multi-stop-fields";
import { trackBookingLead } from "@/lib/analytics";
import { intermediateStopsInputSchema, type IntermediateStopInput } from "@/lib/booking-stops";
import { SITE_NAME } from "@/lib/site-config";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const bookingSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Số điện thoại chưa đúng định dạng Việt Nam."),
  route: z.string().optional(),
  pickup: z.string().trim().min(1, "Vui lòng nhập điểm đón.").max(120),
  destination: z.string().trim().min(1, "Vui lòng nhập điểm đến.").max(120),
  vehicleType: z.string().min(1, "Vui lòng chọn loại xe."),
  departureDate: z.string().optional(),
  pickupAddress: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập điểm đón cụ thể.")
    .max(240, "Điểm đón tối đa 240 ký tự."),
  dropoffAddress: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập điểm trả cụ thể.")
    .max(240, "Điểm trả tối đa 240 ký tự."),
  pickupNote: z.string().trim().max(300, "Lưu ý điểm đón tối đa 300 ký tự.").optional(),
  intermediateStops: intermediateStopsInputSchema,
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự.").optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

interface ContactBookingFormProps {
  /** Gợi ý điểm đón/đến từ các tuyến được phép hiển thị. */
  locationOptions: string[];
  /** Mặc định lấy đúng VEHICLE_TYPE_ORDER (lib/api/routes.ts) — khớp taxonomy vehicle_type thật, không tự đặt tên khác ("Xe 4 chỗ"...). */
  vehicleTypeOptions?: string[];
  defaultRoute?: string;
  onSubmit: (data: BookingFormData) => Promise<{ leadId: number; replayed: boolean }>;
}

const FALLBACK_VEHICLE_TYPES = ["4–7 chỗ", "16–29 chỗ", "45 chỗ", "Limousine"];

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ContactBookingForm({
  locationOptions,
  vehicleTypeOptions = FALLBACK_VEHICLE_TYPES,
  defaultRoute = "",
  onSubmit,
}: ContactBookingFormProps) {
  const instanceId = useId();
  const vehicleTypes = vehicleTypeOptions;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      route: defaultRoute,
      pickup: "",
      destination: "",
      vehicleType: "",
      departureDate: "",
      pickupAddress: "",
      dropoffAddress: "",
      pickupNote: "",
      intermediateStops: [],
      note: "",
    },
  });
  const pickup = useWatch({ control, name: "pickup" }) ?? "";
  const destination = useWatch({ control, name: "destination" }) ?? "";
  const intermediateStops = useWatch({ control, name: "intermediateStops" }) ?? [];

  useEffect(() => {
    if (defaultRoute) {
      setValue("route", defaultRoute);
      const [from, to] = defaultRoute.split(/\s+[–—]\s+|\s+đi\s+/i);
      if (from && to) { setValue("pickup", from); setValue("destination", to); }
    }
  }, [defaultRoute, setValue]);

  const submitForm = async (data: BookingFormData) => {
    try {
      const { leadId, replayed } = await onSubmit({ ...data, route: `${data.pickup} – ${data.destination}` });
      // Ngày 22 — chỉ bắn sau khi onSubmit() (gọi /api/booking) đã thành công, tránh đếm lead
      // ảo cho những lượt gửi lỗi. Tự tắt nếu chưa cấu hình GA4/FB Pixel, xem lib/analytics.ts.
      if (!replayed) trackBookingLead({ route: `${data.pickup} – ${data.destination}`, vehicleType: data.vehicleType });
      toast.success("Đã nhận thông tin đặt xe", {
        description: `Mã yêu cầu #${leadId}. ${SITE_NAME} sẽ liên hệ với bạn trong thời gian sớm nhất.`,
      });
      reset({ ...data, fullName: "", phone: "", pickupAddress: "", dropoffAddress: "", pickupNote: "", intermediateStops: [], note: "" });
    } catch {
      toast.error("Gửi thông tin chưa thành công", {
        description: `Vui lòng thử lại hoặc gọi trực tiếp cho ${SITE_NAME}.`,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} className="contact-form" noValidate>
      <div className="contact-form-section-title"><UserRound aria-hidden="true" /><strong>Thông tin liên hệ</strong></div>
      <div className="contact-form-grid">
        <label className="contact-field"><span>Họ tên <b>*</b></span><span className="contact-input-wrap"><UserRound aria-hidden="true" /><input {...register("fullName")} aria-invalid={!!errors.fullName} placeholder="Nhập họ tên của bạn" className="form-control" /></span><FieldError message={errors.fullName?.message} /></label>
        <label className="contact-field"><span>Số điện thoại <b>*</b></span><span className="contact-input-wrap"><Phone aria-hidden="true" /><input {...register("phone")} aria-invalid={!!errors.phone} inputMode="tel" placeholder="Nhập số điện thoại" className="form-control" /></span><FieldError message={errors.phone?.message} /></label>
      </div>
      <div className="contact-form-section-title"><MapPin aria-hidden="true" /><strong>Hành trình của bạn</strong></div>
      <div className="contact-form-grid">
        <div className="contact-full contact-journey-locations">
          <div><LocationField label="Điểm đón *" value={pickup} onChange={(value) => setValue("pickup", value, { shouldDirty: true, shouldValidate: true })} placeholder="Nhập hoặc chọn điểm đón" listId={`${instanceId}-pickup`} options={locationOptions} /><FieldError message={errors.pickup?.message} /></div>
          <div><LocationField label="Điểm đến *" value={destination} onChange={(value) => setValue("destination", value, { shouldDirty: true, shouldValidate: true })} placeholder="Nhập hoặc chọn điểm đến" listId={`${instanceId}-destination`} options={locationOptions} /><FieldError message={errors.destination?.message} /></div>
        </div>
        <label className="contact-field"><span>Loại xe <b>*</b></span><span className="contact-input-wrap"><CarFront aria-hidden="true" /><select {...register("vehicleType")} aria-invalid={!!errors.vehicleType} className="form-control"><option value="">Chọn loại xe</option>{vehicleTypes.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}</select></span><FieldError message={errors.vehicleType?.message} /></label>
        <label className="contact-field contact-date"><span>Ngày đi</span><span className="contact-input-wrap"><CalendarDays aria-hidden="true" /><input {...register("departureDate")} type="date" className="form-control" /></span></label>
        <label className="contact-field"><span>Điểm đón cụ thể <b>*</b></span><span className="contact-input-wrap"><MapPin aria-hidden="true" /><input {...register("pickupAddress")} maxLength={240} aria-invalid={!!errors.pickupAddress} placeholder="Nhập địa chỉ hoặc điểm đón cụ thể" className="form-control" /></span><FieldError message={errors.pickupAddress?.message} /></label>
        <label className="contact-field"><span>Điểm trả cụ thể <b>*</b></span><span className="contact-input-wrap"><MapPin aria-hidden="true" /><input {...register("dropoffAddress")} maxLength={240} aria-invalid={!!errors.dropoffAddress} placeholder="Nhập địa chỉ hoặc điểm trả cụ thể" className="form-control" /></span><FieldError message={errors.dropoffAddress?.message} /></label>
        <MultiStopFields compact stops={intermediateStops as IntermediateStopInput[]} onChange={(stops) => setValue("intermediateStops", stops, { shouldDirty: true, shouldValidate: true })} errors={errors.intermediateStops as MultiStopFieldsError[] | undefined} />
        <label className="contact-field contact-full"><span>Lưu ý điểm đón <small>(nếu có)</small></span><textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} placeholder="Ví dụ: sảnh chung cư, cổng công ty, tên quán cà phê..." className="form-control" /><FieldError message={errors.pickupNote?.message} /></label>
        <label className="contact-field contact-full"><span>Ghi chú <small>(nếu có)</small></span><textarea {...register("note")} maxLength={500} aria-invalid={!!errors.note} placeholder="Nhập thêm thông tin về chuyến đi, số người, hành lý..." className="form-control" /><FieldError message={errors.note?.message} /></label>
      </div>
      <Button type="submit" disabled={isSubmitting} className="contact-form-submit">{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}{isSubmitting ? "Đang gửi thông tin..." : "Gửi yêu cầu đặt xe"}</Button>
      <p className="contact-form-assurance"><Info aria-hidden="true" /> Chúng tôi xác nhận thông tin và giá trước chuyến đi.</p>
    </form>
  );
}

export { bookingSchema };

type MultiStopFieldsError = {
  address?: { message?: string };
  waitingMinutes?: { message?: string };
};

export default ContactBookingForm;
