"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CarFront, ChevronDown, MapPin } from "lucide-react";
import { JourneyPackageTabs } from "@/components/journey-package-tabs";
import { RouteBookingActions } from "@/components/route-booking-actions";
import { PromotionPrice } from "@/components/promotion-price";
import { getPublicRouteLabel } from "@/lib/public-location-label";
import { vehicleJourneyChoices, vehicleJourneyPrice, vehicleJourneyRows } from "@/lib/vehicle-category-journey";
import { routeJourneyHref } from "@/lib/route-journey-selection";
import { routeComboHref, type Route } from "@/types/route";
import { formatCurrencyVN } from "@/lib/wp-format";

export function VehicleJourneyPicker({ routes, vehicleType, vehicleSlug }: { routes: Route[]; vehicleType: string; vehicleSlug: string }) {
  const choices = useMemo(() => vehicleJourneyChoices(routes, vehicleType), [routes, vehicleType]);
  const [choiceKey, setChoiceKey] = useState("");
  const [packageKey, setPackageKey] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const choice = choices.find((item) => item.key === choiceKey);
  const rows = choice ? vehicleJourneyRows(choice.route, choice.direction, vehicleType) : [];
  const packageItems = Array.from(new Map(rows.map((row) => [row.packageKey, { key: row.packageKey, label: row.packageLabel }])).values());
  const row = rows.find((item) => item.packageKey === packageKey);
  const mode = vehicleJourneyPrice(row);
  const pickup = choice?.direction === "outbound" ? choice?.route.originLocation : choice?.route.destinationLocation;
  const dropoff = choice?.direction === "outbound" ? choice?.route.destinationLocation : choice?.route.originLocation;
  const airportContext = pickup?.type === "airport" ? "pickup_from_airport" : dropoff?.type === "airport" ? "dropoff_at_airport" : undefined;
  const price = mode === "fixed" && row ? formatCurrencyVN(row.price) : undefined;

  return <section className="vehicle-trip-picker" id="vehicle-journey" aria-labelledby="vehicle-journey-title">
    <header className="vehicle-page-section-heading"><p className="home-eyebrow">HÀNH TRÌNH CỦA BẠN</p><h2 id="vehicle-journey-title">Chọn chuyến đi và xem giá</h2><p><CarFront size={17} aria-hidden="true" /> Loại xe đang chọn: <strong>{vehicleType}</strong></p></header>
    <label className="route-direction-select"><span>Chiều chuyến đi</span><span className="route-direction-select-field">
      <select aria-label="Chọn chiều chuyến đi" value={choiceKey} onChange={(event) => {
        const next = choices.find((item) => item.key === event.target.value);
        setChoiceKey(event.target.value);
        const nextRows = next ? vehicleJourneyRows(next.route, next.direction, vehicleType) : [];
        const featured = next?.route.pricingV2?.[next.direction].featuredPackage;
        setPackageKey(nextRows.find((item) => item.packageKey === featured)?.packageKey ?? nextRows[0]?.packageKey ?? "");
        setPickupAddress(""); setDropoffAddress("");
      }}><option value="">Chọn hành trình bằng {vehicleType}</option>{choices.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <ChevronDown size={18} aria-hidden="true" /></span></label>
    {packageItems.length > 0 && <JourneyPackageTabs items={packageItems} value={packageKey} onChange={setPackageKey} />}
    {!choices.length ? <p className="vehicle-page-notice" role="status">Chưa có tuyến và gói được công bố cho {vehicleType}. <Link href="/lien-he">Liên hệ nhận tư vấn</Link> để xác nhận phương án phù hợp.</p> : !choice ? <p className="vehicle-page-notice">Chọn hành trình để xem các gói và giá tương ứng. Chỉ hiển thị những chiều đi đang được phục vụ.</p> : <>
      <div className="vehicle-trip-fields">
        <label>Điểm đón cụ thể<input className="form-control" maxLength={240} value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} placeholder={pickup?.type === "airport" ? pickup.name : "Địa chỉ đón theo hành trình"} disabled={pickup?.type === "airport"} /></label>
        <label>Điểm đến cụ thể<input className="form-control" maxLength={240} value={dropoffAddress} onChange={(event) => setDropoffAddress(event.target.value)} placeholder={dropoff?.type === "airport" ? dropoff.name : "Địa chỉ trả theo hành trình"} disabled={dropoff?.type === "airport"} /></label>
        {!airportContext && <label>Ngày giờ đi<input className="form-control" type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} /></label>}
      </div>
      {airportContext && <p className="vehicle-page-notice">Giờ bay và thông tin đón, tiễn sân bay được nhập theo luồng đặt chuyến hiện hành khi bạn tiếp tục.</p>}
      <div className="vehicle-trip-result" aria-live="polite">
        <div><span className="vehicle-page-kicker"><MapPin size={17} aria-hidden="true" /> {choice.label}</span><h3>{row?.packageLabel || "Chưa có gói phù hợp"} · {vehicleType}</h3>
          {mode === "disabled" ? <p>Tổ hợp này không được phục vụ. Vui lòng chọn hành trình hoặc gói khác; loại xe đang chọn được giữ nguyên.</p> : row?.promotionView ? <PromotionPrice view={row.promotionView} /> : <strong className="vehicle-trip-price">{price || row?.contactText || "Cần tư vấn"}</strong>}
          <p className="vehicle-trip-price-note">Giá theo tuyến, chiều, loại xe và gói đang chọn. Điểm đón trả, ngày giờ và chi phí cuối cùng được xác nhận trước chuyến đi.</p>
          {choice.route.notes.length > 0 && <details><summary>Điều kiện theo tuyến đang chọn</summary><ul>{choice.route.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>}
        </div>
        {mode !== "disabled" && row && <div className="vehicle-trip-actions"><RouteBookingActions key={choice.key + ":" + row.packageKey} route={getPublicRouteLabel(choice.route, " – ")} routeId={choice.route.id} displayRoute={choice.label} vehicleType={vehicleType} price={price} direction={choice.direction} packageKey={row.packageKey} packageLabel={row.packageLabel} pricingMode={mode} airportContext={airportContext} airportName={pickup?.type === "airport" ? pickup.name : dropoff?.type === "airport" ? dropoff.name : undefined} initialTrip={{ pickupAddress, dropoffAddress, departureAt }} />
          <Link href={routeJourneyHref(routeComboHref(choice.route, vehicleSlug), choice.direction, row.packageKey)}>Xem trang tuyến với đúng xe và gói</Link>
        </div>}
      </div>
    </>}
  </section>;
}
