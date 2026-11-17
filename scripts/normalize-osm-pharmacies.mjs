import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [inputArgument, packArgument, coverageArgument] = process.argv.slice(2);
if (!inputArgument || !packArgument || !coverageArgument) {
  throw new Error(
    "Usage: node scripts/normalize-osm-pharmacies.mjs <geojson> <pack.json> <coverage.tsv>",
  );
}

const inputPath = resolve(inputArgument);
const packPath = resolve(packArgument);
const coveragePath = resolve(coverageArgument);
const fetchedAt = process.env["OSM_FETCHED_AT"] ?? new Date().toISOString();
const snapshotAt = process.env["OSM_SNAPSHOT_AT"] ?? fetchedAt;
const extractUrl =
  process.env["OSM_EXTRACT_URL"] ??
  "https://download.geofabrik.de/africa/cameroon-latest.osm.pbf";
const extractSha256 = process.env["OSM_EXTRACT_SHA256"] ?? "";
const extractBytes = Number(process.env["OSM_EXTRACT_BYTES"] ?? "0");
const pagesBaseUrl = (
  process.env["PAGES_BASE_URL"] ?? "https://pauldjeuda.github.io/locapharm"
).replace(/\/$/, "");
const snapshotTime = Date.parse(snapshotAt);
if (!Number.isFinite(snapshotTime)) {
  throw new Error(`Invalid OSM_SNAPSHOT_AT timestamp: ${snapshotAt}`);
}

const sourceData = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(sourceData.features)) {
  throw new Error("Osmium export must be a GeoJSON FeatureCollection");
}

function coordinatesOf(geometry) {
  const coordinates = [];
  function collect(value) {
    if (
      Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      coordinates.push([value[0], value[1]]);
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) collect(child);
    }
  }
  collect(geometry?.coordinates);
  if (!coordinates.length) return null;
  const longitude =
    coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length;
  const latitude =
    coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;
  return { latitude, longitude, point: geometry?.type === "Point" };
}

function clean(value) {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length ? result : undefined;
}

function phoneValues(properties) {
  const raw = [properties["contact:phone"], properties.phone]
    .filter((value) => typeof value === "string")
    .flatMap((value) => value.split(/[;,/]/))
    .map((value) => value.trim())
    .filter(Boolean);
  const normalized = new Set();
  let invalid = 0;

  for (const value of raw) {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("237")) digits = digits.slice(3);
    if (/^[0-9]{8,9}$/.test(digits)) normalized.add(`+237${digits}`);
    else invalid += 1;
  }

  return { values: [...normalized], invalid };
}

function sourceType(value) {
  if (value === "node" || value === "way" || value === "relation") return value;
  return null;
}

const bySourceId = new Map();
for (const feature of sourceData.features) {
  const properties = feature.properties ?? {};
  const tags = properties;
  if (tags.amenity !== "pharmacy" && tags.healthcare !== "pharmacy") {
    continue;
  }

  const type = sourceType(properties["@type"]);
  const rawId = properties["@id"];
  if (!type || (typeof rawId !== "number" && typeof rawId !== "string")) {
    throw new Error("Osmium export must include @type and @id attributes");
  }
  const id = String(rawId);
  const sourceId = `${type}/${id}`;
  const location = coordinatesOf(feature.geometry);
  if (!location) continue;
  if (
    location.latitude < 1.3 ||
    location.latitude > 13.5 ||
    location.longitude < 8 ||
    location.longitude > 16.5
  ) {
    continue;
  }

  const phones = phoneValues(tags);
  const city =
    clean(tags["addr:city"]) ??
    clean(tags["addr:town"]) ??
    clean(tags["addr:municipality"]);
  const neighbourhood =
    clean(tags["addr:neighbourhood"]) ?? clean(tags["addr:suburb"]);
  const street = [clean(tags["addr:housenumber"]), clean(tags["addr:street"])]
    .filter(Boolean)
    .join(" ");
  const name =
    clean(tags["name:fr"]) ??
    clean(tags.name) ??
    clean(tags.brand) ??
    "Pharmacie (nom non renseigné)";
  const openingHours = clean(tags.opening_hours);
  const region = clean(tags["addr:region"]) ?? clean(tags["addr:state"]);
  const address = Object.fromEntries(
    Object.entries({ street, neighbourhood, city, region }).filter(
      ([, value]) => Boolean(value),
    ),
  );
  const updatedAt = clean(properties["@timestamp"]) ?? snapshotAt;
  const flags = [];
  if (name === "Pharmacie (nom non renseigné)") flags.push("missing-name");
  if (!city) flags.push("missing-city");
  if (!street && !neighbourhood) flags.push("missing-street-address");
  if (!phones.values.length) flags.push("missing-phone");
  if (!openingHours) flags.push("missing-opening-hours");
  if (!location.point) flags.push("derived-from-area-geometry");
  if (phones.invalid) flags.push("invalid-phone-format");

  const completeFields = [
    name !== "Pharmacie (nom non renseigné)",
    Boolean(street || neighbourhood || city),
    phones.values.length > 0,
    Boolean(openingHours),
  ].filter(Boolean).length;
  const record = {
    id: sourceId,
    name,
    lat: location.latitude,
    lon: location.longitude,
    ...(Object.keys(address).length ? { address } : {}),
    ...(neighbourhood ? { neighbourhood } : {}),
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
    ...(phones.values.length
      ? {
          phones: phones.values.map((number, index) => ({
            number,
            primary: index === 0,
          })),
        }
      : {}),
    ...(openingHours ? { opening_hours: openingHours } : {}),
    source: {
      id: "osm-cameroon",
      url: `https://www.openstreetmap.org/${type}/${id}`,
      fetched_at: fetchedAt,
      license: "ODbL-1.0",
      official: false,
    },
    quality: { score: completeFields / 4, flags },
    updated_at: updatedAt,
  };

  const previous = bySourceId.get(sourceId);
  if (!previous || (!previous.point && location.point)) {
    bySourceId.set(sourceId, { record, point: location.point, phones });
  }
}

const records = [...bySourceId.values()].map((entry) => entry.record);
if (!records.length) {
  throw new Error("No pharmacy objects were found inside the Cameroon bounds");
}
records.sort((a, b) =>
  `${a.city ?? ""}\t${a.name}`.localeCompare(
    `${b.city ?? ""}\t${b.name}`,
    "fr",
  ),
);

const withPhone = records.filter((record) => record.phones?.length).length;
const withOpeningHours = records.filter(
  (record) => record.opening_hours,
).length;
const withCity = records.filter((record) => record.city).length;
const cityCounts = new Map();
for (const record of records) {
  const city = record.city ?? "(city tag absent)";
  const current = cityCounts.get(city) ?? {
    count: 0,
    name: 0,
    phone: 0,
    hours: 0,
  };
  current.count += 1;
  if (!record.quality.flags.includes("missing-name")) current.name += 1;
  if (record.phones?.length) current.phone += 1;
  if (record.opening_hours) current.hours += 1;
  cityCounts.set(city, current);
}

const generatedAt = fetchedAt;
const dataVersion = snapshotAt.slice(0, 10).replaceAll("-", "");
const pack = {
  schema_version: 1,
  region: "CM",
  generated_at: generatedAt,
  pharmacies: records,
  guards: [],
  quality: {
    pharmacies_count: records.length,
    phone_coverage: withPhone / records.length,
    opening_hours_coverage: withOpeningHours / records.length,
    city_tag_coverage: withCity / records.length,
    guards_available: false,
    source_snapshot_at: snapshotAt,
    source_extract_url: extractUrl,
    ...(extractSha256 ? { source_extract_sha256: extractSha256 } : {}),
    ...(extractBytes > 0 ? { source_extract_bytes: extractBytes } : {}),
    source_snapshot_age_days: Math.max(
      0,
      Math.floor((Date.parse(fetchedAt) - snapshotTime) / 86_400_000),
    ),
    completeness_note:
      "Mapped OSM objects and tag coverage only; this is not a completeness or verification claim.",
  },
};

const packJson = `${JSON.stringify(pack, null, 2)}\n`;
const digest = createHash("sha256").update(packJson).digest("hex");
await mkdir(dirname(packPath), { recursive: true });
await mkdir(dirname(coveragePath), { recursive: true });
await writeFile(packPath, packJson, "utf8");

const tsv = [
  "city\tpharmacies\tnamed\tphone\topening_hours",
  ...[...cityCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([city, counts]) =>
      [city, counts.count, counts.name, counts.phone, counts.hours].join("\t"),
    ),
].join("\n");
await writeFile(coveragePath, `${tsv}\n`, "utf8");

const packStat = await stat(packPath);
const packUrl = `${pagesBaseUrl}/data/packs/cm.json`;
const manifest = {
  schema_version: 1,
  generated_at: generatedAt,
  data_version: dataVersion,
  packs: [
    {
      id: "cm",
      name: { fr: "Cameroun", en: "Cameroon" },
      cities: [...cityCounts.keys()]
        .filter((city) => !city.startsWith("("))
        .sort((a, b) => a.localeCompare(b, "fr")),
      url: packUrl,
      sha256: digest,
      bytes: packStat.size,
      pharmacies_count: records.length,
      guards_valid_until: null,
      guards_updated_at: null,
    },
  ],
  emergency: [],
  app_min_version: "0.1.0",
};
await writeFile(
  resolve(dirname(packPath), "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

process.stdout.write(
  `OSM snapshot ${snapshotAt}; ${records.length} unique pharmacy objects; city-tag coverage ${((withCity / records.length) * 100).toFixed(1)}%; phone tags ${withPhone}; opening-hours tags ${withOpeningHours}; SHA-256 ${digest}. Counts describe mapped objects, not real-world completeness.\n`,
);
