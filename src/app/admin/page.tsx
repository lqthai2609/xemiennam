"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  FilePenLine,
  Filter,
  Gauge,
  Globe2,
  LayoutDashboard,
  ListFilter,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems: { label: string; icon: LucideIcon; count?: string }[] = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Thư viện nội dung", icon: BookOpen, count: "128" },
  { label: "Hàng chờ phê duyệt", icon: FileCheck2, count: "7" },
  { label: "Lịch nội dung", icon: CalendarDays },
  { label: "Sức khỏe nội dung", icon: Gauge },
  { label: "Lịch sử phiên bản", icon: Clock3 },
];

const tasks = [
  { title: "TP.HCM → Vũng Tàu", type: "Route Page", entity: "Bà Rịa – Vũng Tàu", status: "Cần sửa", priority: "Cao", due: "Hôm nay", owner: "Linh", tone: "danger" },
  { title: "Xe 7 chỗ đi sân bay Tân Sơn Nhất", type: "Airport Page", entity: "TP. Hồ Chí Minh", status: "Chờ kiểm tra", priority: "Trung bình", due: "Hôm nay", owner: "Minh", tone: "warning" },
  { title: "Kinh nghiệm đi Đà Lạt cuối tuần", type: "Blog Post", entity: "Đà Lạt", status: "Bản nháp", priority: "Thấp", due: "18/09", owner: "Hương", tone: "neutral" },
];

const inventory = [
  { title: "TP.HCM → Vũng Tàu", type: "Route Page", entity: "Vũng Tàu", status: "Cần sửa", score: "62", updated: "17/09/2026", owner: "Linh" },
  { title: "Sân bay Tân Sơn Nhất → Quận 1", type: "Airport Page", entity: "TP.HCM", status: "Đã duyệt", score: "96", updated: "16/09/2026", owner: "Minh" },
  { title: "TP.HCM → Phan Thiết", type: "Route Page", entity: "Bình Thuận", status: "Chờ kiểm tra", score: "84", updated: "15/09/2026", owner: "Hương" },
  { title: "Thuê xe đi miền Tây", type: "Service Page", entity: "Cần Thơ", status: "Đã xuất bản", score: "91", updated: "12/09/2026", owner: "Linh" },
];

function StatusBadge({ status }: { status: string }) {
  const className = status === "Đã duyệt" || status === "Đã xuất bản" ? "status status-success" : status === "Cần sửa" ? "status status-danger" : status === "Chờ kiểm tra" ? "status status-warning" : "status status-neutral";
  return <span className={className}><span className="status-dot" />{status}</span>;
}

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: LucideIcon; label: string; value: string; detail: string; accent?: string }) {
  return <article className="metric-card">
    <div className={`metric-icon ${accent ?? "teal"}`}><Icon aria-hidden="true" /></div>
    <div className="metric-copy"><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>
    <ArrowRight className="metric-arrow" aria-hidden="true" />
  </article>;
}

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredInventory = inventory.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.entity.toLowerCase().includes(query.toLowerCase()));

  return <div className="admin-app">
    <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="admin-brand"><span className="brand-mark">G</span><span><strong>GOCARVN</strong><small>CONTENT HUB</small></span><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X /></button></div>
      <div className="workspace-switcher"><span className="workspace-avatar">G</span><span><strong>Gocar VN</strong><small>Content workspace</small></span><ChevronDown /></div>
      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        <p className="nav-caption">WORKSPACE</p>
        {navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`admin-nav-item ${activeNav === label ? "is-active" : ""}`} onClick={() => { setActiveNav(label); setSidebarOpen(false); setShowLibrary(label === "Thư viện nội dung"); setShowEditor(false); }}><Icon aria-hidden="true" /><span>{label}</span>{count && <b>{count}</b>}</button>)}
        <p className="nav-caption nav-caption-spaced">HỆ THỐNG</p>
        <button className="admin-nav-item"><Settings2 aria-hidden="true" /><span>Cài đặt</span></button>
        <button className="admin-nav-item"><CircleHelp aria-hidden="true" /><span>Trợ giúp</span></button>
      </nav>
      <div className="sidebar-footer"><div className="help-card"><Sparkles /><strong>Cần hỗ trợ?</strong><p>Xem hướng dẫn quản trị nội dung.</p><a href="#help">Mở trung tâm trợ giúp <ArrowRight /></a></div><div className="user-mini"><span className="user-avatar">LN</span><span><strong>Lan Nguyễn</strong><small>Content editor</small></span><MoreHorizontal /></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" />}
    <main className="admin-main">
      <header className="admin-header"><div className="header-left"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Mở menu"><Menu /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight /><strong>{showLibrary ? "Thư viện nội dung" : "Tổng quan"}</strong></div></div><div className="header-actions"><label className="global-search"><Search aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm nội dung, tuyến, tỉnh..." aria-label="Tìm kiếm toàn cục" /><kbd>⌘ K</kbd></label><button className="icon-button has-notice" aria-label="Thông báo"><Bell /><i /></button><div className="header-user"><span className="user-avatar">LN</span><span><strong>Lan Nguyễn</strong><small>Content editor</small></span><ChevronDown /></div></div></header>
      <div className="admin-content">
        <div className="page-heading"><div><p className="eyebrow teal-eyebrow">THỨ NĂM, 17 THÁNG 9, 2026</p><h1>{showLibrary ? "Thư viện nội dung" : "Chào Lan, hôm nay có gì cần làm?"}</h1><p className="heading-description">{showLibrary ? "Tìm và quản lý toàn bộ nội dung SEO của Gocar VN." : "Một vài việc cần bạn để ý để nội dung luôn sẵn sàng xuất bản."}</p></div><Button className="primary-button" onClick={() => { setShowEditor(true); setShowLibrary(false); }}><Plus data-icon="inline-start" />Tạo nội dung mới</Button></div>
        {showEditor ? <EditorView /> : showLibrary ? <LibraryView items={filteredInventory} filterOpen={filterOpen} setFilterOpen={setFilterOpen} /> : <>
          <section className="metrics-grid" aria-label="Tổng quan nội dung"><MetricCard icon={FilePenLine} label="Bản nháp đang viết" value="18" detail="+3 so với tuần trước" /><MetricCard icon={FileCheck2} label="Chờ phê duyệt" value="7" detail="2 cần xử lý hôm nay" accent="amber" /><MetricCard icon={AlertCircle} label="Cần sửa" value="5" detail="1 mức độ nghiêm trọng" accent="red" /><MetricCard icon={ShieldCheck} label="Điểm sức khỏe" value="86/100" detail="+4 điểm trong tháng" accent="purple" /></section>
          <div className="section-row"><div className="section-title"><span className="section-icon"><ListFilter /></span><div><h2>Việc cần làm hôm nay</h2><p>Ưu tiên những nội dung có ảnh hưởng lớn đến SEO.</p></div></div><Button variant="ghost" className="view-all" onClick={() => setShowLibrary(true)}>Xem tất cả việc <ArrowRight data-icon="inline-end" /></Button></div>
          <section className="task-list" aria-label="Việc cần làm">{tasks.map((task) => <article className="task-card" key={task.title}><div className={`task-priority ${task.tone}`} /><div className="task-main"><div className="task-title-row"><h3>{task.title}</h3><StatusBadge status={task.status} /></div><div className="task-meta"><span>{task.type}</span><span>{task.entity}</span><span><UserRound />{task.owner}</span></div></div><div className="task-due"><small>Hạn xử lý</small><strong className={task.due === "Hôm nay" ? "due-today" : ""}>{task.due}</strong></div><Button variant="outline" className="task-action">{task.status === "Cần sửa" ? "Sửa nội dung" : task.status === "Chờ kiểm tra" ? "Kiểm tra" : "Tiếp tục viết"}<ArrowRight data-icon="inline-end" /></Button><button className="more-button" aria-label={`Thêm thao tác cho ${task.title}`}><MoreHorizontal /></button></article>)}</section>
          <div className="bottom-grid"><section className="content-health card-surface"><div className="card-heading"><div><p className="eyebrow teal-eyebrow">TỔNG QUAN</p><h2>Sức khỏe nội dung</h2></div><button className="more-button" aria-label="Thêm thao tác"><MoreHorizontal /></button></div><div className="health-content"><div className="health-score"><div className="score-ring"><strong>86</strong><span>/100</span></div><div><strong>Tốt</strong><p>Tiếp tục duy trì chất lượng nội dung.</p></div></div><div className="health-bars"><div><span><b>Đủ dữ liệu bắt buộc</b><strong>94%</strong></span><i><em style={{ width: "94%" }} /></i></div><div><span><b>SEO & indexability</b><strong>88%</strong></span><i><em style={{ width: "88%" }} /></i></div><div><span><b>Liên kết nội bộ</b><strong>76%</strong></span><i><em style={{ width: "76%" }} /></i></div></div></div><button className="text-button">Xem báo cáo chi tiết <ArrowRight /></button></section><section className="upcoming card-surface"><div className="card-heading"><div><p className="eyebrow teal-eyebrow">SẮP TỚI</p><h2>Lịch nội dung</h2></div><CalendarDays className="calendar-heading-icon" /></div><div className="calendar-item"><div className="date-tile"><strong>18</strong><span>TH09</span></div><div><strong>Xuất bản Route Page</strong><p>TP.HCM → Phan Thiết</p></div><StatusBadge status="Đã duyệt" /></div><div className="calendar-item"><div className="date-tile"><strong>20</strong><span>TH09</span></div><div><strong>Review nội dung tháng</strong><p>8 nội dung cần kiểm tra</p></div><StatusBadge status="Chờ kiểm tra" /></div><button className="text-button">Mở lịch nội dung <ArrowRight /></button></section></div>
        </>}
      </div>
    </main>
  </div>;
}

function EditorView() {
  const steps = ["Loại nội dung", "Entity liên quan", "Search intent", "Nội dung", "Kiểm tra", "Preview & gửi duyệt"];
  return <section className="editor-shell"><div className="editor-stepper">{steps.map((step, index) => <div className={`editor-step ${index === 0 ? "active" : ""}`} key={step}><span>{index + 1}</span><small>{step}</small></div>)}</div><div className="editor-panel card-surface"><div className="editor-panel-heading"><div><p className="eyebrow teal-eyebrow">BƯỚC 1 / 6</p><h2>Bạn muốn tạo nội dung gì?</h2><p>Chọn template phù hợp để Gocar VN tự chuẩn bị các trường cần thiết.</p></div><span className="autosave-state"><Check /> Đã lưu tự động</span></div><div className="template-grid"><button className="template-card selected"><span className="template-icon"><Globe2 /></span><strong>Route Page</strong><p>Nội dung cho một tuyến đường cụ thể</p><span className="template-check"><Check /></span></button><button className="template-card"><span className="template-icon"><BookOpen /></span><strong>Location Page</strong><p>Trang giới thiệu tỉnh, thành phố</p></button><button className="template-card"><span className="template-icon"><Table2 /></span><strong>Airport Page</strong><p>Trang đón trả tại sân bay</p></button><button className="template-card"><span className="template-icon"><UsersRound /></span><strong>Service Page</strong><p>Trang giới thiệu dịch vụ</p></button></div><div className="editor-footer"><Button variant="ghost">Hủy</Button><Button className="primary-button">Tiếp tục <ArrowRight data-icon="inline-end" /></Button></div></div></section>;
}

function LibraryView({ items, filterOpen, setFilterOpen }: { items: typeof inventory; filterOpen: boolean; setFilterOpen: (value: boolean) => void }) {
  return <section className="library-section"><div className="library-toolbar"><div className="filter-chips"><button className="filter-chip active">Tất cả <b>128</b></button><button className="filter-chip">Route Page <b>42</b></button><button className="filter-chip">Cần sửa <b>5</b></button></div><Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}><Filter data-icon="inline-start" />Bộ lọc nâng cao<ChevronDown data-icon="inline-end" /></Button></div>{filterOpen && <div className="advanced-filters"><label>Page family<select><option>Tất cả page family</option></select></label><label>Trạng thái<select><option>Tất cả trạng thái</option></select></label><label>Người phụ trách<select><option>Tất cả người phụ trách</option></select></label></div>}<div className="library-table-wrap"><table className="library-table"><thead><tr><th><input type="checkbox" aria-label="Chọn tất cả" /></th><th>Tiêu đề</th><th>Loại nội dung</th><th>Entity liên quan</th><th>Trạng thái</th><th>Chất lượng</th><th>Cập nhật</th><th>Phụ trách</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.title}><td><input type="checkbox" aria-label={`Chọn ${item.title}`} /></td><td><strong>{item.title}</strong><small>/{item.type === "Route Page" ? "tuyen-duong" : "san-bay"}/...</small></td><td><span className="type-label">{item.type}</span></td><td>{item.entity}</td><td><StatusBadge status={item.status} /></td><td><span className={`quality-score ${Number(item.score) < 70 ? "low" : Number(item.score) < 90 ? "medium" : "high"}`}>{item.score}</span></td><td>{item.updated}</td><td><span className="owner-cell"><span className="mini-avatar">{item.owner.slice(0, 1)}</span>{item.owner}</span></td><td><button className="more-button" aria-label={`Mở thao tác cho ${item.title}`}><MoreHorizontal /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Hiển thị 1–{items.length} trong 128 nội dung</span><div><button className="pagination-button" aria-label="Trang trước"><ChevronLeft /></button><button className="pagination-button active">1</button><button className="pagination-button">2</button><button className="pagination-button">3</button><button className="pagination-button" aria-label="Trang sau"><ChevronRight /></button></div></div></section>;
}

