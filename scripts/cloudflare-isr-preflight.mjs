import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../wrangler.isr.jsonc", import.meta.url), "utf8"));
const databaseId = config.d1_databases[0].database_id;
if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(databaseId) ||
    databaseId === "00000000-0000-0000-0000-000000000000") {
  console.error("Chưa có Database ID D1 thật trong wrangler.isr.jsonc. Dừng triển khai.");
  process.exit(1);
}
console.log("Cấu hình có Database ID D1. Lệnh deploy sẽ kiểm tra tài nguyên trên tài khoản Cloudflare.");
