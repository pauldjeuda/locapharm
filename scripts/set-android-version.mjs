import { readFile, writeFile } from "node:fs/promises";

const gradlePath = process.argv[2];
const version = process.argv[3] ?? "";
if (!gradlePath) throw new Error("Pass the generated app/build.gradle path.");
const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
if (!match) throw new Error("VERSION must use semantic X.Y.Z format.");

const [, majorText, minorText, patchText] = match;
const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
if (major > 999 || minor > 999 || patch > 999) {
  throw new Error("Each version component must be at most 999.");
}
const versionCode = major * 1_000_000 + minor * 1_000 + patch;
let gradle = await readFile(gradlePath, "utf8");
for (const [pattern, replacement, label] of [
  [
    /^(\s*versionCode\s+)\d+\s*$/gm,
    (prefix) => `${prefix}${versionCode}`,
    "versionCode",
  ],
  [
    /^(\s*versionName\s+)["'][^"']+["']\s*$/gm,
    (prefix) => `${prefix}"${version}"`,
    "versionName",
  ],
]) {
  const count = [...gradle.matchAll(pattern)].length;
  if (count !== 1)
    throw new Error(
      `Expected one ${label} in generated Gradle file; found ${count}.`,
    );
  gradle = gradle.replace(pattern, (_match, prefix) => replacement(prefix));
}
await writeFile(gradlePath, gradle, "utf8");
