const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const NOTIFICATION_TIMEOUT_MS = 8_000;

export interface BookingNotificationData {
  bookingId: number;
  fullName: string;
  phone: string;
  route: string;
  vehicleType: string;
  departureDate: string;
  note: string;
}

export interface BookingNotificationResult {
  sent: boolean;
  reason?: string;
}

interface Web3FormsResponse {
  success?: boolean;
  message?: string;
}

/** Chuẩn hóa số Việt Nam thành URI `tel:` để có thể bấm gọi ngay trong email. */
function phoneCallUri(phone: string): string {
  const compactPhone = phone.replace(/[\s.-]/g, "");
  const internationalPhone = compactPhone.startsWith("0")
    ? `+84${compactPhone.slice(1)}`
    : compactPhone;

  return `tel:${internationalPhone}`;
}

/**
 * Gửi thông báo sau khi lead đã được WordPress lưu thành công.
 *
 * Access key Web3Forms đã gắn với email người nhận lúc tạo key, vì vậy địa chỉ nhận không
 * được gửi từ trình duyệt hoặc trong payload. Hàm luôn trả kết quả thay vì throw để lỗi dịch
 * vụ email không thể biến một lead đã lưu trong CMS thành một lần gửi form thất bại.
 */
export async function sendBookingNotification(
  data: BookingNotificationData,
): Promise<BookingNotificationResult> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    return { sent: false, reason: "missing_access_key" };
  }

  const submittedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  try {
    // Dùng multipart/form-data đúng theo form submission chuẩn của Web3Forms. Không tự đặt
    // Content-Type vì fetch phải thêm boundary tương ứng với FormData.
    const form = new FormData();
    form.set("access_key", accessKey);
    form.set("subject", `[Xe Miền Nam] Yêu cầu đặt xe mới #${data.bookingId}`);
    form.set("from_name", "Website Xe Miền Nam");
    form.set("botcheck", "");
    form.set("Mã lead CMS", String(data.bookingId));
    form.set("Họ tên", data.fullName);
    form.set("Số điện thoại", data.phone);
    form.set("Gọi ngay", phoneCallUri(data.phone));
    form.set("Tuyến quan tâm", data.route);
    form.set("Loại xe", data.vehicleType);
    form.set("Ngày đi", data.departureDate || "Khách chưa chọn");
    form.set("Ghi chú", data.note || "Không có");
    form.set("Thời gian gửi", submittedAt);

    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as Web3FormsResponse | null;
    if (!response.ok || result?.success !== true) {
      const providerMessage = result?.message?.replace(/[\r\n]/g, " ").slice(0, 200);
      return {
        sent: false,
        reason: providerMessage
          ? `web3forms_${response.status}: ${providerMessage}`
          : `web3forms_${response.status}`,
      };
    }

    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "request_failed";
    return { sent: false, reason };
  }
}
