import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { sendBookingNotification } from "../src/lib/booking-notification.ts";

const booking = {
  bookingId: 123,
  fullName: "Nguyễn Văn A",
  phone: "0901234567",
  route: "TP.HCM – Vũng Tàu",
  vehicleType: "4–7 chỗ",
  departureDate: "2026-09-12",
  note: "Đón tại nhà",
};

const originalFetch = globalThis.fetch;
const originalAccessKey = process.env.WEB3FORMS_ACCESS_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAccessKey === undefined) delete process.env.WEB3FORMS_ACCESS_KEY;
  else process.env.WEB3FORMS_ACCESS_KEY = originalAccessKey;
});

test("không gọi Web3Forms khi chưa cấu hình access key", async () => {
  delete process.env.WEB3FORMS_ACCESS_KEY;
  globalThis.fetch = () => Promise.reject(new Error("fetch không được gọi"));

  assert.deepEqual(await sendBookingNotification(booking), {
    sent: false,
    reason: "missing_access_key",
  });
});

test("gửi đủ thông tin và số điện thoại dạng tel URI bằng FormData", async () => {
  process.env.WEB3FORMS_ACCESS_KEY = "test-access-key";
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "POST");
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("access_key"), "test-access-key");
    assert.equal(init.body.get("Họ tên"), booking.fullName);
    assert.equal(init.body.get("Số điện thoại"), booking.phone);
    assert.equal(init.body.get("Gọi ngay"), "tel:+84901234567");
    assert.equal(init.body.get("Tuyến quan tâm"), booking.route);
    assert.equal(init.body.get("Loại xe"), booking.vehicleType);
    assert.equal(init.body.get("Ngày đi"), booking.departureDate);
    assert.equal(init.body.get("Ghi chú"), booking.note);
    return Response.json({ success: true });
  };

  assert.deepEqual(await sendBookingNotification(booking), { sent: true });
});

test("giữ lỗi Web3Forms trong kết quả thay vì throw", async () => {
  process.env.WEB3FORMS_ACCESS_KEY = "test-access-key";
  globalThis.fetch = async () => Response.json(
    { success: false, message: "Invalid Access Key" },
    { status: 400 },
  );

  assert.deepEqual(await sendBookingNotification(booking), {
    sent: false,
    reason: "web3forms_400: Invalid Access Key",
  });
});
