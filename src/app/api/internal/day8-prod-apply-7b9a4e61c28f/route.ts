import { NextRequest } from "next/server";

import { GET as runMigration } from "../day8-migrate/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/api/internal/day8-migrate";
  url.searchParams.set("apply", "day8-location-pricing-v2");
  url.searchParams.set("production", "day8-prod-20260913-7b9a4e61");
  return runMigration(new NextRequest(url));
}
