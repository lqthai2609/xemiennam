import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
let logs = "";
const children = [];
function child(args, env = {}) {
  const p = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (b) => { logs += b; }); p.stderr.on("data", (b) => { logs += b; }); children.push(p); return p;
}
child(["scripts/day51-dispatch-fixture-server.mjs"]);
const mode = process.env.DAY51_SERVER_MODE || "start";
child(["node_modules/next/dist/bin/next", mode, ...(mode === "dev" ? ["--webpack"] : []), "--hostname", "127.0.0.1", "--port", "4288"], { WP_API_BASE_URL: "http://127.0.0.1:4299/wp/v2", GOCAR_ENABLE_MOCK_FALLBACK: "false", VERCEL_ENV: "preview" });
try {
  for (let n = 0; n < 60; n++) {
    if (logs.includes("SYNTHETIC dispatch fixture ready") && logs.includes("Ready in")) break;
    await new Promise((r) => setTimeout(r, 500));
    if (n === 59) throw new Error(logs);
  }
  const test = child(["scripts/day51-dispatch-browser.mjs"]);
  test.stdout.on("data", (b) => process.stdout.write(b)); test.stderr.on("data", (b) => process.stderr.write(b));
  process.exitCode = await new Promise((r) => test.on("exit", r));
} finally {
  for (const p of children) p.kill();
  await writeFile("../evidence/browser-server.log", logs);
}
