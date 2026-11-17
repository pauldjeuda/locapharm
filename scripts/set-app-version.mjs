import { readFile, writeFile } from "node:fs/promises";

const version = process.argv[2] ?? "";
const versionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
if (
  !versionMatch ||
  versionMatch.slice(1).some((value) => Number(value) > 999)
) {
  throw new Error("VERSION must use semantic X.Y.Z format.");
}

const packagePath = new URL("../app/package.json", import.meta.url);
const versionPath = new URL(
  "../app/src/app/core/app-version.ts",
  import.meta.url,
);
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = version;
await writeFile(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);
await writeFile(
  versionPath,
  `export const APP_VERSION = ${JSON.stringify(version)};\n`,
  "utf8",
);
