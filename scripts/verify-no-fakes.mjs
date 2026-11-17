import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const roots = ["app/src", "app/public", "data/gardes", "data/overrides"].map(
  (p) => resolve(import.meta.dirname, "..", p),
);
const banned = [
  [
    "invented certification claim",
    /officine certifi[eé]e|r[eé]pertoire officiel du littoral|valid[eé] par l'ordre r[eé]gional/i,
  ],
  [
    "invented fixed coverage/count claim",
    /\b(?:4[,. ]?820|212 pharmacies enregistr[eé]es|18 ouvertes cette nuit|\+24 utilisateurs orient[eé]s)\b/i,
  ],
  ["invented traffic claim", /trafic fluide|trafic ralenti d[eé]tect[eé]/i],
  ["invented report reference", /CMR-8842|actualis[eé]e sous 2 heures/i],
];
const sourceExtensions = new Set([
  ".ts",
  ".html",
  ".scss",
  ".css",
  ".json",
  ".csv",
  ".yml",
  ".yaml",
]);
const violations = [];

async function walk(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (sourceExtensions.has(extname(entry.name).toLowerCase())) {
      const text = await readFile(file, "utf8");
      for (const [label, pattern] of banned) {
        if (pattern.test(text)) violations.push(`${file}: ${label}`);
      }
    }
  }
}

for (const root of roots) await walk(root);
if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    "No prohibited sample claims found in shipped app/data files.\n",
  );
}
