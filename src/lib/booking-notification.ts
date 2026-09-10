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
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `[Xe Miền Nam] Yêu cầu đặt xe mới #${data.bookingId}`,
        from_name: "Website Xe Miền Nam",
        "Mã lead CMS": data.bookingId,
        "Họ tên": data.fullName,
        "Số điện thoại": data.phone,
        "Gọi ngay": phoneCallUri(data.phone),
        "Tuyến quan tâm": data.route,
        "Loại xe": data.vehicleType,
        "Ngày đi": data.departureDate || "Khách chưa chọn",
        "Ghi chú": data.note || "Không có",
        "Thời gian gửi": submittedAt,
      }),
      signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
    if (!response.ok || result?.success !== true) {
      return { sent: false, reason: `web3forms_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "request_failed";
    return { sent: false, reason };
  }
}
