import { readFile, writeFile } from "node:fs/promises";

const outputPath = new URL("../site/version.json", import.meta.url);
let release = {};
try {
  release = JSON.parse(
    await readFile(process.env.LOCAPHARM_RELEASE_JSON ?? "", "utf8"),
  );
} catch {
  release = {};
}

const tag = typeof release.tag_name === "string" ? release.tag_name : "";
const version = tag.startsWith("v") ? tag.slice(1) : "";
const sha256 = process.env.LOCAPHARM_APK_SHA256 ?? "";
const validVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
const assets = Array.isArray(release.assets)
  ? release.assets.map((asset) => asset.name)
  : [];
const apkName = `locapharm-${tag}.apk`;
const available =
  validVersion &&
  /^[a-f0-9]{64}$/i.test(sha256) &&
  assets.includes(apkName) &&
  assets.includes(`${apkName}.sha256`);

let result = { available: false, checkedAt: new Date().toISOString() };
if (available) {
  const [major, minor, patch] = version.split(".").map(Number);
  result = {
    available: true,
    version,
    versionCode: major * 1_000_000 + minor * 1_000 + patch,
    url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/releases/download/${tag}/${apkName}`,
    sha256,
    notes: typeof release.body === "string" ? release.body : `Locapharm ${tag}`,
    minSupported: "0.1.0",
    checkedAt: new Date().toISOString(),
  };
}

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
