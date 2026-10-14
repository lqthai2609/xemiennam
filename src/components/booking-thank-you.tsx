"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, Phone } from "lucide-react";
import { bookingReceiptSnapshot, parseBookingReceipt, subscribeBookingReceipt } from "@/lib/booking-receipt";
import { SITE_HOTLINE_TEL } from "@/lib/site-config";
const serverSnapshot = () => "";

export function BookingThankYou() {
  const raw = useSyncExternalStore(subscribeBookingReceipt, bookingReceiptSnapshot, serverSnapshot);
  const receipt = parseBookingReceipt(raw);
  return <section className="booking-thank-you" aria-labelledby="thank-you-title">
    <CheckCircle2 size={44} aria-hidden="true" />
    <h1 id="thank-you-title">{receipt ? "Cảm ơn bạn đã gửi yêu cầu" : "Cảm ơn bạn đã quan tâm Alo Đặt Xe"}</h1>
    {receipt ? <div role="status"><p>{receipt.kind === "quote" ? "Đã nhận yêu cầu báo giá" : "Đã nhận yêu cầu đặt xe"}. Mã yêu cầu: <strong>#{receipt.leadId}</strong>.</p><p>Chúng tôi sẽ liên hệ để xác nhận lịch xe và chi phí theo chuyến đi của bạn.</p><p>Bạn chưa cần gửi lại yêu cầu này.</p></div> : <p>Chưa có xác nhận gửi yêu cầu trong phiên này. Bạn có thể chọn hành trình hoặc liên hệ để được hỗ trợ.</p>}
    <div className="booking-thank-you-actions"><Link href="/" className="home-button home-button-primary">Về trang chủ</Link><a href={"tel:" + SITE_HOTLINE_TEL} className="home-button home-button-outline"><Phone size={17} /> Gọi tư vấn</a></div>
  </section>;
}
