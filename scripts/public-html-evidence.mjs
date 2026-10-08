import { readFile } from "node:fs/promises";

export const dynamicRouteSamples = [
  "tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau.html",
  "tuyen-duong/ba-ria-vung-tau/san-bay-long-thanh-vung-tau.html",
  "tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau.html",
];

/** Static artifacts when available; request-rendered pages must be checked live. */
export async function readPublicHtml(relativePath) {
  try { return await readFile(new URL(`../.next/server/app/${relativePath}`, import.meta.url), "utf8"); }
  catch (error) {
    if (error.code !== "ENOENT" || !process.env.HTML_AUDIT_BASE_URL) throw error;
    const response = await fetch(`${process.env.HTML_AUDIT_BASE_URL}/${relativePath.replace(/\.html$/, "")}`, {signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`Public HTML ${relativePath}: HTTP ${response.status}`);
    return response.text();
  }
}
