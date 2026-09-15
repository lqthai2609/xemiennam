#!/usr/bin/env node

import { auditDay20Targets } from "./lib/gocar-airport-hub-audit.mjs";

const DEFAULT_BASE_URL = "https://xemiennam.vercel.app";
const HUB_PATH = "/san-bay/tan-son-nhat";
const allowIncomplete = process.argv.includes("--allow-incomplete");
const baseUrl = (process.env.GOCAR_AUDIT_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "gocar-day20-airport-audit/1.0" },
    redirect: "manual",
  });

  return { response, text: await response.text() };
}

function routeSummary(route) {
  if (!route) return "MISSING";
  return route.priceMode === "fixed" ? `FIXED ${route.priceText}` : "CONTACT";
}

async function main() {
  const hubUrl = `${baseUrl}${HUB_PATH}`;
  const { response: hubResponse, text: hubHtml } = await fetchText(hubUrl);

  if (!hubResponse.ok) {
    console.error(`Airport Hub returned HTTP ${hubResponse.status}: ${hubUrl}`);
    process.exitCode = 2;
    return;
  }

  const audit = auditDay20Targets(hubHtml);
  const routeUrls = new Set();

  for (const item of audit) {
    if (item.fromAirport?.href) routeUrls.add(new URL(item.fromAirport.href, baseUrl).href);
    if (item.toAirport?.href) routeUrls.add(new URL(item.toAirport.href, baseUrl).href);
  }

  const routeStatus = new Map();
  for (const url of routeUrls) {
    const response = await fetch(url, {
      headers: { "user-agent": "gocar-day20-airport-audit/1.0" },
      redirect: "manual",
    });
    routeStatus.set(url, response.status);
  }

  const rows = audit.map((item) => {
    const href = item.fromAirport?.href || item.toAirport?.href || "";
    const absoluteUrl = href ? new URL(href, baseUrl).href : "";
    const status = absoluteUrl ? routeStatus.get(absoluteUrl) : null;
    const routePageReady = status === null ? false : status >= 200 && status < 400;

    return {
      target: item.target,
      from_airport: routeSummary(item.fromAirport),
      to_airport: routeSummary(item.toAirport),
      route_http: status ?? "-",
      result: item.ready && routePageReady ? "PASS" : "FAIL",
    };
  });

  console.log(`Day 20 Airport Hub audit: ${hubUrl}`);
  console.table(rows);

  const failures = rows.filter((row) => row.result !== "PASS");
  console.log(`${rows.length - failures.length}/${rows.length} priority route pairs ready.`);

  if (failures.length > 0 && !allowIncomplete) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Airport Hub audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
