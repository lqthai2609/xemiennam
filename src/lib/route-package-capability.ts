import type { RoutePricingPackage } from "@/types/route";

export type JourneyPackage = "oneWay" | "roundTrip" | "twoDays" | "threeDays";

const aliases: Record<JourneyPackage, string[]> = {
  oneWay: ["one_way", "mot_chieu", "mot-chieu", "oneway", "default"],
  roundTrip: ["round_trip", "khu_hoi", "khu-hoi", "roundtrip"],
  twoDays: ["2d1n", "2_ngay_1_dem", "2-ngay-1-dem"],
  threeDays: ["3d2n", "3_ngay_2_dem", "3-ngay-2-dem"],
};

export function packageMatches(row: RoutePricingPackage, selected: JourneyPackage): boolean {
  const key = row.packageKey.toLowerCase();
  if (selected === "oneWay" && key === "default") return true;
  if (aliases[selected].some((alias) => key.includes(alias) && alias !== "default")) return true;
  const label = row.packageLabel.toLocaleLowerCase("vi");
  switch (selected) {
    case "oneWay": return label.includes("một chiều");
    case "roundTrip": return label.includes("khứ hồi");
    case "twoDays": return label.includes("2 ngày");
    case "threeDays": return label.includes("3 ngày");
  }
}

export function availablePackages(rows: RoutePricingPackage[]): JourneyPackage[] {
  return (["oneWay", "roundTrip", "twoDays", "threeDays"] as const)
    .filter((selected) => rows.some((row) => row.mode !== "disabled" && packageMatches(row, selected)));
}

export function findVehiclePackage(rows: RoutePricingPackage[], displayType: string, selected: JourneyPackage): RoutePricingPackage | undefined {
  // Presentation cards say "Xe 4 chỗ"; WordPress taxonomy uses "4 chỗ".
  const vehicleType = displayType.startsWith("Xe ") ? displayType.slice(3) : displayType;
  return rows.find((row) => row.vehicleType === vehicleType && packageMatches(row, selected));
}
