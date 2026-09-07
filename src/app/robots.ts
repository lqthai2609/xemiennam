import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * robots.ts (Ngày 23) — đi kèm sitemap.ts. Subdomain CMS (`xemiennam.datxesaigon.com`) đã
 * tự chặn index riêng bằng snippet WPCode (robots.txt ảo + X-Robots-Tag, Ngày 2, mục 1
 * kiến trúc kỹ thuật) — file này chỉ áp dụng cho domain frontend Next.js.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
