import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcesPath = resolve(import.meta.dirname, "..", "data", "sources.yml");
const sourceText = await readFile(sourcesPath, "utf8");
const allowedStatuses = new Set(["candidate", "permitted", "rejected"]);
const ids = [...sourceText.matchAll(/^\s*- id:\s*([a-z0-9_-]+)\s*$/gm)].map(
  (match) => match[1],
);
const statuses = [...sourceText.matchAll(/^\s+status:\s*([a-z]+)\s*$/gm)].map(
  (match) => match[1],
);

if (ids.length === 0)
  throw new Error("data/sources.yml contains no source records");
if (new Set(ids).size !== ids.length)
  throw new Error("data/sources.yml contains duplicate source IDs");
if (statuses.length !== ids.length)
  throw new Error("Every source record must declare a status");
for (const status of statuses) {
  if (!allowedStatuses.has(status))
    throw new Error(`Invalid source status: ${status}`);
}

for (const schema of [
  "pharmacy.schema.json",
  "guard.schema.json",
  "manifest.schema.json",
  "pack.schema.json",
]) {
  const json = JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "..", "data", "schema", schema),
      "utf8",
    ),
  );
  if (json.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`${schema} must use JSON Schema 2020-12`);
  }
}

process.stdout.write(
  `Source registry and ${ids.length} source records are structurally valid.\n`,
);
