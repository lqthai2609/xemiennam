import type { VehicleFactsDisplay } from "@/types/vehicle-selector";

export function VehicleFactsSummary({ facts }: { facts: VehicleFactsDisplay }) {
  return <div className="vehicle-facts-summary">
    <dl><div><dt>Sức chứa</dt><dd>{facts.passengers}</dd></div><div><dt>Mẫu xe tham khảo</dt><dd>{facts.models}</dd></div><div><dt>Cấp dịch vụ</dt><dd>{facts.serviceLevel}</dd></div></dl>
    <details><summary>Cấu hình khách và hành lý đã xác nhận</summary>{facts.loadProfiles.length ? <ul>{facts.loadProfiles.map((profile) => <li key={profile}>{profile}</li>)}</ul> : <p>Cần tư vấn</p>}<p>Hai nhóm hành lý theo cấu hình Vận hành, không mặc định theo tiêu chuẩn hãng bay. Kích thước theo thứ tự dài, rộng, cao.</p></details>
    <p>Mẫu xe và ảnh chỉ để tham khảo. Xe giao thực tế, lịch xe và giá được xác nhận khi tư vấn.</p>
  </div>;
}
