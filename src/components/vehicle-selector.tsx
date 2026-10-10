"use client";

import { useEffect, useId, useRef, useState } from "react";
import { VehicleFactsSummary } from "./vehicle-facts-summary";
import { readVehicleSelectorResponse } from "@/lib/vehicle-selector-response";
import type { VehicleFitRequest, VehicleServiceLevel } from "@/types/vehicle-facts";
import type { VehicleSelectorResponse } from "@/types/vehicle-selector";

const fitLabels = {
  fits_confirmed_profile: "Phù hợp cấu hình đã xác nhận",
  needs_consultation: "Cần tư vấn",
  exceeds_confirmed_capacity: "Xe quá nhỏ: số khách vượt sức chứa đã xác nhận",
};
const reasonLabels = {
  confirmed_profile: "Cấu hình phù hợp số khách và hành lý đã nhập.",
  missing_facts: "Chưa đủ thông tin xe đã xác nhận.",
  invalid_request: "Thông tin khách hoặc hành lý chưa đầy đủ.",
  missing_luggage: "Chưa biết đầy đủ lượng hành lý.",
  passenger_limit: "Vui lòng tham khảo lựa chọn khác hoặc yêu cầu tư vấn xe.",
  unconfirmed_load: "Hành lý nằm ngoài cấu hình đã xác nhận hoặc chưa có cấu hình phù hợp.",
  service_level: "Cấp dịch vụ chưa được xác nhận phù hợp với yêu cầu.",
};

export function VehicleSelector({ selectedType = "", onSelectType, passengerValue, onPassengerChange }: {
  selectedType?: string;
  onSelectType?: (type: string) => void;
  passengerValue?: string;
  onPassengerChange?: (value: string) => void;
}) {
  const id = useId();
  const [localPassengers, setLocalPassengers] = useState("");
  const passengers = passengerValue ?? localPassengers;
  const [mode, setMode] = useState("unknown");
  const [level, setLevel] = useState("");
  const [bags, setBags] = useState<Record<string, string>>({ cabin: "", checked: "", weight: "", c0: "", c1: "", c2: "", k0: "", k1: "", k2: "" });
  const [result, setResult] = useState<{ key: string; data: VehicleSelectorResponse } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const key = JSON.stringify([passengers, mode, level, bags, selectedType]);
  const [previousKey, setPreviousKey] = useState(key);
  // External form fields may change without going through our input handlers.
  // Forget the previous result even if the customer later restores the same values.
  if (previousKey !== key) {
    setPreviousKey(key);
    setResult(null);
    setError(null);
    setPendingKey(null);
  }
  const data = result?.key === key ? result.data : null;
  const pending = pendingKey === key;
  const typeKey = (value: string) => value.replace(/^Xe\s+/i, "").trim().toLocaleLowerCase("vi");
  const items = data?.items.filter((item) => !selectedType || typeKey(item.type) === typeKey(selectedType)) || [];

  useEffect(() => () => { sequence.current++; active.current?.abort(); }, [key]);
  function invalidate() {
    sequence.current++;
    active.current?.abort();
    setResult(null); setError(null); setPendingKey(null);
  }
  function setBag(name: string, value: string) { invalidate(); setBags((previous) => ({ ...previous, [name]: value })); }
  async function check() {
    invalidate();
    const integer = (value: string, min: number, max: number) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
    if (!integer(passengers, 1, 100)) { setError({ key, text: "Nhập số hành khách từ 1 đến 100, không gồm tài xế." }); return; }
    const request: VehicleFitRequest = { passengers: Number(passengers), luggage: null, service_level: (level || null) as VehicleServiceLevel | null };
    if (mode === "none") request.luggage = { cabin_bags: 0, checked_bags: 0, cabin_max_cm: null, checked_max_cm: null, total_luggage_kg: null };
    if (mode === "details") {
      const valid = integer(bags.cabin, 0, 100) && integer(bags.checked, 0, 100) &&
        (Number(bags.cabin) === 0 || ["c0", "c1", "c2"].every((name) => integer(bags[name], 1, 300))) &&
        (Number(bags.checked) === 0 || ["k0", "k1", "k2"].every((name) => integer(bags[name], 1, 300))) &&
        ((Number(bags.cabin) === 0 && Number(bags.checked) === 0) || integer(bags.weight, 1, 5000));
      if (!valid) { setError({ key, text: "Cần đủ số kiện, ba kích thước lớn nhất của mỗi nhóm có hành lý và tổng khối lượng. Nếu chưa biết, chọn “Chưa rõ, cần tư vấn”." }); return; }
      request.luggage = { cabin_bags: Number(bags.cabin), checked_bags: Number(bags.checked), cabin_max_cm: Number(bags.cabin) ? [Number(bags.c0), Number(bags.c1), Number(bags.c2)] : null, checked_max_cm: Number(bags.checked) ? [Number(bags.k0), Number(bags.k1), Number(bags.k2)] : null, total_luggage_kg: Number(bags.cabin) + Number(bags.checked) ? Number(bags.weight) : null };
    }
    const controller = new AbortController(); active.current = controller;
    const current = ++sequence.current;
    setPendingKey(key);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/vehicle-suggestions", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal: controller.signal });
      if (!response.ok) throw new Error("consultation");
      const body = readVehicleSelectorResponse(await response.json());
      if (!body) throw new Error("contract");
      if (current === sequence.current) setResult({ key, data: body });
    } catch {
      if (current === sequence.current) setError({ key, text: "Chưa kiểm tra được thông tin xe. Cần tư vấn; bạn vẫn có thể gửi yêu cầu." });
    } finally {
      clearTimeout(timeout);
      if (current === sequence.current) setPendingKey(null);
    }
  }

  return <section className="vehicle-selector" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Kiểm tra xe theo số khách và hành lý</h2>
    <p>Thông tin đã xác nhận thuộc từng cấu hình xe. Nhãn số chỗ không phải số hành khách có thể chở.</p>
    <div className="vehicle-selector-fields">
      <label>Số hành khách (không gồm tài xế)<input type="number" min="1" max="100" step="1" value={passengers} onChange={(event) => { invalidate(); setLocalPassengers(event.target.value); onPassengerChange?.(event.target.value); }} /></label>
      <label>Hành lý<select aria-label="Hành lý" value={mode} onChange={(event) => { invalidate(); setMode(event.target.value); }}><option value="unknown">Chưa rõ, cần tư vấn</option><option value="none">Không mang hành lý</option><option value="details">Nhập thông tin hành lý</option></select></label>
      <label>Cấp dịch vụ mong muốn<select aria-label="Cấp dịch vụ mong muốn" value={level} onChange={(event) => { invalidate(); setLevel(event.target.value); }}><option value="">Không yêu cầu, cần tư vấn</option><option value="standard">Tiêu chuẩn</option><option value="business">Thương gia</option><option value="premium">Cao cấp</option></select></label>
    </div>
    {mode === "details" && <fieldset className="vehicle-selector-luggage"><legend>Thông tin hành lý</legend><p>Nhập kích thước lớn nhất từng nhóm, theo thứ tự dài, rộng, cao; không tự xoay kiện. Đồ cồng kềnh hoặc không biết kích thước: chọn cần tư vấn.</p><div className="vehicle-selector-fields">{([['cabin', 'Nhóm xách tay', 'c'], ['checked', 'Nhóm ký gửi', 'k']] as const).map(([name, label, prefix]) => <div className="vehicle-selector-bags" key={name}><label>Số kiện {label.toLowerCase()}<input type="number" min="0" max="100" step="1" value={bags[name]} onChange={(event) => setBag(name, event.target.value)} /></label>{bags[name] !== "0" && ["Dài", "Rộng", "Cao"].map((dimension, index) => <label key={dimension}>{dimension} {label.toLowerCase()} (cm)<input type="number" min="1" max="300" step="1" value={bags[`${prefix}${index}`]} onChange={(event) => setBag(`${prefix}${index}`, event.target.value)} /></label>)}</div>)}<label>Tổng khối lượng hành lý (kg)<input type="number" min="1" max="5000" step="1" value={bags.weight} onChange={(event) => setBag("weight", event.target.value)} /></label></div></fieldset>}
    <button type="button" className="vehicle-selector-check" onClick={check} disabled={pending}>{pending ? "Đang kiểm tra..." : "Kiểm tra xe"}</button>
    <div aria-live="polite" aria-busy={pending}>
      {error?.key === key && <p role="alert">{error.text}</p>}
      {data && items.length === 0 && <p>Cần tư vấn: chưa có thông tin xe cho lựa chọn này. Bạn vẫn có thể gửi yêu cầu.</p>}
      {data && <div className="vehicle-selector-results">{items.map((item, index) => <article key={item.id} className={`vehicle-selector-result is-${item.fit.status}`}><h3>{item.type} · Cấu hình {index + 1}</h3><strong role={item.fit.status === "exceeds_confirmed_capacity" ? "alert" : undefined}>{fitLabels[item.fit.status]}</strong><p>{reasonLabels[item.fit.reason]}</p><VehicleFactsSummary facts={item.facts} />{onSelectType && item.fit.status !== "exceeds_confirmed_capacity" && <button type="button" onClick={() => { invalidate(); onSelectType(item.type); }}>Chọn loại xe để tư vấn</button>}</article>)}</div>}
    </div>
    <p>Thiếu thông tin không cản trở gửi yêu cầu tư vấn. Khi gửi yêu cầu, vui lòng ghi nhu cầu khách và hành lý vào phần ghi chú. Kết quả kiểm tra không xác nhận còn xe hoặc đặt chuyến thành công.</p>
  </section>;
}
