import { writeFile } from "node:fs/promises";

const outputPath = new URL("../app/public/runtime-config.json", import.meta.url);
const configuredUrl = process.env.LOCAPHARM_WORKER_BASE_URL?.trim();
let workerBaseUrl = null;

if (configuredUrl) {
  let url;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("LOCAPHARM_WORKER_BASE_URL must be an absolute HTTPS URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "LOCAPHARM_WORKER_BASE_URL must be a public HTTPS origin without a path, query, or credentials.",
    );
  }
  workerBaseUrl = url.origin;
}

await writeFile(
  outputPath,
  `${JSON.stringify({ schema_version: 1, worker_base_url: workerBaseUrl }, null, 2)}\n`,
  "utf8",
);
