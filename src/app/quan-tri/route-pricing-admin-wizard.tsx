"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Check,
  ChevronRight,
  FileClock,
  History,
  LogOut,
  MapPinned,
  Plus,
  RefreshCcw,
  Route as RouteIcon,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import styles from "./route-pricing-admin-wizard.module.css";

type AdminLocation = {
  id: number;
  name: string;
  slug: string;
  type: string;
  serviceAreaStatus: string;
  locked: boolean;
};

type Direction = "outbound" | "inbound";
type PriceMode = "fixed" | "contact" | "disabled";
type Operation = "create_route" | "update_pricing" | "archive_route" | "delete_route";
type Screen = "home" | "create" | "pricing" | "manage" | "audit";

type PricingRow = {
  direction: Direction;
  vehicleId: string;
  packageKey: string;
  mode: PriceMode;
  price?: number;
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
  postStatus?: string;
  backendVersion?: string;
  locked: boolean;
  pricingRows: PricingRow[];
};

type AdminVehicle = { id: string; name: string; type: string };

type DraftPayload = {
  operation: Operation;
  routeId?: number;
  originLocationId?: number;
  destinationLocationId?: number;
  outboundEnabled?: boolean;
  inboundEnabled?: boolean;
  pricingDirection?: Direction;
  vehicleId?: number;
  packageKey?: string;
  priceMode?: PriceMode;
  priceAmount?: number;
  baseVersion?: string;
  reason: string;
};

type Validation = { valid: boolean; errors: string[]; warnings: string[] };
type ServerDraft = {
  id: number;
  status: "draft" | "pending" | "publish" | "trash";
  modified: string;
  version: number;
  reason: string;
  payload: DraftPayload;
  validation?: Validation | null;
  auditId?: number;
};
type AuditRow = {
  id: number;
  operation: string;
  routeId: number;
  timestamp: string;
  reason: string;
  actor?: { id: number; name: string };
};

type CreateDraft = {
  originId: string;
  destinationId: string;
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  pricingDirection: Direction;
  vehicleId: string;
  packageKey: string;
  priceMode: PriceMode;
  priceAmount: string;
  reason: string;
  updatedAt?: string;
};

type PriceDraft = {
  routeId: string;
  direction: Direction;
  vehicleId: string;
  packageKey: string;
  priceMode: PriceMode;
  priceAmount: string;
  reason: string;
};

type DirectAction = "create" | "pricing" | "delete";
type DirectResult = { routeId: number; auditId: number; deleted: boolean; public: boolean; message: string };

const STORAGE_KEY = "alo-dat-xe-admin-route-draft-v3";
const EMPTY_CREATE: CreateDraft = {
  originId: "",
  destinationId: "",
  outboundEnabled: true,
  inboundEnabled: false,
  pricingDirection: "outbound",
  vehicleId: "",
  packageKey: "one_way",
  priceMode: "contact",
  priceAmount: "",
  reason: "",
};
const EMPTY_PRICE: PriceDraft = {
  routeId: "",
  direction: "outbound",
  vehicleId: "",
  packageKey: "one_way",
  priceMode: "contact",
  priceAmount: "",
  reason: "",
};

const STEPS = ["Tuyến", "Chiều", "Xe", "Gói", "Giá", "Kiểm tra"];
const PACKAGE_LABELS: Record<string, string> = {
  one_way: "Một chiều",
  round_trip_day: "Khứ hồi trong ngày",
  "2d1n": "2 ngày 1 đêm",
  "3d2n": "3 ngày 2 đêm",
};

function money(value: string | number | undefined) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("vi-VN").format(amount) + " đồng"
    : "Chưa nhập";
}

function formatTime(value?: string) {
  if (!value) return "Chưa lưu";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function modeLabel(mode: PriceMode) {
  if (mode === "fixed") return "Có giá";
  if (mode === "disabled") return "Không cung cấp";
  return "Liên hệ";
}

async function adminFetch<T>(path: string, csrf: string, init?: { method?: string; body?: unknown }) {
  const method = init?.method ?? "GET";
  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: {
      ...(method !== "GET" ? { "Content-Type": "application/json", "X-Gocar-Csrf": csrf } : {}),
      ...(method !== "GET" ? { "X-Gocar-Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok) throw new Error(data?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
  return data as T;
}

export function RoutePricingAdminWizard({
  locations,
  routes,
  vehicles,
  actor,
  csrf,
}: {
  locations: AdminLocation[];
  routes: AdminRoute[];
  vehicles: AdminVehicle[];
  actor: { id: number; name: string; canPublish: boolean; contract: number };
  csrf: string;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_CREATE);
  const [priceDraft, setPriceDraft] = useState<PriceDraft>(EMPTY_PRICE);
  const [manageRouteId, setManageRouteId] = useState("");
  const [manageReason, setManageReason] = useState("");
  const [serverDrafts, setServerDrafts] = useState<ServerDraft[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [activeServerDraft, setActiveServerDraft] = useState<ServerDraft | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [directConfirm, setDirectConfirm] = useState<DirectAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [routeRows, setRouteRows] = useState(routes);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setDraft({ ...EMPTY_CREATE, ...JSON.parse(saved) });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void loadActivity();
    // csrf is stable for the authenticated page lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrf]);

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
  const existingRoute = routeRows.find((route) => {
    const a = Number(draft.originId);
    const b = Number(draft.destinationId);
    return (
      (route.originLocationId === a && route.destinationLocationId === b) ||
      (route.originLocationId === b && route.destinationLocationId === a)
    );
  });
  const selectedPriceRoute = routeRows.find((route) => route.id === priceDraft.routeId);
  const selectedManageRoute = routeRows.find((route) => route.id === manageRouteId);
  const currentPrice = selectedPriceRoute?.pricingRows.find(
    (row) =>
      row.direction === priceDraft.direction &&
      row.vehicleId === priceDraft.vehicleId &&
      row.packageKey === priceDraft.packageKey,
  );

  const incompleteRoutes = routeRows.filter((route) => route.contactCount > 0).length;
  const enabledDirections = routeRows.reduce(
    (total, route) => total + Number(route.outboundEnabled) + Number(route.inboundEnabled),
    0,
  );
  const pendingDrafts = serverDrafts.filter((item) => item.status === "pending").length;

  async function loadActivity() {
    try {
      const [draftRows, audits, latestRoutes] = await Promise.all([
        adminFetch<ServerDraft[]>("drafts", csrf),
        adminFetch<AuditRow[]>("audit", csrf),
        adminFetch<AdminRoute[]>("routes", csrf),
      ]);
      setServerDrafts(draftRows);
      setAuditRows(audits);
      setRouteRows(latestRoutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu quản trị.");
    }
  }

  function updateDraft(patch: Partial<CreateDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setActiveServerDraft(null);
    setDirectConfirm(null);
  }

  function updatePriceDraft(patch: Partial<PriceDraft>) {
    setPriceDraft((current) => ({ ...current, ...patch }));
    setActiveServerDraft(null);
    setDirectConfirm(null);
  }

  function saveDeviceDraft() {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast.success("Đã lưu tạm trên thiết bị");
  }

  function clearDeviceDraft() {
    if (!window.confirm("Xóa bản nháp đang làm trên thiết bị này?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setDraft(EMPTY_CREATE);
    setActiveServerDraft(null);
    setStep(0);
    setScreen("home");
    toast.success("Đã xóa bản nháp trên thiết bị");
  }

  function createCanContinue() {
    if (step === 0) {
      return Boolean(
        origin && destination && origin.id !== destination.id && !origin.locked && !destination.locked && !existingRoute,
      );
    }
    if (step === 1) return draft.outboundEnabled || draft.inboundEnabled;
    if (step === 2) return Boolean(selectedVehicle);
    if (step === 3) return Boolean(PACKAGE_LABELS[draft.packageKey]);
    if (step === 4) return draft.priceMode !== "fixed" || Number(draft.priceAmount) > 0;
    if (step === 5) return draft.reason.trim().length >= 3;
    return true;
  }

  function createPayload(): DraftPayload {
    return {
      operation: "create_route",
      originLocationId: Number(draft.originId),
      destinationLocationId: Number(draft.destinationId),
      outboundEnabled: draft.outboundEnabled,
      inboundEnabled: draft.inboundEnabled,
      pricingDirection: draft.pricingDirection,
      vehicleId: Number(draft.vehicleId),
      packageKey: draft.packageKey,
      priceMode: draft.priceMode,
      priceAmount: draft.priceMode === "fixed" ? Number(draft.priceAmount) : 0,
      reason: draft.reason.trim(),
    };
  }

  function pricingPayload(): DraftPayload {
    return {
      operation: "update_pricing",
      routeId: Number(priceDraft.routeId),
      pricingDirection: priceDraft.direction,
      vehicleId: Number(priceDraft.vehicleId),
      packageKey: priceDraft.packageKey,
      priceMode: priceDraft.priceMode,
      priceAmount: priceDraft.priceMode === "fixed" ? Number(priceDraft.priceAmount) : 0,
      baseVersion: selectedPriceRoute?.backendVersion,
      reason: priceDraft.reason.trim(),
    };
  }

  async function saveAndSubmit(payload: DraftPayload, existingId?: number) {
    setBusy(true);
    try {
      const saved = await adminFetch<ServerDraft>("drafts", csrf, {
        method: "POST",
        body: { id: existingId, payload, reason: payload.reason },
      });
      const validation = await adminFetch<Validation>(`drafts/${saved.id}/validate`, csrf, {
        method: "POST",
        body: {},
      });
      if (!validation.valid) {
        setActiveServerDraft({ ...saved, validation });
        toast.error(validation.errors[0] || "Bản nháp chưa hợp lệ.");
        return;
      }
      const submitted = await adminFetch<ServerDraft>(`drafts/${saved.id}/submit`, csrf, {
        method: "POST",
        body: {},
      });
      setActiveServerDraft(submitted);
      await loadActivity();
      toast.success(actor.canPublish ? "Đã gửi duyệt. Anh có thể áp dụng ngay." : "Đã gửi người có quyền phê duyệt.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu bản nháp.");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft(id: number) {
    if (!window.confirm("Áp dụng thay đổi này vào backend production?")) return;
    setBusy(true);
    try {
      const result = await adminFetch<{ message: string }>(`drafts/${id}/publish`, csrf, {
        method: "POST",
        body: {},
      });
      toast.success(result.message);
      window.localStorage.removeItem(STORAGE_KEY);
      setDraft(EMPTY_CREATE);
      setPriceDraft(EMPTY_PRICE);
      setActiveServerDraft(null);
      await loadActivity();
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể áp dụng thay đổi.");
    } finally {
      setBusy(false);
    }
  }

  async function applyDirect(payload: DraftPayload) {
    if (!actor.canPublish) return;
    setBusy(true);
    try {
      const result = await adminFetch<DirectResult>("apply", csrf, {
        method: "POST",
        body: payload,
      });
      toast.success(result.message);
      window.localStorage.removeItem(STORAGE_KEY);
      setDraft(EMPTY_CREATE);
      setPriceDraft(EMPTY_PRICE);
      setManageRouteId("");
      setManageReason("");
      setActiveServerDraft(null);
      setDirectConfirm(null);
      await loadActivity();
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể ghi trực tiếp vào backend.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteServerDraft(item: ServerDraft) {
    if (item.status === "publish") return;
    setBusy(true);
    try {
      await adminFetch<{ deleted: boolean; id: number }>(`drafts/${item.id}`, csrf, { method: "DELETE" });
      if (activeServerDraft?.id === item.id) setActiveServerDraft(null);
      setDeleteConfirmId(null);
      await loadActivity();
      toast.success(`Đã xóa bản nháp máy chủ #${item.id}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa bản nháp máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveRoute() {
    if (!selectedManageRoute || manageReason.trim().length < 3) return;
    const payload: DraftPayload = {
      operation: "archive_route",
      routeId: Number(selectedManageRoute.id),
      reason: manageReason.trim(),
    };
    await saveAndSubmit(payload, activeServerDraft?.id);
  }

  function deleteRoutePayload(): DraftPayload | null {
    if (!selectedManageRoute || manageReason.trim().length < 3) return null;
    return {
      operation: "delete_route",
      routeId: Number(selectedManageRoute.id),
      baseVersion: selectedManageRoute.backendVersion,
      reason: manageReason.trim(),
    };
  }

  function resumeServerDraft(item: ServerDraft) {
    setActiveServerDraft(item);
    if (item.payload.operation === "create_route") {
      setDraft({
        ...EMPTY_CREATE,
        originId: String(item.payload.originLocationId ?? ""),
        destinationId: String(item.payload.destinationLocationId ?? ""),
        outboundEnabled: Boolean(item.payload.outboundEnabled),
        inboundEnabled: Boolean(item.payload.inboundEnabled),
        pricingDirection: item.payload.pricingDirection ?? "outbound",
        vehicleId: String(item.payload.vehicleId ?? ""),
        packageKey: item.payload.packageKey ?? "one_way",
        priceMode: item.payload.priceMode ?? "contact",
        priceAmount: item.payload.priceAmount ? String(item.payload.priceAmount) : "",
        reason: item.reason || item.payload.reason || "",
      });
      setStep(5);
      setScreen("create");
    } else if (item.payload.operation === "update_pricing") {
      setPriceDraft({
        routeId: String(item.payload.routeId ?? ""),
        direction: item.payload.pricingDirection ?? "outbound",
        vehicleId: String(item.payload.vehicleId ?? ""),
        packageKey: item.payload.packageKey ?? "one_way",
        priceMode: item.payload.priceMode ?? "contact",
        priceAmount: item.payload.priceAmount ? String(item.payload.priceAmount) : "",
        reason: item.reason || item.payload.reason || "",
      });
      setScreen("pricing");
    } else {
      setManageRouteId(String(item.payload.routeId ?? ""));
      setManageReason(item.reason || item.payload.reason || "");
      setScreen("manage");
    }
  }

  async function rollbackAudit(row: AuditRow) {
    if (!actor.canPublish) return;
    const reason = window.prompt(`Lý do rollback audit #${row.id}:`, "Khôi phục phiên bản trước");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await adminFetch(`audit/${row.id}/rollback`, csrf, { method: "POST", body: { reason } });
      toast.success("Đã rollback và tạo audit mới.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể rollback.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.reload();
  }

  function openScreen(next: Screen) {
    setActiveServerDraft(null);
    setDirectConfirm(null);
    setScreen(next);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandMark}>A</div>
        <div><p className={styles.eyebrow}>ALO ĐẶT XE</p><h1>Quản trị tuyến và giá</h1></div>
        <div className={styles.userMenu}><span>{actor.name}</span><button type="button" onClick={logout} aria-label="Đăng xuất"><LogOut aria-hidden="true" /></button></div>
      </header>

      {screen === "home" && (
        <div className={styles.home}>
          <section className={styles.summaryGrid} aria-label="Tổng quan dữ liệu">
            <SummaryCard icon={<RouteIcon />} value={routeRows.length} label="Tuyến từ backend" />
            <SummaryCard icon={<ArrowRight />} value={enabledDirections} label="Chiều đang bật" />
            <SummaryCard icon={<FileClock />} value={pendingDrafts} label="Bản chờ duyệt" />
          </section>
          <section className={styles.actionSection}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Thao tác</p><h2>Anh muốn làm gì?</h2></div>{hydrated && draft.updatedAt && <span className={styles.savedAt}>Nháp thiết bị {formatTime(draft.updatedAt)}</span>}</div>
            <ActionButton primary icon={<Plus />} title="Tạo tuyến mới" note="Lưu nháp hoặc ghi thẳng vào backend" onClick={() => openScreen("create")} />
            <ActionButton icon={<BadgeDollarSign />} title="Cập nhật giá" note="Tìm tuyến và lưu nháp hoặc áp dụng ngay" onClick={() => openScreen("pricing")} />
            <ActionButton icon={<RouteIcon />} title="Quản lý tuyến" note="Tìm, tạm ngừng hoặc xóa tuyến trực tiếp" onClick={() => openScreen("manage")} />
            <ActionButton icon={<History />} title="Lịch sử và rollback" note={`${auditRows.length} thay đổi gần nhất`} onClick={() => openScreen("audit")} />
          </section>
          {serverDrafts.filter((item) => item.status !== "publish" && item.status !== "trash").length > 0 && (
            <section className={styles.serverDrafts}>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Bản nháp máy chủ</p><h2>Việc đang xử lý</h2></div><button type="button" onClick={loadActivity}><RefreshCcw aria-hidden="true" /> Làm mới</button></div>
              {serverDrafts.filter((item) => item.status !== "publish" && item.status !== "trash").slice(0, 5).map((item) => (
                <div className={styles.draftRowShell} key={item.id}>
                  <button type="button" className={styles.draftRow} onClick={() => resumeServerDraft(item)}><span><strong>#{item.id} · {operationLabel(item.payload.operation)}</strong><small>{item.status === "pending" ? "Chờ duyệt" : "Bản nháp"} · {formatTime(item.modified)}</small></span><ChevronRight aria-hidden="true" /></button>
                  {deleteConfirmId === item.id ? (
                    <div className={styles.draftDeleteConfirm}>
                      <button type="button" disabled={busy} onClick={() => setDeleteConfirmId(null)}>Hủy</button>
                      <button type="button" disabled={busy} onClick={() => void deleteServerDraft(item)}>Xác nhận xóa</button>
                    </div>
                  ) : (
                    <button type="button" className={styles.draftDelete} disabled={busy} aria-label={`Xóa bản nháp máy chủ #${item.id}`} onClick={() => setDeleteConfirmId(item.id)}><Trash2 aria-hidden="true" /></button>
                  )}
                </div>
              ))}
            </section>
          )}
          <section className={styles.safetyNote}><ShieldCheck aria-hidden="true" /><div><strong>Đã bật ghi có kiểm soát</strong><p>D35-10 và Long Thành PRELAUNCH bị khóa ở cả giao diện lẫn backend. Giá bằng 0 và sao chép chéo hai chiều đều bị từ chối.</p></div></section>
          <p className={styles.mutedStat}>{incompleteRoutes} tuyến hiện còn mức giá liên hệ.</p>
        </div>
      )}

      {screen === "create" && (
        <div className={styles.wizard}>
          <WizardProgress step={step} />
          <section className={styles.stepCard}>
            {step === 0 && <><StepTitle icon={<MapPinned />} kicker="Bước 1/6" title="Chọn điểm đầu và điểm cuối" /><div className={styles.fieldGrid}><LocationSelect label="Điểm đi" value={draft.originId} locations={locations} onChange={(originId) => updateDraft({ originId })} /><LocationSelect label="Điểm đến" value={draft.destinationId} locations={locations} onChange={(destinationId) => updateDraft({ destinationId })} /></div>{origin && destination && origin.id === destination.id && <InlineWarning>Điểm đi và điểm đến phải khác nhau.</InlineWarning>}{(origin?.locked || destination?.locked) && <InlineWarning>Long Thành đang PRELAUNCH nên chưa thể thao tác.</InlineWarning>}{existingRoute && <InlineWarning>Route Pair đã tồn tại với mã #{existingRoute.id}; không được tạo bản ghi trùng hoặc đảo chiều.</InlineWarning>}</>}
            {step === 1 && <><StepTitle icon={<RouteIcon />} kicker="Bước 2/6" title="Bật các chiều phục vụ" /><div className={styles.choiceStack}><ToggleCard checked={draft.outboundEnabled} onChange={(outboundEnabled) => updateDraft({ outboundEnabled })} title={`${origin?.name} → ${destination?.name}`} note="Chiều đi (outbound)" /><ToggleCard checked={draft.inboundEnabled} onChange={(inboundEnabled) => updateDraft({ inboundEnabled })} title={`${destination?.name} → ${origin?.name}`} note="Chiều về (inbound), quản lý độc lập" /></div>{!draft.outboundEnabled && !draft.inboundEnabled && <InlineWarning>Phải bật ít nhất một chiều.</InlineWarning>}</>}
            {step === 2 && <><StepTitle icon={<ArrowRight />} kicker="Bước 3/6" title="Chọn chiều và loại xe cho giá đầu tiên" /><div className={styles.fieldGrid}><DirectionSelect value={draft.pricingDirection} outbound={draft.outboundEnabled} inbound={draft.inboundEnabled} from={origin?.name} to={destination?.name} onChange={(pricingDirection) => updateDraft({ pricingDirection })} /><VehicleSelect value={draft.vehicleId} vehicles={vehicles} onChange={(vehicleId) => updateDraft({ vehicleId })} /></div><p className={styles.helper}>Mỗi giá thuộc đúng một chiều và một xe; hệ thống không sao chép sang chiều còn lại.</p></>}
            {step === 3 && <PackageStep value={draft.packageKey} onChange={(packageKey) => updateDraft({ packageKey })} />}
            {step === 4 && <PriceStep mode={draft.priceMode} amount={draft.priceAmount} onMode={(priceMode) => updateDraft({ priceMode, priceAmount: priceMode === "fixed" ? draft.priceAmount : "" })} onAmount={(priceAmount) => updateDraft({ priceAmount })} />}
            {step === 5 && <><StepTitle icon={<ShieldCheck />} kicker="Bước 6/6" title="Kiểm tra và lưu" /><dl className={styles.reviewList}><ReviewRow label="Tuyến" value={`${origin?.name} ↔ ${destination?.name}`} /><ReviewRow label="Chiều bật" value={[draft.outboundEnabled && "Đi", draft.inboundEnabled && "Về"].filter(Boolean).join(" và ")} /><ReviewRow label="Xe" value={`${selectedVehicle?.type} · ${selectedVehicle?.name}`} /><ReviewRow label="Gói" value={PACKAGE_LABELS[draft.packageKey]} /><ReviewRow label="Trạng thái" value={draft.priceMode === "fixed" ? money(draft.priceAmount) : modeLabel(draft.priceMode)} /></dl><ReasonField value={draft.reason} onChange={(reason) => updateDraft({ reason })} /><div className={styles.readOnlyBanner}><ShieldCheck aria-hidden="true" /><p><strong>Gửi duyệt</strong> sẽ tạo bản nháp thao tác. <strong>Ghi thẳng backend</strong> sẽ bỏ qua hàng chờ nhưng tuyến mới vẫn ở trạng thái nháp WordPress, chưa tạo URL công khai.</p></div><WorkflowStatus draft={activeServerDraft} canPublish={actor.canPublish} busy={busy} onPublish={publishDraft} />{directConfirm === "create" && <DirectConfirmation busy={busy} title="Ghi tuyến thẳng vào backend?" detail="Tuyến được tạo ngay trong WordPress và audit được lưu. Tuyến chưa được công khai." onCancel={() => setDirectConfirm(null)} onConfirm={() => void applyDirect(createPayload())} />}</>}
          </section>
          <footer className={`${styles.stickyFooter} ${step === 5 && actor.canPublish ? styles.stickyFooterFinal : ""}`}><button type="button" className={styles.backButton} onClick={() => step === 0 ? setScreen("home") : setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> {step === 0 ? "Trang chính" : "Quay lại"}</button><button type="button" className={styles.saveButton} onClick={saveDeviceDraft}><Save aria-hidden="true" /> Lưu tạm</button>{step === 5 && actor.canPublish && <button type="button" className={styles.directButton} disabled={!createCanContinue() || busy} onClick={() => setDirectConfirm("create")}><ShieldCheck aria-hidden="true" /> Ghi thẳng backend</button>}<button type="button" className={styles.nextButton} disabled={!createCanContinue() || busy || activeServerDraft?.status === "pending"} onClick={() => step === 5 ? void saveAndSubmit(createPayload(), activeServerDraft?.id) : setStep((current) => current + 1)}>{step === 5 ? <><Send aria-hidden="true" /> Lưu và gửi duyệt</> : <>Tiếp tục <ArrowRight aria-hidden="true" /></>}</button></footer>
          {draft.updatedAt && <button type="button" className={styles.clearDraft} onClick={clearDeviceDraft}><Trash2 aria-hidden="true" /> Xóa nháp trên thiết bị</button>}
        </div>
      )}

      {screen === "pricing" && (
        <AdminPanel onBack={() => setScreen("home")} kicker="Pricing V2" title="Cập nhật giá một tổ hợp">
          <div className={styles.fieldStack}>
            <RouteCombobox label="Tìm tuyến" value={priceDraft.routeId} routes={routeRows} onChange={(routeId) => updatePriceDraft({ routeId })} />
            {selectedPriceRoute?.locked && <InlineWarning>Tuyến này thuộc phạm vi đang khóa và không thể cập nhật.</InlineWarning>}
            {selectedPriceRoute && <div className={styles.fieldGrid}><DirectionSelect value={priceDraft.direction} outbound={selectedPriceRoute.outboundEnabled} inbound={selectedPriceRoute.inboundEnabled} from={selectedPriceRoute.from} to={selectedPriceRoute.to} onChange={(direction) => updatePriceDraft({ direction })} /><VehicleSelect value={priceDraft.vehicleId} vehicles={vehicles} onChange={(vehicleId) => updatePriceDraft({ vehicleId })} /></div>}
            <PackageSelect value={priceDraft.packageKey} onChange={(packageKey) => updatePriceDraft({ packageKey })} />
            {currentPrice && <div className={styles.currentValue}><span>Giá hiện tại</span><strong>{currentPrice.mode === "fixed" ? money(currentPrice.price) : modeLabel(currentPrice.mode)}</strong></div>}
            <PriceStep mode={priceDraft.priceMode} amount={priceDraft.priceAmount} onMode={(priceMode) => updatePriceDraft({ priceMode, priceAmount: priceMode === "fixed" ? priceDraft.priceAmount : "" })} onAmount={(priceAmount) => updatePriceDraft({ priceAmount })} compact />
            <ReasonField value={priceDraft.reason} onChange={(reason) => updatePriceDraft({ reason })} />
            <div className={styles.actionPair}><button type="button" className={styles.panelPrimary} disabled={busy || !selectedPriceRoute || selectedPriceRoute.locked || !priceDraft.vehicleId || !priceDraft.reason.trim() || (priceDraft.priceMode === "fixed" && Number(priceDraft.priceAmount) <= 0) || activeServerDraft?.status === "pending"} onClick={() => void saveAndSubmit(pricingPayload(), activeServerDraft?.id)}><Send aria-hidden="true" /> Lưu và gửi duyệt</button>{actor.canPublish && <button type="button" className={styles.directButton} disabled={busy || !selectedPriceRoute?.backendVersion || selectedPriceRoute.locked || !priceDraft.vehicleId || !priceDraft.reason.trim() || (priceDraft.priceMode === "fixed" && Number(priceDraft.priceAmount) <= 0)} onClick={() => setDirectConfirm("pricing")}><ShieldCheck aria-hidden="true" /> Ghi thẳng backend</button>}</div>
            {directConfirm === "pricing" && <DirectConfirmation busy={busy} title="Áp dụng giá ngay trên production?" detail="Giá của đúng tổ hợp tuyến, chiều, xe và gói này sẽ thay đổi ngay; hệ thống đồng thời lưu audit." onCancel={() => setDirectConfirm(null)} onConfirm={() => void applyDirect(pricingPayload())} />}
            <WorkflowStatus draft={activeServerDraft} canPublish={actor.canPublish} busy={busy} onPublish={publishDraft} />
          </div>
        </AdminPanel>
      )}

      {screen === "manage" && (
        <AdminPanel onBack={() => setScreen("home")} kicker="Quản lý tuyến" title="Tạm ngừng hoặc xóa tuyến">
          <div className={styles.fieldStack}>
            <RouteCombobox label="Tìm tuyến" value={manageRouteId} routes={routeRows} onChange={(routeId) => { setManageRouteId(routeId); setActiveServerDraft(null); setDirectConfirm(null); }} />
            {selectedManageRoute && <div className={styles.currentValue}><span>Trạng thái hiện tại</span><strong>{selectedManageRoute.outboundEnabled ? "Chiều đi đang bật" : "Chiều đi đang tắt"} · {selectedManageRoute.inboundEnabled ? "Chiều về đang bật" : "Chiều về đang tắt"}</strong></div>}
            <ReasonField value={manageReason} onChange={setManageReason} />
            <InlineWarning>Tạm ngừng sẽ đưa Route về draft và tắt cả hai chiều. Không xóa cứng dữ liệu, giá hoặc lịch sử.</InlineWarning>
            <div className={styles.actionPair}><button type="button" className={styles.panelPrimary} disabled={busy || !selectedManageRoute || selectedManageRoute.locked || manageReason.trim().length < 3 || activeServerDraft?.status === "pending"} onClick={() => void archiveRoute()}><Send aria-hidden="true" /> Lưu nháp tạm ngừng</button>{actor.canPublish && <button type="button" className={styles.dangerButton} disabled={busy || !selectedManageRoute?.backendVersion || selectedManageRoute.locked || manageReason.trim().length < 3} onClick={() => setDirectConfirm("delete")}><Trash2 aria-hidden="true" /> Xóa tuyến trực tiếp</button>}</div>
            {directConfirm === "delete" && selectedManageRoute && <DirectConfirmation danger busy={busy} title={`Xóa tuyến #${selectedManageRoute.id}?`} detail={`${selectedManageRoute.from} ↔ ${selectedManageRoute.to} sẽ biến mất khỏi website ngay. Dữ liệu được chuyển vào Thùng rác WordPress và có thể rollback từ lịch sử.`} onCancel={() => setDirectConfirm(null)} onConfirm={() => { const payload = deleteRoutePayload(); if (payload) void applyDirect(payload); }} />}
            <WorkflowStatus draft={activeServerDraft} canPublish={actor.canPublish} busy={busy} onPublish={publishDraft} />
          </div>
        </AdminPanel>
      )}

      {screen === "audit" && (
        <AdminPanel onBack={() => setScreen("home")} kicker="Audit log" title="Lịch sử thay đổi">
          <div className={styles.auditList}>
            {auditRows.length === 0 && <p className={styles.emptyState}>Chưa có thay đổi nào được áp dụng từ dashboard.</p>}
            {auditRows.map((row) => <article key={row.id}><div><strong>#{row.id} · {operationLabel(row.operation)}</strong><small>Route #{row.routeId} · {formatTime(row.timestamp)}</small><p>{row.reason || "Không có lý do"}</p><span>{row.actor?.name || "Tài khoản hệ thống"}</span></div>{actor.canPublish && <button type="button" disabled={busy} onClick={() => void rollbackAudit(row)}><RefreshCcw aria-hidden="true" /> Rollback</button>}</article>)}
          </div>
        </AdminPanel>
      )}
    </main>
  );
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <article className={styles.summaryCard}>{icon}<strong>{value}</strong><span>{label}</span></article>;
}

function ActionButton({ primary, icon, title, note, onClick }: { primary?: boolean; icon: React.ReactNode; title: string; note: string; onClick: () => void }) {
  return <button className={primary ? styles.primaryAction : styles.secondaryAction} type="button" onClick={onClick}><span className={styles.actionIcon}>{icon}</span><span><strong>{title}</strong><small>{note}</small></span><ChevronRight aria-hidden="true" /></button>;
}

function WizardProgress({ step }: { step: number }) {
  return <nav className={styles.progress} aria-label="Tiến trình tạo tuyến"><div className={styles.progressLine}><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div><ol>{STEPS.map((label, index) => <li key={label} className={index <= step ? styles.progressActive : ""}><span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span><small>{label}</small></li>)}</ol></nav>;
}

function AdminPanel({ onBack, kicker, title, children }: { onBack: () => void; kicker: string; title: string; children: React.ReactNode }) {
  return <div className={styles.panel}><button type="button" className={styles.panelBack} onClick={onBack}><ArrowLeft aria-hidden="true" /> Trang chính</button><section className={styles.stepCard}><StepTitle icon={<ShieldCheck />} kicker={kicker} title={title} />{children}</section></div>;
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

function LocationSelect({ label, value, locations, onChange }: { label: string; value: string; locations: AdminLocation[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Chọn Location</option>{locations.map((location) => <option key={location.id} value={location.id} disabled={location.locked}>{location.name} · {location.type}{location.locked ? " · Tạm khóa" : ""}</option>)}</select></label>;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function routeLabel(route: AdminRoute) {
  return `#${route.id} · ${route.from} ↔ ${route.to}`;
}

function RouteCombobox({ label, value, routes, onChange }: { label: string; value: string; routes: AdminRoute[]; onChange: (value: string) => void }) {
  const listId = useId();
  const selected = routes.find((route) => route.id === value);
  const [query, setQuery] = useState(selected ? routeLabel(selected) : "");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = normalizeSearch(query);
    return routes.filter((route) => {
      if (!needle || selected?.id === route.id) return true;
      return normalizeSearch(`${route.id} ${route.slug} ${route.from} ${route.to}`).includes(needle);
    }).slice(0, 8);
  }, [query, routes, selected?.id]);

  function choose(route: AdminRoute) {
    if (route.locked) return;
    setQuery(routeLabel(route));
    setOpen(false);
    onChange(route.id);
  }

  return <label className={styles.routeSearch}><span>{label}</span><div className={styles.routeSearchInput}><Search aria-hidden="true" /><input type="search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} placeholder="Nhập tên điểm đi, điểm đến hoặc mã tuyến" value={query} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (value) onChange(""); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && open && matches[0] && !matches[0].locked) { event.preventDefault(); choose(matches[0]); } }} /></div>{open && <div id={listId} className={styles.routeSuggestions} role="listbox">{matches.length === 0 && <p>Không tìm thấy tuyến phù hợp.</p>}{matches.map((route) => <button key={route.id} type="button" role="option" aria-selected={route.id === value} disabled={route.locked} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(route)}><strong>{route.from} ↔ {route.to}</strong><small>Route #{route.id} · {route.postStatus === "publish" ? "Đang công khai" : "Nháp WordPress"}{route.locked ? " · Tạm khóa" : ""}</small></button>)}</div>}</label>;
}

function VehicleSelect({ value, vehicles, onChange }: { value: string; vehicles: AdminVehicle[]; onChange: (value: string) => void }) {
  return <label><span>Xe</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Chọn xe</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.type} · {vehicle.name}</option>)}</select></label>;
}

function DirectionSelect({ value, outbound, inbound, from, to, onChange }: { value: Direction; outbound: boolean; inbound: boolean; from?: string; to?: string; onChange: (value: Direction) => void }) {
  return <label><span>Chiều áp dụng</span><select value={value} onChange={(event) => onChange(event.target.value as Direction)}>{outbound && <option value="outbound">{from} → {to}</option>}{inbound && <option value="inbound">{to} → {from}</option>}</select></label>;
}

function PackageSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label><span>Gói chuyến</span><select value={value} onChange={(event) => onChange(event.target.value)}>{Object.entries(PACKAGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}

function PackageStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <><StepTitle icon={<FileClock />} kicker="Bước 4/6" title="Chọn gói chuyến" /><div className={styles.radioGrid}>{Object.entries(PACKAGE_LABELS).map(([key, label]) => <label key={key} className={value === key ? styles.radioSelected : ""}><input type="radio" name="package" value={key} checked={value === key} onChange={() => onChange(key)} /><span><strong>{label}</strong><small>{key}</small></span></label>)}</div></>;
}

function PriceStep({ mode, amount, onMode, onAmount, compact }: { mode: PriceMode; amount: string; onMode: (mode: PriceMode) => void; onAmount: (amount: string) => void; compact?: boolean }) {
  return <>{!compact && <StepTitle icon={<BadgeDollarSign />} kicker="Bước 5/6" title="Chọn trạng thái giá" />}<div className={styles.segmented}>{(["fixed", "contact", "disabled"] as PriceMode[]).map((item) => <button key={item} type="button" className={mode === item ? styles.segmentedActive : ""} onClick={() => onMode(item)}>{modeLabel(item)}</button>)}</div>{mode === "fixed" && <label className={styles.moneyField}><span>Giá cơ bản</span><input inputMode="numeric" pattern="[0-9]*" placeholder="Ví dụ: 1500000" value={amount} onChange={(event) => onAmount(event.target.value.replace(/\D/g, ""))} /><strong>{money(amount)}</strong></label>}<p className={styles.helper}>Không cho phép price=0. Phụ phí, modifier và condition không được gộp vào base price.</p></>;
}

function ReasonField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className={styles.reasonField}><span>Lý do thay đổi</span><textarea value={value} maxLength={500} rows={3} placeholder="Ví dụ: Cập nhật theo bảng giá vận hành đã duyệt ngày…" onChange={(event) => onChange(event.target.value)} /><small>Tối thiểu 3 ký tự; nội dung được lưu trong audit log.</small></label>;
}

function DirectConfirmation({ title, detail, busy, danger, onCancel, onConfirm }: { title: string; detail: string; busy: boolean; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className={`${styles.directConfirm} ${danger ? styles.directConfirmDanger : ""}`} role="alert"><div><strong>{title}</strong><p>{detail}</p></div><div><button type="button" disabled={busy} onClick={onCancel}>Hủy</button><button type="button" disabled={busy} onClick={onConfirm}>{danger ? "Xác nhận xóa tuyến" : "Xác nhận ghi ngay"}</button></div></div>;
}

function WorkflowStatus({ draft, canPublish, busy, onPublish }: { draft: ServerDraft | null; canPublish: boolean; busy: boolean; onPublish: (id: number) => void }) {
  if (!draft) return null;
  return <div className={styles.workflowStatus}><div><strong>Bản nháp máy chủ #{draft.id}</strong><span>{draft.status === "pending" ? "Đang chờ phê duyệt" : draft.status === "publish" ? "Đã áp dụng" : "Đã lưu"}</span></div>{draft.validation?.warnings?.map((warning) => <p key={warning}>{warning}</p>)}{draft.status === "pending" && canPublish && <button type="button" disabled={busy} onClick={() => onPublish(draft.id)}><ShieldCheck aria-hidden="true" /> Duyệt và áp dụng</button>}</div>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function operationLabel(operation: string) {
  if (operation === "create_route") return "Tạo tuyến";
  if (operation === "update_pricing") return "Cập nhật giá";
  if (operation === "archive_route") return "Tạm ngừng tuyến";
  if (operation === "delete_route") return "Xóa tuyến";
  if (operation === "rollback") return "Rollback";
  return operation;
}
