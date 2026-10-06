import handler from "../.open-next/worker.js";
import { createPreviewWorker } from "./preview-guard.mjs";

// Public HEAD requests from the self-reference queue are allowed by the guard.
// Booking, administration and the existing webhook remain blocked.
export default createPreviewWorker(handler, globalThis.fetch, { cacheMode: "r2-isr" });
export * from "../.open-next/worker.js";
