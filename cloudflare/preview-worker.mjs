// This entry point is exclusively for the dedicated migration spike Worker.
import handler from "../.open-next/worker.js";
import { createPreviewWorker } from "./preview-guard.mjs";

export default createPreviewWorker(handler);
export * from "../.open-next/worker.js";
