import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const designRoot = join(root, "design", "stitch_locapharm_cameroon_app_ui");
const packageRoot = join(
  root,
  "node_modules",
  "@material-symbols",
  "svg-400",
  "outlined",
);
const outputPath = join(
  root,
  "app",
  "public",
  "assets",
  "material-symbols.svg",
);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.name === "code.html") files.push(path);
  }
  return files;
}

const glyphs = new Map();
const markup =
  /<span\b(?=[^>]*class=["'][^"']*material-symbols-outlined[^"']*["'])[^>]*>\s*([a-z0-9_]+)\s*<\/span>/gi;

for (const path of await walk(designRoot)) {
  const html = await readFile(path, "utf8");
  for (const match of html.matchAll(markup)) {
    const start = match.index ?? 0;
    const openTagStart = html.lastIndexOf("<span", start);
    const openTag = html.slice(openTagStart, start + match[0].indexOf(">") + 1);
    const filled = /font-variation-settings:\s*['"]FILL['"]\s*1\b/i.test(
      openTag,
    );
    const name = match[1];
    glyphs.set(name, (glyphs.get(name) ?? false) || filled);
  }
}

if (glyphs.size === 0)
  throw new Error(`No Material Symbols found under ${designRoot}`);

const symbols = [];
for (const [name, needsFill] of [...glyphs.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  for (const filled of needsFill ? [false, true] : [false]) {
    const fileName = `${name}${filled ? "-fill" : ""}.svg`;
    const sourcePath = join(packageRoot, fileName);
    const svg = await readFile(sourcePath, "utf8");
    const inner = svg
      .replace(/^.*?<svg\b[^>]*>/is, "")
      .replace(/<\/svg>\s*$/i, "")
      .trim();
    if (!inner) throw new Error(`Missing SVG paths for ${fileName}`);
    symbols.push(
      `  <symbol id="icon-${name}${filled ? "-fill" : ""}" viewBox="0 0 48 48">${inner}</symbol>`,
    );
  }
}

const result = [
  '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">',
  `  <!-- Generated from ${glyphs.size} reference glyphs; only used fill variants are included. -->`,
  ...symbols,
  "</svg>",
  "",
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, result, "utf8");
process.stdout.write(
  `Generated ${glyphs.size} glyphs (${symbols.length} symbols) to ${outputPath}\n`,
);
