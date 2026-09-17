"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FilePenLine,
  MapPinned,
  Plus,
  Route as RouteIcon,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import styles from "./route-pricing-admin-wizard.module.css";

type AdminLocation = {
  id: number;
  name: string;
  slug: string;
  type: string;
  serviceAreaStatus: string;
};

type AdminRoute = {
  id: string;
  slug: string;
  from: string;
  to: string;
  originLocationId?: number;
  destinationLocationId?: number;
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  fixedCount: number;
  contactCount: number;
  priceLabel: string;
};

type AdminVehicle = { id: string; name: string; type: string };
type Direction = "outbound" | "inbound";
type PriceMode = "fixed" | "contact" | "disabled";

type Draft = {
  originId: string;
  destinationId: string;
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  pricingDirection: Direction;
  vehicleId: string;
  packageKey: string;
  priceMode: PriceMode;
  priceAmount: string;
  updatedAt?: string;
};

const STORAGE_KEY = "gocar-admin-route-draft-v1";
const EMPTY_DRAFT: Draft = {
  originId: "",
  destinationId: "",
  outboundEnabled: true,
  inboundEnabled: false,
  pricingDirection: "outbound",
  vehicleId: "",
  packageKey: "one_way",
  priceMode: "contact",
  priceAmount: "",
};

const STEPS = ["Tuyến", "Chiều", "Xe", "Gói", "Giá", "Kiểm tra"];
const PACKAGE_LABELS: Record<string, string> = {
  one_way: "Một chiều",
  round_trip_day: "Khứ hồi trong ngày",
  "2d1n": "2 ngày 1 đêm",
  "3d2n": "3 ngày 2 đêm",
};

function money(value: string) {
  const amount = Number(value.replace(/\D/g, ""));
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("vi-VN").format(amount) + " đồng"
    : "Chưa nhập";
}

function formatSavedTime(value?: string) {
  if (!value) return "Chưa lưu";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function RoutePricingAdminWizard({
  locations,
  routes,
  vehicles,
}: {
  locations: AdminLocation[];
  routes: AdminRoute[];
  vehicles: AdminVehicle[];
}) {
  const [screen, setScreen] = useState<"home" | "wizard">("home");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const locationById = useMemo(
    () => new Map(locations.map((location) => [String(location.id), location])),
    [locations],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );
  const origin = locationById.get(draft.originId);
  const destination = locationById.get(draft.destinationId);
  const selectedVehicle = vehicleById.get(draft.vehicleId);
  const existingRoute = routes.find(
    (route) =>
      route.originLocationId === Number(draft.originId) &&
      route.destinationLocationId === Number(draft.destinationId),
  );

  const incompleteRoutes = routes.filter((route) => route.contactCount > 0).length;
  const enabledDirections = routes.reduce(
    (total, route) => total + Number(route.outboundEnabled) + Number(route.inboundEnabled),
    0,
  );

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function saveDraft() {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast.success("Đã lưu bản nháp trên thiết bị này");
  }

  function clearDraft() {
    if (!window.confirm("Xóa bản nháp đang làm trên thiết bị này?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setDraft(EMPTY_DRAFT);
    setStep(0);
    setScreen("home");
    toast.success("Đã xóa bản nháp");
  }

  function canContinue() {
    if (step === 0) {
      return Boolean(origin && destination && origin.id !== destination.id && !existingRoute);
    }
    if (step === 1) return draft.outboundEnabled || draft.inboundEnabled;
    if (step === 2) return Boolean(selectedVehicle);
    if (step === 3) return Boolean(PACKAGE_LABELS[draft.packageKey]);
    if (step === 4) {
      return draft.priceMode !== "fixed" || Number(draft.priceAmount.replace(/\D/g, "")) > 0;
    }
    return true;
  }

  function nextStep() {
    if (!canContinue()) return;
    if (step === STEPS.length - 1) {
      saveDraft();
      toast.message("Bản đầu tiên chưa gửi dữ liệu lên production");
      return;
    }
    setStep((current) => current + 1);
  }

  function startWizard() {
    setScreen("wizard");
    setStep(0);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandMark}>G</div>
        <div>
          <p className={styles.eyebrow}>Gocar VN</p>
          <h1>Quản trị tuyến và giá</h1>
        </div>
        <span className={styles.previewBadge}>Bản thử nghiệm an toàn</span>
      </header>

      {screen === "home" ? (
        <div className={styles.home}>
          <section className={styles.summaryGrid} aria-label="Tổng quan dữ liệu">
            <article className={styles.summaryCard}>
              <RouteIcon aria-hidden="true" />
              <strong>{routes.length}</strong>
              <span>Tuyến đang đọc từ backend</span>
            </article>
            <article className={styles.summaryCard}>
              <ArrowRight aria-hidden="true" />
              <strong>{enabledDirections}</strong>
              <span>Chiều tuyến đang bật</span>
            </article>
            <article className={styles.summaryCard}>
              <CircleDollarSign aria-hidden="true" />
              <strong>{incompleteRoutes}</strong>
              <span>Tuyến còn mức giá liên hệ</span>
            </article>
          </section>

          <section className={styles.actionSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Thao tác nhanh</p>
                <h2>Anh muốn làm gì?</h2>
              </div>
              {hydrated && draft.updatedAt && (
                <span className={styles.savedAt}>Đã lưu {formatSavedTime(draft.updatedAt)}</span>
              )}
            </div>

            <button className={styles.primaryAction} type="button" onClick={startWizard}>
              <span className={styles.actionIcon}><Plus aria-hidden="true" /></span>
              <span>
                <strong>Tạo tuyến mới</strong>
                <small>Wizard 6 bước, kiểm tra trùng trước khi lưu</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>

            {draft.updatedAt && (
              <button className={styles.secondaryAction} type="button" onClick={startWizard}>
                <span className={styles.actionIcon}><FilePenLine aria-hidden="true" /></span>
                <span>
                  <strong>Tiếp tục bản nháp</strong>
                  <small>{origin?.name || "Chưa chọn điểm đi"} → {destination?.name || "Chưa chọn điểm đến"}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            )}

            <button className={styles.disabledAction} type="button" disabled>
              <span className={styles.actionIcon}><BadgeDollarSign aria-hidden="true" /></span>
              <span>
                <strong>Cập nhật giá nhanh</strong>
                <small>Sẽ mở sau khi API ghi và audit log đạt nghiệm thu</small>
              </span>
              <ShieldCheck aria-hidden="true" />
            </button>
          </section>

          <section className={styles.safetyNote}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Không ghi vào production</strong>
              <p>Bản đầu tiên đọc dữ liệu thật và lưu bản nháp trên thiết bị. D35-10 và Long Thành PRELAUNCH vẫn được giữ nguyên.</p>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.wizard}>
          <nav className={styles.progress} aria-label="Tiến trình tạo tuyến">
            <div className={styles.progressLine}>
              <span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            </div>
            <ol>
              {STEPS.map((label, index) => (
                <li key={label} className={index <= step ? styles.progressActive : ""}>
                  <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
                  <small>{label}</small>
                </li>
              ))}
            </ol>
          </nav>

          <section className={styles.stepCard}>
            {step === 0 && (
              <>
                <StepTitle icon={<MapPinned />} kicker="Bước 1/6" title="Chọn điểm đầu và điểm cuối" />
                <div className={styles.fieldGrid}>
                  <label>
                    <span>Điểm đi</span>
                    <select value={draft.originId} onChange={(event) => updateDraft({ originId: event.target.value })}>
                      <option value="">Chọn Location</option>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.type}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Điểm đến</span>
                    <select value={draft.destinationId} onChange={(event) => updateDraft({ destinationId: event.target.value })}>
                      <option value="">Chọn Location</option>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.type}</option>)}
                    </select>
                  </label>
                </div>
                {origin && destination && origin.id === destination.id && (
                  <InlineWarning>Điểm đi và điểm đến phải khác nhau.</InlineWarning>
                )}
                {existingRoute && (
                  <InlineWarning>Tuyến này đã tồn tại với mã #{existingRoute.id}. Không tạo thêm Route Pair trùng.</InlineWarning>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <StepTitle icon={<RouteIcon />} kicker="Bước 2/6" title="Bật các chiều phục vụ" />
                <div className={styles.choiceStack}>
                  <ToggleCard checked={draft.outboundEnabled} onChange={(checked) => updateDraft({ outboundEnabled: checked })} title={`${origin?.name} → ${destination?.name}`} note="Chiều đi (outbound)" />
                  <ToggleCard checked={draft.inboundEnabled} onChange={(checked) => updateDraft({ inboundEnabled: checked })} title={`${destination?.name} → ${origin?.name}`} note="Chiều về (inbound), quản lý độc lập" />
                </div>
                {!draft.outboundEnabled && !draft.inboundEnabled && <InlineWarning>Phải bật ít nhất một chiều.</InlineWarning>}
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle icon={<ArrowRight />} kicker="Bước 3/6" title="Chọn chiều và loại xe cho giá đầu tiên" />
                <div className={styles.fieldGrid}>
                  <label>
                    <span>Chiều áp dụng</span>
                    <select value={draft.pricingDirection} onChange={(event) => updateDraft({ pricingDirection: event.target.value as Direction })}>
                      {draft.outboundEnabled && <option value="outbound">{origin?.name} → {destination?.name}</option>}
                      {draft.inboundEnabled && <option value="inbound">{destination?.name} → {origin?.name}</option>}
                    </select>
                  </label>
                  <label>
                    <span>Xe</span>
                    <select value={draft.vehicleId} onChange={(event) => updateDraft({ vehicleId: event.target.value })}>
                      <option value="">Chọn xe</option>
                      {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.type} · {vehicle.name}</option>)}
                    </select>
                  </label>
                </div>
                <p className={styles.helper}>Mỗi giá chỉ thuộc một chiều và một xe. Wizard không tự sao chép sang chiều khác.</p>
              </>
            )}

            {step === 3 && (
              <>
                <StepTitle icon={<Clock3 />} kicker="Bước 4/6" title="Chọn gói chuyến" />
                <div className={styles.radioGrid}>
                  {Object.entries(PACKAGE_LABELS).map(([key, label]) => (
                    <label key={key} className={draft.packageKey === key ? styles.radioSelected : ""}>
                      <input type="radio" name="package" value={key} checked={draft.packageKey === key} onChange={() => updateDraft({ packageKey: key })} />
                      <span><strong>{label}</strong><small>{key}</small></span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <StepTitle icon={<BadgeDollarSign />} kicker="Bước 5/6" title="Chọn trạng thái giá" />
                <div className={styles.segmented}>
                  {(["fixed", "contact", "disabled"] as PriceMode[]).map((mode) => (
                    <button key={mode} type="button" className={draft.priceMode === mode ? styles.segmentedActive : ""} onClick={() => updateDraft({ priceMode: mode, priceAmount: mode === "fixed" ? draft.priceAmount : "" })}>
                      {mode === "fixed" ? "Có giá" : mode === "contact" ? "Liên hệ" : "Không cung cấp"}
                    </button>
                  ))}
                </div>
                {draft.priceMode === "fixed" && (
                  <label className={styles.moneyField}>
                    <span>Giá cơ bản</span>
                    <input inputMode="numeric" pattern="[0-9]*" placeholder="Ví dụ: 1500000" value={draft.priceAmount} onChange={(event) => updateDraft({ priceAmount: event.target.value.replace(/\D/g, "") })} />
                    <strong>{money(draft.priceAmount)}</strong>
                  </label>
                )}
                <p className={styles.helper}>Không cho phép price=0. Phụ phí và modifier không được gộp vào base price.</p>
              </>
            )}

            {step === 5 && (
              <>
                <StepTitle icon={<ShieldCheck />} kicker="Bước 6/6" title="Kiểm tra trước khi lưu nháp" />
                <dl className={styles.reviewList}>
                  <ReviewRow label="Tuyến" value={`${origin?.name} ↔ ${destination?.name}`} />
                  <ReviewRow label="Chiều bật" value={[draft.outboundEnabled && "Đi", draft.inboundEnabled && "Về"].filter(Boolean).join(" và ")} />
                  <ReviewRow label="Tuple giá đầu tiên" value={`${draft.pricingDirection === "outbound" ? origin?.name : destination?.name} → ${draft.pricingDirection === "outbound" ? destination?.name : origin?.name}`} />
                  <ReviewRow label="Xe" value={`${selectedVehicle?.type} · ${selectedVehicle?.name}`} />
                  <ReviewRow label="Gói" value={PACKAGE_LABELS[draft.packageKey]} />
                  <ReviewRow label="Trạng thái" value={draft.priceMode === "fixed" ? money(draft.priceAmount) : draft.priceMode === "contact" ? "Liên hệ báo giá" : "Không cung cấp"} />
                </dl>
                <div className={styles.readOnlyBanner}>
                  <ShieldCheck aria-hidden="true" />
                  <p><strong>Chỉ lưu bản nháp.</strong> Chưa có yêu cầu nào được gửi tới WordPress hoặc production.</p>
                </div>
              </>
            )}
          </section>

          <footer className={styles.stickyFooter}>
            <button type="button" className={styles.backButton} onClick={() => step === 0 ? setScreen("home") : setStep((current) => current - 1)}>
              <ArrowLeft aria-hidden="true" /> {step === 0 ? "Trang chính" : "Quay lại"}
            </button>
            <button type="button" className={styles.saveButton} onClick={saveDraft}>
              <Save aria-hidden="true" /> Lưu nháp
            </button>
            <button type="button" className={styles.nextButton} disabled={!canContinue()} onClick={nextStep}>
              {step === STEPS.length - 1 ? "Hoàn tất bản nháp" : "Tiếp tục"}
              {step < STEPS.length - 1 && <ArrowRight aria-hidden="true" />}
            </button>
          </footer>

          {draft.updatedAt && (
            <button type="button" className={styles.clearDraft} onClick={clearDraft}>
              <Trash2 aria-hidden="true" /> Xóa bản nháp trên thiết bị
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function StepTitle({ icon, kicker, title }: { icon: React.ReactNode; kicker: string; title: string }) {
  return <div className={styles.stepTitle}><span>{icon}</span><div><p>{kicker}</p><h2>{title}</h2></div></div>;
}

function InlineWarning({ children }: { children: React.ReactNode }) {
  return <div className={styles.inlineWarning}><AlertTriangle aria-hidden="true" /><span>{children}</span></div>;
}

function ToggleCard({ checked, onChange, title, note }: { checked: boolean; onChange: (checked: boolean) => void; title: string; note: string }) {
  return <label className={checked ? styles.toggleChecked : ""}><span><strong>{title}</strong><small>{note}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
