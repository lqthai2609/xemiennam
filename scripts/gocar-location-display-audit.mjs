import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const SOURCE_ROOTS = ["src", "scripts", "wordpress", "docs", ".github"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".php", ".md", ".yml", ".yaml"]);
const VARIANT_PATTERN = /TP\.HCM|TP HCM|TP\. HCM|TP Hồ Chí Minh|TP\. Hồ Chí Minh|Hồ Chí Minh|ho-chi-minh|tp-hcm/giu;

const TECHNICAL_FILES = new Set([
  "src/data/routes.ts",
  "src/lib/api/diem-den.ts",
  "src/lib/location-search.ts",
  "src/lib/public-location-label.ts",
  "src/lib/schema.ts",
  "src/lib/site-config.ts",
  "scripts/lib/gocar-location-normalizer.mjs",
  "scripts/gocar-location-normalizer.test.mjs",
  "scripts/gocar-booking-search-source.test.mjs",
  "wordpress/gocar-core/includes/class-gocar-location-normalizer.php",
]);

const PUBLIC_ROOTS = ["src/app/", "src/components/", "src/data/"];

async function walk(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const output = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walk(relativePath)));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      output.push(relativePath);
    }
  }
  return output;
}

function classify(file, line) {
  if (file.startsWith("docs/")) {
    return { classification: "HISTORICAL_EVIDENCE", reason: "Tài liệu hoặc receipt lịch sử; không sửa nội dung bằng remediation runtime." };
  }
  if (TECHNICAL_FILES.has(file)) {
    return { classification: "TECHNICAL_KEEP", reason: "Canonical entity, alias, slug, URL, schema entity hoặc migration fixture kỹ thuật." };
  }
  if (/https?:\/\/|\/tuyen-duong\/|\bslug\b|image/i.test(line) && /tp-hcm|ho-chi-minh/i.test(line)) {
    return { classification: "TECHNICAL_KEEP", reason: "Slug, URL hoặc asset path hiện hữu phải giữ nguyên." };
  }
  if (PUBLIC_ROOTS.some((prefix) => file.startsWith(prefix))) {
    return { classification: "PUBLIC_DISPLAY", reason: "Chuỗi thuộc bề mặt public và phải đi qua formatter Sài Gòn." };
  }
  if (file.startsWith("scripts/") || file.startsWith("wordpress/")) {
    return { classification: "TECHNICAL_KEEP", reason: "Test, migration hoặc canonical normalization kỹ thuật." };
  }
  return { classification: "REVIEW_REQUIRED", reason: "Chưa có allowlist rõ ràng." };
}

export async function scanLocationVariants() {
  const files = (await Promise.all(SOURCE_ROOTS.map(walk))).flat().sort();
  const occurrences = [];

  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf8");
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      VARIANT_PATTERN.lastIndex = 0;
      for (const match of line.matchAll(VARIANT_PATTERN)) {
        const result = classify(file, line);
        occurrences.push({
          file,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          match: match[0],
          ...result,
        });
      }
    }
  }

  const summary = Object.fromEntries(
    ["PUBLIC_DISPLAY", "TECHNICAL_KEEP", "HISTORICAL_EVIDENCE", "REVIEW_REQUIRED"].map((key) => [
      key,
      occurrences.filter((item) => item.classification === key).length,
    ]),
  );
  return { scannedFiles: files.length, totalOccurrences: occurrences.length, summary, occurrences };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const report = await scanLocationVariants();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.summary.PUBLIC_DISPLAY > 0 || report.summary.REVIEW_REQUIRED > 0) process.exitCode = 1;
}
