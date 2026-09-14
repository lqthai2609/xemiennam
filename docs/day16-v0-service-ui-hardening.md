# Day 16 — v0 Service Detail UI hardening

Phạm vi: chỉ harden UI Service Detail đã có sau khi review bản v0.

- Làm rõ internal link Service → Route và Route × Vehicle.
- Bổ sung focus-visible cho keyboard navigation.
- Cho phép danh sách Route × Vehicle wrap tự nhiên trên mobile.
- Không thay đổi Service contract, Pricing V2, Route Engine, booking logic, API, database hoặc routing.
- Không thêm dữ liệu giả hoặc client-side fetch.

Acceptance cần xác minh qua CI và preview deployment trước khi merge.
